import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const temporary=await mkdtemp(join(tmpdir(),'ardi-http-tests-'));
try {
  const output=join(temporary,'http.test.mjs');
  await build({entryPoints:['tests/http-readiness.test.ts'],outfile:output,bundle:true,platform:'node',format:'esm',external:['pg-native'],banner:{js:"import {createRequire} from 'node:module';globalThis.require=createRequire(import.meta.url);"}});
  const run=spawnSync(process.execPath,['--test',output],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',DATABASE_URL:'postgresql://fixture:fixture@127.0.0.1:1/fixture',JWT_SECRET:'readiness-test-only-key-never-used-in-production',CORS_ORIGIN:'https://fixture.example',ARDI_PROVIDER:'none'}});
  if(run.error)throw run.error;
  process.exitCode=run.status??1;
} finally {await rm(temporary,{recursive:true,force:true});}
