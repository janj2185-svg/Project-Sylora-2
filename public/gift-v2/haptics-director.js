const PROFILES=Object.freeze({micro:{duration:12,intensity:.12},contact:{duration:24,intensity:.28},heartbeat:{duration:55,intensity:.52},pressure:{duration:70,intensity:.64},climax:{duration:90,intensity:.82}});

export class HapticsDirector{
  constructor({vibrate=globalThis.navigator?.vibrate?.bind(globalThis.navigator)}={}){this.vibrate=vibrate;this.history=[]}
  trigger(profile,time=0){const spec=PROFILES[profile];if(!spec)throw new Error(`Unknown haptic profile: ${profile}`);this.history.push({profile,time,...spec});if(this.vibrate)this.vibrate(spec.duration);return spec}
}

export const HAPTIC_PROFILES=PROFILES;
