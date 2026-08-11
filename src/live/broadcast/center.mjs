/**
 * Broadcast Center — device & quality state (browser executes getUserMedia).
 * Server stores preferences + honesty about permissions.
 */

export function defaultBroadcastPrefs() {
  return {
    cameraId: null,
    microphoneId: null,
    speakerId: null,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    quality: '720p',
    layout: 'solo', // solo | guest_split | grid
    screenShare: false,
    connectionQuality: 'unknown'
  };
}

export function normalizeBroadcastPrefs(input = {}) {
  const base = defaultBroadcastPrefs();
  const quality = ['360p', '480p', '720p', '1080p'].includes(input.quality) ? input.quality : base.quality;
  const layout = ['solo', 'guest_split', 'grid'].includes(input.layout) ? input.layout : base.layout;
  return {
    ...base,
    ...input,
    quality,
    layout,
    noiseSuppression: input.noiseSuppression !== false,
    echoCancellation: input.echoCancellation !== false,
    autoGainControl: input.autoGainControl !== false,
    screenShare: !!input.screenShare
  };
}

export function broadcastCapabilities() {
  return {
    cameraSelection: 'WORKING_BROWSER',
    microphoneSelection: 'WORKING_BROWSER',
    speakerOutput: 'WORKING_BROWSER',
    preview: 'WORKING_BROWSER',
    micMeter: 'WORKING_BROWSER',
    noiseSuppression: 'WORKING_BROWSER',
    echoCancellation: 'WORKING_BROWSER',
    permissions: 'WORKING_BROWSER',
    screenShare: 'WORKING_BROWSER',
    guestLayout: 'PARTIAL',
    streamQuality: 'WORKING',
    connectionQuality: 'PARTIAL',
    note: 'Device capture runs in the browser. Guest WebRTC uses existing Call/LIVE peer paths.'
  };
}

export function guestSessionStub() {
  return {
    roles: ['host', 'co_host', 'guest'],
    features: {
      invite: 'WORKING_SYLORA',
      waitingRoom: 'PARTIAL',
      mute: 'WORKING_SYLORA',
      cameraToggle: 'WORKING_SYLORA',
      removeGuest: 'WORKING_SYLORA',
      layoutSwitch: 'PARTIAL',
      externalPlatformGuests: 'UNAVAILABLE'
    },
    note: 'Sylora-native WebRTC guests only. Do not claim TikTok/YouTube guest APIs.'
  };
}
