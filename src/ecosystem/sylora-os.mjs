/**
 * Sylora Intelligence Layer / Personal Operating Layer foundations (125–164).
 * One Sylora face; specialized routing stays internal.
 * Never dump full platform state into prompts — select relevant slices only.
 */

export const KNOWLEDGE_SCOPES = Object.freeze([
  'my', 'project', 'company', 'community', 'public', 'space_shared'
]);

export const INBOX_BUCKETS = Object.freeze([
  'IMPORTANT', 'REQUIRES_ACTION', 'PEOPLE', 'PROJECTS', 'COMMUNITIES', 'OTHER'
]);

export const ACTIVITY_TYPES = Object.freeze([
  'message_sent', 'live_created', 'project_updated', 'meeting_completed',
  'document_created', 'course_completed', 'creator_collaboration_started',
  'decision_recorded', 'task_created', 'goal_updated', 'clip_suggested'
]);

export const SPECIALIST_AGENTS = Object.freeze([
  'research', 'creator', 'business', 'translation', 'moderation', 'search', 'planning', 'learning'
]);

/** Skill manifest shape — capabilities for Sylora, not separate bots. */
export function createSkillManifest({
  id,
  slug,
  name,
  summary = '',
  capabilities = [],
  requiredPermissions = [],
  tools = [],
  uiIntegration = [],
  version = '0.1.0',
  developerId = 'sylora-platform',
  securityPolicy = 'sandbox',
  category = 'platform'
} = {}) {
  return {
    id,
    slug: String(slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48),
    name: String(name || '').slice(0, 80),
    summary: String(summary || '').slice(0, 500),
    capabilities: [...new Set(capabilities)].slice(0, 40),
    requiredPermissions: [...new Set(requiredPermissions)].slice(0, 40),
    tools: [...new Set(tools)].slice(0, 40),
    uiIntegration: [...new Set(uiIntegration)].slice(0, 20),
    version,
    developerId,
    securityPolicy,
    category,
    status: 'available',
    createdAt: new Date().toISOString()
  };
}

export const PLATFORM_SKILLS = Object.freeze([
  createSkillManifest({
    id: 'skill-search', slug: 'universal-search', name: 'Universal Search',
    capabilities: ['search'], tools: ['search_platform', 'search_people'],
    requiredPermissions: ['search'], uiIntegration: ['command_palette', 'explore']
  }),
  createSkillManifest({
    id: 'skill-creator', slug: 'creator-pipeline', name: 'Creator Pipeline',
    capabilities: ['clips', 'titles', 'subtitles'], tools: ['create_clip', 'create_live', 'schedule_live'],
    requiredPermissions: ['content_assist', 'live_assist'], uiIntegration: ['studio', 'live'],
    category: 'creator'
  }),
  createSkillManifest({
    id: 'skill-business', slug: 'business-workflows', name: 'Business Workflows',
    capabilities: ['meetings', 'tasks', 'follow_up'], tools: ['create_room', 'create_project'],
    requiredPermissions: ['business_assist'], uiIntegration: ['business', 'canvas'],
    category: 'business'
  }),
  createSkillManifest({
    id: 'skill-learning', slug: 'adaptive-learning', name: 'Adaptive Learning',
    capabilities: ['quiz', 'explain', 'progress'], tools: ['summarize_content'],
    requiredPermissions: ['learn_assist'], uiIntegration: ['learning'],
    category: 'learning'
  }),
  createSkillManifest({
    id: 'skill-translation', slug: 'cross-language', name: 'Cross-language Content',
    capabilities: ['translate', 'subtitles'], tools: ['translate_content'],
    requiredPermissions: ['translate'], uiIntegration: ['studio', 'messages'],
    category: 'translation'
  }),
  createSkillManifest({
    id: 'skill-planning', slug: 'daily-planning', name: 'Daily Planning',
    capabilities: ['brief', 'tasks', 'goals'], tools: ['manage_notifications', 'search_platform'],
    requiredPermissions: ['personalization'], uiIntegration: ['home', 'dashboard'],
    category: 'planning'
  })
]);

/**
 * Context Engine — select only relevant slices for the active view/query.
 * Caps keep prompts small; private scopes stay permission-gated by caller.
 */
