import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SYLORA_FRAME_SRC, SYLORA_GESTURE_SEQUENCES } from '../public/sylora-avatar-runtime.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(repoRoot, 'public/assets/avatar/sylora-v2/runtime.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function webpDimensions(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const kind = bytes.subarray(offset, offset + 4).toString('ascii');
    const size = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    if (kind === 'VP8 ') {
      assert.equal(bytes.subarray(payload + 3, payload + 6).toString('hex'), '9d012a');
      return {
        width: bytes.readUInt16LE(payload + 6) & 0x3fff,
        height: bytes.readUInt16LE(payload + 8) & 0x3fff
      };
    }
    offset = payload + size + (size % 2);
  }
  throw new Error('Unsupported WebP bitstream: expected a lossy VP8 frame');
}

assert.equal(manifest.renderMode, 'single_plate_2d_fallback');
assert.equal(manifest.isRigged3DModel, false);
assert.equal(manifest.logo.separateOverlay, false);
assert.equal(manifest.motion.fullBodyFrameReplacementOnly, true);
assert.equal(manifest.motion.crossFadeBetweenBodyPlates, false);
assert.deepEqual(Object.keys(manifest.frameSha256).sort(), Object.keys(SYLORA_FRAME_SRC).sort());

let totalBytes = 0;
const frames = [];
for (const [name, source] of Object.entries(SYLORA_FRAME_SRC)) {
  const file = path.join(repoRoot, 'public', source.replace(/^\//, ''));
  const bytes = fs.readFileSync(file);
  const dimensions = webpDimensions(bytes);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.deepEqual(dimensions, { width: manifest.frame.width, height: manifest.frame.height }, name);
  assert.equal(sha256, manifest.frameSha256[name], name);
  totalBytes += bytes.length;
  frames.push({ name, bytes: bytes.length, sha256 });
}

for (const [gesture, steps] of Object.entries(SYLORA_GESTURE_SEQUENCES)) {
  assert.ok(steps.length > 0, gesture);
  assert.equal(steps[0].atMs, 0, gesture);
  let previous = -1;
  for (const step of steps) {
    assert.ok(Object.hasOwn(SYLORA_FRAME_SRC, step.frame), `${gesture}:${step.frame}`);
    assert.ok(step.atMs >= previous, `${gesture}:${step.atMs}`);
    previous = step.atMs;
  }
}

assert.ok(totalBytes <= 512 * 1024, `avatar frame budget exceeded: ${totalBytes}`);
assert.equal(fs.existsSync(path.join(repoRoot, 'public/assets/sylora-avatar-v2-base.png')), false);
assert.equal(fs.existsSync(path.join(repoRoot, 'public/assets/gestures')), false);

console.log(JSON.stringify({
  status: 'PASS',
  assetVersion: manifest.assetVersion,
  renderMode: manifest.renderMode,
  frameCount: frames.length,
  dimensions: { width: manifest.frame.width, height: manifest.frame.height },
  totalBytes,
  budgetBytes: 512 * 1024,
  rigged3D: manifest.isRigged3DModel,
  logoOverlay: manifest.logo.separateOverlay
}, null, 2));
