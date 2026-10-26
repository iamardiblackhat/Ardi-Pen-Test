import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../src/app';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../src/lib/auth';
import { parseTarget } from '../../../lib/scan-engine/src/targets';
let server: Server;
let base: string;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => { server.closeAllConnections(); await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); });
test('health response includes browser security headers and hides server framework', async () => {
  const response=await fetch(`${base}/api/healthz`);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(response.headers.get('x-frame-options'),'DENY');
  assert.equal(response.headers.get('x-powered-by'),null);
});
test('malformed JSON is a safe client error', async () => {
  const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:'{broken'});
  assert.equal(response.status,400);
  const body=await response.json(); assert.equal(body.error,'Invalid JSON request.');
  assert(!JSON.stringify(body).includes('SyntaxError'));
});
test('oversized input is rejected before authentication or schema validation', async () => {
  const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({padding:'x'.repeat(70_000)})});
  assert.equal(response.status,413);
});
test('unsupported compressed input cannot enter the body parser inflater', async () => {
  const response=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json','content-encoding':'gzip'},body:'not a gzip stream'});
  assert.equal(response.status,415);
});
test('malformed chat entries are rejected without starting an AI request', async () => {
  for(const messages of [[null],[42],['hello'],[{role:'system',content:'ignored'}]]) {
    const response=await fetch(`${base}/api/ardi/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages})});
    assert.equal(response.status,400);
  }
});
test('private workspace endpoints reject missing and forged sessions', async () => {
  for(const path of ['/assets','/scans','/findings','/reports','/dashboard/stats','/osint/lookup']) {
    for(const token of ['', 'Bearer fake.session.value']) {
      const response=await fetch(`${base}/api${path}`,{headers:token?{authorization:token}:{}});
      assert.equal(response.status,401,`${path}: ${token?'forged':'missing'} session`);
    }
  }
});

test('password hashes verify the right password and reject a different password', async () => {
  const hash=await hashPassword('Fixture-only-passphrase-2026');
  assert.notEqual(hash,'Fixture-only-passphrase-2026');
  assert(await verifyPassword('Fixture-only-passphrase-2026',hash));
  assert.equal(await verifyPassword('different-passphrase',hash),false);
});
test('signed sessions reject payload tampering', () => {
  const token=signToken({id:123,email:'fixture@example.com',role:'analyst'});
  assert.equal(verifyToken(token)?.sub,123);
  const parts=token.split('.');
  parts[1]=Buffer.from(JSON.stringify({sub:1,role:'admin',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  assert.equal(verifyToken(parts.join('.')),null);
});
test('target validation rejects option injection, shell syntax and private address literals', () => {
  for(const value of ['--script=anything','example.com;id','127.0.0.1','169.254.169.254','10.0.0.1','https://trusted.example@127.0.0.1/']) {
    assert.throws(()=>parseTarget(value),undefined,value);
  }
  assert.doesNotThrow(()=>parseTarget('example.com'));
});

test('deployment-forwarded honeypot probes reach the actual tripwire', async () => {
  const response=await fetch(`${base}/api/honeypot/.env`);
  assert.equal(response.status,404);
  assert.deepEqual(await response.json(),{error:'Not found.'});
});