export function selectContextSlices({
  view = 'command_center',
  query = '',
  user,
  memories = [],
  calendar = [],
  projects = [],
  orgs = [],
  lives = [],
  notifications = [],
  conversations = [],
  documents = [],
  continuity = [],
  tasks = [],
  goals = [],
  decisions = [],
  contentIndex = [],
  spaceId = null,
  maxTokensApprox = 1200
} = {}) {
  const q = String(query || '').toLowerCase();
  const slices = [];
  const push = (kind, items, mapFn, limit = 5) => {
    const list = (items || []).slice(0, limit).map(mapFn).filter(Boolean);
    if (list.length) slices.push({ kind, count: list.length, items: list });
  };

  push('user', [user], u => u && ({ id: u.id, displayName: u.displayName, locale: u.locale }), 1);
  push('view', [{ view, spaceId }], x => x, 1);

  const memRelevant = memories.filter(m => {
    if (!q) return m.category === 'preferences' || m.importance >= 0.6;
    const hay = `${m.label || ''} ${m.value || ''}`.toLowerCase();
    return q.split(/\s+/).some(t => t.length > 2 && hay.includes(t));
  });
  push('memory', memRelevant.length ? memRelevant : memories.filter(m => m.category === 'preferences'), m => ({
    id: m.id, label: m.label, category: m.category || 'preferences', value: String(m.value || '').slice(0, 160)
  }), 6);

  if (/live|лайв|studio|clip|creator/i.test(view + q) || view === 'live' || view === 'studio') {
    push('live', lives, r => ({ id: r.id, title: r.title, status: r.status }), 5);
  }
  if (/business|meeting|проєкт|project|org/i.test(view + q) || view === 'business') {
    push('projects', projects, p => ({ id: p.id, name: p.name, status: p.status }), 5);
    push('organizations', orgs, o => ({ id: o.id, name: o.name }), 4);
    push('decisions', decisions, d => ({ id: d.id, decision: d.decision, owner: d.owner, date: d.date }), 5);
  }
  if (/learn|science|course|урок/i.test(view + q) || view === 'learning') {
    push('learning_tasks', tasks.filter(t => t.source === 'learning' || t.relatedType === 'course'), t => ({
      id: t.id, title: t.title, status: t.status
    }), 5);
  }
  if (/message|inbox|повідом/i.test(view + q) || view === 'messages') {
    push('inbox', notifications.filter(n => !n.read), n => ({ id: n.id, type: n.type }), 8);
    push('conversations', conversations, c => ({ id: c.id, preview: String(c.lastMessage?.text || '').slice(0, 80) }), 5);
  }
  if (/calendar|сьогодні|today|зустріч|deadline|brief/i.test(view + q) || view === 'command_center' || view === 'home') {
    push('calendar', calendar, c => ({ id: c.id, title: c.title, startsAt: c.startsAt, kind: c.kind }), 8);
    push('tasks', tasks.filter(t => t.status !== 'done'), t => ({ id: t.id, title: t.title, deadline: t.deadline, priority: t.priority }), 8);
    push('goals', goals.filter(g => g.status !== 'completed'), g => ({ id: g.id, title: g.title, progress: g.progress }), 4);
  }
  if (documents.length && /doc|документ|policy|knowledge/i.test(q + view)) {
    push('documents', documents, d => ({ id: d.id, title: d.title, scope: d.knowledgeScope || 'my' }), 5);
  }
  if (continuity.length) {
    push('continuity', continuity, s => ({ id: s.id, kind: s.kind, key: s.key, updatedAt: s.updatedAt }), 4);
  }
  if (contentIndex.length && /дивив|watched|відео|video|live|робот|будів/i.test(q)) {
    push('content_history', contentIndex, c => ({
      id: c.contentId, type: c.contentType, title: c.title, topics: c.topics?.slice(0, 4)
    }), 6);
  }

  // Approximate budget: trim trailing slices if too large
  let approx = JSON.stringify(slices).length / 4;
  while (approx > maxTokensApprox && slices.length > 3) {
    slices.pop();
    approx = JSON.stringify(slices).length / 4;
  }

  return {
    view,
    query: String(query || '').slice(0, 500),
    slices,
    approxTokens: Math.round(approx),
    principle: 'Selective context only — never full dump. Permission boundaries enforced by caller.',
    knowledgeScopes: KNOWLEDGE_SCOPES
  };
}

