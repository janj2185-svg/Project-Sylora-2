import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,mkdtemp,readFile,rm,unlink,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
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
  verifyVisualTouchInput,
  waitForStableVisualState,
  waitForVisualQuiescence
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
  const initScripts=[];
  const createdContext={async addInitScript(callback,arg){initScripts.push({callback,arg});}};
  const contextBrowser={
    async newContext(options){contextOptions.push(options);return createdContext;}
  };
  const mobileViewport={id:'390x844',width:390,height:844,isMobile:true,hasTouch:true};
  assert.equal(await createVisualContext(contextBrowser,mobileViewport,'http://127.0.0.1:4173'),createdContext);
  assert.equal(contextOptions.length,1);
  assert.equal(contextOptions[0].isMobile,true);
  assert.equal(contextOptions[0].hasTouch,false);
  assert.equal(initScripts.length,1);
  assert.equal(initScripts[0].arg.captureStyleId,'sylora-visual-capture-style');
  assert.equal(
    initScripts[0].arg.captureStyleText,
    '@layer syloraVisualCapture{*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}input,textarea,[contenteditable]{caret-color:transparent!important}}'
  );
  assert.match(initScripts[0].callback.toString(),/if \(!installCaptureStyle\(\)\)/);
  assert.match(initScripts[0].callback.toString(),/new MutationObserver/);
  assert.match(initScripts[0].callback.toString(),/DOMContentLoaded/);
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
  const captureStyleIndex=navigationSource.indexOf('await assertPersistentVisualCaptureStyle(page)');
  const preOpenAssetsIndex=navigationSource.indexOf('await waitForStableVisualAssets(page)');
  const preOpenQuiescenceIndex=navigationSource.indexOf('await waitForVisualQuiescence(page)');
  const preOpenPaintIndex=navigationSource.indexOf("requireScreenshotBuffer(await page.screenshot(VISUAL_SCREENSHOT_OPTIONS), 'pre-open paint fence')");
  const surfaceOpenIndex=navigationSource.indexOf('await surface.open(page)');
  const surfaceReadyIndex=navigationSource.indexOf("await expect(page.locator(surface.ready)).toBeVisible()");
  const stableStateIndex=navigationSource.indexOf('await waitForStableVisualState(page, surface)');
  assert.notEqual(beforeIndex,-1);
  assert.notEqual(gotoIndex,-1);
  assert.notEqual(verifyIndex,-1);
  assert.notEqual(readinessIndex,-1);
  assert.ok(beforeIndex<gotoIndex);
  assert.ok(gotoIndex<verifyIndex);
  assert.ok(verifyIndex<readinessIndex);
  for(const index of [captureStyleIndex,preOpenAssetsIndex,preOpenQuiescenceIndex,preOpenPaintIndex,surfaceOpenIndex,surfaceReadyIndex,stableStateIndex])assert.notEqual(index,-1);
  assert.ok(readinessIndex<captureStyleIndex);
  assert.ok(captureStyleIndex<preOpenAssetsIndex);
  assert.ok(preOpenAssetsIndex<preOpenQuiescenceIndex);
  assert.ok(preOpenQuiescenceIndex<preOpenPaintIndex);
  assert.ok(preOpenPaintIndex<surfaceOpenIndex);
  assert.ok(surfaceOpenIndex<surfaceReadyIndex);
  assert.ok(surfaceReadyIndex<stableStateIndex);

  const stableStateSource=waitForStableVisualState.toString();
  const postOpenAssetsIndex=stableStateSource.indexOf('await waitForStableVisualAssets(page)');
  const postOpenQuiescenceIndex=stableStateSource.indexOf('await waitForVisualQuiescence(page)');
  for(const index of [postOpenAssetsIndex,postOpenQuiescenceIndex])assert.notEqual(index,-1);
  assert.ok(postOpenAssetsIndex<postOpenQuiescenceIndex);

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
  assert.match(
    visualBaselineSpec,
    /recordMismatch: evidence => writeStabilityMismatchEvidence\(\{ \.\.\.evidence, viewport, surface \}\)/
  );
  assert.match(visualBaselineSpec,/stability-mismatch[\s\S]*final-a\.png[\s\S]*final-b\.png[\s\S]*metadata\.json/);
  assert.doesNotMatch(visualBaselineSpec,/context\.tracing|trace-[^'"`]+\.zip/);
  assert.match(visualBaselineSpec,/status: complete \? 'CANDIDATE_RESTORED_BASELINE' : 'INCOMPLETE_VISUAL_CAPTURE'/);
  const stableCaptureSource=captureStableVisualScreenshot.toString();
  const stableStyleIndexes=[...stableCaptureSource.matchAll(/await assertPersistentVisualCaptureStyle\(page\)/g)]
    .map(match=>match.index);
  const cropProofIndex=stableCaptureSource.indexOf('rawScreenshotCropDigests');
  const hiddenFirstIndex=stableCaptureSource.indexOf("hidden-full-page-first");
  const hiddenSecondIndex=stableCaptureSource.indexOf("hidden-full-page-second");
  const warmupIndex=stableCaptureSource.indexOf("'full-page-post-restore-warmup'");
  const fullFirstIndex=stableCaptureSource.indexOf("'full-page-stability-first'");
  const fullSecondIndex=stableCaptureSource.indexOf("'full-page-stability-second'");
  const byteGateIndex=stableCaptureSource.indexOf('if (!finalFirst.equals(finalSecond))');
  assert.equal(stableStyleIndexes.length,2,'persistent capture style must be proven before and after exact A/B evidence');
  for(const index of [cropProofIndex,hiddenFirstIndex,hiddenSecondIndex,warmupIndex,fullFirstIndex,fullSecondIndex,byteGateIndex])assert.notEqual(index,-1);
  assert.ok(stableStyleIndexes[0]<hiddenFirstIndex);
  assert.ok(fullSecondIndex<stableStyleIndexes[1]&&stableStyleIndexes[1]<byteGateIndex);
  assert.ok(hiddenFirstIndex<hiddenSecondIndex&&hiddenSecondIndex<cropProofIndex&&cropProofIndex<warmupIndex);
  assert.ok(warmupIndex<fullFirstIndex&&fullFirstIndex<fullSecondIndex&&fullSecondIndex<byteGateIndex);
  const restorationIndexes=[...stableCaptureSource.matchAll(/await assertCanonicalTargetsRestored\(page, targets\)/g)].map(match=>match.index);
  assert.equal(restorationIndexes.length,2,'canonical restoration must be probed only before A and after B');
  assert.ok(restorationIndexes[0]<warmupIndex,'the restored-state probe must run before the discarded paint fence');
  assert.ok(restorationIndexes[1]>byteGateIndex);
  const warmupToFirstSource=stableCaptureSource.slice(warmupIndex,fullFirstIndex);
  assert.match(
    warmupToFirstSource,
    /^'full-page-post-restore-warmup',\s+assertClean\s+\);\s+await waitForCompositorFrames\(page\);\s+const finalFirst = await takeCheckedScreenshot\(\s+page,\s+\{ \.\.\.VISUAL_SCREENSHOT_OPTIONS, fullPage: true \},\s+$/
  );
  assert.doesNotMatch(warmupToFirstSource,/assertCanonicalTargetsRestored|assertVisualScrollOrigin|boundingBox|isVisible|getComputedStyle/);
  const interFrameSource=stableCaptureSource.slice(fullFirstIndex,fullSecondIndex);
  assert.match(
    interFrameSource,
    /^'full-page-stability-first',\s+assertClean\s+\);\s+await waitForCompositorFrames\(page\);\s+const finalSecond = await takeCheckedScreenshot\(\s+page,\s+\{ \.\.\.VISUAL_SCREENSHOT_OPTIONS, fullPage: true \},\s+$/
  );
  assert.doesNotMatch(interFrameSource,/assertCanonicalTargetsRestored|assertVisualScrollOrigin|boundingBox|isVisible|getComputedStyle/);
  assert.doesNotMatch(stableCaptureSource,/maxAttempts|while\s*\(/,'paint evidence must not retry until a preferred frame appears');
  assert.match(
    visualHelpersSource,
    /@layer syloraVisualCapture\{[\s\S]*\*,\*::before,\*::after\{animation:none!important;transition:none!important;scroll-behavior:auto!important\}/
  );
  assert.match(visualHelpersSource,/uncoveredAnimationStyleCount/);
  assert.match(visualHelpersSource,/uncoveredTransitionStyleCount/);
  assert.match(visualHelpersSource,/uncoveredScrollStyleCount/);
  assert.match(visualHelpersSource,/uncoveredMotionStyleCount/);
  assert.match(visualHelpersSource,/animations:\s*'allow'/);
  assert.doesNotMatch(visualHelpersSource,/animations:\s*'disabled'/);
  assert.match(visualHelpersSource,/caret:\s*'initial'/);
  assert.doesNotMatch(visualHelpersSource,/caret:\s*'hide'/);
  assert.match(visualBaselineSpec,/failureScreenshot[\s\S]*animations:\s*'allow'[\s\S]*caret:\s*'initial'/);
  assert.doesNotMatch(visualBaselineSpec,/caret:\s*'hide'/);
  assert.doesNotMatch(stableCaptureSource,/VISUAL_SCREENSHOT_OPTIONS,\s*clip/,'tight clips are not exact compositor oracles for full-page evidence');
  assert.doesNotMatch(stableCaptureSource,/hiddenFirst\.equals\(hiddenSecond\)/,'unrelated full-page pixels must not invalidate canonical crop evidence');
  assert.doesNotMatch(visualHelpersSource,/rawClipScreenshotEvidence/);
  assert.match(stableCaptureSource,/canonical-hidden-full-page-first/);
  assert.match(stableCaptureSource,/canonical-hidden-full-page-second/);
  assert.match(visualHelpersSource,/const binary = atob\(encodedPng\)/);
  assert.doesNotMatch(visualHelpersSource,/fetch\(`data:image\/png/,'PNG evidence decoding must not violate the application connect-src CSP');
});

test('visual screenshots prove canonical pixel contribution, exact restoration and fixed full-page stability',async()=>{
  function capturePage(frameNames,{
    rawDigests={},rawContrasts={},scrollPosition={x:0,y:0},targetRoles=['header'],initialStyles=[],targetBoxes=[],
    restoredTargetBoxes=[],restoreFailureIndexes=[],restoredInvisibleIndexes=[],restoredSourceDriftIndexes=[],
    restoredBackgroundDriftIndexes=[],captureStyleEvidence={
      count:1,textMatches:true,uncoveredCaretCount:0,
      uncoveredAnimationStyleCount:0,uncoveredTransitionStyleCount:0,
      uncoveredScrollStyleCount:0,uncoveredMotionStyleCount:0
    },postCaptureStyleEvidence=null
  }={}){
    const frames=[...frameNames];
    const inlineStyles=targetRoles.map((_,index)=>initialStyles[index]??null);
    const restoredFlags=targetRoles.map(()=>false);
    let screenshotCalls=0;
    const screenshotOptions=[];
    const screenshotStyleSnapshots=[];
    const cropLists=[];
    let captureStyleChecks=0;
    const boxCalls=targetRoles.map(()=>0);
    const targets=targetRoles.map((role,index)=>({
      async isVisible(){return !(restoredFlags[index]&&restoredInvisibleIndexes.includes(index))},
      async boundingBox(){
        const fallback=targetBoxes[index]??{x:10.4+index*150,y:8.2+index*90,width:119.2,height:70.1};
        const box=boxCalls[index]===0?fallback:(restoredTargetBoxes[index]??fallback);
        boxCalls[index]+=1;
        return box;
      },
      async getAttribute(name){
        if(name==='style')return inlineStyles[index];
        if(name==='src')return restoredFlags[index]&&restoredSourceDriftIndexes.includes(index)
          ?'/assets/brand/other.png'
          :'/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
        return null;
      },
      async evaluate(callback,arg){
        if(String(callback).includes('getComputedStyle')){
          return !(restoredFlags[index]&&restoredBackgroundDriftIndexes.includes(index));
        }
        const element={
          closest(selector){return selector==='.brand'&&role==='header'?{}:null},
          style:{setProperty(property,value){inlineStyles[index]=`${property}:${value}!important`}},
          removeAttribute(name){
            if(name!=='style')return;
            if(restoreFailureIndexes.includes(index))throw new Error(`restore target ${index} failed`);
            inlineStyles[index]=null;
            restoredFlags[index]=true;
          },
          setAttribute(name,value){
            if(name!=='style')return;
            if(restoreFailureIndexes.includes(index))throw new Error(`restore target ${index} failed`);
            inlineStyles[index]=value;
            restoredFlags[index]=true;
          }
        };
        return callback(element,arg);
      }
    }));
    const locatorFor=items=>({async count(){return items.length},nth(index){return items[index]}});
    const imageLocator=locatorFor(targets.filter((_target,index)=>targetRoles[index]!=='presence-background'));
    const backgroundLocator=locatorFor(targets.filter((_target,index)=>targetRoles[index]==='presence-background'));
    const page={
      locator(selector){return selector==='.sylora-presence-image'?backgroundLocator:imageLocator},
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
        if(arg?.styleId){
          captureStyleChecks+=1;
          return captureStyleChecks>1&&postCaptureStyleEvidence
            ?postCaptureStyleEvidence
            :captureStyleEvidence;
        }
        if(!arg?.encodedPng)return scrollPosition;
        cropLists.push(arg.cropList.map(clip=>({...clip})));
        const name=Buffer.from(arg.encodedPng,'base64').toString();
        return arg.cropList.map((_clip,index)=>({
          sha256:rawDigests[`${name}:${index}`]??rawDigests[name]??name,
          contrast:rawContrasts[`${name}:${index}`]??rawContrasts[name]??0.2
        }));
      }
    };
    return {
      page,
      getStyle:()=>inlineStyles[0],
      getStyles:()=>[...inlineStyles],
      getScreenshotCalls:()=>screenshotCalls,
      getScreenshotOptions:()=>screenshotOptions,
      getScreenshotStyleSnapshots:()=>screenshotStyleSnapshots,
      getCropLists:()=>cropLists,
      getCaptureStyleChecks:()=>captureStyleChecks
    };
  }

  const captureOptions=(assertClean=()=>{},recordMismatch=()=>{})=>({assertClean,recordMismatch});

  const cleanLabels=[];
  const stableMismatches=[];
  const stable=capturePage(
    ['hidden','hidden','warmup','final','final'],
    {rawDigests:{final:'visible'}}
  );
  const capture=await captureStableVisualScreenshot(stable.page,{
    assertClean:label=>cleanLabels.push(label),
    recordMismatch:evidence=>stableMismatches.push(evidence)
  });
  assert.equal(capture.png.toString(),'final');
  assert.deepEqual(capture.paintStability,{
    canonicalImagesChecked:1,
    canonicalBackgroundsChecked:0,
    canonicalPixelContribution:true,
    canonicalContentContrast:true,
    canonicalRestoreMatch:true,
    hiddenScreenshotsCompared:2,
    fullPageScreenshotsCompared:2
  });
  assert.equal(stable.getScreenshotCalls(),5);
  assert.equal(stable.getCaptureStyleChecks(),2);
  assert.equal(stableMismatches.length,0);
  assert.equal(cleanLabels.length,7);
  assert.ok(cleanLabels.includes('canonical-hidden-full-page-raster'));
  assert.ok(cleanLabels.includes('full-page-stability-second-raster'));
  assert.ok(stable.getScreenshotOptions().every(options=>options.fullPage===true));
  assert.ok(stable.getScreenshotOptions().every(options=>options.animations==='allow'));
  assert.ok(stable.getScreenshotOptions().every(options=>options.caret==='initial'));
  assert.deepEqual(stable.getCropLists()[0],[{x:10,y:8,width:120,height:71}]);
  assert.equal(stable.getStyle(),null);

  const batched=capturePage(
    ['hidden','hidden','warmup','final','final'],
    {rawDigests:{final:'visible'},targetRoles:['header','wallet']}
  );
  const batchedCapture=await captureStableVisualScreenshot(batched.page,captureOptions());
  assert.equal(batchedCapture.paintStability.canonicalImagesChecked,2);
  assert.equal(batched.getScreenshotCalls(),5,'multi-target proof must use a fixed five-frame sequence');
  assert.deepEqual(batched.getScreenshotStyleSnapshots(),[
    ['visibility:hidden!important','visibility:hidden!important'],
    ['visibility:hidden!important','visibility:hidden!important'],
    [null,null],
    [null,null],
    [null,null]
  ]);
  assert.deepEqual(batched.getStyles(),[null,null]);
  assert.ok(batched.getScreenshotOptions().every(options=>options.fullPage===true));
  assert.ok(batched.getScreenshotOptions().every(options=>options.animations==='allow'));
  assert.ok(batched.getScreenshotOptions().every(options=>options.caret==='initial'));

  const missingCaptureStyle=capturePage(
    [],
    {
      captureStyleEvidence:{
        count:0,textMatches:false,uncoveredCaretCount:1,
        uncoveredAnimationStyleCount:1,uncoveredTransitionStyleCount:1,
        uncoveredScrollStyleCount:1,uncoveredMotionStyleCount:3
      }
    }
  );
  await assert.rejects(
    captureStableVisualScreenshot(missingCaptureStyle.page,captureOptions()),
    /Persistent visual capture style drifted/
  );
  assert.equal(missingCaptureStyle.getScreenshotCalls(),0);

  for (const uncoveredField of [
    'uncoveredAnimationStyleCount',
    'uncoveredTransitionStyleCount',
    'uncoveredScrollStyleCount'
  ]) {
    const uncoveredMotionStyle=capturePage(
      [],
      {
        captureStyleEvidence:{
          count:1,textMatches:true,uncoveredCaretCount:0,
          uncoveredAnimationStyleCount:0,uncoveredTransitionStyleCount:0,
          uncoveredScrollStyleCount:0,uncoveredMotionStyleCount:1,
          [uncoveredField]:1
        }
      }
    );
    await assert.rejects(
      captureStableVisualScreenshot(uncoveredMotionStyle.page,captureOptions()),
      /Persistent visual capture style drifted/
    );
    assert.equal(uncoveredMotionStyle.getScreenshotCalls(),0);
  }

  const postCaptureStyleDrift=capturePage(
    ['hidden','hidden','warmup','final','final'],
    {
      rawDigests:{final:'visible'},
      postCaptureStyleEvidence:{
        count:1,textMatches:true,uncoveredCaretCount:0,
        uncoveredAnimationStyleCount:1,uncoveredTransitionStyleCount:0,
        uncoveredScrollStyleCount:0,uncoveredMotionStyleCount:1
      }
    }
  );
  await assert.rejects(
    captureStableVisualScreenshot(postCaptureStyleDrift.page,captureOptions()),
    /Persistent visual capture style drifted/
  );
  assert.equal(postCaptureStyleDrift.getScreenshotCalls(),5);
  assert.equal(postCaptureStyleDrift.getCaptureStyleChecks(),2);

  const overlapping=capturePage([],{
    targetRoles:['header','wallet'],
    targetBoxes:[
      {x:10,y:10,width:120,height:71},
      {x:20,y:20,width:56,height:34}
    ]
  });
  await assert.rejects(
    captureStableVisualScreenshot(overlapping.page,captureOptions()),
    /paint targets overlap: header and wallet/
  );
  assert.equal(overlapping.getScreenshotCalls(),0);

  const stableBlank=capturePage(
    ['hidden','hidden','warmup','final','final'],
    {rawDigests:{hidden:'same',final:'same'}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(stableBlank.page,captureOptions()),
    /paint sentinel saw no full-page pixel contribution/
  );

  const blankContent=capturePage(
    ['hidden','hidden','warmup','final','final'],
    {rawDigests:{hidden:'hidden',final:'visible'},rawContrasts:{final:0.001}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(blankContent.page,captureOptions()),
    /content contrast is below the locked paint threshold/
  );

  const unrelatedHiddenDifference=capturePage(
    ['hidden-frame-a','hidden-frame-b','warmup','final','final'],
    {rawDigests:{final:'visible','hidden-frame-a':'hidden','hidden-frame-b':'hidden'}}
  );
  const unrelatedHiddenCapture=await captureStableVisualScreenshot(unrelatedHiddenDifference.page,captureOptions());
  assert.equal(unrelatedHiddenCapture.png.toString(),'final');
  assert.equal(unrelatedHiddenDifference.getScreenshotCalls(),5);

  const unstableHiddenCrop=capturePage(
    ['hidden-a','hidden-b']
  );
  await assert.rejects(
    captureStableVisualScreenshot(unstableHiddenCrop.page,captureOptions()),
    /hidden crop is not deterministic/
  );

  const unstableSecondHiddenCrop=capturePage(
    ['hidden-a','hidden-b'],
    {
      targetRoles:['header','wallet'],
      rawDigests:{
        'hidden-a:0':'hidden-header','hidden-b:0':'hidden-header',
        'hidden-a:1':'hidden-wallet-a','hidden-b:1':'hidden-wallet-b'
      }
    }
  );
  await assert.rejects(
    captureStableVisualScreenshot(unstableSecondHiddenCrop.page,captureOptions()),
    /Canonical wallet hidden crop is not deterministic/
  );

  const unstableFullPage=capturePage(
    ['hidden','hidden','warmup','final-a','final-b'],
    {rawDigests:{'final-a':'visible','final-b':'visible'}}
  );
  const mismatchEvidence=[];
  await assert.rejects(
    captureStableVisualScreenshot(unstableFullPage.page,captureOptions(
      ()=>{},
      evidence=>mismatchEvidence.push(evidence)
    )),
    /Post-restore full-page paint is not byte-stable/
  );
  assert.equal(unstableFullPage.getScreenshotCalls(),5,'a final mismatch must fail without an extra capture or retry');
  assert.equal(unstableFullPage.getCaptureStyleChecks(),2);
  assert.equal(mismatchEvidence.length,1);
  assert.equal(mismatchEvidence[0].first.toString(),'final-a');
  assert.equal(mismatchEvidence[0].second.toString(),'final-b');
  assert.equal(mismatchEvidence[0].firstSha256,createHash('sha256').update('final-a').digest('hex'));
  assert.equal(mismatchEvidence[0].secondSha256,createHash('sha256').update('final-b').digest('hex'));

  const driftedUnstableFullPage=capturePage(
    ['hidden','hidden','warmup','final-a','final-b'],
    {
      rawDigests:{'final-a':'visible','final-b':'visible'},
      postCaptureStyleEvidence:{
        count:1,textMatches:true,uncoveredCaretCount:0,
        uncoveredAnimationStyleCount:0,uncoveredTransitionStyleCount:1,
        uncoveredScrollStyleCount:0,uncoveredMotionStyleCount:1
      }
    }
  );
  const driftedMismatchEvidence=[];
  await assert.rejects(
    captureStableVisualScreenshot(driftedUnstableFullPage.page,captureOptions(
      ()=>{},
      evidence=>driftedMismatchEvidence.push(evidence)
    )),
    error=>/Persistent visual capture style drifted/.test(error.message)&&
      /Post-restore full-page paint also mismatched/.test(error.message)&&
      error.cause?.message.includes('Persistent visual capture style drifted')
  );
  assert.equal(driftedUnstableFullPage.getScreenshotCalls(),5);
  assert.equal(driftedUnstableFullPage.getCaptureStyleChecks(),2);
  assert.equal(driftedMismatchEvidence.length,1,'style drift must not suppress raw A/B mismatch evidence');

  const evidenceWriteFailure=capturePage(
    ['hidden','hidden','warmup','final-a','final-b'],
    {rawDigests:{'final-a':'visible','final-b':'visible'}}
  );
  await assert.rejects(
    captureStableVisualScreenshot(evidenceWriteFailure.page,captureOptions(
      ()=>{},
      ()=>{throw new Error('evidence disk full')}
    )),
    error=>/Post-restore full-page paint is not byte-stable/.test(error.message)&&
      /Mismatch evidence failed: evidence disk full/.test(error.message)&&
      error.cause?.message==='evidence disk full'
  );
  assert.equal(evidenceWriteFailure.getScreenshotCalls(),5);

  const unstableRestoredGeometry=capturePage(
    ['hidden','hidden','warmup'],
    {restoredTargetBoxes:[{x:11.4,y:8.2,width:119.2,height:70.1}]}
  );
  await assert.rejects(
    captureStableVisualScreenshot(unstableRestoredGeometry.page,captureOptions()),
    /Canonical header geometry drifted across paint restoration/
  );

  const invisibleAfterRestore=capturePage(
    ['hidden','hidden','warmup'],
    {restoredInvisibleIndexes:[0]}
  );
  await assert.rejects(
    captureStableVisualScreenshot(invisibleAfterRestore.page,captureOptions()),
    /Canonical header is not visible after paint restoration/
  );

  const sourceDriftAfterRestore=capturePage(
    ['hidden','hidden','warmup'],
    {restoredSourceDriftIndexes:[0]}
  );
  await assert.rejects(
    captureStableVisualScreenshot(sourceDriftAfterRestore.page,captureOptions()),
    /Canonical header image source drifted across paint restoration/
  );

  const backgroundDriftAfterRestore=capturePage(
    ['hidden','hidden','warmup'],
    {targetRoles:['header','presence-background'],restoredBackgroundDriftIndexes:[1]}
  );
  await assert.rejects(
    captureStableVisualScreenshot(backgroundDriftAfterRestore.page,captureOptions()),
    /Canonical presence background was not restored/
  );

  const restorationFailure=capturePage(
    [new Error('hidden full-page screenshot failed')],
    {initialStyles:['opacity:.9']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(restorationFailure.page,captureOptions()),
    /hidden full-page screenshot failed/
  );
  assert.equal(restorationFailure.getStyle(),'opacity:.9','inline style must be restored even when the hidden capture throws');

  const secondHiddenFailure=capturePage(
    ['hidden',new Error('second hidden full-page screenshot failed')],
    {initialStyles:['opacity:.8']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(secondHiddenFailure.page,captureOptions()),
    /second hidden full-page screenshot failed/
  );
  assert.equal(secondHiddenFailure.getStyle(),'opacity:.8');

  const hiddenDiagnosticsFailure=capturePage(
    ['hidden','hidden'],
    {initialStyles:['opacity:.7']}
  );
  await assert.rejects(
    captureStableVisualScreenshot(hiddenDiagnosticsFailure.page,{
      assertClean:label=>{
        if(label==='canonical-hidden-full-page-second')throw new Error('second hidden diagnostics failed');
      },
      recordMismatch:()=>{}
    }),
    /second hidden diagnostics failed/
  );
  assert.equal(hiddenDiagnosticsFailure.getStyle(),'opacity:.7');

  const restoreAllTargets=capturePage(
    ['hidden','hidden'],
    {
      targetRoles:['header','wallet'],
      restoreFailureIndexes:[0]
    }
  );
  await assert.rejects(
    captureStableVisualScreenshot(restoreAllTargets.page,captureOptions()),
    /restore target 0 failed/
  );
  assert.deepEqual(
    restoreAllTargets.getStyles(),
    ['visibility:hidden!important',null],
    'a failed first restoration must not prevent later targets from restoring'
  );

  const scrolled=capturePage([],{scrollPosition:{x:0,y:4}});
  await assert.rejects(
    captureStableVisualScreenshot(scrolled.page,captureOptions()),
    /require scroll origin 0,0/
  );
  assert.equal(scrolled.getScreenshotCalls(),0);

  await assert.rejects(captureStableVisualScreenshot(stable.page),/requires a diagnostics assertion callback/);
  await assert.rejects(
    captureStableVisualScreenshot(stable.page,{assertClean:()=>{}}),
    /requires a mismatch evidence callback/
  );
});

test('visual quiescence requires zero transient ripples and an empty Web Animations graph',async()=>{
  const predicates=[];
  const evaluatePredicate=(predicate,{ripple=false,animations=[]}={})=>runInNewContext(
    `(${predicate.toString()})()`,
    {document:{querySelector:()=>ripple?{}:null,getAnimations:()=>animations}}
  );
  const settledPage={
    async waitForFunction(predicate,_argument,options){
      predicates.push(predicate);
      assert.deepEqual(options,{timeout:15_000});
      assert.equal(evaluatePredicate(predicate),true);
    },
    async evaluate(){return {pressRippleCount:0,webAnimationCount:0}}
  };
  await waitForVisualQuiescence(settledPage);
  assert.equal(predicates.length,1);
  const predicateSource=predicates[0].toString();
  assert.match(predicateSource,/sylora-press-ripple/);
  assert.match(predicateSource,/document\.getAnimations\(\)\.length === 0/);
  assert.equal(evaluatePredicate(predicates[0],{ripple:true}),false);
  assert.equal(evaluatePredicate(predicates[0],{animations:[{pending:true,playState:'idle'}]}),false);
  assert.equal(evaluatePredicate(predicates[0],{animations:[{pending:false,playState:'running'}]}),false);
  assert.equal(evaluatePredicate(predicates[0],{animations:[{pending:false,playState:'paused'}]}),false);

  const unsettledPage={
    async waitForFunction(){},
    async evaluate(){return {pressRippleCount:1,webAnimationCount:1}}
  };
  await assert.rejects(
    waitForVisualQuiescence(unsettledPage),
    /did not reach animation quiescence/
  );

  const timedOutPage={
    async waitForFunction(){throw new Error('Timeout 15000ms exceeded')},
    async evaluate(){return {pressRippleCount:1,webAnimationCount:2}}
  };
  await assert.rejects(
    waitForVisualQuiescence(timedOutPage),
    error=>/within 15000ms/.test(error.message)&&
      /"pressRippleCount":1/.test(error.message)&&
      /"webAnimationCount":2/.test(error.message)&&
      error.cause?.message==='Timeout 15000ms exceeded'
  );
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
