import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const server=await readFile(new URL('../src/server.mjs',import.meta.url),'utf8');
const sseBackpressure=await readFile(new URL('../src/sse-backpressure.mjs',import.meta.url),'utf8');
const studioCss=await readFile(new URL('../public/design-studio-2026.css',import.meta.url),'utf8');
const bridgeCss=await readFile(new URL('../public/living-horizon-bridge.css',import.meta.url),'utf8');
const studioMigration=await readFile(new URL('../infra/postgres/migrations/016_studio_scenes.sql',import.meta.url),'utf8');

const profileObject=app.match(/const STUDIO_PROFILES=(\{[\s\S]*?\n\});\nconst STUDIO_P2P_PEER_LIMIT/)?.[1];
assert.ok(profileObject,'Studio profile object is missing');
const profiles=Function(`"use strict";return (${profileObject})`)();
const serverProfileBlock=server.match(/const STUDIO_PROFILE_IDS = new Set\(\[([\s\S]*?)\]\);/)?.[1]||'';
const serverProfiles=[...serverProfileBlock.matchAll(/'([^']+)'/g)].map(match=>match[1]);

test('Studio output profiles cover SD through 4K and stay aligned with API validation',()=>{
  assert.deepEqual(Object.keys(profiles),serverProfiles);
  assert.deepEqual(Object.fromEntries(Object.entries(profiles).map(([id,{width,height,fps}])=>[id,{width,height,fps}])),{
    vertical480:{width:480,height:854,fps:30},vertical720:{width:720,height:1280,fps:30},vertical1080:{width:1080,height:1920,fps:30},vertical1080p60:{width:1080,height:1920,fps:60},
    horizontal480:{width:854,height:480,fps:30},horizontal720:{width:1280,height:720,fps:30},horizontal1080:{width:1920,height:1080,fps:30},horizontal1080p60:{width:1920,height:1080,fps:60},
    square1080:{width:1080,height:1080,fps:30},portrait4x5:{width:1080,height:1350,fps:30},horizontal1440:{width:2560,height:1440,fps:30},horizontal2160:{width:3840,height:2160,fps:30}
  });
  const migrationProfileBlock=studioMigration.match(/CHECK\(profile_id IN \(([\s\S]*?)\)\)/)?.[1]||'',migrationProfiles=[...migrationProfileBlock.matchAll(/'([^']+)'/g)].map(match=>match[1]);
  assert.deepEqual(migrationProfiles,Object.keys(profiles));
  assert.equal(profiles.horizontal1440.conditional,true);
  assert.equal(profiles.horizontal2160.conditional,true);
});

