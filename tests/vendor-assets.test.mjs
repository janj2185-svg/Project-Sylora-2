import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const vendorDir=fileURLToPath(new URL('../public/vendor/three/',import.meta.url));

test('vendored Three.js entry point ships every relative runtime dependency',()=>{
  const modulePath=path.join(vendorDir,'three.module.js'),source=fs.readFileSync(modulePath,'utf8');
  const imports=[...source.matchAll(/from\s+['"](\.\/[^'"]+)['"]/g)].map(match=>match[1]);
  assert.ok(imports.length>0,'three.module.js must declare its relative runtime dependencies');
  for(const relative of new Set(imports)){
    const dependency=path.resolve(vendorDir,relative);
    assert.ok(dependency.startsWith(vendorDir),`unsafe vendor dependency: ${relative}`);
    assert.ok(fs.existsSync(dependency),`missing Three.js vendor dependency: ${relative}`);
    assert.ok(fs.statSync(dependency).size>1024,`empty/incomplete Three.js vendor dependency: ${relative}`);
  }
});
