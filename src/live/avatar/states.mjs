import { AVATAR_STATES } from '../core/types.mjs';

/** Avatar animation hooks — UI/rig consumes these states. */
export function createAvatarController(initial = 'idle') {
  let state = AVATAR_STATES.includes(initial) ? initial : 'idle';
  let emotion = 'neutral';
  const listeners = new Set();

  return {
    getState: () => ({ state, emotion, lipSync: state === 'speaking', blink: true }),
    setState(next) {
      if (!AVATAR_STATES.includes(next)) return this.getState();
      state = next;
      for (const fn of listeners) fn(this.getState());
      return this.getState();
    },
    setEmotion(next) {
      emotion = String(next || 'neutral').slice(0, 32);
      if (['happy', 'excited', 'surprised', 'sad', 'serious', 'laughing'].includes(emotion)) {
        state = emotion;
      }
      for (const fn of listeners) fn(this.getState());
      return this.getState();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Interface for future lip-sync / facial / gesture drivers */
    hooks: {
      lipSync: true,
      facialExpressions: true,
      headMovement: true,
      eyes: true,
      blinking: true,
      emotion: true,
      bodyMovement: true,
      handGestures: true
    }
  };
}
