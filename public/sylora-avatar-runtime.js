const FRAME_ROOT = '/assets/avatar/sylora-v2/frames';

export const SYLORA_AVATAR_VERSION = '2.1.0';

export const SYLORA_FRAME_SRC = Object.freeze({
  neutral: `${FRAME_ROOT}/neutral.webp`,
  'blink-half': `${FRAME_ROOT}/blink-half.webp`,
  'blink-closed': `${FRAME_ROOT}/blink-closed.webp`,
  smile: `${FRAME_ROOT}/smile.webp`,
  'head-left': `${FRAME_ROOT}/head-left.webp`,
  'head-right': `${FRAME_ROOT}/head-right.webp`,
  'greeting-quarter': `${FRAME_ROOT}/greeting-quarter.webp`,
  'greeting-half': `${FRAME_ROOT}/greeting-half.webp`,
  greeting: `${FRAME_ROOT}/greeting.webp`,
  'greeting-to-explain': `${FRAME_ROOT}/greeting-to-explain.webp`,
  explain: `${FRAME_ROOT}/explain.webp`,
  'explain-speaking': `${FRAME_ROOT}/explain-speaking.webp`,
  'explain-to-listening': `${FRAME_ROOT}/explain-to-listening.webp`,
  listening: `${FRAME_ROOT}/listening.webp`,
  'listening-blink': `${FRAME_ROOT}/listening-blink.webp`,
  'listening-release': `${FRAME_ROOT}/listening-release.webp`
});

const sequence = (...steps) => Object.freeze(steps.map(([frame, atMs]) => Object.freeze({ frame, atMs })));

// Every step replaces one complete character plate. Full-body frames are never
// alpha-blended, so the fabric, silhouette and embroidered logo stay together.
export const SYLORA_GESTURE_SEQUENCES = Object.freeze({
  neutral: sequence(['neutral', 0]),
  explain: sequence(['greeting-to-explain', 0], ['explain', 140]),
  empathy: sequence(['explain-to-listening', 0], ['listening', 140]),
  welcome: sequence(['greeting-quarter', 0], ['greeting-half', 110], ['greeting', 230]),
  emphasis: sequence(['explain-speaking', 0]),
  wave: sequence(['greeting-quarter', 0], ['greeting-half', 110], ['greeting', 230]),
  thinking: sequence(['head-left', 0]),
  positive: sequence(['smile', 0])
});

const NEUTRAL_BLINK = sequence(
  ['blink-half', 0],
  ['blink-closed', 55],
  ['blink-half', 110],
  ['neutral', 165]
);

const LISTENING_BLINK = sequence(['listening-blink', 0], ['listening', 82]);

export function syloraFrameSrc(name = 'neutral') {
  return SYLORA_FRAME_SRC[name] || SYLORA_FRAME_SRC.neutral;
}

export function syloraGestureSequence(name = 'neutral') {
  return SYLORA_GESTURE_SEQUENCES[name] || SYLORA_GESTURE_SEQUENCES.neutral;
}

export function syloraRestingFrame(name = 'neutral') {
  const steps = syloraGestureSequence(name);
  return steps[steps.length - 1].frame;
}

export function syloraBlinkSequence(name = 'neutral') {
  if (name === 'neutral') return NEUTRAL_BLINK;
  if (name === 'empathy') return LISTENING_BLINK;
  return Object.freeze([]);
}

export function preloadSyloraAvatarFrames(ImageCtor = globalThis.Image) {
  if (typeof ImageCtor !== 'function') return [];
  return Object.entries(SYLORA_FRAME_SRC).map(([frame, src]) => {
    const image = new ImageCtor();
    image.decoding = 'async';
    image.dataset.frame = frame;
    image.src = src;
    return image;
  });
}
