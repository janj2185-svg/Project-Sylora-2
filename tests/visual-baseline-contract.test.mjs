import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm,unlink,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {deflateSync} from 'node:zlib';
import {verifyPassword} from '../src/auth.mjs';
import {
  VISUAL_TOUCH_POINTS,
  enforceVisualTouchEmulation,
  verifyVisualTouchInput
} from '../e2e/visual-helpers.mjs';
import {FIXED_VISUAL_ACCOUNT,VISUAL_FIXTURE_ID,createVisualFixtureData} from '../scripts/visual-fixture.mjs';
import {
  BASELINE_LOCALE,
  CANDIDATE_STATUS,
  DEFAULT_CANDIDATE_DIR,
  EXPECTED_PNG_COUNT,
  INCOMPLETE_STATUS,
  NOT_CAPTURED_STATUS,
  PENDING_RUN_CONCLUSION,
  READY_FOR_VALIDATION_STATUS,
  SURFACES,
  VIEWPORTS,
  assertExactCandidateFileSet,
  assertExactCaptureSourceFileSet,
  expectedRelativePngPaths,
  finalizeCaptureMetadata,
  generateCandidateManifest,
  inspectCandidateDirectory,
  promoteCandidateFromCapture,
  validateCandidateManifest,
  validateCaptureMetadata,
  validatePendingCaptureMetadata,
  validatePendingCaptureSource,
  validateRawCaptureMetadata,
  writeJsonAtomicExclusive
} from '../scripts/build-visual-manifest.mjs';

const repositoryState=await inspectCandidateDirectory(DEFAULT_CANDIDATE_DIR);
const defaultPlaywrightConfig=await readFile(new URL('../playwright.config.mjs',import.meta.url),'utf8');
const visualPlaywrightConfig=await readFile(new URL('../playwright.visual.config.mjs',import.meta.url),'utf8');
const repositoryRoot=fileURLToPath(new URL('..',import.meta.url));
const playwrightCli=fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url));

function discoverPlaywright(configFile){
  const result=spawnSync(process.execPath,[playwrightCli,'test',`--config=${configFile}`,'--list','--reporter=json'],{
    cwd:repositoryRoot,
    encoding:'utf8',
    env:{...process.env,NO_COLOR:'1'}
  });
  assert.equal(result.status,0,`Playwright discovery failed for ${configFile}`);
  const report=JSON.parse(result.stdout);
  const discovered=[];
  const visit=suite=>{
    for(const spec of suite.specs||[])discovered.push(spec.file);
    for(const child of suite.suites||[])visit(child);
  };
  for(const suite of report.suites||[])visit(suite);
  return discovered;
}

function crc32(buffer){
  let crc=0xffffffff;
  for(const byte of buffer){
    crc^=byte;
    for(let bit=0;bit<8;bit+=1)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}

function chunk(type,data){
  const typeBuffer=Buffer.from(type,'ascii');
  const header=Buffer.alloc(4);header.writeUInt32BE(data.length);
  const checksum=Buffer.alloc(4);checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer,data])));
  return Buffer.concat([header,typeBuffer,data,checksum]);
}

function validPng(width,height){
  const header=Buffer.alloc(13);
  header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=2;
  const stride=width*3+1;
  const pixels=Buffer.alloc(stride*height);
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',header),
    chunk('IDAT',deflateSync(pixels)),
    chunk('IEND',Buffer.alloc(0))
  ]);
}

function metadataFixture(commit='a'.repeat(40)){
  return {
    status:CANDIDATE_STATUS,
    renderedFromCommit:commit,
    capturedAt:'2026-08-18T12:00:01.000Z',
    sourceRun:{
      provider:'github-actions',
      id:123456789,
      attempt:1,
      url:'https://github.com/example/sylora/actions/runs/123456789',
      conclusion:'success',
      headSha:commit
    },
    playwright:{version:'1.62.1'},
    browser:{name:'chromium',version:'151.0.7922.34'},
    os:{name:'Ubuntu',version:'24.04.4',runnerImage:'ubuntu-24.04'},
    locale:BASELINE_LOCALE,
    fixture:{id:VISUAL_FIXTURE_ID,fixedTime:'2026-08-18T12:00:00.000Z'},
    font:{ready:true,computedFamily:'Inter, sans-serif'},
    viewports:Object.fromEntries(VIEWPORTS.map(({id,width,height,devicePixelRatio,inputMode})=>[id,{width,height,devicePixelRatio,inputMode}]))
  };
}