/** Route OS-style natural language to specialist + skill (user still sees one Sylora). */
export function routeOperatingIntent(text = '') {
  const q = String(text || '').trim();
  const lower = q.toLowerCase();
  if (!q) return { intent: 'unknown', specialist: null, skill: null, confidence: 0 };

  if (/незакінчен|unfinished|open tasks|справи|todo|задач/i.test(lower)) {
    return { intent: 'list_open_work', specialist: 'planning', skill: 'daily-planning', tool: 'list_open_work', confidence: 0.88, view: 'dashboard' };
  }
  if (/що\s*сьогодні|today|важливого|daily brief|brief/i.test(lower)) {
    return { intent: 'daily_brief', specialist: 'planning', skill: 'daily-planning', tool: 'daily_brief', confidence: 0.9, view: 'home' };
  }
  if (/підготуй.*зустріч|prepare.*meeting|brief me|до зустріч/i.test(lower)) {
    return { intent: 'prepare_meeting', specialist: 'business', skill: 'business-workflows', tool: 'prepare_meeting', confidence: 0.85, view: 'business' };
  }
  if (/знайд.*люд.*проєкт|people for.*project|команд.*проєкт/i.test(lower)) {
    return { intent: 'find_project_people', specialist: 'search', skill: 'universal-search', tool: 'search_people', confidence: 0.82, view: 'explore' };
  }
  if (/clip|ролик|з.*live|з.*лайв/i.test(lower)) {
    return { intent: 'clips_from_live', specialist: 'creator', skill: 'creator-pipeline', tool: 'create_clip', confidence: 0.8, view: 'studio', requiresConfirmation: true };
  }
  if (/де ми говорили|where.*(talk|spoke|said)|знайди.*розмов/i.test(lower)) {
    return { intent: 'find_conversation', specialist: 'search', skill: 'universal-search', tool: 'content_history_search', confidence: 0.78, view: 'messages' };
  }
  if (/decision|рішення|чому ми/i.test(lower)) {
    return { intent: 'recall_decision', specialist: 'business', skill: 'business-workflows', tool: 'recall_decision', confidence: 0.8, view: 'business' };
  }
  if (/goal|ціль|milestone/i.test(lower)) {
    return { intent: 'goals', specialist: 'planning', skill: 'daily-planning', tool: 'list_goals', confidence: 0.75, view: 'dashboard' };
  }

  return { intent: 'ask_sylora', specialist: 'search', skill: 'universal-search', tool: 'search_platform', confidence: 0.4, view: 'ai' };
}

export function orchestrateTask(task = {}) {
  const routing = routeOperatingIntent(task.text || task.query || '');
  return {
    taskId: task.id || null,
    text: String(task.text || '').slice(0, 2000),
    pipeline: ['task', 'routing', 'specialist', 'verification', 'sylora_response'],
    routing,
    specialist: routing.specialist,
    skill: routing.skill,
    verification: {
      required: !!routing.requiresConfirmation || ['create_clip', 'create_live', 'send_message'].includes(routing.tool),
      note: 'Mutating or external actions need user confirmation. Specialists never surface as separate bots.'
    },
    oneSylora: true
  };
}

