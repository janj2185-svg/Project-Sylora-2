import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const EXPECTED_SHA256='dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08';
const CANONICAL_URL='/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const LOCKUP_SHA256='061430e7d2fceefb660d049838603cffc0f30433a704dd3eb239b9f59e57fa50';
const SYMBOL_SHA256='9975f9f178eee4cf747f258e68d268ef512b4786342aee45bf932e8a2f941df1';
const LOCKUP_URL='/assets/brand/sylora-canonical-lockup.png';
const SYMBOL_URL='/assets/brand/sylora-canonical-symbol.png';
const PUBLIC_DIR=fileURLToPath(new URL('../public/',import.meta.url));
const CANONICAL_FILE=path.join(PUBLIC_DIR,'assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png');
const LOCKUP_FILE=path.join(PUBLIC_DIR,'assets/brand/sylora-canonical-lockup.png');
const SYMBOL_FILE=path.join(PUBLIC_DIR,'assets/brand/sylora-canonical-symbol.png');
const UI_SOURCE_EXTENSIONS=new Set(['.css','.html','.js','.mjs','.json','.webmanifest']);

async function uiSourceFiles(directory){
  const files=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory())files.push(...await uiSourceFiles(absolute));
    else if(UI_SOURCE_EXTENSIONS.has(path.extname(entry.name)))files.push(absolute);
  }
  return files;
}

test('canonical production logo bytes are immutable and retain master dimensions',async()=>{
  const png=await readFile(CANONICAL_FILE);
  assert.equal(createHash('sha256').update(png).digest('hex'),EXPECTED_SHA256);
  assert.equal(png.subarray(1,4).toString('ascii'),'PNG');
  assert.equal(png.readUInt32BE(16),1100,'canonical width changed');
  assert.equal(png.readUInt32BE(20),650,'canonical height changed');
  for(const [file,sha,width,height] of [[LOCKUP_FILE,LOCKUP_SHA256,976,569],[SYMBOL_FILE,SYMBOL_SHA256,310,395]]){
    const approved=await readFile(file);
    assert.equal(createHash('sha256').update(approved).digest('hex'),sha);
    assert.equal(approved.subarray(1,4).toString('ascii'),'PNG');
    assert.equal(approved.readUInt32BE(16),width,'approved brand export width changed');
    assert.equal(approved.readUInt32BE(20),height,'approved brand export height changed');
  }
});

