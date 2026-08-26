import {createHash,randomUUID} from 'node:crypto';
import {linkSync,lstatSync,mkdirSync,readFileSync,readdirSync,renameSync,rmSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {
  BASELINE_LOCALE,
  EXPECTED_PNG_COUNT,
  VIEWPORTS,
  VISUAL_BROWSER_DISTRIBUTION,
  VISUAL_BROWSER_EXECUTABLE,
  VISUAL_BROWSER_REVISION,
  VISUAL_BROWSER_VERSION,
  VISUAL_COMPOSITOR_SCHEDULING,
  VISUAL_PLAYWRIGHT_VERSION,
  VISUAL_SCREENSHOT_BACKEND,
  VisualBaselineContractError,
  expectedRelativePngPaths,
  inspectPngBuffer,
  validateRawCaptureRecord
} from './build-visual-manifest.mjs';

export const VISUAL_CAPTURE_LEDGER_SCHEMA_VERSION=2;
export const VISUAL_CAPTURE_LEDGER_DIRECTORY='capture-ledger';

const COMMIT_PATTERN=/^[a-f0-9]{40}$/;
const ALLOWED_OUTPUT_METADATA=new Set(['metadata.json','capture-metadata.json']);

function fail(message){throw new VisualBaselineContractError(`visual capture ledger: ${message}`)}

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

function validateCommit(value,label='renderedFromCommit'){
  if(typeof value!=='string'||!COMMIT_PATTERN.test(value))fail(`${label} must be a lowercase 40-character commit SHA`);
  return value;
}

function validateRunMode(value,label='runMode'){
  if(!['capture','repeat'].includes(value))fail(`${label} must be capture or repeat`);
  return value;
}

function validateBrowser(browser,label='browser'){
  requireExactObject(browser,label,[
    'name','distribution','revision','executable','screenshotBackend','compositorScheduling','version','playwrightVersion'
  ]);
  if(browser.name!=='chromium')fail(`${label}.name must be chromium`);
  if(browser.distribution!==VISUAL_BROWSER_DISTRIBUTION)fail(`${label}.distribution must be ${VISUAL_BROWSER_DISTRIBUTION}`);
  if(browser.revision!==VISUAL_BROWSER_REVISION)fail(`${label}.revision must be ${VISUAL_BROWSER_REVISION}`);
  if(browser.executable!==VISUAL_BROWSER_EXECUTABLE)fail(`${label}.executable must be ${VISUAL_BROWSER_EXECUTABLE}`);
  if(browser.screenshotBackend!==VISUAL_SCREENSHOT_BACKEND)fail(`${label}.screenshotBackend must be ${VISUAL_SCREENSHOT_BACKEND}`);
  if(browser.compositorScheduling!==VISUAL_COMPOSITOR_SCHEDULING){
    fail(`${label}.compositorScheduling must be ${VISUAL_COMPOSITOR_SCHEDULING}`);
  }
  if(browser.version!==VISUAL_BROWSER_VERSION)fail(`${label}.version must be ${VISUAL_BROWSER_VERSION}`);
  if(browser.playwrightVersion!==VISUAL_PLAYWRIGHT_VERSION)fail(`${label}.playwrightVersion must be ${VISUAL_PLAYWRIGHT_VERSION}`);
  return structuredClone(browser);
}

function validateRunner(runner,label='runner'){
  requireExactObject(runner,label,['platform','arch','release']);
  for(const field of ['platform','arch','release'])requireString(runner[field],`${label}.${field}`);
  return structuredClone(runner);
}

function slash(value){return value.split(path.sep).join('/')}

function resolveDisjointRoots(resultsRoot,outputRoot){
  const resultsDirectory=path.resolve(resultsRoot);
  const outputDirectory=path.resolve(outputRoot);
  const contains=(parent,candidate)=>{
    const relative=path.relative(parent,candidate);
    return relative===''||(!relative.startsWith('..')&&!path.isAbsolute(relative));
  };
  if(contains(resultsDirectory,outputDirectory)||contains(outputDirectory,resultsDirectory)){
    fail('resultsRoot and outputRoot must be disjoint directories');
  }
  return {resultsDirectory,outputDirectory};
}

function ledgerRelativePath(pngPath){
  const normalized=slash(pngPath);
  if(!expectedRelativePngPaths().includes(normalized))fail(`PNG path is not canonical: ${normalized}`);
  return normalized.replace(/\.png$/,'.json');
}

function walkFiles(root){
  const output=[];
  function visit(directory,prefix){
    let entries;
    try{entries=readdirSync(directory,{withFileTypes:true})}
    catch(error){
      if(error?.code==='ENOENT'&&directory===root)return;
      throw error;
    }
    entries.sort((left,right)=>left.name.localeCompare(right.name));
    for(const entry of entries){
      const relative=prefix?`${prefix}/${entry.name}`:entry.name;
      const absolute=path.join(directory,entry.name);
      const stat=lstatSync(absolute);
      if(stat.isSymbolicLink())fail(`symbolic links are forbidden: ${relative}`);
      if(entry.isDirectory())visit(absolute,relative);
      else if(entry.isFile())output.push(relative);
      else fail(`unsupported filesystem entry: ${relative}`);
    }
  }
  visit(root,'');
  return output;
}

function readJson(filePath,label){
  try{return JSON.parse(readFileSync(filePath,'utf8'))}
  catch(error){fail(`${label} JSON cannot be parsed: ${error.message}`)}
}

function verifyRecordPng(outputRoot,record){
  const absolutePath=path.join(outputRoot,...record.file.split('/'));
  let bytes;
  try{bytes=readFileSync(absolutePath)}
  catch(error){fail(`PNG for ${record.file} cannot be read: ${error.message}`)}
  const inspected=inspectPngBuffer(bytes,record.file);
  const viewport=VIEWPORTS.find(item=>item.id===record.viewport);
  if(
    bytes.length!==record.bytes||
    createHash('sha256').update(bytes).digest('hex')!==record.sha256||
    inspected.width!==viewport.width*viewport.devicePixelRatio||
    inspected.height<viewport.height*viewport.devicePixelRatio||
    inspected.width*inspected.height!==record.paintStability.rasterPixelsCompared
  )fail(`PNG digest/size/dimensions do not match ${record.file}`);
}

function normalizeEntry(entry,{expectedCommit,expectedRunMode,expectedSidecar}={}){
  requireExactObject(entry,'entry',['schemaVersion','renderedFromCommit','runMode','browser','runner','record']);
  if(entry.schemaVersion!==VISUAL_CAPTURE_LEDGER_SCHEMA_VERSION){
    fail(`entry.schemaVersion must be ${VISUAL_CAPTURE_LEDGER_SCHEMA_VERSION}`);
  }
  validateCommit(entry.renderedFromCommit,'entry.renderedFromCommit');
  validateRunMode(entry.runMode,'entry.runMode');
  if(expectedCommit&&entry.renderedFromCommit!==expectedCommit)fail(`entry commit ${entry.renderedFromCommit} does not match ${expectedCommit}`);
  if(expectedRunMode&&entry.runMode!==expectedRunMode)fail(`entry runMode ${entry.runMode} does not match ${expectedRunMode}`);
  const record=validateRawCaptureRecord(entry.record);
  if(expectedSidecar&&ledgerRelativePath(record.file)!==expectedSidecar){
    fail(`entry path ${record.file} does not match sidecar ${expectedSidecar}`);
  }
  return {
    schemaVersion:VISUAL_CAPTURE_LEDGER_SCHEMA_VERSION,
    renderedFromCommit:entry.renderedFromCommit,
    runMode:entry.runMode,
    browser:validateBrowser(entry.browser,'entry.browser'),
    runner:validateRunner(entry.runner,'entry.runner'),
    record
  };
}

export function persistVisualCaptureLedgerEntry({resultsRoot,outputRoot,record,browser,runner,renderedFromCommit,runMode}){
  if(!resultsRoot||!outputRoot)fail('resultsRoot and outputRoot are required');
  const {resultsDirectory,outputDirectory}=resolveDisjointRoots(resultsRoot,outputRoot);
  validateCommit(renderedFromCommit);
  validateRunMode(runMode);
  const normalizedRecord=validateRawCaptureRecord(record);
  const entry=normalizeEntry({
    schemaVersion:VISUAL_CAPTURE_LEDGER_SCHEMA_VERSION,
    renderedFromCommit,
    runMode,
    browser,
    runner,
    record:normalizedRecord
  },{expectedCommit:renderedFromCommit,expectedRunMode:runMode});
  verifyRecordPng(outputDirectory,entry.record);
  const target=path.join(resultsDirectory,VISUAL_CAPTURE_LEDGER_DIRECTORY,...ledgerRelativePath(entry.record.file).split('/'));
  mkdirSync(path.dirname(target),{recursive:true});
  const temporary=path.join(path.dirname(target),`.${path.basename(target)}-${process.pid}-${randomUUID()}.tmp`);
  try{
    writeFileSync(temporary,`${JSON.stringify(entry,null,2)}\n`,{flag:'wx'});
    try{linkSync(temporary,target)}
    catch(error){
      if(error?.code==='EEXIST')fail(`refusing to overwrite ledger sidecar for ${entry.record.file}`);
      throw error;
    }
  }finally{
    rmSync(temporary,{force:true});
  }
  return target;
}

export function aggregateVisualCaptureLedger({resultsRoot,outputRoot,expectedCommit,expectedRunMode,observedBrowser,observedRunner}){
  if(!resultsRoot||!outputRoot)fail('resultsRoot and outputRoot are required');
  const {resultsDirectory,outputDirectory}=resolveDisjointRoots(resultsRoot,outputRoot);
  validateCommit(expectedCommit,'expectedCommit');
  validateRunMode(expectedRunMode,'expectedRunMode');
  const normalizedObservedBrowser=observedBrowser?validateBrowser(observedBrowser,'observedBrowser'):null;
  const normalizedObservedRunner=validateRunner(observedRunner,'observedRunner');
  const ledgerRoot=path.join(resultsDirectory,VISUAL_CAPTURE_LEDGER_DIRECTORY);
  const expectedPaths=expectedRelativePngPaths();
  const expectedSidecars=new Set(expectedPaths.map(ledgerRelativePath));
  const sidecarFiles=walkFiles(ledgerRoot);
  const entries=[];
  const seen=new Set();
  let consensusBrowser=null;
  let consensusRunner=null;

  for(const relative of sidecarFiles){
    if(!expectedSidecars.has(relative))fail(`unexpected ledger sidecar: ${relative}`);
    const entry=normalizeEntry(readJson(path.join(ledgerRoot,...relative.split('/')),relative),{
      expectedCommit,
      expectedRunMode,
      expectedSidecar:relative
    });
    if(seen.has(entry.record.file))fail(`duplicate ledger record: ${entry.record.file}`);
    seen.add(entry.record.file);
    if(consensusBrowser&&!isDeepStrictEqual(consensusBrowser,entry.browser))fail(`browser fingerprint drifted at ${entry.record.file}`);
    if(consensusRunner&&!isDeepStrictEqual(consensusRunner,entry.runner))fail(`runner fingerprint drifted at ${entry.record.file}`);
    consensusBrowser||=entry.browser;
    consensusRunner||=entry.runner;
    verifyRecordPng(outputDirectory,entry.record);
    entries.push(entry);
  }

  if(consensusBrowser&&normalizedObservedBrowser&&!isDeepStrictEqual(consensusBrowser,normalizedObservedBrowser)){
    fail('observed browser fingerprint drifted from durable ledger');
  }
  if(consensusRunner&&!isDeepStrictEqual(consensusRunner,normalizedObservedRunner)){
    fail('observed runner fingerprint drifted from durable ledger');
  }

  const outputFiles=walkFiles(outputDirectory);
  const physicalPngs=[];
  for(const relative of outputFiles){
    if(relative.endsWith('.png')){
      if(!expectedPaths.includes(relative))fail(`unexpected candidate PNG: ${relative}`);
      physicalPngs.push(relative);
    }else if(!ALLOWED_OUTPUT_METADATA.has(relative)){
      fail(`unexpected candidate output file: ${relative}`);
    }
  }
  const physicalSet=new Set(physicalPngs);
  const recordSet=new Set(entries.map(entry=>entry.record.file));
  const pngWithoutRecord=physicalPngs.filter(relative=>!recordSet.has(relative));
  const recordWithoutPng=[...recordSet].filter(relative=>!physicalSet.has(relative));
  if(pngWithoutRecord.length||recordWithoutPng.length){
    fail(`ledger/output mismatch; pngWithoutRecord=[${pngWithoutRecord.join(', ')}] recordWithoutPng=[${recordWithoutPng.join(', ')}]`);
  }

  const order=new Map(expectedPaths.map((relative,index)=>[relative,index]));
  const records=entries.map(entry=>entry.record).sort((left,right)=>order.get(left.file)-order.get(right.file));
  return {
    records,
    actualFiles:records.length,
    expectedFiles:EXPECTED_PNG_COUNT,
    complete:records.length===EXPECTED_PNG_COUNT,
    browser:structuredClone(consensusBrowser||normalizedObservedBrowser),
    runner:structuredClone(consensusRunner||normalizedObservedRunner)
  };
}

export function writeJsonAtomicReplace(filePath,value){
  const target=path.resolve(filePath);
  mkdirSync(path.dirname(target),{recursive:true});
  const temporary=path.join(path.dirname(target),`.${path.basename(target)}-${process.pid}-${randomUUID()}.tmp`);
  try{
    writeFileSync(temporary,`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});
    renameSync(temporary,target);
  }finally{
    rmSync(temporary,{force:true});
  }
  return target;
}
