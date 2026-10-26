import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const temporary = await mkdtemp(join(tmpdir(), 'ardi-botazez-tests-'));
try {
  const output = join(temporary, 'tests.mjs');
  await build({ entryPoints: [join(dirname(fileURLToPath(import.meta.url)), 'botazez-intelligence.test.ts')], outfile: output, bundle: true, platform: 'node', format: 'esm' });
  const run = spawnSync(process.execPath, ['--test', output], { stdio: 'inherit' });
  if (run.error) throw run.error;
  process.exitCode = run.status ?? 1;
} finally { await rm(temporary, { recursive: true, force: true }); }
