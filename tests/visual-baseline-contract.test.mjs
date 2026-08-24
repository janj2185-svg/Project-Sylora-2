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
import visualPlaywrightConfigObject from '../playwright.visual.config.mjs';
import {
  VISUAL_TOUCH_POINTS,
  applyVisualTouchEmulation,
  enforceVisualTouchEmulation,
  gotoVisualSurface,
  verifyVisualTouchInput
} from '../e2e/visual-helpers.mjs';
import {
  VISUAL_BROWSER_DISTRIBUTION,
  VISUAL_BROWSER_EXECUTABLE,
  VISUAL_BROWSER_REVISION,
  VISUAL_BROWSER_VERSION,
  VISUAL_PLAYWRIGHT_VERSION,
  assertNoVisualBrowserConnectionEnvironment,
  assertVisualProjectConfiguration,
  inspectVisualBrowserRuntime,
  normalizeVisualBrowserCommandLine
} from '../scripts/visual-browser-contract.mjs';
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
const visualBaselineSpec=await readFile(new URL('../e2e/visual-baseline.spec.mjs',import.meta.url),'utf8');
const runVisualQaScript=await readFile(new URL('../scripts/run-visual-qa.mjs',import.meta.url),'utf8');
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
    playwright:{version:VISUAL_PLAYWRIGHT_VERSION},
    browser:{
      name:'chromium',
      distribution:VISUAL_BROWSER_DISTRIBUTION,
      revision:VISUAL_BROWSER_REVISION,
      executable:VISUAL_BROWSER_EXECUTABLE,
      version:VISUAL_BROWSER_VERSION
    },
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
        primaryHover:touch?'none':'hover',
        playwrightTouchInput:touch?{touchStart:true,pointerType:'touch'}:null
      }
    };
  });
  return {
    schemaVersion:4,
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
    browser:{
      name:'chromium',
      distribution:VISUAL_BROWSER_DISTRIBUTION,
      revision:VISUAL_BROWSER_REVISION,
      executable:VISUAL_BROWSER_EXECUTABLE,
      version:VISUAL_BROWSER_VERSION,
      playwrightVersion:VISUAL_PLAYWRIGHT_VERSION
    },
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
  assert.doesNotMatch(visualPlaywrightConfig,/\bchannel\s*:/);
  assert.equal(visualPlaywrightConfigObject.use.browserName,'chromium');
  assert.equal(visualPlaywrightConfigObject.use.headless,true);
  assert.equal(Object.hasOwn(visualPlaywrightConfigObject.use,'channel'),false);
  assert.deepEqual(visualPlaywrightConfigObject.use.launchOptions,{args:['--enable-automation']});
  assert.equal(visualPlaywrightConfigObject.projects.length,1);
  assert.equal(visualPlaywrightConfigObject.projects[0].name,'visual-chromium-headless-shell');
  assert.equal(Object.hasOwn(visualPlaywrightConfigObject.projects[0].use,'channel'),false);
  const resolvedVisualUse={
    ...visualPlaywrightConfigObject.use,
    ...visualPlaywrightConfigObject.projects[0].use,
    launchOptions:{
      ...visualPlaywrightConfigObject.use.launchOptions,
      ...visualPlaywrightConfigObject.projects[0].use.launchOptions
    }
  };
  assert.doesNotThrow(()=>assertVisualProjectConfiguration(resolvedVisualUse));
  const ordinary=discoverPlaywright('playwright.config.mjs');
  const visual=discoverPlaywright('playwright.visual.config.mjs');
  assert.ok(ordinary.length>0);
  assert.ok(ordinary.every(file=>file!=='visual-baseline.spec.mjs'));
  assert.equal(visual.length,4);
  assert.ok(visual.every(file=>file==='visual-baseline.spec.mjs'));
});