export function buildDailyBrief({
  notifications = [],
  invites = [],
  lives = [],
  calendar = [],
  projects = [],
  tasks = [],
  learning = [],
  creator = {},
  business = {},
  enabled = true
} = {}) {
  if (!enabled) {
    return { enabled: false, sections: [], summary: 'Daily Brief is disabled by user.' };
  }
  const unread = notifications.filter(n => !n.read);
  const sections = [
    { id: 'messages', title: 'Important messages', items: unread.filter(n => n.type === 'message').slice(0, 5).map(n => ({ id: n.id, text: n.type })) },
    { id: 'invites', title: 'Invitations', items: invites.slice(0, 5).map(n => ({ id: n.id, text: n.type })) },
    { id: 'live', title: 'Upcoming LIVE', items: lives.filter(l => l.status === 'scheduled' || l.status === 'live').slice(0, 5).map(l => ({ id: l.id, text: l.title })) },
    { id: 'meetings', title: 'Meetings', items: calendar.filter(c => c.kind === 'meeting' || c.kind === 'event').slice(0, 5).map(c => ({ id: c.id, text: `${c.title} · ${c.startsAt}` })) },
    { id: 'projects', title: 'Project changes', items: projects.slice(0, 5).map(p => ({ id: p.id, text: p.name })) },
    { id: 'creator', title: 'Creator', items: (creator.recentClips || []).slice(0, 3).map(v => ({ id: v.id, text: v.title || 'Clip' })) },
    { id: 'learning', title: 'Learning', items: learning.slice(0, 4).map(c => ({ id: c.id, text: `${c.title}${c.progress != null ? ` · ${Math.round(c.progress * 100)}%` : ''}` })) },
    { id: 'business', title: 'Business', items: (business.orgs || []).slice(0, 4).map(o => ({ id: o.id, text: o.name })) },
    { id: 'deadlines', title: 'Deadlines', items: tasks.filter(t => t.deadline && t.status !== 'done').slice(0, 5).map(t => ({ id: t.id, text: `${t.title} · ${t.deadline}` })) }
  ].filter(s => s.items.length);

  const total = sections.reduce((n, s) => n + s.items.length, 0);
  return {
    enabled: true,
    generatedAt: new Date().toISOString(),
    summary: total
      ? `Сьогодні ${total} пунктів, що стосуються тебе. Ось стислий огляд.`
      : 'Сьогодні спокійно — немає термінових пунктів у дозволеному контексті.',
    sections,
    controls: { canDisable: true, permissionAware: true }
  };
}

export function classifyInboxItem(item = {}) {
  const type = String(item.type || '');
  const text = String(item.text || item.preview || item.lastMessage?.text || '').toLowerCase();
  if (/security|payment|call|urgent/i.test(type) || /терміново|urgent|asap/i.test(text)) return 'IMPORTANT';
  if (/invite|conference|task|assign|approval|confirm/i.test(type) || /\?|будь ласка|please|можеш|can you/i.test(text)) return 'REQUIRES_ACTION';
  if (/follow|message|dm/i.test(type) || item.kind === 'conversation') return 'PEOPLE';
  if (/project|org|task|document/i.test(type)) return 'PROJECTS';
  if (/community|channel/i.test(type)) return 'COMMUNITIES';
  return 'OTHER';
}

export function buildIntelligentInbox({ conversations = [], notifications = [] } = {}) {
  const buckets = Object.fromEntries(INBOX_BUCKETS.map(b => [b, []]));
  for (const c of conversations) {
    const row = { kind: 'conversation', id: c.id, preview: c.lastMessage?.text || '', members: c.members };
    buckets[classifyInboxItem(row)].push(row);
  }
  for (const n of notifications) {
    const row = { kind: 'notification', id: n.id, type: n.type, read: !!n.read, actorId: n.actorId };
    buckets[classifyInboxItem(row)].push(row);
  }
  const total = conversations.length + notifications.filter(n => !n.read).length;
  const needsReply = buckets.REQUIRES_ACTION.length + buckets.IMPORTANT.length;
  return {
    buckets,
    totals: { all: total, requiresAction: needsReply },
    summary: total
      ? `У тебе ${total} елементів у Inbox, але лише ${needsReply} виглядають як такі, що потребують відповіді/дії.`
      : 'Inbox порожній.',
    note: 'AI priority is an additional filter — nothing is hidden from classic views.'
  };
}

export function createActivityEvent({
  id, userId, type, entityType = null, entityId = null, summary = '', data = {}, spaceId = null
}) {
  if (!ACTIVITY_TYPES.includes(type) && type !== 'custom') {
    // allow custom but tag it
  }
  return {
    id,
    userId,
    type,
    entityType,
    entityId,
    spaceId,
    summary: String(summary || '').slice(0, 400),
    data,
    createdAt: new Date().toISOString()
  };
}

