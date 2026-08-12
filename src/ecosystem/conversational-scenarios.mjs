/**
 * Conversational naturalness scenarios — structural QA harness.
 * Live OpenAI scoring is optional (requires OPENAI_API_KEY).
 * Naturalness is scored separately from factual correctness.
 */

export const CONVERSATION_SCENARIOS = Object.freeze([
  { id: 'casual_hi', category: 'casual', user: 'Привіт', expect: { maxLenHint: 180, emotion: 'neutral', avoid: [/як я можу допомогти/i, /я — sylora/i] } },
  { id: 'casual_day', category: 'casual', user: 'Як твій день?', expect: { avoid: [/список/i, /1\./] } },
  { id: 'humor_light', category: 'humor', user: 'Розкажи легкий жарт про каву', expect: { avoid: [/як експерт/i] } },
  { id: 'sad_user', category: 'sad', user: 'Мені сьогодні дуже сумно і важко', expect: { emotion: 'concerned', avoid: [/просто усміхнись/i, /список кроків/i] } },
  { id: 'sad_listen', category: 'sad', user: 'Не хочу порад. Просто побудь поруч.', expect: { emotion: 'concerned', maxLenHint: 220 } },
  { id: 'happy_user', category: 'happy', user: 'У мене супер новини, я здала іспит!!!', expect: { emotion: 'happy' } },
  { id: 'happy_share', category: 'happy', user: 'Дякую що поруч ❤️', expect: { emotion: 'happy' } },
  { id: 'live_chat', category: 'live', user: 'У LIVE зараз тихо. Що сказати глядачам?', expect: { avoid: [/я опублікувала/i] } },
  { id: 'live_mod', category: 'live', user: 'Хтось токсичний у чаті', expect: { emotion: 'serious' } },
  { id: 'gift_reaction', category: 'gift', user: 'Мені кинули великий gift!', expect: { emotion: 'happy' } },
  { id: 'gift_thanks', category: 'gift', user: 'Як гарно подякувати донатеру?', expect: { avoid: [/шаблон/i] } },
  { id: 'question_short', category: 'question', user: 'Котра година в Києві приблизно?', expect: { maxLenHint: 160 } },
  { id: 'question_fact', category: 'question', user: 'Що таке WebRTC одним реченням?', expect: { maxLenHint: 220 } },
  { id: 'argument_push', category: 'argument', user: 'Ти завжди повторюєш одне й те саме', expect: { avoid: [/вибачте за незручності/i] } },
  { id: 'argument_disagree', category: 'argument', user: 'Я думаю, списки завжди кращі за короткий текст', expect: { avoid: [/ви абсолютно праві/i] } },
  { id: 'silence_nudge', category: 'silence', user: '…', expect: { maxLenHint: 140 } },
  { id: 'silence_ok', category: 'silence', user: 'Можна помовчати разом?', expect: { maxLenHint: 160 } },
  { id: 'topic_switch', category: 'topic_switch', user: 'Стоп. Давай про вечерю, не про роботу.', expect: { avoid: [/повертаючись до попереднього/i] } },
  { id: 'topic_switch_2', category: 'topic_switch', user: 'Забудь про LIVE. Хочу про музику.', expect: {} },
  { id: 'memory_ref', category: 'memory', user: 'Пам’ятаєш, я просила запам’ятати мою мову?', expect: { avoid: [/я точно пам.ятаю все/i] } },
  { id: 'memory_store', category: 'memory', user: 'Запам’ятай: мене звати неформально Лея', expect: { avoid: [/вже збережено назавжди/i] } },
  { id: 'short_answer', category: 'short', user: 'Так чи ні: варто спати зараз?', expect: { maxLenHint: 120 } },
  { id: 'short_ok', category: 'short', user: 'Ок?', expect: { maxLenHint: 80 } },
  { id: 'long_reason', category: 'long', user: 'Поясни спокійно, як спланувати тиждень навчання без вигорання', expect: { minLenHint: 120 } },
  { id: 'long_tradeoff', category: 'long', user: 'Порівняй коротко LIVE vs Clips для росту', expect: { minLenHint: 80 } },
  { id: 'emotion_angry', category: 'emotion', user: 'Бісить цей баг вже третій день', expect: { emotion: 'concerned' } },
  { id: 'emotion_surprise', category: 'emotion', user: 'Вау!! Це несподівано', expect: { emotion: 'surprised' } },
  { id: 'emotion_serious', category: 'emotion', user: 'Це важливо і серйозно — фінанси', expect: { emotion: 'serious' } },
  { id: 'interrupt_style', category: 'interrupt', user: 'Коротше', expect: { maxLenHint: 100 } },
  { id: 'no_name_spam', category: 'style', user: 'Розкажи щось добре', expect: { avoid: [/я sylora/i, /мене звати sylora/i] } },
  { id: 'no_helpdesk', category: 'style', user: 'Що робимо далі?', expect: { avoid: [/чим можу допомогти/i, /зверніться до підтримки/i] } },
  { id: 'uk_natural', category: 'style', user: 'Говори зі мною по-людськи українською', expect: { avoid: [/шановний користувач/i] } }
]);

/** Heuristic naturalness checks on an assistant reply (0–1). Factuality not scored. */
export function scoreNaturalness(reply = '', scenario = {}) {
  const text = String(reply || '');
  const expect = scenario.expect || {};
  let score = 1;
  const flags = [];

  if (!text.trim()) {
    return { score: 0, flags: ['empty'] };
  }
  if (expect.maxLenHint && text.length > expect.maxLenHint * 2.5) {
    score -= 0.25;
    flags.push('too_long_for_prompt');
  }
  if (expect.minLenHint && text.length < expect.minLenHint * 0.35) {
    score -= 0.15;
    flags.push('too_thin');
  }
  for (const re of expect.avoid || []) {
    if (re.test(text)) {
      score -= 0.3;
      flags.push(`avoid:${re}`);
    }
  }
  // Chatbot smell
  if (/як я можу (вам )?допомогти|чим я можу допомогти|чем я могу помочь|how can i help you today/i.test(text)) {
    score -= 0.35;
    flags.push('helpdesk_opener');
  }
  if ((text.match(/\n\s*[-•\d]/g) || []).length >= 4) {
    score -= 0.2;
    flags.push('list_heavy');
  }
  if ((text.match(/Sylora|СИЛОРА/g) || []).length >= 2) {
    score -= 0.15;
    flags.push('name_spam');
  }
  return { score: Math.max(0, Math.min(1, score)), flags };
}

export function scenariosByCategory() {
  const map = {};
  for (const s of CONVERSATION_SCENARIOS) {
    (map[s.category] ||= []).push(s.id);
  }
  return map;
}