test('pinned headless-shell selection is proven from sanitized runtime evidence',async()=>{
  assert.equal(VISUAL_BROWSER_DISTRIBUTION,'chromium-headless-shell');
  assert.equal(VISUAL_BROWSER_REVISION,'1234');
  assert.equal(VISUAL_BROWSER_EXECUTABLE,'chrome-headless-shell');
  assert.equal(VISUAL_BROWSER_VERSION,'151.0.7922.34');
  assert.equal(VISUAL_PLAYWRIGHT_VERSION,'1.62.1');
  assert.match(runVisualQaScript,/assertNoVisualBrowserConnectionEnvironment\(process\.env\)/);
  assert.match(visualBaselineSpec,/assertNoVisualBrowserConnectionEnvironment\(process\.env\)/);
  assert.match(visualBaselineSpec,/connectOptions !== undefined && connectOptions !== null/);

  assert.doesNotThrow(()=>assertNoVisualBrowserConnectionEnvironment({}));
  assert.doesNotThrow(()=>assertNoVisualBrowserConnectionEnvironment({PW_TEST_CONNECT_WS_ENDPOINT:''}));
  for(const name of ['PW_TEST_CONNECT_WS_ENDPOINT','PW_TEST_CONNECT_HEADERS','PW_TEST_CONNECT_EXPOSE_NETWORK']){
    assert.throws(()=>assertNoVisualBrowserConnectionEnvironment({[name]:'configured'}),new RegExp(name));
  }

  const requiredArguments=['--headless','--enable-automation','--remote-debugging-pipe'];
  const linuxCommandLine=[
    `/home/runner/.cache/ms-playwright/chromium_headless_shell-${VISUAL_BROWSER_REVISION}/chrome-headless-shell-linux64/chrome-headless-shell`,
    ...requiredArguments
  ];
  const fingerprint={
    distribution:VISUAL_BROWSER_DISTRIBUTION,
    revision:VISUAL_BROWSER_REVISION,
    executable:VISUAL_BROWSER_EXECUTABLE
  };
  assert.deepEqual(normalizeVisualBrowserCommandLine(linuxCommandLine,{platform:'linux',arch:'x64'}),fingerprint);
  assert.deepEqual(normalizeVisualBrowserCommandLine([
    `C:\\pw\\chromium_headless_shell-${VISUAL_BROWSER_REVISION}\\chrome-headless-shell-win64\\chrome-headless-shell.exe`,
    ...requiredArguments
  ],{platform:'win32',arch:'x64'}),fingerprint);

  assert.throws(()=>normalizeVisualBrowserCommandLine([]),/non-empty string array/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([42]),/non-empty string array/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    `/cache/chromium-${VISUAL_BROWSER_REVISION}/chrome-linux64/chrome`,...requiredArguments
  ],{platform:'linux',arch:'x64'}),/not the pinned Playwright Chromium headless shell/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    `/cache/chromium_tip_of_tree_headless_shell-${VISUAL_BROWSER_REVISION}/chrome-headless-shell-linux64/chrome-headless-shell`,...requiredArguments
  ],{platform:'linux',arch:'x64'}),/not the pinned Playwright Chromium headless shell/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    `/cache/chromium_headless_shell-${Number(VISUAL_BROWSER_REVISION)+1}/chrome-headless-shell-linux64/chrome-headless-shell`,...requiredArguments
  ],{platform:'linux',arch:'x64'}),/not the pinned Playwright Chromium headless shell/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    `/cache/chromium_headless_shell-${VISUAL_BROWSER_REVISION}/chrome-linux/headless_shell`,...requiredArguments
  ],{platform:'linux',arch:'x64'}),/not the pinned Playwright Chromium headless shell/);
  for(const required of requiredArguments){
    assert.throws(
      ()=>normalizeVisualBrowserCommandLine(linuxCommandLine.filter(argument=>argument!==required),{platform:'linux',arch:'x64'}),
      new RegExp(required.replaceAll('-','\\-'))
    );
  }
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    linuxCommandLine[0],'--headless=new','--enable-automation','--remote-debugging-pipe'
  ],{platform:'linux',arch:'x64'}),/--headless/);
  assert.throws(()=>normalizeVisualBrowserCommandLine([
    ...linuxCommandLine,'--headless=new'
  ],{platform:'linux',arch:'x64'}),/alternate --headless modes are forbidden/);
  assert.throws(()=>normalizeVisualBrowserCommandLine(linuxCommandLine,{platform:'freebsd',arch:'x64'}),/unsupported runtime platform/);

  const calls=[];
  let detachCount=0;
  const browser={
    browserType(){return {name:()=> 'chromium'};},
    version(){return VISUAL_BROWSER_VERSION;},
    async newBrowserCDPSession(){
      return {
        async send(method){calls.push(method);return {arguments:linuxCommandLine};},
        async detach(){detachCount+=1;}
      };
    }
  };
  assert.deepEqual(await inspectVisualBrowserRuntime(browser),{name:'chromium',...fingerprint,version:VISUAL_BROWSER_VERSION});
  assert.deepEqual(calls,['Browser.getBrowserCommandLine']);
  assert.equal(detachCount,1);

  let failedDetachCount=0;
  const failingBrowser={
    ...browser,
    async newBrowserCDPSession(){
      return {
        async send(){throw new Error('cdp failed');},
        async detach(){failedDetachCount+=1;}
      };
    }
  };
  await assert.rejects(inspectVisualBrowserRuntime(failingBrowser),/cdp failed/);
  assert.equal(failedDetachCount,1);
  await assert.rejects(inspectVisualBrowserRuntime({...browser,version:()=> 'different'}),/browser version must be/);
  await assert.rejects(inspectVisualBrowserRuntime({...browser,browserType:()=>({name:()=> 'firefox'})}),/runtime browser type must be chromium/);

  const validUse={browserName:'chromium',headless:true,launchOptions:{args:['--enable-automation']}};
  assert.doesNotThrow(()=>assertVisualProjectConfiguration(validUse));
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,channel:'chromium'}),/channel must be omitted/);
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,connectOptions:{wsEndpoint:'ws:\/\/example'}}),/connectOptions must be omitted/);
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,headless:false}),/headless must be true/);
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,launchOptions:{args:['--enable-automation'],executablePath:'/tmp/chrome'}}),/may contain only args/);
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,launchOptions:{args:['--enable-automation'],ignoreDefaultArgs:[]}}),/may contain only args/);
  assert.throws(()=>assertVisualProjectConfiguration({...validUse,launchOptions:{args:['--enable-automation','--headless=new']}}),/must be exactly/);
});

