import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const NEUTRAL_URL='/assets/avatar/sylora-v2/frames/neutral.webp';
const NEUTRAL_SHA256='fcdf723ea0d3290e81d2228202d9dc8003a2934e0f35d730cd3d49c86c5ccbf9';

test('static delivery serves canonical avatar WebP with a safe media type and immutable cache',async()=>{
  process.env.NODE_ENV='test';
  process.env.DATABASE_URL='';
  process.env.REDIS_URL='';
  process.env.OPENAI_API_KEY='';
  const {server}=await import(`../src/server.mjs?avatar-runtime=${Date.now()}`);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));

  try{
    const {port}=server.address();
    const response=await fetch(`http://127.0.0.1:${port}${NEUTRAL_URL}`);
    const webp=Buffer.from(await response.arrayBuffer());
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/webp');
    assert.equal(response.headers.get('cache-control'),'public, max-age=31536000, immutable');
    assert.equal(Number(response.headers.get('content-length')),webp.length);
    assert.equal(webp.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(webp.subarray(8,12).toString('ascii'),'WEBP');
    assert.equal(crypto.createHash('sha256').update(webp).digest('hex'),NEUTRAL_SHA256);

    const manifestResponse=await fetch(`http://127.0.0.1:${port}/assets/avatar/sylora-v2/runtime.json`);
    assert.equal(manifestResponse.headers.get('content-type'),'application/json; charset=utf-8');
    assert.equal((await manifestResponse.json()).logo.separateOverlay,false);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