export function createContentUnderstanding({
  id, contentId, contentType, ownerId, visibility = 'private',
  transcript = '', captions = [], language = 'uk', topics = [], entities = [],
  chapters = [], embeddingStatus = 'blocked_provider'
} = {}) {
  return {
    id,
    contentId,
    contentType,
    ownerId,
    visibility,
    transcript: String(transcript || '').slice(0, 20000),
    captions,
    language,
    topics: topics.slice(0, 20),
    entities: entities.slice(0, 40),
    chapters: chapters.slice(0, 40),
    embeddingStatus: process.env.SYLORA_EMBEDDING_PROVIDER ? 'ready' : embeddingStatus,
    searchIndexed: visibility !== 'private' || true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    honesty: {
      embeddings: process.env.SYLORA_EMBEDDING_PROVIDER ? 'available' : 'lexical_only',
      note: 'Private content stays inside permission boundary of the owner/space.'
    }
  };
}

export function extractTopics(text = '') {
  const words = String(text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 3);
  const stop = new Set(['this', 'that', 'with', 'from', 'have', 'було', 'мене', 'тому', 'який', 'яка']);
  const freq = new Map();
  for (const w of words) {
    if (stop.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

export function createDecisionRecord({
  id, spaceId, orgId = null, projectId = null, decision, owner, reason = '', relatedTaskIds = [], source = {}
}) {
  return {
    id,
    spaceId,
    orgId,
    projectId,
    decision: String(decision || '').slice(0, 500),
    owner: String(owner || '').slice(0, 120),
    date: new Date().toISOString().slice(0, 10),
    reason: String(reason || '').slice(0, 1000),
    relatedTaskIds: (relatedTaskIds || []).slice(0, 40),
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createSharedMemoryRecord({
  id, scope, spaceId, orgId = null, communityId = null, projectId = null,
  label, value, createdBy, roles = ['member']
}) {
  if (!KNOWLEDGE_SCOPES.includes(scope) && scope !== 'team') {
    throw new Error('INVALID_KNOWLEDGE_SCOPE');
  }
  return {
    id,
    scope,
    spaceId,
    orgId,
    communityId,
    projectId,
    label: String(label || '').slice(0, 80),
    value: String(value || '').slice(0, 4000),
    createdBy,
    roles,
    history: [{ at: new Date().toISOString(), by: createdBy, event: 'created' }],
    deletedAt: null,
    createdAt: new Date().toISOString()
  };
}

export function createUniversalTask({
  id, title, description = '', ownerId, deadline = null, status = 'open',
  priority = 'normal', source = 'sylora', relatedType = null, relatedId = null, spaceId = null
}) {
  return {
    id,
    title: String(title || '').slice(0, 160),
    description: String(description || '').slice(0, 2000),
    ownerId,
    deadline,
    status: ['open', 'in_progress', 'done', 'cancelled'].includes(status) ? status : 'open',
    priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
    source,
    relatedType,
    relatedId,
    spaceId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createGoal({
  id, userId, title, description = '', milestones = [], status = 'active'
}) {
  return {
    id,
    userId,
    title: String(title || '').slice(0, 160),
    description: String(description || '').slice(0, 2000),
    milestones: (milestones || []).slice(0, 40).map((m, i) => ({
      id: m.id || `m${i}`,
      title: String(m.title || '').slice(0, 120),
      done: !!m.done
    })),
    taskIds: [],
    progress: 0,
    status: ['active', 'paused', 'completed'].includes(status) ? status : 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: 'AI does not invent behavioral/addiction goals without user request.'
  };
}

export function goalProgress(goal, tasks = []) {
  const linked = tasks.filter(t => (goal.taskIds || []).includes(t.id));
  const milestoneDone = (goal.milestones || []).filter(m => m.done).length;
  const milestoneTotal = (goal.milestones || []).length || 1;
  const taskDone = linked.filter(t => t.status === 'done').length;
  const taskTotal = linked.length || 0;
  const progress = taskTotal
    ? (taskDone / taskTotal) * 0.6 + (milestoneDone / milestoneTotal) * 0.4
    : milestoneDone / milestoneTotal;
  return Math.round(progress * 100) / 100;
}

export function structuredMeetingResult({
  id, spaceId, title, transcript = '', speakers = [], notes = '', locale = 'uk'
} = {}) {
  const lines = String(transcript || notes || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
  const decisions = lines.filter(l => /виріш|decide|decision|погод/i.test(l)).slice(0, 10);
  const questions = lines.filter(l => /\?/.test(l)).slice(0, 10);
  const actionItems = lines.filter(l => /todo|action|зробити|task|наступн/i.test(l)).slice(0, 10);
  return {
    id,
    spaceId,
    title: String(title || 'Meeting').slice(0, 160),
    transcript: String(transcript || '').slice(0, 50000),
    speakers,
    translationTracks: [],
    summary: lines.slice(0, 5).join(' ').slice(0, 800) || 'No transcript yet.',
    decisions: decisions.map(d => ({ text: d, confidence: 'extractive' })),
    actionItems: actionItems.map(a => ({ text: a, status: 'proposed' })),
    questions: questions.map(q => ({ text: q })),
    followUps: actionItems.slice(0, 5).map(a => ({ text: a, due: null })),
    locale,
    mode: 'structured_meeting_result',
    honesty: { aiInference: 'extractive_local_until_provider', citations: [] }
  };
}

export function creatorPipelinePlan({ liveId, title = 'LIVE', language = 'uk' } = {}) {
  return {
    liveId,
    stages: [
      'transcript', 'chapters', 'highlights', 'suggested_clips',
      'subtitles', 'translations', 'titles', 'descriptions', 'thumbnails', 'scheduling'
    ],
    assets: [
      { kind: 'transcript', status: 'queued', editable: true },
      { kind: 'chapters', status: 'queued', editable: true },
      { kind: 'clips', status: 'queued', editable: true, countSuggested: 3 },
      { kind: 'subtitles', status: 'queued', editable: true, languages: [language, 'pl', 'en', 'de', 'es'] },
      { kind: 'titles', status: 'queued', editable: true },
      { kind: 'descriptions', status: 'queued', editable: true },
      { kind: 'thumbnails', status: 'queued', editable: true },
      { kind: 'schedule', status: 'queued', editable: true }
    ],
    policy: {
      publishRequiresConfirmation: true,
      syntheticAudioLabeled: true,
      note: 'Every generated asset is editable before publication.'
    },
    title
  };
}

export function localizedContentTracks({ originalLanguage = 'uk', subtitleLanguages = ['pl', 'en', 'de', 'es'], audioLanguages = [] } = {}) {
  return {
    originalLanguage,
    subtitleTracks: subtitleLanguages.map(lang => ({ lang, status: 'prepared', kind: 'subtitles' })),
    audioTracks: audioLanguages.map(lang => ({
      lang,
      status: 'blocked_provider',
      kind: 'synthetic_dub',
      label: 'SYNTHETIC / DUBBED — must be disclosed when voice tech is available'
    })),
    metadataLocales: subtitleLanguages,
    oneContentItem: true,
    note: 'Do not fork a separate post per language unless necessary.'
  };
}

export function ownershipGraphNode({
  id, contentId, originalCreatorId, relation = 'original', parentContentId = null, aiModified = false
}) {
  return {
    id,
    contentId,
    originalCreatorId,
    relation, // original | clip | remix | translation | ai_modification
    parentContentId,
    aiModified: !!aiModified,
    createdAt: new Date().toISOString()
  };
}

export function revenueSplitDraft({ parties = [] } = {}) {
  const cleaned = parties.slice(0, 20).map(p => ({
    role: p.role || 'creator',
    userId: p.userId || null,
    bps: Math.max(0, Math.min(10000, Number(p.bps) || 0))
  }));
  const sum = cleaned.reduce((n, p) => n + p.bps, 0);
  return {
    parties: cleaned,
    sumBps: sum,
    valid: sum === 10000 || cleaned.length === 0,
    payouts: 'blocked_until_payment_compliance',
    note: 'Architecture only — no uncontrolled payouts.'
  };
}

export function scienceClaim({ text, kind = 'unknown', sources = [] } = {}) {
  const allowed = ['source_backed', 'hypothesis', 'ai_inference', 'unknown'];
  return {
    text: String(text || '').slice(0, 2000),
    kind: allowed.includes(kind) ? kind : 'unknown',
    sources: sources.slice(0, 20),
    display: kind === 'source_backed' ? 'fact (sourced)' : kind
  };
}

export function learningKnowledgeNode({ concept, state = 'NOT_STARTED', reason = '' } = {}) {
  const allowed = ['KNOWS', 'LEARNING', 'STRUGGLING', 'NOT_STARTED'];
  return {
    concept: String(concept || '').slice(0, 120),
    state: allowed.includes(state) ? state : 'NOT_STARTED',
    reason: String(reason || '').slice(0, 400),
    updatedAt: new Date().toISOString()
  };
}

export function personalDashboardPayload({
  role = 'member', brief, tasks = [], goals = [], inbox, continuity = [], lives = [], projects = [], suggestions = []
} = {}) {
  return {
    role,
    today: brief,
    tasks: tasks.filter(t => t.status !== 'done').slice(0, 8),
    messages: inbox?.buckets?.REQUIRES_ACTION?.slice(0, 5) || [],
    projects: projects.slice(0, 6),
    live: lives.slice(0, 4),
    goals: goals.slice(0, 4),
    upcoming: (brief?.sections || []).find(s => s.id === 'meetings')?.items || [],
    continue: continuity.slice(0, 5),
    syloraSuggestions: suggestions.slice(0, 5),
    principle: 'Adaptive, not overloaded — show what matters for this role.'
  };
}

export function guestPublicView({ content, profile, live } = {}) {
  return {
    canWatch: !!(content?.visibility === 'public' || live?.visibility === 'public' || profile?.privacy?.profile === 'public'),
    canViewProfile: profile?.privacy?.profile === 'public',
    canViewLive: live?.status === 'live' && (live.visibility || 'public') !== 'private',
    interactionRequiresAccount: true,
    aggressiveLoginWall: false,
    seo: {
      indexable: profile?.privacy?.profile === 'public',
      openGraphReady: true,
      structuredDataReady: true
    }
  };
}

export function onboardingState({ user, stepsDone = [] } = {}) {
  const minimal = ['account_created'];
  const progressive = ['creator_settings', 'professional_profile', 'business_org', 'learning_goals'];
  return {
    mode: 'minimal_first',
    required: minimal,
    done: stepsDone,
    next: progressive.find(s => !stepsDone.includes(s)) || null,
    note: 'Do not ask 30 questions. Preferences grow from use + explicit permission.'
  };
}

export function emptyPlatformSeed({ communities = [], courses = [], lives = [], people = [] } = {}) {
  return {
    strategy: 'real_or_guided',
    seed: {
      people: people.slice(0, 6),
      communities: communities.filter(c => c.visibility === 'public').slice(0, 6),
      courses: courses.filter(c => c.published).slice(0, 6),
      live: lives.filter(l => l.status === 'live').slice(0, 4)
    },
    honesty: {
      noFakeCounters: true,
      note: 'If empty, show guided first actions — never invent popularity metrics.'
    },
    firstActions: [
      { label: 'Talk with Sylora', view: 'ai' },
      { label: 'Create your first post', view: 'feed' },
      { label: 'Explore LIVE', view: 'live' },
      { label: 'Join a community', view: 'communities' }
    ]
  };
}

export function connectedServiceRecord({
  id, userId, provider, scopes = [], status = 'connected'
}) {
  return {
    id,
    userId,
    provider,
    scopes,
    status,
    lastUsedAt: null,
    // tokens must never be returned to frontend
    tokenRef: `vault:${id}`,
    createdAt: new Date().toISOString()
  };
}

export function canvasWorkspace({
  id, userId, title = 'Workspace', kind = 'document', artifact = {}, spaceId = null, shared = false
} = {}) {
  return {
    id,
    userId,
    spaceId,
    title: String(title || '').slice(0, 160),
    kind: ['document', 'plan', 'project', 'research', 'presentation', 'content', 'business'].includes(kind) ? kind : 'document',
    artifact,
    conversationSide: 'side',
    shared: !!shared,
    mobileLayout: 'stacked',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
}
