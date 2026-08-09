import test from 'node:test';
import assert from 'node:assert/strict';
import { GiftGpuEngine } from '../public/gift-gpu-engine.js';

const ids=['spark','pulse','lumen-bloom','nova','dream-orbit','aurora','celestial-wing','time-gate','cosmos','infinite-sylora'];

test('all ten cinematic gifts build distinct GPU scenes and Phoenix has an articulated rig',()=>{
  const engine=Object.create(GiftGpuEngine.prototype);engine.quality='high';
  const objects=ids.map(id=>engine.build(id,'#e9b869'));
  assert.equal(objects.length,10);
  objects.forEach((object,index)=>assert.ok(object,`GPU gift missing: ${ids[index]}`));
  const phoenixRoot=objects[8],phoenix=phoenixRoot.children.find(x=>x.userData.phoenix);
  assert.ok(phoenix,'Phoenix Rebirth must contain a 3D phoenix rig');
  assert.equal(phoenix.children.filter(x=>x.userData.phoenixWing).length,2);
  assert.equal(phoenix.children.filter(x=>x.userData.phoenixTail).length,7);
  for(const object of objects)object.traverse(node=>node.geometry?.dispose?.());
});
