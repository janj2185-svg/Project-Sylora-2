#!/usr/bin/env node

import {createHash,randomUUID} from 'node:crypto';
import {copyFile,link,lstat,mkdir,mkdtemp,readFile,readdir,rename,rm,unlink,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {
  VISUAL_BROWSER_DISTRIBUTION,
  VISUAL_BROWSER_EXECUTABLE,
  VISUAL_BROWSER_REVISION,
  VISUAL_BROWSER_VERSION,
  VISUAL_COMPOSITOR_SCHEDULING,
  VISUAL_PLAYWRIGHT_VERSION,
  VISUAL_SCREENSHOT_BACKEND
} from './visual-browser-contract.mjs';
import {
  FIXED_VISUAL_ACCOUNT,
  FIXED_VISUAL_TIME,
  VISUAL_FIXTURE_ID,
  VISUAL_LOCALE,
  VISUAL_RANDOM_SEED
} from './visual-fixture.mjs';
import {
  VISUAL_RASTER_MAX_CHANNEL_DELTA,
  VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_PIXELS,
  VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_RATIO,
  VISUAL_RASTER_MAX_TOTAL_CHANNEL_DELTA,
  VISUAL_RASTER_SIGNIFICANT_CHANNEL_DELTA
} from './visual-raster-contract.mjs';

export {
  VISUAL_BROWSER_DISTRIBUTION,
  VISUAL_BROWSER_EXECUTABLE,
  VISUAL_BROWSER_REVISION,
  VISUAL_BROWSER_VERSION,
  VISUAL_COMPOSITOR_SCHEDULING,
  VISUAL_PLAYWRIGHT_VERSION,
  VISUAL_SCREENSHOT_BACKEND
};

export const CANDIDATE_STATUS='CANDIDATE_RESTORED_BASELINE';
export const NOT_CAPTURED_STATUS='NOT_CAPTURED';
export const INCOMPLETE_STATUS='INCOMPLETE';
export const READY_FOR_VALIDATION_STATUS='READY_FOR_VALIDATION';
export const PENDING_RUN_CONCLUSION='pending-terminal-verification';
export const MANIFEST_SCHEMA_VERSION=4;
export const BASELINE_LOCALE=VISUAL_LOCALE;

export const SURFACES=Object.freeze([
  'home',
  'live',
  'studio',
  'sylora',
  'inbox',
  'profile',
  'settings',
  'create-hub-open',
  'live-create',
  'clips-create',
  'video-create'
]);

export const VIEWPORTS=Object.freeze([
  Object.freeze({id:'390x844',width:390,height:844,devicePixelRatio:1,inputMode:'touch'}),
  Object.freeze({id:'768x1024',width:768,height:1024,devicePixelRatio:1,inputMode:'touch'}),
  Object.freeze({id:'1366x900',width:1366,height:900,devicePixelRatio:1,inputMode:'mouse'}),
  Object.freeze({id:'1920x1080',width:1920,height:1080,devicePixelRatio:1,inputMode:'mouse'})
]);

export const EXPECTED_PNG_COUNT=SURFACES.length*VIEWPORTS.length;
export const DEFAULT_CANDIDATE_DIR=fileURLToPath(new URL('../docs/visual-baseline/candidate/',import.meta.url));
export const DEFAULT_MANIFEST_PATH=path.join(DEFAULT_CANDIDATE_DIR,'manifest.json');

const PNG_SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const SHA256_PATTERN=/^[a-f0-9]{64}$/;
const COMMIT_PATTERN=/^[a-f0-9]{40}$/;

export class VisualBaselineContractError extends Error{
  constructor(message){super(message);this.name='VisualBaselineContractError'}
}

function fail(message){throw new VisualBaselineContractError(message)}

function slash(value){return value.split(path.sep).join('/')}

function requireExactObject(value,label,keys){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(`${label} must be an object`);
  const actual=Object.keys(value);
  const missing=keys.filter(key=>!Object.hasOwn(value,key));
  const extra=actual.filter(key=>!keys.includes(key));
  if(missing.length||extra.length)fail(`${label} fields mismatch; missing=[${missing.join(', ')}] extra=[${extra.join(', ')}]`);
  return value;
}

function requireString(value,label){
  if(typeof value!=='string'||!value.trim()||value!==value.trim())fail(`${label} must be a non-empty, trimmed string`);
  return value;
}

function requireCanonicalIso(value,label){
  requireString(value,label);
  const timestamp=Date.parse(value);
  if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString()!==value)fail(`${label} must be a canonical ISO-8601 timestamp`);
  return value;
}

function requirePositiveInteger(value,label){
  if(!Number.isSafeInteger(value)||value<=0)fail(`${label} must be a positive safe integer`);
  return value;
}

function requireNonNegativeInteger(value,label){
  if(!Number.isSafeInteger(value)||value<0)fail(`${label} must be a non-negative safe integer`);
  return value;
}

export function expectedRelativePngPaths(){
  return SURFACES.flatMap(surface=>VIEWPORTS.map(viewport=>`${surface}/${viewport.id}/${BASELINE_LOCALE}.png`));
}

export function candidateFileReport(relativeFiles){
  if(!Array.isArray(relativeFiles))fail('candidate file list must be an array');
  const files=relativeFiles.map((file,index)=>{
    requireString(file,`candidate file[${index}]`);
    const normalized=slash(file);
    if(normalized.startsWith('/')||normalized.includes('../')||normalized==='..')fail(`candidate file escapes root: ${file}`);
    return normalized;
  });
  const duplicates=[...new Set(files.filter((file,index)=>files.indexOf(file)!==index))].sort();
  const actual=new Set(files);
  const expected=expectedRelativePngPaths();
  const expectedSet=new Set(expected);
  const missing=expected.filter(file=>!actual.has(file));
  const extra=files.filter(file=>file!=='manifest.json'&&!expectedSet.has(file)).sort();
  const pngFiles=files.filter(file=>file.endsWith('.png')).sort();
  return {
    files:[...files].sort(),
    pngFiles,
    pngCount:pngFiles.length,
    manifestPresent:actual.has('manifest.json'),
    missing,
    extra,
    duplicates
  };
}

export function assertExactCandidateFileSet(relativeFiles,{requireManifest=false}={}){
  const report=candidateFileReport(relativeFiles);
  const manifestMissing=requireManifest&&!report.manifestPresent;
  if(report.missing.length||report.extra.length||report.duplicates.length||report.pngCount!==EXPECTED_PNG_COUNT||manifestMissing){
    fail(`candidate file set is not exact; expectedPngs=${EXPECTED_PNG_COUNT} actualPngs=${report.pngCount} missing=[${report.missing.join(', ')}] extra=[${report.extra.join(', ')}] duplicates=[${report.duplicates.join(', ')}] manifest=${report.manifestPresent?'present':'missing'}`);
  }
  return report;
}