test('web shell, favicon, and wallet use the canonical master directly',async()=>{
  const html=await readFile(path.join(PUBLIC_DIR,'index.html'),'utf8');
  const phoenixPreview=await readFile(path.join(PUBLIC_DIR,'phoenix-preview.html'),'utf8');
  const homeCss=await readFile(path.join(PUBLIC_DIR,'design-home-2026.css'),'utf8');
  const systemCss=await readFile(path.join(PUBLIC_DIR,'design-system-2026.css'),'utf8');
  const app=await readFile(path.join(PUBLIC_DIR,'app.js'),'utf8');
  const brandTag=html.match(/<a class="[^"]*\bbrand\b[^"]*"[\s\S]*?<\/a>/)?.[0]||'';

  assert.match(html,new RegExp(`<link rel="preload" as="image" href="${LOCKUP_URL.replaceAll('/','\\/')}" fetchpriority="high"`));
  assert.match(html,new RegExp(`<link rel="icon" type="image/png" href="${SYMBOL_URL.replaceAll('/','\\/')}"`));
  assert.ok(brandTag.includes(`src="${LOCKUP_URL}"`),'shell brand is not the approved transparent lockup');
  assert.ok(brandTag.includes(`data-brand-sha256="${LOCKUP_SHA256}"`),'shell lockup checksum marker is missing');
  assert.ok(brandTag.includes(`src="${SYMBOL_URL}"`),'compact shell symbol is missing');
  assert.ok(brandTag.includes(`data-brand-sha256="${SYMBOL_SHA256}"`),'shell symbol checksum marker is missing');
  assert.match(brandTag,/decoding="sync" loading="eager" fetchpriority="high"/);
  assert.doesNotMatch(brandTag,/<svg|\.svg\b/i,'shell brand must not use redrawn SVG geometry');
  const walletImages=[...app.matchAll(/<img src="\$\{CANONICAL_BRAND_ASSET\}"[^>]*>/g)].map(match=>match[0]);
  assert.equal(walletImages.length,2,'both authenticated and signed-out wallet states must use the canonical brand');
  for(const image of walletImages){
    assert.match(image,/width="1100" height="650"/);
    assert.ok(image.includes(`data-brand-sha256="${EXPECTED_SHA256}"`));
    assert.match(image,/decoding="sync" loading="eager"/);
  }
  assert.doesNotMatch(systemCss,/\.brand-lockup\{[^}]*transform:translateZ\(0\)/,'resting brand must not be forced into a transient compositor layer');
  assert.match(systemCss,/\.brand:hover \.brand-lockup\{transform:translateY\(-1px\) scale\(1\.012\)/,'approved hover composition changed');
  assert.ok(!homeCss.includes(CANONICAL_URL),'Home must not render a Sylora brand presence');
  const canonicalCssReferences=[];
  for(const file of await uiSourceFiles(PUBLIC_DIR)){
    if(path.extname(file)!=='.css')continue;
    if((await readFile(file,'utf8')).includes(CANONICAL_URL))canonicalCssReferences.push(path.relative(PUBLIC_DIR,file));
  }
  assert.deepEqual(canonicalCssReferences,[],'canonical brand must remain an image element, not a CSS background');
  assert.match(phoenixPreview,new RegExp(`<link rel="icon" type="image/png" href="${CANONICAL_URL.replaceAll('/','\\/')}"`));
  assert.match(phoenixPreview,new RegExp(`<img class="brand-mark" src="${CANONICAL_URL.replaceAll('/','\\/')}"`));
  assert.doesNotMatch(phoenixPreview,/class="brand-mark"[^>]*>\s*S\s*</,'standalone preview must not recreate the brand with text/CSS');
});

test('web UI cannot reference an unverified logo-like asset',async()=>{
  const logoReference=/\/assets\/[A-Za-z0-9_./-]*(?:logo|brand|mark|app-icon)[A-Za-z0-9_./-]*/gi;
  const approvedUrls=new Set([CANONICAL_URL,LOCKUP_URL,SYMBOL_URL]);
  const violations=[];

  for(const file of await uiSourceFiles(PUBLIC_DIR)){
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(logoReference)){
      if(!approvedUrls.has(match[0])){
        violations.push(`${path.relative(PUBLIC_DIR,file)}: ${match[0]}`);
      }
    }
  }

  assert.deepEqual(violations,[],`unverified UI logo references:\n${violations.join('\n')}`);
});

test('Phoenix preview keeps the recording download hidden until a recording exists',async()=>{
  const html=await readFile(path.join(PUBLIC_DIR,'phoenix-preview.html'),'utf8');
  const css=await readFile(path.join(PUBLIC_DIR,'phoenix-preview.css'),'utf8');

  assert.match(html,/id="recordingDownload"[^>]*\bhidden\b/);
  assert.match(css,/\.download\[hidden\]\s*\{\s*display\s*:\s*none\s*\}/);
});

test('static delivery preserves canonical bytes and declares the PNG media type',async()=>{
  process.env.NODE_ENV='test';
  process.env.DATABASE_URL='';
  process.env.REDIS_URL='';
  process.env.OPENAI_API_KEY='';
  const {server}=await import(`../src/server.mjs?canonical-brand=${Date.now()}`);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

  try{
    const {port}=server.address();
    const response=await fetch(`http://127.0.0.1:${port}${CANONICAL_URL}`);
    const png=Buffer.from(await response.arrayBuffer());
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.equal(createHash('sha256').update(png).digest('hex'),EXPECTED_SHA256);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