function pendingMetadataFixture(commit='a'.repeat(40)){
  const metadata=metadataFixture(commit);
  metadata.sourceRun.conclusion=PENDING_RUN_CONCLUSION;
  return metadata;
}

function verifiedRunFixture(metadata,{conclusion='success'}={}){
  return {...metadata.sourceRun,conclusion};
}

function rawCaptureFixture(commit='a'.repeat(40),pngByViewport=new Map()){
  const files=expectedRelativePngPaths().map(file=>{
    const [surface,viewportId]=file.split('/');
    const viewport=VIEWPORTS.find(item=>item.id===viewportId);
    const png=pngByViewport.get(viewportId)||Buffer.from('fixture');
    const touch=viewport.inputMode==='touch';
    return {
      surface,
      viewport:viewportId,
      width:viewport.width,
      height:viewport.height,
      locale:BASELINE_LOCALE,
      input:viewport.inputMode,
      isMobile:touch,
      hasTouch:touch,
      file,
      sha256:createHash('sha256').update(png).digest('hex'),
      bytes:png.length,
      runtime:{
        fontStatus:'loaded',
        bodyFontFamily:'Inter, sans-serif',
        imageCount:1,
        viewport:{width:viewport.width,height:viewport.height},
        devicePixelRatio:viewport.devicePixelRatio,
        locale:BASELINE_LOCALE,
        reducedMotion:true,
        touchPoints:touch?1:0,
        primaryPointer:touch?'coarse':'fine',
        primaryHover:touch?'none':'hover'
      }
    };
  });
  return {
    schemaVersion:2,
    status:CANDIDATE_STATUS,
    complete:true,
    expectedFiles:EXPECTED_PNG_COUNT,
    actualFiles:EXPECTED_PNG_COUNT,
    generatedAt:'2026-08-18T12:00:00.500Z',
    renderedFromCommit:commit,
    runMode:'capture',
    fixture:{
      id:VISUAL_FIXTURE_ID,
      username:'visual_baseline_owner',
      displayName:'SYLORA Visual Baseline',
      fixedTime:'2026-08-18T12:00:00.000Z',
      randomSeed:0x5a17c0de,
      locale:BASELINE_LOCALE,
      dailyBrief:false
    },
    browser:{name:'chromium',version:'151.0.7922.34',playwrightVersion:'1.62.1'},
    runner:{platform:'linux',arch:'x64',release:'6.11.0'},
    surfaces:[...SURFACES],
    viewports:VIEWPORTS.map(viewport=>({
      id:viewport.id,
      width:viewport.width,
      height:viewport.height,
      isMobile:viewport.inputMode==='touch',
      hasTouch:viewport.inputMode==='touch'
    })),
    files
  };
}

test('visual baseline matrix is exactly eleven surfaces by four fixed viewports',()=>{
  const paths=expectedRelativePngPaths();
  assert.equal(SURFACES.length,11);
  assert.equal(VIEWPORTS.length,4);
  assert.equal(EXPECTED_PNG_COUNT,44);
  assert.equal(paths.length,44);
  assert.equal(new Set(paths).size,44);
  for(const file of paths)assert.match(file,/^[a-z0-9-]+\/(?:390x844|768x1024|1366x900|1920x1080)\/uk\.png$/);
});

