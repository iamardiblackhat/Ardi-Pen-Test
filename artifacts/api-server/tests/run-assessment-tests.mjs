import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const temporary = await mkdtemp(join(tmpdir(), 'ardi-assessment-tests-'));
try {
  const tests = ['lib/scan-engine/tests/process.test.ts', 'artifacts/api-server/tests/report-completeness.test.ts'];
  const outputs=[];
  for (let i=0;i<tests.length;i++) {
    const output=join(temporary, `${i}.test.mjs`); outputs.push(output);
    await build({entryPoints:[resolve(root, tests[i])],outfile:output,bundle:true,platform:'node',format:'esm'});
  }
  const run=spawnSync(process.execPath,['--test',...outputs],{stdio:'inherit'});
  if(run.error)throw run.error;
  process.exitCode=run.status??1;
} finally {await rm(temporary,{recursive:true,force:true});}
