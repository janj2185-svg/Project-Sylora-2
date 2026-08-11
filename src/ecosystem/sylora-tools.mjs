/**
 * Sylora tool catalog + intent detection for Universal Command.
 * ONE Sylora interface; tools are capabilities, not separate bots.
 * Tools never get raw DB access — they go through Action Engine + auth.
 */

import { ACTION_LEVELS } from './permissions.mjs';

export const TOOL_CATALOG = Object.freeze([
  { name: 'search_platform', class: 'READ', level: ACTION_LEVELS.EXECUTE_ALLOWED, schema: { q: 'string' } },
  { name: 'search_people', class: 'READ', level: ACTION_LEVELS.EXECUTE_ALLOWED, schema: { q: 'string' } },
  { name: 'manage_notifications', class: 'READ', level: ACTION_LEVELS.EXECUTE_ALLOWED, schema: {} },
  { name: 'summarize_content', class: 'READ', level: ACTION_LEVELS.PROPOSE, schema: { text: 'string' } },
  { name: 'translate_content', class: 'READ', level: ACTION_LEVELS.PROPOSE, schema: { text: 'string', targetLang: 'string' } },
  { name: 'create_post', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { text: 'string' } },
  { name: 'create_live', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { title: 'string' } },
  { name: 'schedule_live', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { title: 'string', startsAt: 'string' } },
  { name: 'create_project', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { name: 'string' } },
  { name: 'create_room', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { title: 'string', kind: 'string' } },
  { name: 'create_event', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { title: 'string', startsAt: 'string' } },
  { name: 'create_clip', class: 'CREATE', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { title: 'string', liveId: 'string' } },
  { name: 'send_message', class: 'SEND', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { userId: 'string', text: 'string' } },
  { name: 'invite_user', class: 'SEND', level: ACTION_LEVELS.REQUEST_CONFIRMATION, schema: { username: 'string', targetType: 'string', targetId: 'string' } }
]);

export function getTool(name) {
  return TOOL_CATALOG.find(t => t.name === name) || null;
}

/** Lightweight intent detection — no LLM required for routing. */
export function detectIntent(text = '', locale = 'uk') {
  const q = String(text || '').trim();
  const lower = q.toLowerCase();
  if (!q) return { intent: 'unknown', tool: null, confidence: 0, slots: {} };

  const slots = { raw: q.slice(0, 2000), locale };

  if (/непрочитан|unread|inbox|повідомлен|wiadom|nachricht/i.test(lower)) {
    return { intent: 'open_inbox', tool: 'manage_notifications', confidence: 0.85, slots, view: 'messages' };
  }
  if (/знайд.*(люд|дизайн|designer|people|команд)|find.*(people|designer)|szukaj.*(ludzi|designer)/i.test(lower)) {
    const m = q.match(/(?:знайд\w*\s+(?:мені\s+)?|find\s+(?:me\s+)?|szukaj\s+)(.+)/i);
    return { intent: 'search_people', tool: 'search_people', confidence: 0.8, slots: { ...slots, q: (m?.[1] || q).slice(0, 120) }, view: 'explore' };
  }
  if (/створ.*(live|лайв)|start\s*live|create\s*live|zaplanuj\s*live|schedule\s*live/i.test(lower)) {
    const time = q.match(/(\d{1,2}:\d{2})/);
    const title = q.replace(/.*(live|лайв)\s*/i, '').trim() || 'SYLORA LIVE';
    if (/завтра|tomorrow|jutro|morgen|о\s*\d|at\s*\d|schedule|заплан/i.test(lower) || time) {
      return {
        intent: 'schedule_live',
        tool: 'schedule_live',
        confidence: 0.78,
        slots: { ...slots, title: title.slice(0, 120), startsAt: time ? `tomorrow ${time[1]}` : 'tomorrow 20:00' },
        view: 'live'
      };
    }
    return { intent: 'create_live', tool: 'create_live', confidence: 0.8, slots: { ...slots, title: title.slice(0, 120) || 'SYLORA LIVE' }, view: 'live' };
  }
  if (/бізнес.?зустріч|business\s*meeting|spotkanie|meeting|створ.*(зустріч|meeting)/i.test(lower)) {
    return { intent: 'create_room', tool: 'create_room', confidence: 0.75, slots: { ...slots, title: 'Business meeting', kind: 'business' }, view: 'business' };
  }
  if (/проєкт|project|projekt/i.test(lower) && /створ|create|utwórz/i.test(lower)) {
    const name = q.replace(/.*(проєкт|project|projekt)\s*/i, '').trim() || 'New project';
    return { intent: 'create_project', tool: 'create_project', confidence: 0.75, slots: { ...slots, name: name.slice(0, 120) }, view: 'business' };
  }
  if (/подія|event|wydarzenie|створ.*(івент|event)/i.test(lower)) {
    return { intent: 'create_event', tool: 'create_event', confidence: 0.72, slots: { ...slots, title: q.slice(0, 120), startsAt: 'tba' }, view: 'live' };
  }
  if (/переклад|translate|tłumacz|übersetz/i.test(lower)) {
    const lang = /польськ|polish|pl\b/i.test(lower) ? 'pl' : /англій|english|en\b/i.test(lower) ? 'en' : /німець|german|de\b/i.test(lower) ? 'de' : 'en';
    return { intent: 'translate', tool: 'translate_content', confidence: 0.7, slots: { ...slots, text: q, targetLang: lang }, view: 'ai' };
  }
  if (/короткий\s*ролик|clip|зроби\s*clip|make\s*a\s*clip/i.test(lower)) {
    return { intent: 'create_clip', tool: 'create_clip', confidence: 0.7, slots: { ...slots, title: 'Clip from LIVE' }, view: 'studio' };
  }
  if (/напиш|опублік|create\s*post|напиши\s*пост/i.test(lower)) {
    return { intent: 'create_post', tool: 'create_post', confidence: 0.7, slots: { ...slots, text: q.slice(0, 4000) }, view: 'feed' };
  }
  if (/summary|підсумок|резюме|що\s*я\s*пропустив|what\s*did\s*i\s*miss/i.test(lower)) {
    return { intent: 'summarize', tool: 'summarize_content', confidence: 0.65, slots: { ...slots, text: q }, view: 'ai' };
  }

  return { intent: 'ask_sylora', tool: 'search_platform', confidence: 0.4, slots: { ...slots, q }, view: 'ai', naturalLanguage: true };
}

export function planFromIntent(detected) {
  const tool = getTool(detected.tool);
  return {
    intent: detected.intent,
    tool: detected.tool,
    confidence: detected.confidence,
    slots: detected.slots,
    view: detected.view || 'ai',
    requiresConfirmation: !tool || tool.level === ACTION_LEVELS.REQUEST_CONFIRMATION || tool.class !== 'READ',
    actionClass: tool?.class || 'READ',
    naturalLanguage: !!detected.naturalLanguage,
    steps: [
      'intent_detection',
      'permissions',
      'tool_selection',
      detected.confidence < 0.5 || !tool || tool.level === ACTION_LEVELS.REQUEST_CONFIRMATION ? 'confirmation' : 'execution',
      'result'
    ]
  };
}
