import { spawn } from 'node:child_process';
import { ScanEngineError } from '../types';

type ProcessOptions = { tool: string; timeoutMs: number; maxOutputBytes: number; signal?: AbortSignal };
/** No shell; bounded output; cancellation and deadlines wait for the child to exit. */
export function runScannerProcess(binary: string, args: string[], options: ProcessOptions): Promise<string> {
  if (options.signal?.aborted) return Promise.reject(new ScanEngineError('Scan cancelled.', { code: 'cancelled' }));
  if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) return Promise.reject(new ScanEngineError('Invalid scanner timeout.', { code: 'invalid_config' }));
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    const output: Buffer[] = [], errors: Buffer[] = [];
    let bytes = 0, errorBytes = 0, settled = false;
    let failure: ScanEngineError | undefined;
    let forceKill: ReturnType<typeof setTimeout> | undefined;
    const stop = (error: ScanEngineError) => {
      if (settled || failure) return;
      failure = error;
      child.kill('SIGTERM');
      forceKill = setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 1000);
      forceKill.unref();
    };
    const abort = () => stop(new ScanEngineError('Scan cancelled.', { code: 'cancelled' }));
    const deadline = setTimeout(() => stop(new ScanEngineError(`${options.tool} exceeded its time limit. The check is incomplete.`, { code: 'timeout' })), options.timeoutMs);
    deadline.unref();
    const cleanup = () => { settled = true; clearTimeout(deadline); if (forceKill) clearTimeout(forceKill); options.signal?.removeEventListener('abort', abort); };
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    child.stdout.on('data', (chunk: Buffer) => {
      if (failure) return;
      bytes += chunk.length;
      if (bytes > options.maxOutputBytes) { stop(new ScanEngineError(`${options.tool} output exceeded its size limit. The check is incomplete.`, { code: 'tool_failed' })); return; }
      output.push(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => { if (errorBytes < 64_000) { const part = chunk.subarray(0, 64_000 - errorBytes); errors.push(part); errorBytes += part.length; } });
    child.once('error', (error: NodeJS.ErrnoException) => {
      if (settled) return;
      cleanup();
      reject(failure ?? new ScanEngineError(error.code === 'ENOENT' ? `${options.tool} is unavailable on the assessment worker.` : `${options.tool} could not be started.`, { code: error.code === 'ENOENT' ? 'tool_missing' : 'tool_failed', cause: error }));
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      cleanup();
      if (failure) { reject(failure); return; }
      if (code !== 0) { reject(new ScanEngineError(`${options.tool} failed (${code ?? signal ?? 'unknown'}): ${Buffer.concat(errors).toString('utf8').trim().slice(0, 1000) || 'No diagnostic output.'}`, { code: 'tool_failed' })); return; }
      resolve(Buffer.concat(output).toString('utf8'));
    });
  });
}
