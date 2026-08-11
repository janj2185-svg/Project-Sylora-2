/**
 * Visual automation engine: WHEN + IF + THEN
 * Actions are declarative — OBS/UI execute allowed actions; no silent fake side effects.
 */

export const AUTOMATION_TEMPLATES = Object.freeze([
  {
    id: 'thank_big_gift',
    name: 'Thank big gifts',
    when: { eventType: 'gift' },
    if: [{ field: 'amount', op: 'gte', value: 100 }],
    then: [
      { action: 'sylora_say', params: { template: 'thank_gift' } },
      { action: 'avatar_emotion', params: { emotion: 'excited' } },
      { action: 'play_sfx', params: { id: 'gift_chime' } },
      { action: 'update_goal', params: {} }
    ]
  },
  {
    id: 'obs_scene_on_raid',
    name: 'OBS scene on raid',
    when: { eventType: 'raid' },
    if: [],
    then: [
      { action: 'obs_set_scene', params: { sceneName: 'Alert' } },
      { action: 'sylora_say', params: { template: 'welcome_raid' } }
    ]
  },
  {
    id: 'chat_command_overlay',
    name: 'Chat command overlay',
    when: { eventType: 'chat_message' },
    if: [{ field: 'message', op: 'starts_with', value: '!overlay' }],
    then: [{ action: 'overlay_trigger', params: { overlayId: 'default' } }]
  }
]);

export function createAutomationRule({
  id,
  userId,
  name,
  enabled = true,
  when,
  if: conditions = [],
  then: actions = [],
  createdAt = new Date().toISOString()
}) {
  if (!when?.eventType) throw Object.assign(new Error('WHEN_EVENT_REQUIRED'), { code: 'WHEN_EVENT_REQUIRED' });
  if (!Array.isArray(actions) || !actions.length) throw Object.assign(new Error('THEN_REQUIRED'), { code: 'THEN_REQUIRED' });
  return {
    id,
    userId,
    name: String(name || 'Rule').slice(0, 80),
    enabled: !!enabled,
    when: { eventType: when.eventType, platform: when.platform || null },
    if: (conditions || []).slice(0, 12).map(normalizeCondition),
    then: actions.slice(0, 12).map(normalizeAction),
    createdAt,
    updatedAt: createdAt,
    fireCount: 0
  };
}

export class AutomationEngine {
  constructor({ rules = [] } = {}) {
    this.rules = rules;
    this.history = [];
  }

  setRules(rules) {
    this.rules = rules || [];
  }

  evaluate(event) {
    const fired = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (rule.when.eventType !== event.eventType) continue;
      if (rule.when.platform && rule.when.platform !== event.platform) continue;
      if (!rule.if.every(c => matchCondition(c, event))) continue;
      rule.fireCount = (rule.fireCount || 0) + 1;
      const plan = {
        ruleId: rule.id,
        name: rule.name,
        at: new Date().toISOString(),
        actions: rule.then.map(a => ({ ...a, status: 'planned' }))
      };
      this.history.push(plan);
      if (this.history.length > 100) this.history.shift();
      fired.push(plan);
    }
    return fired;
  }

  recent(limit = 20) {
    return this.history.slice(-limit);
  }
}

function normalizeCondition(c) {
  return {
    field: String(c.field || 'message').slice(0, 40),
    op: ['eq', 'gte', 'lte', 'contains', 'starts_with', 'exists'].includes(c.op) ? c.op : 'eq',
    value: c.value
  };
}

function normalizeAction(a) {
  const allowed = [
    'sylora_say', 'avatar_emotion', 'play_sfx', 'play_animation',
    'obs_set_scene', 'obs_source_visibility', 'overlay_trigger',
    'update_goal', 'update_leaderboard', 'notify_host'
  ];
  const action = allowed.includes(a.action) ? a.action : 'notify_host';
  return { action, params: a.params || {} };
}

function matchCondition(c, event) {
  const val = resolveField(event, c.field);
  switch (c.op) {
    case 'exists': return val != null && val !== '';
    case 'eq': return val == c.value;
    case 'gte': return Number(val) >= Number(c.value);
    case 'lte': return Number(val) <= Number(c.value);
    case 'contains': return String(val || '').toLowerCase().includes(String(c.value || '').toLowerCase());
    case 'starts_with': return String(val || '').toLowerCase().startsWith(String(c.value || '').toLowerCase());
    default: return false;
  }
}

function resolveField(event, field) {
  if (field === 'amount') return event.amount;
  if (field === 'message') return event.message || event.text;
  if (field === 'platform') return event.platform;
  if (field === 'username') return event.username;
  if (field === 'gift.name') return event.gift?.name;
  return event[field] ?? event.metadata?.[field];
}