test('touch visual contexts reapply explicit Chromium emulation and retain post-navigation Playwright input evidence',async()=>{
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
  await applyVisualTouchEmulation(session,{hasTouch:true});
  assert.deepEqual(calls[1],{
    method:'Emulation.setTouchEmulationEnabled',
    params:{enabled:true,maxTouchPoints:VISUAL_TOUCH_POINTS}
  });
  await applyVisualTouchEmulation(null,{hasTouch:false});
  await assert.rejects(applyVisualTouchEmulation(null,{hasTouch:true}),/active CDP session/);
  await session.detach();
  assert.equal(detachCount,1);

  const desktopSession=await enforceVisualTouchEmulation(context,page,{hasTouch:false});
  assert.equal(desktopSession,null);
  assert.equal(calls.length,2);
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
  const evidence=await verifyVisualTouchInput(touchPage,{hasTouch:true});
  assert.deepEqual(evidence,{pointerType:'touch',touchStart:true});
  assert.equal(evaluations.length,3);
  assert.equal(await verifyVisualTouchInput(null,{hasTouch:false}),null);
  let failingEvaluations=0;
  const failingTouchPage={
    touchscreen:{async tap(){}},
    async evaluate(){
      failingEvaluations+=1;
      if(failingEvaluations===2)return {pointerType:'mouse',touchStart:false};
    }
  };
  await assert.rejects(verifyVisualTouchInput(failingTouchPage,{hasTouch:true}),/Playwright touch probe failed/);
  assert.equal(failingEvaluations,3);

  const navigationSource=gotoVisualSurface.toString();
  const gotoIndex=navigationSource.indexOf("await page.goto(surface.path, { waitUntil: 'load' })");
  const reapplyIndex=navigationSource.indexOf('await afterNavigation()');
  const readinessIndex=navigationSource.indexOf('await waitForCapabilitiesState');
  assert.notEqual(gotoIndex,-1);
  assert.notEqual(reapplyIndex,-1);
  assert.notEqual(readinessIndex,-1);
  assert.ok(gotoIndex<reapplyIndex);
  assert.ok(reapplyIndex<readinessIndex);
  assert.match(visualBaselineSpec,/await ensureFixedVisualAccount\(page\);\s+touchEmulationSession = await enforceVisualTouchEmulation/);
  assert.match(visualBaselineSpec,/afterNavigation: async \(\) => \{\s+await applyVisualTouchEmulation\(touchEmulationSession, viewport\);\s+playwrightTouchInput = await verifyVisualTouchInput/);
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
  for(const url of [
    'https://token@github.com/example/sylora/actions/runs/123456789',
    'https://github.com:443/example/sylora/actions/runs/123456789',
    'https://github.com/example/sylora/actions/runs/123456789?token=secret',
    'https://github.com/example/sylora/actions/runs/123456789#fragment',
    'https://github.com/example/sylora/extra/actions/runs/123456789'
  ]){
    assert.throws(()=>validateCaptureMetadata({
      ...metadataFixture(),sourceRun:{...metadataFixture().sourceRun,url}
    }),/exact recorded GitHub Actions run/);
  }
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),fixture:{...metadataFixture().fixture,id:'other-fixture'}
  }),/fixture\.id must be/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),fixture:{...metadataFixture().fixture,fixedTime:'2026-08-18T12:00:01.000Z'}
  }),/fixture\.fixedTime must be/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),browser:{...metadataFixture().browser,distribution:'chromium'}
  }),/browser\.distribution must be chromium-headless-shell/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),browser:{...metadataFixture().browser,revision:'9999'}
  }),/browser\.revision must be/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),browser:{...metadataFixture().browser,executable:'chrome'}
  }),/browser\.executable must be/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),browser:{...metadataFixture().browser,version:'different'}
  }),/browser\.version must be/);
  assert.throws(()=>validateCaptureMetadata({
    ...metadataFixture(),playwright:{version:'999.0.0'}
  }),/playwright\.version must be/);
  const raw=rawCaptureFixture();
  assert.doesNotThrow(()=>validateRawCaptureMetadata(raw,{expectedCommit:raw.renderedFromCommit,expectedRunMode:'capture'}));
  assert.throws(()=>validateRawCaptureMetadata({...raw,schemaVersion:3}),/schemaVersion must be 4/);
  assert.doesNotThrow(()=>validatePendingCaptureMetadata(pendingMetadataFixture(),{expectedCommit:raw.renderedFromCommit}));
  assert.doesNotThrow(()=>validatePendingCaptureSource(raw,pendingMetadataFixture(),{expectedCommit:raw.renderedFromCommit}));
  assert.throws(()=>validateRawCaptureMetadata({...raw,files:[...raw.files.slice(0,-1),raw.files[0]]}),/files\[43\]\.file must be/);
  assert.throws(()=>validateRawCaptureMetadata({
    ...raw,browser:{...raw.browser,distribution:'chromium'}
  }),/browser\.distribution must be chromium-headless-shell/);
  assert.throws(()=>validateRawCaptureMetadata({
    ...raw,browser:{...raw.browser,revision:'9999'}
  }),/browser\.revision must be/);
  assert.throws(()=>validateRawCaptureMetadata({
    ...raw,browser:{...raw.browser,executable:'chrome'}
  }),/browser\.executable must be/);
  assert.throws(()=>validateRawCaptureMetadata({
    ...raw,browser:{...raw.browser,version:'different'}
  }),/browser\.version must be/);
  for(const [field,value] of [
    ['id','other-fixture'],
    ['username','other-user'],
    ['displayName','Other User'],
    ['fixedTime','2026-08-18T12:00:01.000Z'],
    ['randomSeed',1]
  ]){
    assert.throws(()=>validateRawCaptureMetadata({
      ...raw,fixture:{...raw.fixture,[field]:value}
    }),new RegExp(`fixture\\.${field} must be`));
  }
  assert.throws(()=>validatePendingCaptureSource({
    ...raw,browser:{...raw.browser,playwrightVersion:'999.0.0'}
  },{
    ...pendingMetadataFixture(),playwright:{version:'999.0.0'}
  }),/playwrightVersion must be/);
  for(const touchPoints of ['1',{},1.5]){
    assert.throws(()=>validateRawCaptureMetadata({
      ...raw,
      files:raw.files.map((record,index)=>index===0?{
        ...record,runtime:{...record.runtime,touchPoints}
      }:record)
    }),/touch contract drifted/);
  }
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
  const playwrightTouchDrift={
    ...raw,
    files:raw.files.map((record,index)=>index===0?{
      ...record,
      runtime:{...record.runtime,playwrightTouchInput:{touchStart:false,pointerType:'touch'}}
    }:record)
  };
  assert.throws(()=>validateRawCaptureMetadata(playwrightTouchDrift),/Playwright touch evidence drifted/);
  const desktopTouchClaim={
    ...raw,
    files:raw.files.map((record,index)=>index===2?{
      ...record,
      runtime:{...record.runtime,playwrightTouchInput:{touchStart:true,pointerType:'touch'}}
    }:record)
  };
  assert.throws(()=>validateRawCaptureMetadata(desktopTouchClaim),/desktop playwrightTouchInput must be null/);
  const legacyNativeClaim={
    ...raw,
    files:raw.files.map((record,index)=>{
      if(index!==0)return record;
      const {playwrightTouchInput,...runtime}=record.runtime;
      return {...record,runtime:{...runtime,nativeTouchInput:playwrightTouchInput}};
    })
  };
  assert.throws(()=>validateRawCaptureMetadata(legacyNativeClaim),/runtime fields mismatch/);
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
    assert.equal(generated.schemaVersion,2);
    assert.equal(generated.fileCount,44);
    assert.equal(generated.renderedFromCommit,metadata.renderedFromCommit);
    assert.equal(generated.sourceRun.id,metadata.sourceRun.id);
    assert.deepEqual(generated.browser,metadata.browser);
    assert.equal(generated.captures.length,44);
    for(const capture of generated.captures){
      assert.match(capture.image.sha256,/^[a-f0-9]{64}$/);
      const source=pngByViewport.get(capture.viewport.id);
      assert.equal(capture.image.sha256,createHash('sha256').update(source).digest('hex'));
    }
    const validated=await validateCandidateManifest({candidateDir:root,expectedCommit:metadata.renderedFromCommit});
    assert.deepEqual(validated,generated);
    await writeFile(path.join(root,'manifest.json'),`${JSON.stringify({...generated,schemaVersion:1},null,2)}\n`);
    await assert.rejects(validateCandidateManifest({candidateDir:root}),/manifest\.schemaVersion must be 2/);
    await writeFile(path.join(root,'manifest.json'),`${JSON.stringify(generated,null,2)}\n`);
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
