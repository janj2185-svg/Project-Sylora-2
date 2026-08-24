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
  captureStableVisualScreenshot,
  createVisualContext,
  enforceVisualTouchEmulation,
  ensureFixedVisualAccount,
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
  verifyRawCaptureBytes,
  writeJsonAtomicExclusive
} from '../scripts/build-visual-manifest.mjs';

const repositoryState=await inspectCandidateDirectory(DEFAULT_CANDIDATE_DIR);
const defaultPlaywrightConfig=await readFile(new URL('../playwright.config.mjs',import.meta.url),'utf8');
const visualPlaywrightConfig=await readFile(new URL('../playwright.visual.config.mjs',import.meta.url),'utf8');
const visualBaselineSpec=await readFile(new URL('../e2e/visual-baseline.spec.mjs',import.meta.url),'utf8');
const visualHelpersSource=await readFile(new URL('../e2e/visual-helpers.mjs',import.meta.url),'utf8');
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
      paintStability:{
        canonicalImagesChecked:touch?1:2,
        canonicalBackgroundsChecked:['home','create-hub-open'].includes(surface)?1:0,
        canonicalPixelContribution:true,
        canonicalContentContrast:true,
        canonicalRestoreMatch:true,
        hiddenScreenshotsCompared:2,
        fullPageScreenshotsCompared:2
      },
      runtime:{
        fontStatus:'loaded',
        bodyFontFamily:'Inter, sans-serif',
        imageCount:1,
        viewport:{width:viewport.width,height:viewport.height},
        devicePixelRatio:viewport.devicePixelRatio,
        locale:BASELINE_LOCALE,
        reducedMotion:true,
        navigatorMaxTouchPoints:touch?1:0,
        primaryPointer:touch?'coarse':'fine',
        primaryHover:touch?'none':'hover',
        cdpTouchInput:touch?{
          touchStart:true,
          touchTrusted:true,
          pointerType:'touch',
          pointerTrusted:true
        }:null
      }
    };
  });
  return {
    schemaVersion:6,
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
  assert.match(runVisualQaScript,/if \(mode === 'capture'\) \{[\s\S]*clean\(repeatDir\);/);
  assert.match(runVisualQaScript,/await verifyRawCaptureBytes\(outputDir, outputReport\)/);
  assert.match(runVisualQaScript,/await verifyRawCaptureBytes\(candidateDir, candidate\)/);
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

test('touch visual contexts use one pre-navigation CDP owner and trusted post-navigation input evidence',async()=>{
  const contextOptions=[];
  const createdContext={async addInitScript(){}};
  const contextBrowser={
    async newContext(options){contextOptions.push(options);return createdContext;}
  };
  const mobileViewport={id:'390x844',width:390,height:844,isMobile:true,hasTouch:true};
  assert.equal(await createVisualContext(contextBrowser,mobileViewport,'http://127.0.0.1:4173'),createdContext);
  assert.equal(contextOptions.length,1);
  assert.equal(contextOptions[0].isMobile,true);
  assert.equal(contextOptions[0].hasTouch,false);
  assert.doesNotMatch(visualHelpersSource,/Object\.defineProperty\s*\(\s*(?:Navigator|navigator)/);
  assert.doesNotMatch(visualHelpersSource,/navigator\.maxTouchPoints\s*=/);
  assert.doesNotMatch(visualHelpersSource,/\bmatchMedia\s*=/);
  assert.doesNotMatch(visualHelpersSource,/page\.touchscreen|touchscreen\.tap/);

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
  const expectedReset=[
    {method:'Emulation.setEmitTouchEventsForMouse',params:{enabled:false}},
    {method:'Emulation.setTouchEmulationEnabled',params:{enabled:false}},
    {method:'Emulation.setTouchEmulationEnabled',params:{enabled:true,maxTouchPoints:VISUAL_TOUCH_POINTS}},
    {method:'Emulation.setEmitTouchEventsForMouse',params:{enabled:true,configuration:'mobile'}}
  ];
  assert.deepEqual(calls,expectedReset);
  assert.equal(VISUAL_TOUCH_POINTS,1);
  assert.equal(detachCount,0);
  await applyVisualTouchEmulation(session,{hasTouch:true});
  assert.deepEqual(calls,[...expectedReset,...expectedReset]);
  await applyVisualTouchEmulation(null,{hasTouch:false});
  await assert.rejects(applyVisualTouchEmulation(null,{hasTouch:true}),/active CDP session/);
  await session.detach();
  assert.equal(detachCount,1);

  const desktopSession=await enforceVisualTouchEmulation(context,page,{hasTouch:false});
  assert.equal(desktopSession,null);
  assert.equal(calls.length,8);
  assert.equal(detachCount,1);

  for(let failureAt=1;failureAt<=expectedReset.length;failureAt+=1){
    const failedCalls=[];
    let failedDetachCount=0;
    const failingContext={
      async newCDPSession(){
        return {
          async send(method,params){
            failedCalls.push({method,params});
            if(failedCalls.length===failureAt)throw new Error(`touch emulation failed at ${failureAt}`);
          },
          async detach(){failedDetachCount+=1;}
        };
      }
    };
    await assert.rejects(
      enforceVisualTouchEmulation(failingContext,page,{hasTouch:true}),
      new RegExp(`touch emulation failed at ${failureAt}`)
    );
    assert.deepEqual(failedCalls,expectedReset.slice(0,failureAt));
    assert.equal(failedDetachCount,1);
  }

  const evaluations=[];
  const inputCalls=[];
  const touchPage={
    async evaluate(){
      evaluations.push(evaluations.length);
      if(evaluations.length===2)return {
        pointerType:'touch',
        pointerTrusted:true,
        touchStart:true,
        touchTrusted:true
      };
    }
  };
  const inputSession={async send(method,params){inputCalls.push({method,params});}};
  const evidence=await verifyVisualTouchInput(touchPage,{hasTouch:true},inputSession);
  assert.deepEqual(evidence,{
    touchStart:true,
    touchTrusted:true,
    pointerType:'touch',
    pointerTrusted:true
  });
  assert.deepEqual(inputCalls,[
    {
      method:'Input.dispatchTouchEvent',
      params:{type:'touchStart',touchPoints:[{id:1,x:12,y:12,radiusX:1,radiusY:1,force:1}]}
    },
    {method:'Input.dispatchTouchEvent',params:{type:'touchEnd',touchPoints:[]}}
  ]);
  assert.equal(evaluations.length,3);
  assert.equal(await verifyVisualTouchInput(null,{hasTouch:false},null),null);
  await assert.rejects(verifyVisualTouchInput(touchPage,{hasTouch:true},null),/active CDP session/);

  let endFailureEvaluations=0;
  const endFailureCalls=[];
  const endFailurePage={async evaluate(){endFailureEvaluations+=1;}};
  const endFailureSession={
    async send(method,params){
      endFailureCalls.push({method,params});
      if(params.type==='touchEnd')throw new Error('touch end failed');
    }
  };
  await assert.rejects(
    verifyVisualTouchInput(endFailurePage,{hasTouch:true},endFailureSession),
    /touch end failed/
  );
  assert.deepEqual(endFailureCalls.map(call=>call.params.type),['touchStart','touchEnd','touchCancel']);
  assert.deepEqual(endFailureCalls.at(-1),{
    method:'Input.dispatchTouchEvent',
    params:{type:'touchCancel',touchPoints:[]}
  });
  assert.equal(endFailureEvaluations,2);

  let cleanupFailureEvaluations=0;
  const cleanupFailurePage={
    async evaluate(){
      cleanupFailureEvaluations+=1;
      if(cleanupFailureEvaluations===2)return {
        pointerType:'touch',pointerTrusted:true,touchStart:true,touchTrusted:true
      };
      if(cleanupFailureEvaluations===3)throw new Error('probe cleanup failed');
    }
  };
  await assert.rejects(
    verifyVisualTouchInput(cleanupFailurePage,{hasTouch:true},inputSession),
    /probe cleanup failed/
  );
  assert.equal(cleanupFailureEvaluations,3);

  let failingEvaluations=0;
  const failingTouchPage={
    async evaluate(){
      failingEvaluations+=1;
      if(failingEvaluations===2)return {
        pointerType:'mouse',
        pointerTrusted:false,
        touchStart:false,
        touchTrusted:false
      };
    }
  };
  await assert.rejects(
    verifyVisualTouchInput(failingTouchPage,{hasTouch:true},inputSession),
    /Chromium CDP touch probe failed/
  );
  assert.equal(failingEvaluations,3);

  const navigationSource=gotoVisualSurface.toString();
  const beforeIndex=navigationSource.indexOf('await beforeNavigation()');
  const gotoIndex=navigationSource.indexOf("await page.goto(surface.path, { waitUntil: 'load' })");
  const verifyIndex=navigationSource.indexOf('await afterNavigation()');
  const readinessIndex=navigationSource.indexOf('await waitForCapabilitiesState');
  const preOpenAssetsIndex=navigationSource.indexOf('await waitForStableVisualAssets(page)');
  const preOpenPaintIndex=navigationSource.indexOf("requireScreenshotBuffer(await page.screenshot(VISUAL_SCREENSHOT_OPTIONS), 'pre-open paint fence')");
  const surfaceOpenIndex=navigationSource.indexOf('await surface.open(page)');
  assert.notEqual(beforeIndex,-1);
  assert.notEqual(gotoIndex,-1);
  assert.notEqual(verifyIndex,-1);
  assert.notEqual(readinessIndex,-1);
  assert.ok(beforeIndex<gotoIndex);
  assert.ok(gotoIndex<verifyIndex);
  assert.ok(verifyIndex<readinessIndex);
  for(const index of [preOpenAssetsIndex,preOpenPaintIndex,surfaceOpenIndex])assert.notEqual(index,-1);
  assert.ok(readinessIndex<preOpenAssetsIndex);
  assert.ok(preOpenAssetsIndex<preOpenPaintIndex);
  assert.ok(preOpenPaintIndex<surfaceOpenIndex);

  const accountSource=ensureFixedVisualAccount.toString();
  const accountBeforeFirst=accountSource.indexOf('await beforeNavigation()');
  const accountGoto=accountSource.indexOf("await page.goto('/', { waitUntil: 'load' })");
  const accountBeforeReload=accountSource.indexOf('await beforeNavigation()',accountBeforeFirst+1);
  const accountReload=accountSource.indexOf("await page.reload({ waitUntil: 'load' })");
  for(const index of [accountBeforeFirst,accountGoto,accountBeforeReload,accountReload])assert.notEqual(index,-1);
  assert.ok(accountBeforeFirst<accountGoto);
  assert.ok(accountGoto<accountBeforeReload);
  assert.ok(accountBeforeReload<accountReload);

  const enforceIndex=visualBaselineSpec.indexOf('touchEmulationSession = await enforceVisualTouchEmulation');
  const accountIndex=visualBaselineSpec.indexOf('await ensureFixedVisualAccount');
  const runtimeIndex=visualBaselineSpec.indexOf('const runtime = await visualRuntimeMetadata');
  const screenshotIndex=visualBaselineSpec.indexOf('const { png, paintStability } = await captureStableVisualScreenshot');
  const durableWriteIndex=visualBaselineSpec.indexOf('fs.writeFileSync(absolutePath, png');
  const recordIndex=visualBaselineSpec.indexOf('records.push');
  const rawMetadataWriteIndex=visualBaselineSpec.indexOf("fs.writeFileSync(path.join(outputRoot, 'metadata.json')");
  const incompleteGateIndex=visualBaselineSpec.indexOf('if (!metadata.complete)');
  const captureSidecarIndex=visualBaselineSpec.indexOf("fs.writeFileSync(path.join(outputRoot, 'capture-metadata.json')");
  for(const index of [
    enforceIndex,accountIndex,runtimeIndex,screenshotIndex,durableWriteIndex,recordIndex,
    rawMetadataWriteIndex,incompleteGateIndex,captureSidecarIndex
  ])assert.notEqual(index,-1);
  assert.ok(enforceIndex<accountIndex);
  assert.match(visualBaselineSpec,/lastSurface = surface\.id;\s+lastSafeRuntime = null;/);
  assert.match(visualBaselineSpec,/ensureFixedVisualAccount\(page, \{\s+beforeNavigation: \(\) => applyVisualTouchEmulation/);
  assert.match(visualBaselineSpec,/beforeNavigation: \(\) => applyVisualTouchEmulation\(touchEmulationSession, viewport\),\s+afterNavigation: async \(\) => \{\s+cdpTouchInput = await verifyVisualTouchInput/);
  assert.ok(runtimeIndex<screenshotIndex&&screenshotIndex<durableWriteIndex&&durableWriteIndex<recordIndex);
  assert.ok(rawMetadataWriteIndex<incompleteGateIndex&&incompleteGateIndex<captureSidecarIndex);
  assert.match(visualBaselineSpec,/fs\.writeFileSync\(absolutePath, png, \{ flag: 'wx' \}\)/);
  assert.match(visualBaselineSpec,/paintStability,\s+runtime/);
  assert.doesNotMatch(visualBaselineSpec,/context\.tracing|trace-[^'"`]+\.zip/);
  assert.match(visualBaselineSpec,/status: complete \? 'CANDIDATE_RESTORED_BASELINE' : 'INCOMPLETE_VISUAL_CAPTURE'/);
  const stableCaptureSource=captureStableVisualScreenshot.toString();
  const fullFirstIndex=stableCaptureSource.indexOf("'full-page-stability-first'");
  const cropProofIndex=stableCaptureSource.indexOf('rawScreenshotCropDigests');
  const hiddenFirstIndex=stableCaptureSource.indexOf("hidden-full-page-first");
  const hiddenSecondIndex=stableCaptureSource.indexOf("hidden-full-page-second");
  const fullSecondIndex=stableCaptureSource.indexOf("'full-page-stability-second'");
  const byteGateIndex=stableCaptureSource.indexOf('if (!first.equals(second))');
  for(const index of [fullFirstIndex,cropProofIndex,hiddenFirstIndex,hiddenSecondIndex,fullSecondIndex,byteGateIndex])assert.notEqual(index,-1);
  assert.ok(fullFirstIndex<cropProofIndex&&cropProofIndex<hiddenFirstIndex&&hiddenFirstIndex<hiddenSecondIndex);
  assert.ok(hiddenSecondIndex<fullSecondIndex&&fullSecondIndex<byteGateIndex);
  assert.doesNotMatch(stableCaptureSource,/maxAttempts|while\s*\(/,'paint evidence must not retry until a preferred frame appears');
  assert.doesNotMatch(stableCaptureSource,/VISUAL_SCREENSHOT_OPTIONS,\s*clip/,'tight clips are not exact compositor oracles for full-page evidence');
  assert.doesNotMatch(visualHelpersSource,/rawClipScreenshotEvidence/);
  assert.match(stableCaptureSource,/canonical-hidden-full-page-first/);
  assert.match(stableCaptureSource,/canonical-hidden-full-page-second/);
  assert.match(visualHelpersSource,/const binary = atob\(encodedPng\)/);
  assert.doesNotMatch(visualHelpersSource,/fetch\(`data:image\/png/,'PNG evidence decoding must not violate the application connect-src CSP');
});

test('visual screenshots prove canonical pixel contribution, exact restoration and fixed full-page stability',async()=>{
  function capturePage(frameNames,{
    rawDigests={},rawContrasts={},scrollPosition={x:0,y:0},targetRoles=['header'],initialStyles=[],targetBoxes=[],restoreFailureIndexes=[]
  }={}){
    const frames=[...frameNames];
    const inlineStyles=targetRoles.map((_,index)=>initialStyles[index]??null);
    let screenshotCalls=0;
    const screenshotOptions=[];
    const screenshotStyleSnapshots=[];
    const cropLists=[];
    const targets=targetRoles.map((role,index)=>({
      async isVisible(){return true},
      async boundingBox(){
        return targetBoxes[index]??{x:10.4+index*150,y:8.2+index*90,width:119.2,height:70.1};
      },
      async getAttribute(name){return name==='style'?inlineStyles[index]:null},
      async evaluate(callback,arg){
        const element={
          closest(selector){return selector==='.brand'&&role==='header'?{}:null},
          style:{setProperty(property,value){inlineStyles[index]=`${property}:${value}!important`}},
          removeAttribute(name){
            if(name!=='style')return;
            if(restoreFailureIndexes.includes(index))throw new Error(`restore target ${index} failed`);
            inlineStyles[index]=null;
          },
          setAttribute(name,value){
            if(name!=='style')return;
            if(restoreFailureIndexes.includes(index))throw new Error(`restore target ${index} failed`);
            inlineStyles[index]=value;
          }
        };
        return callback(element,arg);
      }
    }));
    const imageLocator={async count(){return targets.length},nth(index){return targets[index]}};
    const emptyLocator={async count(){return 0},nth(){throw new Error('empty locator')}};
    const page={
      locator(selector){return selector==='.sylora-presence-image'?emptyLocator:imageLocator},
      viewportSize(){return {width:390,height:844}},
      async screenshot(options){
        screenshotCalls+=1;
        screenshotOptions.push(options);
        screenshotStyleSnapshots.push([...inlineStyles]);
        const next=frames.shift();
        if(next instanceof Error)throw next;
        return Buffer.from(next);
      },
      async evaluate(_callback,arg){
        if(!arg?.encodedPng)return scrollPosition;
        cropLists.push(arg.cropList.map(clip=>({...clip})));
        const name=Buffer.from(arg.encodedPng,'base64').toString();
        const digest=rawDigests[name]||name;
        const contrast=rawContrasts[name]??0.2;
        return arg.cropList.map(()=>({sha256:digest,contrast}));
      }
    };
    return {
      page,
      getStyle:()=>inlineStyles[0],
      getStyles:()=>[...inlineStyles],
      getScreenshotCalls:()=>screenshotCalls,
      getScreenshotOptions:()=>screenshotOptions,
      getScreenshotStyleSnapshots:()=>screenshotStyleSnapshots,
      getCropLists:()=>cropLists
    };
  }

  const cleanLabels=[];
  const stable=capturePage(
    ['full','hidden','hidden','full'],
    {rawDigests:{full:'visible'}}
  );
  const capture=await captureStableVisualScreenshot(stable.page,{
    assertClean:label=>cleanLabels.push(label)
  });
  assert.equal(capture.png.toString(),'full');
  assert.deepEqual(capture.paintStability,{
    canonicalImagesChecked:1,
    canonicalBackgroundsChecked:0,
    canonicalPixelContribution:true,
    canonicalContentContrast:true,
    canonicalRestoreMatch:true,
    hiddenScreenshotsCompared:2,
    fullPageScreenshotsCompared:2
  });
  assert.equal(stable.getScreenshotCalls(),4);
  assert.equal(cleanLabels.length,5);
  assert.ok(stable.getScreenshotOptions().every(options=>options.fullPage===true));
  assert.deepEqual(stable.getCropLists()[0],[{x:10,y:8,width:120,height:71}]);
  assert.equal(stable.getStyle(),null);

  const batched=capturePage(
    ['full','hidden','hidden','full'],
    {rawDigests:{full:'visible'},targetRoles:['header','wallet']}
  );
  const batchedCapture=await captureStableVisualScreenshot(batched.page,{assertClean:()=>{}});
  assert.equal(batchedCapture.paintStability.canonicalImagesChecked,2);
  assert.equal(batched.getScreenshotCalls(),4,'multi-target proof must batch both hidden frames');
  assert.deepEqual(batched.getScreenshotStyleSnapshots(),[
    [null,null],
    ['visibility:hidden!important','visibility:hidden!important'],
    ['visibility:hidden!important','visibility:hidden!important'],
    [null,null]
  ]);
  assert.deepEqual(batched.getStyles(),[null,null]);
  assert.ok(batched.getScreenshotOptions().every(options=>options.fullPage===true));

  const overlapping=capturePage([],{
    targetRoles:['header','wallet'],
    targetBoxes:[
      {x:10,y:10,width:120,height:71},
      {x:20,y:20,width:56,height:34}
    ]
  });
  await assert.rejects(
    captureStableVisualScreenshot(overlapping.page,{assertClean:()=>{}}),
    /paint targets overlap: header and wallet/
  );
  assert.equal(overlapping.getScreenshotCalls(),0);

  const stableBlank=capturePage(
    ['full','hidden','hidden'],
    {rawDigests:{full:'same',hidden:'same'}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(stableBlank.page,{assertClean:()=>{}}),
    /paint sentinel saw no full-page pixel contribution/
  );

  const blankContent=capturePage(
    ['full'],
    {rawContrasts:{full:0.001}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(blankContent.page,{assertClean:()=>{}}),
    /content contrast is below the locked paint threshold/
  );

  const unstableHidden=capturePage(
    ['full','hidden-a','hidden-b'],
    {rawDigests:{full:'visible'}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(unstableHidden.page,{assertClean:()=>{}}),
    /hidden full-page raster is not byte-stable/
  );

  const unstableFullPage=capturePage(
    ['full-a','hidden','hidden','full-b'],
    {rawDigests:{'full-a':'visible','full-b':'visible'}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(unstableFullPage.page,{assertClean:()=>{}}),
    /Full-page paint is not byte-stable/
  );

  const restorationFailure=capturePage(
    ['full',new Error('hidden full-page screenshot failed')],
    {rawDigests:{full:'visible'},initialStyles:['opacity:.9']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(restorationFailure.page,{assertClean:()=>{}}),
    /hidden full-page screenshot failed/
  );
  assert.equal(restorationFailure.getStyle(),'opacity:.9','inline style must be restored even when the hidden capture throws');

  const secondHiddenFailure=capturePage(
    ['full','hidden',new Error('second hidden full-page screenshot failed')],
    {rawDigests:{full:'visible'},initialStyles:['opacity:.8']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(secondHiddenFailure.page,{assertClean:()=>{}}),
    /second hidden full-page screenshot failed/
  );
  assert.equal(secondHiddenFailure.getStyle(),'opacity:.8');

  const hiddenDiagnosticsFailure=capturePage(
    ['full','hidden','hidden'],
    {rawDigests:{full:'visible'},initialStyles:['opacity:.7']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(hiddenDiagnosticsFailure.page,{
      assertClean:label=>{
        if(label==='canonical-hidden-full-page-second')throw new Error('second hidden diagnostics failed');
      }
    }),
    /second hidden diagnostics failed/
  );
  assert.equal(hiddenDiagnosticsFailure.getStyle(),'opacity:.7');

  const restoreAllTargets=capturePage(
    ['full','hidden','hidden'],
    {
      rawDigests:{full:'visible'},
      targetRoles:['header','wallet'],
      restoreFailureIndexes:[0]
    }
  );
  await assert.rejects(
    captureStableVisualScreenshot(restoreAllTargets.page,{assertClean:()=>{}}),
    /restore target 0 failed/
  );
  assert.deepEqual(
    restoreAllTargets.getStyles(),
    ['visibility:hidden!important',null],
    'a failed first restoration must not prevent later targets from restoring'
  );

  const scrolled=capturePage(['full'],{scrollPosition:{x:0,y:4}});
  await assert.rejects(
    captureStableVisualScreenshot(scrolled.page,{assertClean:()=>{}}),
    /require scroll origin 0,0/
  );
  assert.equal(scrolled.getScreenshotCalls(),0);

  await assert.rejects(captureStableVisualScreenshot(stable.page),/requires a diagnostics assertion callback/);
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
  assert.throws(()=>validateRawCaptureMetadata({...raw,schemaVersion:5}),/schemaVersion must be 6/);
  for(const [field,value,message] of [
    ['canonicalImagesChecked',0,/canonical image paint evidence drifted/],
    ['canonicalBackgroundsChecked',0,/canonical background paint evidence drifted/],
    ['canonicalPixelContribution',false,/compositor paint stability evidence drifted/],
    ['canonicalContentContrast',false,/compositor paint stability evidence drifted/],
    ['canonicalRestoreMatch',false,/compositor paint stability evidence drifted/],
    ['hiddenScreenshotsCompared',1,/compositor paint stability evidence drifted/],
    ['fullPageScreenshotsCompared',3,/compositor paint stability evidence drifted/]
  ]){
    assert.throws(()=>validateRawCaptureMetadata({
      ...raw,
      files:raw.files.map((record,index)=>index===0?{
        ...record,paintStability:{...record.paintStability,[field]:value}
      }:record)
    }),message);
  }
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
  for(const navigatorMaxTouchPoints of ['1',{},1.5,-1,2]){
    assert.throws(()=>validateRawCaptureMetadata({
      ...raw,
      files:raw.files.map((record,index)=>index===0?{
        ...record,runtime:{...record.runtime,navigatorMaxTouchPoints}
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
  for(const cdpTouchInput of [
    {touchStart:false,touchTrusted:true,pointerType:'touch',pointerTrusted:true},
    {touchStart:true,touchTrusted:false,pointerType:'touch',pointerTrusted:true},
    {touchStart:true,touchTrusted:true,pointerType:'mouse',pointerTrusted:true},
    {touchStart:true,touchTrusted:true,pointerType:'touch',pointerTrusted:false}
  ]){
    const cdpTouchDrift={
      ...raw,
      files:raw.files.map((record,index)=>index===0?{
        ...record,
        runtime:{...record.runtime,cdpTouchInput}
      }:record)
    };
    assert.throws(()=>validateRawCaptureMetadata(cdpTouchDrift),/Chromium CDP touch evidence drifted/);
  }
  for(const cdpTouchInput of [
    {touchStart:true,touchTrusted:true,pointerType:'touch'},
    {touchStart:true,touchTrusted:true,pointerType:'touch',pointerTrusted:true,synthetic:false}
  ]){
    const malformedCdpEvidence={
      ...raw,
      files:raw.files.map((record,index)=>index===0?{
        ...record,
        runtime:{...record.runtime,cdpTouchInput}
      }:record)
    };
    assert.throws(()=>validateRawCaptureMetadata(malformedCdpEvidence),/cdpTouchInput fields mismatch/);
  }
  const desktopTouchClaim={
    ...raw,
    files:raw.files.map((record,index)=>index===2?{
      ...record,
      runtime:{...record.runtime,cdpTouchInput:{
        touchStart:true,touchTrusted:true,pointerType:'touch',pointerTrusted:true
      }}
    }:record)
  };
  assert.throws(()=>validateRawCaptureMetadata(desktopTouchClaim),/desktop cdpTouchInput must be null/);
  const legacyPlaywrightClaim={
    ...raw,
    files:raw.files.map((record,index)=>{
      if(index!==0)return record;
      const {navigatorMaxTouchPoints,cdpTouchInput,...runtime}=record.runtime;
      return {...record,runtime:{...runtime,touchPoints:navigatorMaxTouchPoints,playwrightTouchInput:cdpTouchInput}};
    })
  };
  assert.throws(()=>validateRawCaptureMetadata(legacyPlaywrightClaim),/runtime fields mismatch/);
  const legacyNativeClaim={
    ...raw,
    files:raw.files.map((record,index)=>{
      if(index!==0)return record;
      const {cdpTouchInput,...runtime}=record.runtime;
      return {...record,runtime:{...runtime,nativeTouchInput:cdpTouchInput}};
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
    await assert.doesNotReject(verifyRawCaptureBytes(source,raw));
    const tamperPath=path.join(source,SURFACES[0],VIEWPORTS[0].id,`${BASELINE_LOCALE}.png`);
    const originalBytes=pngByViewport.get(VIEWPORTS[0].id);
    await writeFile(tamperPath,Buffer.from('tampered'));
    await assert.rejects(verifyRawCaptureBytes(source,raw),/invalid PNG signature/);
    await writeFile(tamperPath,originalBytes);

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
