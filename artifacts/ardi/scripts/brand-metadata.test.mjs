import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {brandDocument,pages} from './brand-metadata.mjs';
test('every public route has branded crawler metadata and a unique canonical',()=>{
 for(const path of Object.keys(pages)){
  const html=brandDocument('<html><head></head><body></body></html>',path);
  assert.equal(brandDocument(html,path),html);
  assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
  assert.ok(html.includes(`href="https://ardi-pen-test-api-server-one.vercel.app${path}"`));
  assert.ok(html.includes('ardi-sec-social-en-v1.png'));
  assert.ok(html.includes('summary_large_image'));
  assert.ok(html.includes('site.webmanifest'));
  assert.match(html,/<meta property="og:image:width" content="1200">/);
  assert.equal(html.includes('content="noindex,follow"'),['/login','/register'].includes(path));
 }
});
test('share card and install icons have their declared dimensions',async()=>{
 for(const [path,w,h]of [['branding/ardi-sec-social-en-v1.png',1200,630],... [32,180,192,512].map(n=>[`branding/ardi-sec-icon-${n}.png`,n,n])]){
  const png=await readFile(new URL('../public/'+path,import.meta.url));
  assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);
 }
 const manifest=JSON.parse(await readFile(new URL('../public/site.webmanifest',import.meta.url)));
 assert.equal(manifest.name,'ARDI Sec');
 for(const icon of manifest.icons)await readFile(new URL('../public'+icon.src,import.meta.url));
});
