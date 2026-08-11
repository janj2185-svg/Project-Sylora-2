/** Contextual gift reaction plans — varied, not identical every time. */

const TEMPLATES = {
  uk: [
    (n, g) => `Вау, ${n}! ${g} саме вчасно.`,
    (n, g) => `${n}, дякую за ${g} — чат це відчуває.`,
    (n, g) => `Це було красиво, ${n}. ${g} запам’ятаємо.`
  ],
  en: [
    (n, g) => `Wow, ${n}! ${g} landed perfectly.`,
    (n, g) => `${n}, thank you for the ${g}.`,
    (n, g) => `That ${g} from ${n} just lit up the room.`
  ],
  pl: [
    (n, g) => `Wow, ${n}! ${g} w idealnym momencie.`,
    (n, g) => `${n}, dzięki za ${g}.`
  ]
};

export function planGiftReaction(event, { language = 'uk', historyCount = 0 } = {}) {
  const name = event?.displayName || event?.username || 'friend';
  const giftName = event?.gift?.name || event?.gift?.id || 'gift';
  const lang = TEMPLATES[language] ? language : 'uk';
  const list = TEMPLATES[lang];
  const idx = Math.abs((historyCount + String(name).length + String(giftName).length)) % list.length;
  const text = list[idx](name, giftName);
  const amount = Number(event?.amount) || 0;
  return {
    text,
    language: lang,
    avatarEmotion: amount >= 500 ? 'excited' : amount >= 100 ? 'happy' : 'surprised',
    effects: [
      { type: 'animation', id: amount >= 1000 ? 'legendary_burst' : 'gift_spark' },
      { type: 'sfx', id: amount >= 500 ? 'gift_epic' : 'gift_chime' },
      ...(amount >= 100 ? [{ type: 'overlay', id: 'gift_banner' }] : []),
      { type: 'leaderboard_update' },
      { type: 'goal_update' }
    ],
    varied: true
  };
}