test('Studio source replacement preserves the active source until new capture succeeds',()=>{
  const start=app.slice(app.indexOf('async function startStudioSource'),app.indexOf('async function setupStudioAudio'));
  assert.match(start,/if\(studioMediaBusy\(\)\)return toast\(t\('sourceChangeBlocked'\)\)/);
  assert.ok(start.indexOf('await acquireStudioSource')<start.indexOf('previous?.getTracks().forEach'),'old tracks must stop only after the replacement is acquired');
  assert.match(start,/requestId!==studioSourceRequestId\|\|state\.view!=='studio'/);
  assert.match(app,/getDisplayMedia\([\s\S]*?getUserMedia\(\{audio:audioConstraints\}\)[\s\S]*?new MediaStream\(\[\.\.\.display\.getVideoTracks\(\),\.\.\.display\.getAudioTracks\(\),\.\.\.\(microphone\?\.getAudioTracks\(\)\|\|\[\]\)\]\)/);
  assert.match(app,/sources=tracks\.map\(track=>context\.createMediaStreamSource\(new MediaStream\(\[track\]\)\)\)/);
  assert.match(start,/await video\.play\(\)[\s\S]*?videoTrack\.readyState!=='live'/);
  assert.match(app,/requestId===studioSourceRequestId&&stream===studioSourceStream/);
});

test('Studio locks source, scene, and profile changes during REC or LIVE',()=>{
  assert.match(app,/function studioMediaBusy\(\)\{return studioRecorder\?\.state==='recording'\|\|studioRecordingFinalizing\|\|studioBroadcastPending\|\|studioBroadcastStopping\|\|Boolean\(studioBroadcastStream\)\}/);
  assert.match(app,/if\(profile\)profile\.disabled=locked;if\(scene\)scene\.disabled=locked/);
  assert.match(app,/function requestStopStudioSource\(\)\{if\(studioMediaBusy\(\)\)return toast\(t\('sourceChangeBlocked'\)\)/);
  assert.match(app,/if\(studioMediaBusy\(\)\|\|studioSourceRequestPending\)/);
  assert.match(app,/studioRecordingFinalizing=true[\s\S]*?studioRecorder\.stop\(\)/);
  assert.match(app,/const \{epoch,hostPeerId,broadcastStream\}=session/);
  assert.match(app,/if\(studioSourceRequestPending\)return toast\(t\('sourceChangeBlocked'\)\)/);
  assert.match(app,/releaseStudioHost\(leavingLiveId,leavingHostPeerId,leavingStreamToken\)/);
  assert.match(app,/function stopStudioBroadcast\(\)\{if\(studioBroadcastStopping\)return studioBroadcastCleanup/);
  assert.match(app,/releaseAuthorized=studioBroadcastHostAcquired/);
  assert.match(app,/releaseAuthorized\?releaseStudioHost\(leavingLiveId,leavingHostPeerId,leavingStreamToken\):true/);
  assert.doesNotMatch(app,/if\(!studioBroadcastIsCurrent\([^)]+\)\)\{await releaseStudioHost/);
  assert.match(app,/const controller=new AbortController\(\),timeout=setTimeout\(\(\)=>controller\.abort\(\),1_200\)/);
  assert.match(app,/sendLiveSignal\(liveId,'host-left',hostPeerId,null,null,\{signal:controller\.signal,streamToken\}\)/);
});

test('Studio preserves active media DOM and ignores stale async renders',()=>{
  assert.match(app,/studioRenderEpoch\+\+;stopStudioTracks\(\)/);
  assert.match(app,/if\(app\.querySelector\('\.studio-reference-layout'\)&&\(studioSourceStream\|\|studioSourceRequestPending\|\|studioMediaBusy\(\)/);
  assert.match(app,/const renderEpoch=\+\+studioRenderEpoch/);
  assert.match(app,/if\(renderEpoch!==studioRenderEpoch\|\|state\.view!=='studio'\|\|!state\.me\)return/);
});

test('Studio preview readiness is derived from real source state',()=>{
  assert.match(app,/class="studio-stage" data-source-state="idle"/);
  assert.match(app,/setStudioSourceState\('ready','sourceReady'/);
  assert.match(app,/setStudioSourceState\('idle','sourceOff'\)/);
  assert.match(studioCss,/\.studio-stage\[data-source-state="ready"\]:before\{content:"PROGRAM PREVIEW  •  READY"/);
  assert.match(studioCss,/\.studio-stage\[data-source-state="error"\]:before\{content:"PROGRAM PREVIEW  •  SOURCE ERROR"/);
});

test('LIVE signaling uses authenticated fetch SSE while public engagement stays separate',()=>{
  assert.match(app,/fetch\(`\/api\/live\/\$\{encodeURIComponent\(liveId\)\}\/signals`,\{headers:\{authorization:`Bearer \$\{state\.token\}`,'x-sylora-peer-id':peerId,'x-sylora-peer-role':role\}/);
  assert.match(app,/liveViewerPublicSource=new EventSource\(`\/api\/live\/\$\{id\}\/events`\)/);
  assert.match(app,/liveViewerPendingIce\.push\(\{fromPeerId:s\.fromPeerId,data:s\.data\}\)/);
  assert.match(app,/replacePeer=!sameHost\|\|\['failed','closed'\]\.includes\(liveViewerPeer\.connectionState\),exactDuplicate=!replacePeer&&liveViewerPeer\.remoteDescription\?\.sdp===s\.data\?\.sdp/);
  assert.match(app,/entry\.pending\.length<64&&Date\.now\(\)-entry\.createdAt<30_000/);
  assert.doesNotMatch(app,/\/signal-access/);
  assert.match(server,/if\(type==='signal'\)[\s\S]*?const targets=liveSignalStreams\.get\(liveId\)\?\.get\(targetPeerId\)/);
  assert.match(server,/const user=await requireUser\(req,res\);if\(!user\)return;const live=await findLiveRoom\(m\.id\)/);
  assert.match(server,/liveFanout\.emitReliable\(live\.id,'signal',signal\)/);
  assert.match(server,/liveHostRegistry\.acquireStream\(live\.id,peerId,user\.id,hostStreamId\)/);
  assert.match(server,/liveHostRegistry\.renewStream\(live\.id,peerId,user\.id,hostStreamId\)/);
  assert.match(server,/'x-sylora-host-stream-token':hostStreamId/);
  assert.match(server,/hostOriginated&&!await liveHostRegistry\.renewStream\(live\.id,fromPeerId,user\.id,hostStreamToken\)/);
  assert.match(server,/liveHostRegistry\.releaseStream\(live\.id,fromPeerId,user\.id,hostStreamToken\)/);
  assert.match(server,/event: room-closed\\ndata:/);
  assert.match(server,/const liveSignalSse = createBoundedSseWriter\(\)/);
  assert.match(server,/if\(liveSignalSse\.write\(res,payload\)\)delivered=true/);
  assert.match(server,/liveSignalSse\.end\(target,payload\)/);
  assert.doesNotMatch(server,/if\(!res\.write\(payload\)\)res\.end\(\)/);
  assert.match(sseBackpressure,/if \(current\.queued\) return false/);
  assert.match(sseBackpressure,/response\.once\('drain', state\.onDrain\)/);
  assert.match(sseBackpressure,/state\.timer = setTimeout\(\(\) => forceClose\(response\), drainDeadline\)/);
  assert.match(sseBackpressure,/state\.queued = \{ payload: normalized, terminal: true \}/);
  assert.match(app,/const terminal=type==='room-closed'\|\|type==='session-revoked'\|\|type==='host-fence-lost'/);
  assert.match(app,/pending\.addEventListener\('room-closed'/);
  assert.match(app,/pending\.addEventListener\('session-revoked'/);
  assert.match(app,/response\.status===401\|\|response\.status===403/);
});

test('Studio host signaling is fenced to the exact authenticated stream generation',()=>{
  assert.match(app,/body:JSON\.stringify\(\{kind,fromPeerId,toPeerId,data,\.\.\.\(streamToken\?\{streamToken\}:\{\}\)\}\)/);
  assert.match(app,/response\.headers\.get\('x-sylora-host-stream-token'\)/);
  assert.match(app,/source\.streamToken=streamToken/);
  assert.match(app,/sendStudioHostSignal\(liveId,'host-ready'/);
  assert.match(app,/sendStudioHostSignal\(liveId,'offer'/);
  assert.match(app,/sendStudioHostSignal\(liveId,'viewer-rejected'/);
  assert.match(app,/sendStudioHostSignal\(liveId,'ice'/);
  assert.match(app,/source\.streamToken===streamToken\)source\.reportHostFenceConflict\(streamToken\)/);
  assert.match(app,/replacement!==streamToken&&validLiveHostStreamToken\(replacement\)&&!source\.hostFenceLost&&attempt===0/);
  assert.match(app,/hostFenceConflictTimer=setTimeout\([\s\S]*?3_500/);
  assert.match(app,/pendingFence\?'LIVE_SIGNAL_HOST_FENCE_PENDING':fenceConflict\?'LIVE_SIGNAL_HOST_FENCE_LOST'/);
  assert.match(app,/pending\.addEventListener\('host-fence-lost',\(\)=>terminate\('fence'\)\)/);
});

test('session revocation stops Studio device capture while room closure preserves preview',()=>{
  const terminalStart=app.indexOf('const terminate=reason=>',app.indexOf('async function startStudioBroadcast'));
  const terminalEnd=app.indexOf("pending.addEventListener('room-closed'",terminalStart);
  const terminalHandler=app.slice(terminalStart,terminalEnd);
  const stopTracksStart=app.indexOf('function stopStudioTracks');
  const stopTracksEnd=app.indexOf('function startStudioRecording',stopTracksStart);
  const stopTracks=app.slice(stopTracksStart,stopTracksEnd);
  assert.ok(terminalStart>=0&&terminalEnd>terminalStart,'Studio terminal handler must exist');
  assert.match(terminalHandler,/revoked=reason==='revoked',cleanup=revoked\?stopStudioTracks\(\):stopStudioBroadcast\(\)/);
  assert.match(stopTracks,/if\(studioRecorder\?\.state==='recording'\)stopStudioRecording\(\)/);
  assert.match(stopTracks,/stopStudioAudio\(\)/);
  assert.match(stopTracks,/studioSourceStream\?\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\)/);
  assert.match(stopTracks,/return broadcastCleanup/);
});

test('Studio tablet sheets override the desktop inspector cascade through 900px',()=>{
  assert.match(bridgeCss,/@media \(max-width:900px\)\{[\s\S]*?\.studio-reference-layout \.studio-controls>\.card\{display:none!important\}/);
  assert.match(bridgeCss,/\.studio-reference-layout \.studio-controls>\.card\[data-studio-open="true"\]\{display:grid!important/);
});
