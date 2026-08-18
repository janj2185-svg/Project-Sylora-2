import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const EXPECTED_SHA256='dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08';
const CANONICAL_URL='/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const PUBLIC_DIR=fileURLToPath(new URL('../public/',import.meta.url));
const CANONICAL_FILE=path.join(PUBLIC_DIR,'assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png');
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
});

test('web shell, favicon, and contextual presence use the canonical master directly',async()=>{
  const html=await readFile(path.join(PUBLIC_DIR,'index.html'),'utf8');
  const phoenixPreview=await readFile(path.join(PUBLIC_DIR,'phoenix-preview.html'),'utf8');
  const homeCss=await readFile(path.join(PUBLIC_DIR,'design-home-2026.css'),'utf8');
  const brandTag=html.match(/<a class="brand"[\s\S]*?<\/a>/)?.[0]||'';

  assert.match(html,new RegExp(`<link rel="icon" type="image/png" href="${CANONICAL_URL.replaceAll('/','\\/')}"`));
  assert.ok(brandTag.includes(`src="${CANONICAL_URL}"`),'shell brand is not the canonical master');
  assert.ok(brandTag.includes(`data-brand-sha256="${EXPECTED_SHA256}"`),'shell brand checksum marker is missing');
  assert.doesNotMatch(brandTag,/<svg|\.svg\b/i,'shell brand must not use redrawn SVG geometry');
  assert.ok(homeCss.includes(`url('${CANONICAL_URL}')`),'Home presence is not the canonical master');
  assert.match(phoenixPreview,new RegExp(`<link rel="icon" type="image/png" href="${CANONICAL_URL.replaceAll('/','\\/')}"`));
  assert.match(phoenixPreview,new RegExp(`<img class="brand-mark" src="${CANONICAL_URL.replaceAll('/','\\/')}"`));
  assert.doesNotMatch(phoenixPreview,/class="brand-mark"[^>]*>\s*S\s*</,'standalone preview must not recreate the brand with text/CSS');
});

test('web UI cannot reference an unverified logo-like asset',async()=>{
  const logoReference=/\/assets\/[A-Za-z0-9_./-]*(?:logo|brand|mark|app-icon)[A-Za-z0-9_./-]*/gi;
  const violations=[];

  for(const file of await uiSourceFiles(PUBLIC_DIR)){
    const source=await readFile(file,'utf8');
    for(const match of source.matchAll(logoReference)){
      if(match[0]!==CANONICAL_URL){
        violations.push(`${path.relative(PUBLIC_DIR,file)}: ${match[0]}`);
      }
    }
  }

  assert.deepEqual(violations,[],`unverified UI logo references:\n${violations.join('\n')}`);
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