test('ordinary browser QA and deterministic visual QA have disjoint discovery',()=>{
  assert.match(defaultPlaywrightConfig,/testIgnore:\s*['"]visual-baseline\.spec\.mjs['"]/);
  assert.match(visualPlaywrightConfig,/testMatch:\s*['"]visual-baseline\.spec\.mjs['"]/);
  assert.match(defaultPlaywrightConfig,/trace:\s*secureProbe \? 'off' : 'retain-on-failure'/);
  assert.match(visualPlaywrightConfig,/trace:\s*'off'/);
  const ordinary=discoverPlaywright('playwright.config.mjs');
  const visual=discoverPlaywright('playwright.visual.config.mjs');
  assert.ok(ordinary.length>0);
  assert.ok(ordinary.every(file=>file!=='visual-baseline.spec.mjs'));
  assert.equal(visual.length,4);
  assert.ok(visual.every(file=>file==='visual-baseline.spec.mjs'));
});

test('touch visual contexts retain explicit Chromium emulation and native input evidence',async()=>{
  const page={id:'visual-page'};
  const calls=[];
  let detachCount=0;
  const context={
    async newCDPSession(observedPage){
      assert.equal(observedPage,page);
      return {
        async send(method,params){calls.push({method,params});},
        async detach(){detachCount+=1;}
      };
    }
  };

  const session=await enforceVisualTouchEmulation(context,page,{hasTouch:true});
  assert.deepEqual(calls,[{
    method:'Emulation.setTouchEmulationEnabled',
    params:{enabled:true,maxTouchPoints:VISUAL_TOUCH_POINTS}
  }]);
  assert.equal(VISUAL_TOUCH_POINTS,1);
  assert.equal(detachCount,0);
  await session.detach();
  assert.equal(detachCount,1);

  const desktopSession=await enforceVisualTouchEmulation(context,page,{hasTouch:false});
  assert.equal(desktopSession,null);
  assert.equal(calls.length,1);
  assert.equal(detachCount,1);

  let failedDetachCount=0;
  const failingContext={
    async newCDPSession(){
      return {
        async send(){throw new Error('touch emulation failed');},
        async detach(){failedDetachCount+=1;}
      };
    }
  };
  await assert.rejects(
    enforceVisualTouchEmulation(failingContext,page,{hasTouch:true}),
    /touch emulation failed/
  );
  assert.equal(failedDetachCount,1);

  const evaluations=[];
  const touchPage={
    touchscreen:{async tap(x,y){assert.deepEqual([x,y],[12,12]);}},
    async evaluate(){
      evaluations.push(evaluations.length);
      if(evaluations.length===2)return {pointerType:'touch',touchStart:true};
    }
  };
  await verifyVisualTouchInput(touchPage,{hasTouch:true});
  assert.equal(evaluations.length,3);
  await verifyVisualTouchInput(null,{hasTouch:false});
});

test('visual fixture seed is deterministic and directly login-capable',()=>{
  const first=createVisualFixtureData();
  const second=createVisualFixtureData();
  assert.deepEqual(first,second);
  assert.equal(first.users.length,1);
  assert.equal(first.users[0].id,FIXED_VISUAL_ACCOUNT.id);
  assert.equal(first.users[0].displayName,FIXED_VISUAL_ACCOUNT.displayName);
  assert.equal(verifyPassword(FIXED_VISUAL_ACCOUNT.password,first.users[0].passwordHash),true);
  assert.deepEqual(first.sessions,[]);
  assert.equal(first.dailyBriefPrefs[0].enabled,false);
  assert.equal(first.wallets[0].balance,10000);
});

test('repository baseline state cannot silently masquerade as a complete candidate',t=>{
  if(repositoryState.status===NOT_CAPTURED_STATUS){
    assert.equal(repositoryState.pngCount,0);
    assert.equal(repositoryState.manifestPresent,false);
    assert.equal(repositoryState.missing.length,44);
    assert.equal(repositoryState.finalCompleteness,false);
    t.diagnostic('NOT_CAPTURED: the candidate completeness gate remains closed until a green runner promotes all 44 PNGs and manifest.json.');
    return;
  }
  assert.notEqual(repositoryState.status,INCOMPLETE_STATUS,`partial baseline is forbidden: ${JSON.stringify(repositoryState)}`);
  assert.equal(repositoryState.status,READY_FOR_VALIDATION_STATUS);
});

test('final candidate completeness validates every promoted PNG and digest',{
  skip:repositoryState.status===NOT_CAPTURED_STATUS?'NOT_CAPTURED is an explicit pre-gate, not a final completeness pass':false
},async()=>{
  const manifest=await validateCandidateManifest({candidateDir:DEFAULT_CANDIDATE_DIR});
  assert.equal(manifest.status,CANDIDATE_STATUS);
  assert.equal(manifest.fileCount,44);
  assert.equal(manifest.captures.length,44);
});

test('file-set and runner-metadata contracts fail closed',()=>{
  const expected=expectedRelativePngPaths();
  assert.throws(()=>assertExactCandidateFileSet([]),/missing=\[/);
  assert.throws(()=>assertExactCandidateFileSet([...expected,'unexpected.txt']),/extra=\[unexpected\.txt\]/);
  assert.throws(()=>assertExactCandidateFileSet([...expected,'manifest.json','manifest.json'],{requireManifest:true}),/duplicates=\[manifest\.json\]/);
  assert.doesNotThrow(()=>assertExactCandidateFileSet([...expected,'manifest.json'],{requireManifest:true}));
  assert.doesNotThrow(()=>assertExactCaptureSourceFileSet([...expected,'metadata.json','capture-metadata.json']));
  assert.throws(()=>assertExactCaptureSourceFileSet([...expected,'metadata.json','capture-metadata.json','verified-run.json']),/extra=\[verified-run\.json\]/);
  assert.throws(()=>validateCaptureMetadata({}),/metadata fields mismatch/);
  assert.throws(()=>validateCaptureMetadata({...metadataFixture(),font:{ready:false,computedFamily:'Inter'}}),/font\.ready must be true/);
  assert.throws(()=>validateCaptureMetadata({...metadataFixture(),renderedFromCommit:'b'.repeat(40)}),/sourceRun\.headSha must equal/);
  assert.throws(()=>validateCaptureMetadata(pendingMetadataFixture()),/sourceRun\.conclusion must be success/);
  const raw=rawCaptureFixture();
  assert.doesNotThrow(()=>validateRawCaptureMetadata(raw,{expectedCommit:raw.renderedFromCommit,expectedRunMode:'capture'}));
  assert.throws(()=>validateRawCaptureMetadata({...raw,schemaVersion:1}),/schemaVersion must be 2/);
  assert.doesNotThrow(()=>validatePendingCaptureMetadata(pendingMetadataFixture(),{expectedCommit:raw.renderedFromCommit}));
  assert.doesNotThrow(()=>validatePendingCaptureSource(raw,pendingMetadataFixture(),{expectedCommit:raw.renderedFromCommit}));
  assert.throws(()=>validateRawCaptureMetadata({...raw,files:[...raw.files.slice(0,-1),raw.files[0]]}),/files\[43\]\.file must be/);
  assert.throws(()=>validatePendingCaptureSource({...raw,browser:{...raw.browser,version:'different'}},pendingMetadataFixture()),/browser does not match/);
  const pointerDrift={
    ...raw,
    files:raw.files.map((record,index)=>index===0?{
      ...record,
      runtime:{...record.runtime,primaryPointer:'fine'}
    }:record)
  };
  assert.throws(()=>validateRawCaptureMetadata(pointerDrift),/pointer contract drifted/);
  const hoverDrift={
    ...raw,
    files:raw.files.map((record,index)=>index===0?{
      ...record,
      runtime:{...record.runtime,primaryHover:'hover'}
    }:record)
  };
  assert.throws(()=>validateRawCaptureMetadata(hoverDrift),/pointer contract drifted/);
});

test('pending runner provenance finalizes only from the exact successful terminal run',async()=>{
  const pending=pendingMetadataFixture();
  const verified=verifiedRunFixture(pending);
  assert.throws(()=>finalizeCaptureMetadata(pending,{...verified,conclusion:'failure'}),/conclusion must be success/);
  assert.throws(()=>finalizeCaptureMetadata(pending,{...verified,id:verified.id+1}),/id does not match/);
  assert.throws(()=>finalizeCaptureMetadata(pending,{...verified,attempt:verified.attempt+1}),/attempt does not match/);
  assert.throws(()=>finalizeCaptureMetadata(pending,{...verified,headSha:'b'.repeat(40)}),/headSha does not match/);
  const finalized=finalizeCaptureMetadata(pending,verified,{expectedCommit:pending.renderedFromCommit});
  assert.equal(finalized.sourceRun.conclusion,'success');
  assert.equal(finalized.sourceRun.id,pending.sourceRun.id);
  assert.equal(finalized.renderedFromCommit,pending.renderedFromCommit);

  const root=await mkdtemp(path.join(os.tmpdir(),'sylora-visual-finalize-'));
  const output=path.join(root,'finalized.json');
  try{
    await writeJsonAtomicExclusive(output,finalized);
    assert.deepEqual(JSON.parse(await readFile(output,'utf8')),finalized);
    await assert.rejects(writeJsonAtomicExclusive(output,finalized),/refusing to overwrite/);
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});

test('manifest generator and validator round-trip exact bytes without inventing metadata',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'sylora-visual-contract-'));
  const pngByViewport=new Map(VIEWPORTS.map(viewport=>[viewport.id,validPng(viewport.width,viewport.height)]));
  const metadata=metadataFixture();
  try{
    for(const surface of SURFACES){
      for(const viewport of VIEWPORTS){
        const directory=path.join(root,surface,viewport.id);
        await mkdir(directory,{recursive:true});
        await writeFile(path.join(directory,`${BASELINE_LOCALE}.png`),pngByViewport.get(viewport.id));
      }
    }
    const generated=await generateCandidateManifest({candidateDir:root,metadata,expectedCommit:metadata.renderedFromCommit});
    assert.equal(generated.fileCount,44);
    assert.equal(generated.renderedFromCommit,metadata.renderedFromCommit);
    assert.equal(generated.sourceRun.id,metadata.sourceRun.id);
    assert.equal(generated.captures.length,44);
    for(const capture of generated.captures){
      assert.match(capture.image.sha256,/^[a-f0-9]{64}$/);
      const source=pngByViewport.get(capture.viewport.id);
      assert.equal(capture.image.sha256,createHash('sha256').update(source).digest('hex'));
    }
    const validated=await validateCandidateManifest({candidateDir:root,expectedCommit:metadata.renderedFromCommit});
    assert.deepEqual(validated,generated);
    await writeFile(path.join(root,'unexpected.txt'),'must fail closed');
    await assert.rejects(validateCandidateManifest({candidateDir:root}),/extra=\[unexpected\.txt\]/);
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});

test('verified raw capture promotes only the canonical 44 PNGs and refuses overwrite',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'sylora-visual-promotion-'));
  const source=path.join(root,'raw-capture');
  const candidate=path.join(root,'candidate');
  const pngByViewport=new Map(VIEWPORTS.map(viewport=>[viewport.id,validPng(viewport.width,viewport.height)]));
  const pending=pendingMetadataFixture();
  const raw=rawCaptureFixture(pending.renderedFromCommit,pngByViewport);
  const finalized=finalizeCaptureMetadata(pending,verifiedRunFixture(pending),{expectedCommit:pending.renderedFromCommit});
  try{
    for(const surface of SURFACES){
      for(const viewport of VIEWPORTS){
        const directory=path.join(source,surface,viewport.id);
        await mkdir(directory,{recursive:true});
        await writeFile(path.join(directory,`${BASELINE_LOCALE}.png`),pngByViewport.get(viewport.id));
      }
    }
    await writeFile(path.join(source,'metadata.json'),`${JSON.stringify(raw,null,2)}\n`);
    await writeFile(path.join(source,'capture-metadata.json'),`${JSON.stringify(pending,null,2)}\n`);

    await assert.rejects(promoteCandidateFromCapture({
      sourceDir:source,
      candidateDir:candidate,
      metadata:pending,
      expectedCommit:pending.renderedFromCommit
    }),/sourceRun\.conclusion must be success/);

    await writeFile(path.join(source,'unexpected.txt'),'must fail closed');
    await assert.rejects(promoteCandidateFromCapture({
      sourceDir:source,
      candidateDir:candidate,
      metadata:finalized,
      expectedCommit:pending.renderedFromCommit
    }),/extra=\[unexpected\.txt\]/);
    await unlink(path.join(source,'unexpected.txt'));

    const promoted=await promoteCandidateFromCapture({
      sourceDir:source,
      candidateDir:candidate,
      metadata:finalized,
      expectedCommit:pending.renderedFromCommit
    });
    assert.equal(promoted.fileCount,EXPECTED_PNG_COUNT);
    assert.equal(promoted.sourceRun.conclusion,'success');
    const status=await inspectCandidateDirectory(candidate);
    assert.equal(status.status,READY_FOR_VALIDATION_STATUS);
    assert.equal(status.pngCount,EXPECTED_PNG_COUNT);
    assert.equal(status.extra.length,0);
    await assert.rejects(readFile(path.join(candidate,'metadata.json')),error=>error?.code==='ENOENT');
    await assert.rejects(readFile(path.join(candidate,'capture-metadata.json')),error=>error?.code==='ENOENT');
    await assert.rejects(promoteCandidateFromCapture({
      sourceDir:source,
      candidateDir:candidate,
      metadata:finalized,
      expectedCommit:pending.renderedFromCommit
    }),/refusing to overwrite existing candidate directory/);
  }finally{
    await rm(root,{recursive:true,force:true});
  }
});