export function assertExactCaptureSourceFileSet(relativeFiles){
  if(!Array.isArray(relativeFiles))fail('capture source file list must be an array');
  const expected=expectedRelativePngPaths();
  const actual=new Set(relativeFiles.map(slash));
  const missing=expected.filter(file=>!actual.has(file));
  const allowed=new Set([...expected,'metadata.json','capture-metadata.json']);
  const extra=[...actual].filter(file=>!allowed.has(file)).sort();
  if(missing.length||extra.length||actual.size!==relativeFiles.length){
    fail(`capture source file set is not exact; missing=[${missing.join(', ')}] extra=[${extra.join(', ')}] duplicates=${actual.size!==relativeFiles.length}`);
  }
  return {expectedPngs:expected.length,files:[...actual].sort()};
}

async function pathExists(target){
  try{await lstat(target);return true}
  catch(error){if(error?.code==='ENOENT')return false;throw error}
}

async function readJsonFile(filePath,label){
  try{return JSON.parse(await readFile(filePath,'utf8'))}
  catch(error){fail(`${label} JSON cannot be parsed: ${error.message}`)}
}

export async function writeJsonAtomicExclusive(filePath,value){
  const target=path.resolve(filePath);
  await mkdir(path.dirname(target),{recursive:true});
  const temporaryPath=path.join(path.dirname(target),`.${path.basename(target)}-${process.pid}-${randomUUID()}.tmp`);
  try{
    await writeFile(temporaryPath,`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});
    try{await link(temporaryPath,target)}
    catch(error){
      if(error?.code==='EEXIST')fail(`refusing to overwrite existing JSON file: ${target}`);
      throw error;
    }
  }finally{
    await unlink(temporaryPath).catch(error=>{if(error?.code!=='ENOENT')throw error});
  }
  return target;
}

async function walkFiles(root){
  const output=[];
  async function visit(directory,prefix){
    let entries;
    try{entries=await readdir(directory,{withFileTypes:true})}
    catch(error){
      if(error?.code==='ENOENT'&&directory===root)return;
      throw error;
    }
    entries.sort((a,b)=>a.name.localeCompare(b.name));
    for(const entry of entries){
      const relative=prefix?`${prefix}/${entry.name}`:entry.name;
      const absolute=path.join(directory,entry.name);
      if(entry.isDirectory())await visit(absolute,relative);
      else if(entry.isFile())output.push(relative);
      else fail(`unsupported candidate filesystem entry: ${relative}`);
    }
  }
  await visit(root,'');
  return output;
}

export async function inspectCandidateDirectory(candidateDir=DEFAULT_CANDIDATE_DIR){
  const root=path.resolve(candidateDir);
  const files=await walkFiles(root);
  const report=candidateFileReport(files);
  let status;
  if(files.length===0)status=NOT_CAPTURED_STATUS;
  else if(report.missing.length||report.extra.length||report.duplicates.length||report.pngCount!==EXPECTED_PNG_COUNT||!report.manifestPresent)status=INCOMPLETE_STATUS;
  else status=READY_FOR_VALIDATION_STATUS;
  return {
    status,
    candidateDir:root,
    expectedPngs:EXPECTED_PNG_COUNT,
    finalCompleteness:false,
    ...report
  };
}

export function validateCaptureMetadata(metadata,{expectedCommit}={}){
  requireExactObject(metadata,'metadata',[
    'status','renderedFromCommit','capturedAt','sourceRun','playwright','browser','os','locale','fixture','font','viewports'
  ]);
  if(metadata.status!==CANDIDATE_STATUS)fail(`metadata.status must be ${CANDIDATE_STATUS}`);
  if(typeof metadata.renderedFromCommit!=='string'||!COMMIT_PATTERN.test(metadata.renderedFromCommit))fail('metadata.renderedFromCommit must be a lowercase 40-character commit SHA');
  if(expectedCommit&&metadata.renderedFromCommit!==expectedCommit)fail(`rendered commit ${metadata.renderedFromCommit} does not match expected commit ${expectedCommit}`);
  requireCanonicalIso(metadata.capturedAt,'metadata.capturedAt');

  requireExactObject(metadata.sourceRun,'metadata.sourceRun',['provider','id','attempt','url','conclusion','headSha']);
  if(metadata.sourceRun.provider!=='github-actions')fail('metadata.sourceRun.provider must be github-actions');
  requirePositiveInteger(metadata.sourceRun.id,'metadata.sourceRun.id');
  requirePositiveInteger(metadata.sourceRun.attempt,'metadata.sourceRun.attempt');
  requireString(metadata.sourceRun.url,'metadata.sourceRun.url');
  let runUrl;
  try{runUrl=new URL(metadata.sourceRun.url)}catch{fail('metadata.sourceRun.url must be a valid URL')}
  const runPathPattern=new RegExp(`^/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/${metadata.sourceRun.id}$`);
  const canonicalRunUrl=`https://github.com${runUrl.pathname}`;
  if(
    runUrl.protocol!=='https:'||
    runUrl.hostname!=='github.com'||
    runUrl.port||runUrl.username||runUrl.password||runUrl.search||runUrl.hash||
    !runPathPattern.test(runUrl.pathname)||
    metadata.sourceRun.url!==canonicalRunUrl
  )fail('metadata.sourceRun.url must identify the exact recorded GitHub Actions run without credentials or URL suffixes');
  if(metadata.sourceRun.conclusion!=='success')fail('metadata.sourceRun.conclusion must be success');
  if(metadata.sourceRun.headSha!==metadata.renderedFromCommit)fail('metadata.sourceRun.headSha must equal metadata.renderedFromCommit');

  requireExactObject(metadata.playwright,'metadata.playwright',['version']);
  if(metadata.playwright.version!==VISUAL_PLAYWRIGHT_VERSION)fail(`metadata.playwright.version must be ${VISUAL_PLAYWRIGHT_VERSION}`);
  requireExactObject(metadata.browser,'metadata.browser',[
    'name','distribution','revision','executable','version','screenshotBackend','compositorScheduling'
  ]);
  if(metadata.browser.name!=='chromium')fail('metadata.browser.name must be chromium');
  if(metadata.browser.distribution!==VISUAL_BROWSER_DISTRIBUTION)fail(`metadata.browser.distribution must be ${VISUAL_BROWSER_DISTRIBUTION}`);
  if(metadata.browser.revision!==VISUAL_BROWSER_REVISION)fail(`metadata.browser.revision must be ${VISUAL_BROWSER_REVISION}`);
  if(metadata.browser.executable!==VISUAL_BROWSER_EXECUTABLE)fail(`metadata.browser.executable must be ${VISUAL_BROWSER_EXECUTABLE}`);
  if(metadata.browser.version!==VISUAL_BROWSER_VERSION)fail(`metadata.browser.version must be ${VISUAL_BROWSER_VERSION}`);
  if(metadata.browser.screenshotBackend!==VISUAL_SCREENSHOT_BACKEND)fail(`metadata.browser.screenshotBackend must be ${VISUAL_SCREENSHOT_BACKEND}`);
  if(metadata.browser.compositorScheduling!==VISUAL_COMPOSITOR_SCHEDULING){
    fail(`metadata.browser.compositorScheduling must be ${VISUAL_COMPOSITOR_SCHEDULING}`);
  }
  requireExactObject(metadata.os,'metadata.os',['name','version','runnerImage']);
  requireString(metadata.os.name,'metadata.os.name');
  requireString(metadata.os.version,'metadata.os.version');
  requireString(metadata.os.runnerImage,'metadata.os.runnerImage');

  if(metadata.locale!==BASELINE_LOCALE)fail(`metadata.locale must be ${BASELINE_LOCALE}`);
  requireExactObject(metadata.fixture,'metadata.fixture',['id','fixedTime']);
  requireString(metadata.fixture.id,'metadata.fixture.id');
  requireCanonicalIso(metadata.fixture.fixedTime,'metadata.fixture.fixedTime');
  if(metadata.fixture.id!==VISUAL_FIXTURE_ID)fail(`metadata.fixture.id must be ${VISUAL_FIXTURE_ID}`);
  if(metadata.fixture.fixedTime!==FIXED_VISUAL_TIME)fail(`metadata.fixture.fixedTime must be ${FIXED_VISUAL_TIME}`);
  if(Date.parse(metadata.capturedAt)<Date.parse(metadata.fixture.fixedTime))fail('metadata.capturedAt cannot precede metadata.fixture.fixedTime');
  requireExactObject(metadata.font,'metadata.font',['ready','computedFamily']);
  if(metadata.font.ready!==true)fail('metadata.font.ready must be true before candidate promotion');
  requireString(metadata.font.computedFamily,'metadata.font.computedFamily');

  const viewportIds=VIEWPORTS.map(viewport=>viewport.id);
  requireExactObject(metadata.viewports,'metadata.viewports',viewportIds);
  for(const contract of VIEWPORTS){
    const observed=metadata.viewports[contract.id];
    requireExactObject(observed,`metadata.viewports.${contract.id}`,['width','height','devicePixelRatio','inputMode']);
    for(const field of ['width','height','devicePixelRatio','inputMode']){
      if(observed[field]!==contract[field])fail(`metadata.viewports.${contract.id}.${field} must be ${contract[field]}`);
    }
  }

  return structuredClone(metadata);
}

export function validateRawCaptureRecord(record,{expectedPath,label='capture record'}={}){
  requireExactObject(record,label,[
    'surface','viewport','width','height','locale','input','isMobile','hasTouch','file','sha256','bytes','paintStability','runtime'
  ]);
  const canonicalPaths=expectedRelativePngPaths();
  const recordPath=expectedPath||record.file;
  if(!canonicalPaths.includes(recordPath))fail(`${label} path is not canonical: ${recordPath}`);
  const [surface,viewportId]=recordPath.split('/');
  const viewport=VIEWPORTS.find(item=>item.id===viewportId);
  if(record.file!==recordPath)fail(`${label}.file must be ${recordPath}`);
  if(record.surface!==surface||record.viewport!==viewportId)fail(`capture report record identity does not match ${recordPath}`);
  if(record.width!==viewport.width||record.height!==viewport.height)fail(`capture report record geometry does not match ${viewportId}`);
  if(record.locale!==BASELINE_LOCALE)fail(`capture report record locale must be ${BASELINE_LOCALE}`);
  const touch=viewport.inputMode==='touch';
  if(record.input!==viewport.inputMode||record.isMobile!==touch||record.hasTouch!==touch)fail(`capture report record input does not match ${viewport.inputMode}`);
  if(typeof record.sha256!=='string'||!SHA256_PATTERN.test(record.sha256))fail(`capture report ${record.file} sha256 must be lowercase SHA-256`);
  requirePositiveInteger(record.bytes,`capture report ${record.file} bytes`);
  requireExactObject(record.paintStability,`capture report ${record.file} paintStability`,[
    'canonicalImagesChecked','canonicalBackgroundsChecked','canonicalPixelContribution','canonicalContentContrast','canonicalRestoreMatch',
    'hiddenScreenshotsCompared','fullPageScreenshotsCompared','fullPageByteMatch','rasterPixelsCompared','rasterMismatchPixels',
    'rasterMismatchRatio','rasterSignificantMismatchPixels','rasterSignificantMismatchRatio','rasterMaxChannelDelta',
    'rasterTotalChannelDelta','rasterSignificantChannelDelta','rasterMaxSignificantMismatchRatio',
    'rasterMaxSignificantMismatchPixelsAllowed','rasterMaxChannelDeltaAllowed','rasterMaxTotalChannelDeltaAllowed'
  ]);
  const expectedCanonicalImages=touch?1:2;
  const expectedCanonicalBackgrounds=0;
  if(record.paintStability.canonicalImagesChecked!==expectedCanonicalImages){
    fail(`capture report ${record.file} canonical image paint evidence drifted`);
  }
  if(record.paintStability.canonicalBackgroundsChecked!==expectedCanonicalBackgrounds){
    fail(`capture report ${record.file} canonical background paint evidence drifted`);
  }
  if(
    record.paintStability.canonicalPixelContribution!==true||
    record.paintStability.canonicalContentContrast!==true||
    record.paintStability.canonicalRestoreMatch!==true||
    record.paintStability.hiddenScreenshotsCompared!==2||
    record.paintStability.fullPageScreenshotsCompared!==2
  ){
    fail(`capture report ${record.file} compositor paint stability evidence drifted`);
  }
  if(typeof record.paintStability.fullPageByteMatch!=='boolean'){
    fail(`capture report ${record.file} full-page byte-match evidence must be boolean`);
  }
  requirePositiveInteger(record.paintStability.rasterPixelsCompared,`capture report ${record.file} rasterPixelsCompared`);
  requireNonNegativeInteger(record.paintStability.rasterMismatchPixels,`capture report ${record.file} rasterMismatchPixels`);
  requireNonNegativeInteger(
    record.paintStability.rasterSignificantMismatchPixels,
    `capture report ${record.file} rasterSignificantMismatchPixels`
  );
  requireNonNegativeInteger(record.paintStability.rasterMaxChannelDelta,`capture report ${record.file} rasterMaxChannelDelta`);
  requireNonNegativeInteger(record.paintStability.rasterTotalChannelDelta,`capture report ${record.file} rasterTotalChannelDelta`);
  const expectedMismatchRatio=record.paintStability.rasterMismatchPixels/record.paintStability.rasterPixelsCompared;
  const expectedSignificantMismatchRatio=
    record.paintStability.rasterSignificantMismatchPixels/record.paintStability.rasterPixelsCompared;
  if(
    record.paintStability.rasterMismatchPixels>record.paintStability.rasterPixelsCompared||
    !Number.isFinite(record.paintStability.rasterMismatchRatio)||record.paintStability.rasterMismatchRatio<0||
    Math.abs(record.paintStability.rasterMismatchRatio-expectedMismatchRatio)>Number.EPSILON||
    record.paintStability.rasterSignificantMismatchPixels>record.paintStability.rasterMismatchPixels||
    !Number.isFinite(record.paintStability.rasterSignificantMismatchRatio)||
    record.paintStability.rasterSignificantMismatchRatio<0||
    Math.abs(record.paintStability.rasterSignificantMismatchRatio-expectedSignificantMismatchRatio)>Number.EPSILON||
    record.paintStability.rasterSignificantMismatchPixels>VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_PIXELS||
    record.paintStability.rasterSignificantMismatchRatio>VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_RATIO||
    record.paintStability.rasterMaxChannelDelta>VISUAL_RASTER_MAX_CHANNEL_DELTA||
    record.paintStability.rasterTotalChannelDelta>VISUAL_RASTER_MAX_TOTAL_CHANNEL_DELTA||
    record.paintStability.rasterTotalChannelDelta<record.paintStability.rasterMismatchPixels||
    record.paintStability.rasterMaxChannelDelta>record.paintStability.rasterTotalChannelDelta||
    record.paintStability.rasterTotalChannelDelta>record.paintStability.rasterMismatchPixels*4*255||
    record.paintStability.rasterSignificantChannelDelta!==VISUAL_RASTER_SIGNIFICANT_CHANNEL_DELTA||
    record.paintStability.rasterMaxSignificantMismatchRatio!==VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_RATIO||
    record.paintStability.rasterMaxSignificantMismatchPixelsAllowed!==VISUAL_RASTER_MAX_SIGNIFICANT_MISMATCH_PIXELS||
    record.paintStability.rasterMaxChannelDeltaAllowed!==VISUAL_RASTER_MAX_CHANNEL_DELTA||
    record.paintStability.rasterMaxTotalChannelDeltaAllowed!==VISUAL_RASTER_MAX_TOTAL_CHANNEL_DELTA||
    (record.paintStability.fullPageByteMatch&&record.paintStability.rasterMismatchPixels!==0)
  )fail(`capture report ${record.file} strict raster tolerance evidence drifted`);
  requireExactObject(record.runtime,`capture report ${record.file} runtime`,[
    'fontStatus','bodyFontFamily','imageCount','viewport','devicePixelRatio','locale','reducedMotion','navigatorMaxTouchPoints',
    'primaryPointer','primaryHover','cdpTouchInput'
  ]);
  if(record.runtime.fontStatus!=='loaded')fail(`capture report ${record.file} fonts were not loaded`);
  requireString(record.runtime.bodyFontFamily,`capture report ${record.file} bodyFontFamily`);
  if(!Number.isSafeInteger(record.runtime.imageCount)||record.runtime.imageCount<0)fail(`capture report ${record.file} imageCount must be a non-negative integer`);
  requireExactObject(record.runtime.viewport,`capture report ${record.file} runtime.viewport`,['width','height']);
  if(record.runtime.viewport.width!==viewport.width||record.runtime.viewport.height!==viewport.height)fail(`capture report ${record.file} runtime viewport drifted`);
  if(record.runtime.devicePixelRatio!==viewport.devicePixelRatio)fail(`capture report ${record.file} DPR drifted`);
  if(record.runtime.locale!==BASELINE_LOCALE)fail(`capture report ${record.file} runtime locale drifted`);
  if(record.runtime.reducedMotion!==true)fail(`capture report ${record.file} reduced motion is not active`);
  if(
    !Number.isSafeInteger(record.runtime.navigatorMaxTouchPoints)||
    record.runtime.navigatorMaxTouchPoints<0||
    record.runtime.navigatorMaxTouchPoints!==(touch?1:0)
  )fail(`capture report ${record.file} touch contract drifted`);
  if(touch){
    requireExactObject(record.runtime.cdpTouchInput,`capture report ${record.file} runtime.cdpTouchInput`,[
      'touchStart','touchTrusted','pointerType','pointerTrusted'
    ]);
    if(
      record.runtime.cdpTouchInput.touchStart!==true||
      record.runtime.cdpTouchInput.touchTrusted!==true||
      record.runtime.cdpTouchInput.pointerType!=='touch'||
      record.runtime.cdpTouchInput.pointerTrusted!==true
    ){
      fail(`capture report ${record.file} Chromium CDP touch evidence drifted`);
    }
  }else if(record.runtime.cdpTouchInput!==null){
    fail(`capture report ${record.file} desktop cdpTouchInput must be null`);
  }
  const expectedPointer=touch?'coarse':'fine';
  const expectedHover=touch?'none':'hover';
  if(record.runtime.primaryPointer!==expectedPointer||record.runtime.primaryHover!==expectedHover){
    fail(`capture report ${record.file} pointer contract drifted`);
  }
  return structuredClone(record);
}

export function validateRawCaptureMetadata(report,{expectedCommit,expectedRunMode}={}){
  requireExactObject(report,'capture report',[
    'schemaVersion','status','complete','expectedFiles','actualFiles','generatedAt','renderedFromCommit','runMode',
    'fixture','browser','runner','surfaces','viewports','files'
  ]);
  if(report.schemaVersion!==12)fail('capture report.schemaVersion must be 12');
  if(report.status!==CANDIDATE_STATUS)fail(`capture report.status must be ${CANDIDATE_STATUS}`);
  if(report.complete!==true)fail('capture report.complete must be true');
  if(report.expectedFiles!==EXPECTED_PNG_COUNT||report.actualFiles!==EXPECTED_PNG_COUNT)fail(`capture report file counts must both be ${EXPECTED_PNG_COUNT}`);
  requireCanonicalIso(report.generatedAt,'capture report.generatedAt');
  if(typeof report.renderedFromCommit!=='string'||!COMMIT_PATTERN.test(report.renderedFromCommit))fail('capture report.renderedFromCommit must be a lowercase 40-character commit SHA');
  if(expectedCommit&&report.renderedFromCommit!==expectedCommit)fail(`capture report commit ${report.renderedFromCommit} does not match expected commit ${expectedCommit}`);
  if(!['capture','repeat'].includes(report.runMode))fail('capture report.runMode must be capture or repeat');
  if(expectedRunMode&&report.runMode!==expectedRunMode)fail(`capture report.runMode must be ${expectedRunMode}`);

  requireExactObject(report.fixture,'capture report.fixture',['id','username','displayName','fixedTime','randomSeed','locale','dailyBrief']);
  requireString(report.fixture.id,'capture report.fixture.id');
  requireString(report.fixture.username,'capture report.fixture.username');
  requireString(report.fixture.displayName,'capture report.fixture.displayName');
  requireCanonicalIso(report.fixture.fixedTime,'capture report.fixture.fixedTime');
  requirePositiveInteger(report.fixture.randomSeed,'capture report.fixture.randomSeed');
  if(report.fixture.id!==VISUAL_FIXTURE_ID)fail(`capture report.fixture.id must be ${VISUAL_FIXTURE_ID}`);
  if(report.fixture.username!==FIXED_VISUAL_ACCOUNT.username)fail(`capture report.fixture.username must be ${FIXED_VISUAL_ACCOUNT.username}`);
  if(report.fixture.displayName!==FIXED_VISUAL_ACCOUNT.displayName)fail(`capture report.fixture.displayName must be ${FIXED_VISUAL_ACCOUNT.displayName}`);
  if(report.fixture.fixedTime!==FIXED_VISUAL_TIME)fail(`capture report.fixture.fixedTime must be ${FIXED_VISUAL_TIME}`);
  if(report.fixture.randomSeed!==VISUAL_RANDOM_SEED)fail(`capture report.fixture.randomSeed must be ${VISUAL_RANDOM_SEED}`);
  if(report.fixture.locale!==BASELINE_LOCALE)fail(`capture report.fixture.locale must be ${BASELINE_LOCALE}`);
  if(report.fixture.dailyBrief!==false)fail('capture report.fixture.dailyBrief must be false');
  if(Date.parse(report.generatedAt)<Date.parse(report.fixture.fixedTime))fail('capture report.generatedAt cannot precede fixture.fixedTime');

  requireExactObject(report.browser,'capture report.browser',[
    'name','distribution','revision','executable','version','playwrightVersion','screenshotBackend','compositorScheduling'
  ]);
  if(report.browser.name!=='chromium')fail('capture report.browser.name must be chromium');
  if(report.browser.distribution!==VISUAL_BROWSER_DISTRIBUTION)fail(`capture report.browser.distribution must be ${VISUAL_BROWSER_DISTRIBUTION}`);
  if(report.browser.revision!==VISUAL_BROWSER_REVISION)fail(`capture report.browser.revision must be ${VISUAL_BROWSER_REVISION}`);
  if(report.browser.executable!==VISUAL_BROWSER_EXECUTABLE)fail(`capture report.browser.executable must be ${VISUAL_BROWSER_EXECUTABLE}`);
  if(report.browser.version!==VISUAL_BROWSER_VERSION)fail(`capture report.browser.version must be ${VISUAL_BROWSER_VERSION}`);
  if(report.browser.playwrightVersion!==VISUAL_PLAYWRIGHT_VERSION)fail(`capture report.browser.playwrightVersion must be ${VISUAL_PLAYWRIGHT_VERSION}`);
  if(report.browser.screenshotBackend!==VISUAL_SCREENSHOT_BACKEND)fail(`capture report.browser.screenshotBackend must be ${VISUAL_SCREENSHOT_BACKEND}`);
  if(report.browser.compositorScheduling!==VISUAL_COMPOSITOR_SCHEDULING){
    fail(`capture report.browser.compositorScheduling must be ${VISUAL_COMPOSITOR_SCHEDULING}`);
  }
  requireExactObject(report.runner,'capture report.runner',['platform','arch','release']);
  requireString(report.runner.platform,'capture report.runner.platform');
  requireString(report.runner.arch,'capture report.runner.arch');
  requireString(report.runner.release,'capture report.runner.release');

  if(!Array.isArray(report.surfaces)||!isDeepStrictEqual(report.surfaces,SURFACES))fail('capture report.surfaces must match the canonical ordered surface list');
  if(!Array.isArray(report.viewports)||report.viewports.length!==VIEWPORTS.length)fail('capture report.viewports must match the four canonical viewports');
  for(let index=0;index<VIEWPORTS.length;index+=1){
    const expected=VIEWPORTS[index];
    const observed=report.viewports[index];
    requireExactObject(observed,`capture report.viewports[${index}]`,['id','width','height','isMobile','hasTouch']);
    if(observed.id!==expected.id||observed.width!==expected.width||observed.height!==expected.height)fail(`capture report.viewports[${index}] geometry does not match ${expected.id}`);
    const touch=expected.inputMode==='touch';
    if(observed.isMobile!==touch||observed.hasTouch!==touch)fail(`capture report.viewports[${index}] input mode does not match ${expected.inputMode}`);
  }

  if(!Array.isArray(report.files)||report.files.length!==EXPECTED_PNG_COUNT)fail(`capture report.files must contain exactly ${EXPECTED_PNG_COUNT} entries`);
  const expectedPaths=expectedRelativePngPaths();
  const seen=new Set();
  for(let index=0;index<expectedPaths.length;index+=1){
    const record=report.files[index];
    const expectedPath=expectedPaths[index];
    const normalizedRecord=validateRawCaptureRecord(record,{expectedPath,label:`capture report.files[${index}]`});
    if(seen.has(normalizedRecord.file))fail(`capture report contains duplicate path ${normalizedRecord.file}`);
    seen.add(normalizedRecord.file);
  }
  return structuredClone(report);
}

export function validatePendingCaptureMetadata(metadata,{expectedCommit}={}){
  requireExactObject(metadata,'capture metadata',[
    'status','renderedFromCommit','capturedAt','sourceRun','playwright','browser','os','locale','fixture','font','viewports'
  ]);
  requireExactObject(metadata.sourceRun,'capture metadata.sourceRun',['provider','id','attempt','url','conclusion','headSha']);
  if(metadata.sourceRun.conclusion!==PENDING_RUN_CONCLUSION)fail(`capture metadata.sourceRun.conclusion must be ${PENDING_RUN_CONCLUSION}`);
  const validated=validateCaptureMetadata({
    ...structuredClone(metadata),
    sourceRun:{...metadata.sourceRun,conclusion:'success'}
  },{expectedCommit});
  return {...validated,sourceRun:{...validated.sourceRun,conclusion:PENDING_RUN_CONCLUSION}};
}

export function finalizeCaptureMetadata(metadata,verifiedRun,{expectedCommit}={}){
  const pendingValidated=validatePendingCaptureMetadata(metadata,{expectedCommit});

  requireExactObject(verifiedRun,'verified run',['provider','id','attempt','url','conclusion','headSha']);
  const finalizedRun={...structuredClone(verifiedRun)};
  if(finalizedRun.conclusion!=='success')fail('verified run conclusion must be success');
  for(const field of ['provider','id','attempt','url','headSha']){
    if(finalizedRun[field]!==pendingValidated.sourceRun[field])fail(`verified run ${field} does not match capture metadata`);
  }
  return validateCaptureMetadata({...pendingValidated,sourceRun:finalizedRun},{expectedCommit});
}

export function inspectPngBuffer(buffer,label='PNG'){
  if(!Buffer.isBuffer(buffer)||buffer.length<45||!buffer.subarray(0,8).equals(PNG_SIGNATURE))fail(`${label} has an invalid PNG signature`);
  let offset=8;
  let width=0,height=0,seenHeader=false,seenData=false,seenEnd=false;
  while(offset+12<=buffer.length){
    const length=buffer.readUInt32BE(offset);
    const type=buffer.subarray(offset+4,offset+8).toString('ascii');
    const next=offset+12+length;
    if(next>buffer.length)fail(`${label} contains a truncated ${type||'unknown'} chunk`);
    if(type==='IHDR'){
      if(seenHeader||length!==13||offset!==8)fail(`${label} has an invalid IHDR chunk`);
      width=buffer.readUInt32BE(offset+8);
      height=buffer.readUInt32BE(offset+12);
      if(!width||!height)fail(`${label} has invalid dimensions`);
      seenHeader=true;
    }else if(type==='IDAT')seenData=true;
    else if(type==='IEND'){
      if(length!==0)fail(`${label} has an invalid IEND chunk`);
      seenEnd=true;
      offset=next;
      break;
    }
    offset=next;
  }
  if(!seenHeader||!seenData||!seenEnd||offset!==buffer.length)fail(`${label} is not a complete PNG stream`);
  return {width,height,sha256:createHash('sha256').update(buffer).digest('hex')};
}

function validateManifestShape(manifest,{expectedCommit}={}){
  requireExactObject(manifest,'manifest',[
    'schemaVersion','status','renderedFromCommit','capturedAt','sourceRun','playwright','browser','os','locale','fixture','font','viewports','fileCount','captures'
  ]);
  if(manifest.schemaVersion!==MANIFEST_SCHEMA_VERSION)fail(`manifest.schemaVersion must be ${MANIFEST_SCHEMA_VERSION}`);
  const metadata=validateCaptureMetadata({
    status:manifest.status,
    renderedFromCommit:manifest.renderedFromCommit,
    capturedAt:manifest.capturedAt,
    sourceRun:manifest.sourceRun,
    playwright:manifest.playwright,
    browser:manifest.browser,
    os:manifest.os,
    locale:manifest.locale,
    fixture:manifest.fixture,
    font:manifest.font,
    viewports:manifest.viewports
  },{expectedCommit});
  if(manifest.fileCount!==EXPECTED_PNG_COUNT)fail(`manifest.fileCount must be ${EXPECTED_PNG_COUNT}`);
  if(!Array.isArray(manifest.captures)||manifest.captures.length!==EXPECTED_PNG_COUNT)fail(`manifest.captures must contain exactly ${EXPECTED_PNG_COUNT} entries`);

  const expectedPaths=expectedRelativePngPaths();
  for(let index=0;index<expectedPaths.length;index+=1){
    const capture=manifest.captures[index];
    requireExactObject(capture,`manifest.captures[${index}]`,['path','surface','locale','viewport','image']);
    const expectedPath=expectedPaths[index];
    const [surface,viewportId]=expectedPath.split('/');
    if(capture.path!==expectedPath)fail(`manifest.captures[${index}].path must be ${expectedPath}`);
    if(capture.surface!==surface)fail(`manifest.captures[${index}].surface must be ${surface}`);
    if(capture.locale!==BASELINE_LOCALE)fail(`manifest.captures[${index}].locale must be ${BASELINE_LOCALE}`);
    requireExactObject(capture.viewport,`manifest.captures[${index}].viewport`,['id','width','height','devicePixelRatio','inputMode']);
    const viewport=metadata.viewports[viewportId];
    if(capture.viewport.id!==viewportId)fail(`manifest.captures[${index}].viewport.id must be ${viewportId}`);
    for(const field of ['width','height','devicePixelRatio','inputMode']){
      if(capture.viewport[field]!==viewport[field])fail(`manifest.captures[${index}].viewport.${field} does not match runner metadata`);
    }
    requireExactObject(capture.image,`manifest.captures[${index}].image`,['width','height','sha256']);
    requirePositiveInteger(capture.image.width,`manifest.captures[${index}].image.width`);
    requirePositiveInteger(capture.image.height,`manifest.captures[${index}].image.height`);
    if(capture.image.width!==viewport.width*viewport.devicePixelRatio)fail(`manifest.captures[${index}] physical width does not match viewport DPR`);
    if(capture.image.height<viewport.height*viewport.devicePixelRatio)fail(`manifest.captures[${index}] is shorter than its viewport`);
    if(typeof capture.image.sha256!=='string'||!SHA256_PATTERN.test(capture.image.sha256))fail(`manifest.captures[${index}].image.sha256 must be lowercase SHA-256`);
  }
  return metadata;
}

async function captureEntries(candidateDir,metadata){
  const output=[];
  for(const surface of SURFACES){
    for(const contract of VIEWPORTS){
      const relative=`${surface}/${contract.id}/${BASELINE_LOCALE}.png`;
      const absolute=path.join(candidateDir,...relative.split('/'));
      const png=inspectPngBuffer(await readFile(absolute),relative);
      const observed=metadata.viewports[contract.id];
      if(png.width!==observed.width*observed.devicePixelRatio)fail(`${relative} width ${png.width} does not match viewport/DPR ${observed.width*observed.devicePixelRatio}`);
      if(png.height<observed.height*observed.devicePixelRatio)fail(`${relative} height ${png.height} is shorter than viewport ${observed.height*observed.devicePixelRatio}`);
      output.push({
        path:relative,
        surface,
        locale:BASELINE_LOCALE,
        viewport:{id:contract.id,...observed},
        image:png
      });
    }
  }
  return output;
}

export async function generateCandidateManifest({candidateDir=DEFAULT_CANDIDATE_DIR,metadata,expectedCommit}={}){
  const root=path.resolve(candidateDir);
  const files=await walkFiles(root);
  assertExactCandidateFileSet(files,{requireManifest:false});
  const normalized=validateCaptureMetadata(metadata,{expectedCommit});
  const captures=await captureEntries(root,normalized);
  const manifest={
    schemaVersion:MANIFEST_SCHEMA_VERSION,
    status:normalized.status,
    renderedFromCommit:normalized.renderedFromCommit,
    capturedAt:normalized.capturedAt,
    sourceRun:normalized.sourceRun,
    playwright:normalized.playwright,
    browser:normalized.browser,
    os:normalized.os,
    locale:normalized.locale,
    fixture:normalized.fixture,
    font:normalized.font,
    viewports:normalized.viewports,
    fileCount:EXPECTED_PNG_COUNT,
    captures
  };
  validateManifestShape(manifest,{expectedCommit});

  const manifestPath=path.join(root,'manifest.json');
  const temporaryPath=path.join(root,`.manifest-${process.pid}-${randomUUID()}.tmp`);
  try{
    await writeFile(temporaryPath,`${JSON.stringify(manifest,null,2)}\n`,{flag:'wx'});
    await rename(temporaryPath,manifestPath);
  }finally{
    await unlink(temporaryPath).catch(error=>{if(error?.code!=='ENOENT')throw error});
  }
  return validateCandidateManifest({candidateDir:root,expectedCommit});
}

function assertCaptureReportMatchesMetadata(report,metadata){
  if(report.renderedFromCommit!==metadata.renderedFromCommit)fail('capture report commit does not match finalized metadata');
  if(report.status!==metadata.status||report.fixture.id!==metadata.fixture.id||report.fixture.fixedTime!==metadata.fixture.fixedTime)fail('capture report fixture does not match finalized metadata');
  if(report.fixture.locale!==metadata.locale)fail('capture report locale does not match finalized metadata');
  if(
    report.browser.name!==metadata.browser.name||
    report.browser.distribution!==metadata.browser.distribution||
    report.browser.revision!==metadata.browser.revision||
    report.browser.executable!==metadata.browser.executable||
    report.browser.version!==metadata.browser.version||
    report.browser.screenshotBackend!==metadata.browser.screenshotBackend||
    report.browser.compositorScheduling!==metadata.browser.compositorScheduling||
    report.browser.playwrightVersion!==metadata.playwright.version
  )fail('capture report browser does not match finalized metadata');
  if(Date.parse(report.generatedAt)>Date.parse(metadata.capturedAt))fail('capture report was generated after its capture provenance timestamp');
  const fontFamilies=[...new Set(report.files.map(record=>record.runtime.bodyFontFamily))];
  if(fontFamilies.length!==1||fontFamilies[0]!==metadata.font.computedFamily)fail('capture report font evidence does not match finalized metadata');
  for(const viewport of VIEWPORTS){
    const observed=report.viewports.find(item=>item.id===viewport.id);
    const finalized=metadata.viewports[viewport.id];
    if(!observed||observed.width!==finalized.width||observed.height!==finalized.height||finalized.devicePixelRatio!==viewport.devicePixelRatio||finalized.inputMode!==viewport.inputMode){
      fail(`capture report viewport ${viewport.id} does not match finalized metadata`);
    }
  }
}

export function validatePendingCaptureSource(report,metadata,{expectedCommit,expectedRunMode='capture'}={}){
  const normalizedReport=validateRawCaptureMetadata(report,{expectedCommit,expectedRunMode});
  const normalizedMetadata=validatePendingCaptureMetadata(metadata,{expectedCommit});
  assertCaptureReportMatchesMetadata(normalizedReport,normalizedMetadata);
  return {report:normalizedReport,metadata:normalizedMetadata};
}

export async function verifyRawCaptureBytes(source,report){
  for(const record of report.files){
    const bytes=await readFile(path.join(source,...record.file.split('/')));
    const inspected=inspectPngBuffer(bytes,record.file);
    if(bytes.length!==record.bytes||inspected.sha256!==record.sha256)fail(`capture report digest/size does not match ${record.file}`);
    const viewport=VIEWPORTS.find(item=>item.id===record.viewport);
    if(inspected.width!==viewport.width*viewport.devicePixelRatio||inspected.height<viewport.height*viewport.devicePixelRatio)fail(`capture report PNG dimensions do not match ${record.file}`);
    if(inspected.width*inspected.height!==record.paintStability.rasterPixelsCompared){
      fail(`capture report raster pixel count does not match ${record.file}`);
    }
  }
}

export async function promoteCandidateFromCapture({sourceDir,candidateDir=DEFAULT_CANDIDATE_DIR,metadata,expectedCommit}={}){
  if(!sourceDir)fail('capture source directory is required');
  const source=path.resolve(sourceDir);
  const target=path.resolve(candidateDir);
  if(source===target)fail('capture source and candidate target must be different directories');
  const targetFromSource=path.relative(source,target);
  if(targetFromSource&&!targetFromSource.startsWith('..')&&!path.isAbsolute(targetFromSource))fail('candidate target cannot be nested inside the capture source');
  if(await pathExists(target))fail(`refusing to overwrite existing candidate directory: ${target}`);

  const sourceFiles=await walkFiles(source);
  assertExactCaptureSourceFileSet(sourceFiles);
  const normalized=validateCaptureMetadata(metadata,{expectedCommit});
  const rawReport=await readJsonFile(path.join(source,'metadata.json'),'capture report');
  const pending=await readJsonFile(path.join(source,'capture-metadata.json'),'capture metadata');
  const {report}=validatePendingCaptureSource(rawReport,pending,{expectedCommit,expectedRunMode:'capture'});
  const paired=finalizeCaptureMetadata(pending,normalized.sourceRun,{expectedCommit});
  if(!isDeepStrictEqual(paired,normalized))fail('finalized metadata does not match the capture source sidecar');
  await verifyRawCaptureBytes(source,report);
  const parent=path.dirname(target);
  await mkdir(parent,{recursive:true});
  const temporary=await mkdtemp(path.join(parent,`.${path.basename(target)}-promotion-`));
  let promoted=false;
  try{
    for(const relative of expectedRelativePngPaths()){
      const destination=path.join(temporary,...relative.split('/'));
      await mkdir(path.dirname(destination),{recursive:true});
      await copyFile(path.join(source,...relative.split('/')),destination);
    }
    const manifest=await generateCandidateManifest({candidateDir:temporary,metadata:normalized,expectedCommit});
    if(await pathExists(target))fail(`refusing to overwrite existing candidate directory: ${target}`);
    await rename(temporary,target);
    promoted=true;
    return manifest;
  }finally{
    if(!promoted)await rm(temporary,{recursive:true,force:true});
  }
}

export async function validateCandidateManifest({candidateDir=DEFAULT_CANDIDATE_DIR,expectedCommit}={}){
  const root=path.resolve(candidateDir);
  const files=await walkFiles(root);
  assertExactCandidateFileSet(files,{requireManifest:true});
  const manifestPath=path.join(root,'manifest.json');
  let manifest;
  try{manifest=JSON.parse(await readFile(manifestPath,'utf8'))}
  catch(error){fail(`manifest.json cannot be parsed: ${error.message}`)}
  validateManifestShape(manifest,{expectedCommit});
  const actual=await captureEntries(root,manifest);
  for(let index=0;index<actual.length;index+=1){
    const recorded=manifest.captures[index];
    const observed=actual[index];
    if(recorded.path!==observed.path||recorded.image.width!==observed.image.width||recorded.image.height!==observed.image.height||recorded.image.sha256!==observed.image.sha256){
      fail(`manifest mismatch for ${observed.path}; recorded dimensions/digest do not match bytes`);
    }
  }
  return structuredClone(manifest);
}

function usage(){
  return [
    'Usage:',
    '  node scripts/build-visual-manifest.mjs status [--candidate <dir>]',
    '  node scripts/build-visual-manifest.mjs generate --metadata <json> [--candidate <dir>] [--expected-commit <sha>]',
    '  node scripts/build-visual-manifest.mjs finalize --metadata <capture-json> --verified-run <json> --output <json> [--expected-commit <sha>]',
    '  node scripts/build-visual-manifest.mjs promote --source <capture-dir> --metadata <finalized-json> [--candidate <dir>] [--expected-commit <sha>]',
    '  node scripts/build-visual-manifest.mjs validate [--candidate <dir>] [--expected-commit <sha>]'
  ].join('\n');
}

function parseArguments(argv){
  const command=argv[0];
  if(!['status','generate','finalize','promote','validate','help'].includes(command))fail(usage());
  const options={};
  const allowed=new Set(['candidate','metadata','expected-commit','output','source','verified-run']);
  for(let index=1;index<argv.length;index+=2){
    const flag=argv[index];
    const value=argv[index+1];
    if(!flag?.startsWith('--')||!value)fail(`invalid CLI arguments\n${usage()}`);
    const key=flag.slice(2);
    if(!allowed.has(key)||Object.hasOwn(options,key))fail(`unknown or duplicate option ${flag}`);
    options[key]=value;
  }
  return {command,options};
}

function assertCommandOptions(command,options,{allowed=[],required=[]}={}){
  const unknown=Object.keys(options).filter(key=>!allowed.includes(key));
  const missing=required.filter(key=>!Object.hasOwn(options,key));
  if(unknown.length||missing.length)fail(`${command} options mismatch; missing=[${missing.join(', ')}] unsupported=[${unknown.join(', ')}]\n${usage()}`);
}

async function main(){
  const {command,options}=parseArguments(process.argv.slice(2));
  if(command==='help'){
    assertCommandOptions(command,options);
    console.log(usage());
    return;
  }
  const candidateDir=options.candidate?path.resolve(options.candidate):DEFAULT_CANDIDATE_DIR;
  const expectedCommit=options['expected-commit']||process.env.SYLORA_VISUAL_GIT_SHA||process.env.GITHUB_SHA||undefined;
  if(expectedCommit&&!COMMIT_PATTERN.test(expectedCommit))fail('--expected-commit/SYLORA_VISUAL_GIT_SHA/GITHUB_SHA must be a lowercase 40-character commit SHA');
  if(command==='status'){
    assertCommandOptions(command,options,{allowed:['candidate']});
    const status=await inspectCandidateDirectory(candidateDir);
    console.log(JSON.stringify(status,null,2));
    if(status.status===INCOMPLETE_STATUS)process.exitCode=2;
    return;
  }
  if(command==='generate'){
    assertCommandOptions(command,options,{allowed:['candidate','metadata','expected-commit'],required:['metadata']});
    const metadata=await readJsonFile(path.resolve(options.metadata),'metadata');
    const manifest=await generateCandidateManifest({candidateDir,metadata,expectedCommit});
    console.log(JSON.stringify({status:manifest.status,fileCount:manifest.fileCount,renderedFromCommit:manifest.renderedFromCommit,manifest:path.join(candidateDir,'manifest.json')},null,2));
    return;
  }
  if(command==='finalize'){
    assertCommandOptions(command,options,{allowed:['metadata','verified-run','output','expected-commit'],required:['metadata','verified-run','output']});
    const metadata=await readJsonFile(path.resolve(options.metadata),'capture metadata');
    const verifiedRun=await readJsonFile(path.resolve(options['verified-run']),'verified run');
    const finalized=finalizeCaptureMetadata(metadata,verifiedRun,{expectedCommit});
    const output=await writeJsonAtomicExclusive(path.resolve(options.output),finalized);
    console.log(JSON.stringify({status:finalized.status,renderedFromCommit:finalized.renderedFromCommit,sourceRun:finalized.sourceRun,output},null,2));
    return;
  }
  if(command==='promote'){
    assertCommandOptions(command,options,{allowed:['source','candidate','metadata','expected-commit'],required:['source','metadata']});
    const metadata=await readJsonFile(path.resolve(options.metadata),'finalized metadata');
    const manifest=await promoteCandidateFromCapture({
      sourceDir:path.resolve(options.source),
      candidateDir,
      metadata,
      expectedCommit
    });
    console.log(JSON.stringify({status:manifest.status,fileCount:manifest.fileCount,renderedFromCommit:manifest.renderedFromCommit,manifest:path.join(candidateDir,'manifest.json')},null,2));
    return;
  }
  assertCommandOptions(command,options,{allowed:['candidate','expected-commit']});
  const manifest=await validateCandidateManifest({candidateDir,expectedCommit});
  console.log(JSON.stringify({status:manifest.status,fileCount:manifest.fileCount,renderedFromCommit:manifest.renderedFromCommit},null,2));
}

const invokedPath=process.argv[1]?path.resolve(process.argv[1]):'';
if(invokedPath===fileURLToPath(import.meta.url)){
  main().catch(error=>{
    console.error(`visual-baseline: ${error.message}`);
    process.exitCode=1;
  });
}
