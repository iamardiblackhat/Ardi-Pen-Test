import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, chmod, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { runNmap } from '../src/runners/nmap.ts';
import { runNuclei } from '../src/runners/nuclei.ts';
import { runScannerProcess } from '../src/runners/process.ts';
import { ScanEngineError } from '../src/types.ts';
async function fixture(body: string) {
  const dir = await mkdtemp(join(tmpdir(), 'ardi-scanner-fixture-'));
  const binary = join(dir, 'scanner');
  await writeFile(binary, `#!${process.execPath}\n${body}\n`); await chmod(binary, 0o700);
  return { binary, dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}
const isCode = (code: string) => (e: unknown) => e instanceof ScanEngineError && e.code === code;
const xml = '<nmaprun><host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="80"><state state="open"/><service name="http"/></port></ports></host></nmaprun>';

test('successful service discovery preserves parsed evidence', async () => {
  const f = await fixture(`process.stdout.write(${JSON.stringify(xml)});`);
  try { const result = await runNmap('example.com', { binary: f.binary }); assert.equal(result.findings.length, 1); assert.match(result.findings[0].target, /80\/tcp/); } finally { await f.cleanup(); }
});
test('zero-result vulnerability check succeeds only with exit zero', async () => {
  const f = await fixture('process.exit(0);');
  try { assert.equal((await runNuclei('https://example.com', { binary: f.binary })).findings.length, 0); } finally { await f.cleanup(); }
});
test('nonzero exits fail even with empty or partially valid output', async () => {
  for (const tool of ['nmap', 'nuclei']) {
    const f = await fixture(`process.stdout.write(${JSON.stringify(xml)}); process.stderr.write('fixture failure'); process.exit(2);`);
    try { await assert.rejects(tool === 'nmap' ? runNmap('example.com', { binary: f.binary }) : runNuclei('https://example.com', { binary: f.binary }), isCode('tool_failed')); } finally { await f.cleanup(); }
  }
});
test('missing tool and elapsed timeout are distinct failures', async () => {
  await assert.rejects(runNmap('example.com', { binary: '/nonexistent/ardi-fixture' }), isCode('tool_missing'));
  const f = await fixture('setInterval(() => {}, 100);');
  try { await assert.rejects(runNmap('example.com', { binary: f.binary, timeoutMs: 100 }), isCode('timeout')); } finally { await f.cleanup(); }
});
test('already-cancelled calls do not spawn a process', async () => {
  const signal = AbortSignal.abort();
  await assert.rejects(runNuclei('https://example.com', { binary: '/nonexistent/ardi-fixture', signal }), isCode('cancelled'));
});
test('cancellation terminates a child that ignores graceful shutdown', async () => {
  const f = await fixture('process.on("SIGTERM", () => {}); console.log(process.pid); setInterval(() => {}, 100);');
  const marker = join(f.dir, 'pid');
  await writeFile(f.binary, `#!${process.execPath}\nrequire('node:fs').writeFileSync(${JSON.stringify(marker)}, String(process.pid)); process.on('SIGTERM',()=>{}); setInterval(()=>{},100);`);
  const controller = new AbortController();
  let pid: number | undefined;
  try {
    const run = runNuclei('https://example.com', { binary: f.binary, signal: controller.signal, timeoutMs: 5000 });
    for (let i=0; i<100; i++) { try { pid = Number(await readFile(marker, 'utf8')); break; } catch { await delay(10); } }
    assert.ok(pid); controller.abort(); await assert.rejects(run, isCode('cancelled'));
    assert.throws(() => process.kill(pid!, 0), (e: unknown) => (e as NodeJS.ErrnoException).code === 'ESRCH');
  } finally { controller.abort(); await f.cleanup(); }
});
test('output limits terminate the process without returning a clean scan', async () => {
  const f = await fixture("process.stdout.write('x'.repeat(10000)); setInterval(()=>{},100);");
  try { await assert.rejects(runScannerProcess(f.binary, [], { tool: 'fixture', timeoutMs: 5000, maxOutputBytes: 100 }), isCode('tool_failed')); } finally { await f.cleanup(); }
});
