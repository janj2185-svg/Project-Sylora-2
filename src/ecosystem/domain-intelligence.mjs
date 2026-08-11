/**
 * Domain intelligence helpers for ONE Sylora (creator / business / learning modes).
 * Pure functions over real platform data — no fake analytics, no separate bot personas.
 */

export function analyzeLiveRoom({ room, engagement = {}, chat = [], gifts = [], battle = null } = {}) {
  const likes = Number(engagement.likes || 0);
  const viewers = Number(room?.viewerCount || 0);
  const chatCount = Array.isArray(chat) ? chat.length : 0;
  const giftCount = Array.isArray(gifts) ? gifts.length : 0;
  const giftVolume = gifts.reduce((sum, g) => sum + Number(g.grossAmount ?? g.amount ?? 0), 0);
  const peakSignal = likes + chatCount * 2 + giftCount * 5 + viewers;
  const moments = [];
  if (chatCount) {
    const mid = Math.floor(chatCount / 2);
    const sample = chat[mid];
    moments.push({
      kind: 'chat_density',
      label: 'High chat activity window',
      evidence: { messageIndex: mid, sampleText: String(sample?.text || '').slice(0, 120) },
      confidence: chatCount >= 5 ? 0.7 : 0.4
    });
  }
  if (likes >= 3) {
    moments.push({
      kind: 'likes_spike',
      label: 'Audience resonance (likes)',
      evidence: { likes },
      confidence: likes >= 10 ? 0.8 : 0.55
    });
  }
  if (giftCount) {
    moments.push({
      kind: 'gifts',
      label: 'Support moments',
      evidence: { giftCount, giftVolume },
      confidence: 0.75
    });
  }
  if (battle) {
    moments.push({
      kind: 'battle',
      label: 'Resonance Battle segment',
      evidence: { hostScore: battle.hostScore, opponentScore: battle.opponentScore },
      confidence: 0.85
    });
  }
  return {
    liveId: room?.id || null,
    title: room?.title || '',
    metrics: {
      viewers,
      likes,
      chatCount,
      giftCount,
      giftVolume,
      peakSignal,
      source: 'platform_store'
    },
    moments,
    moderationInsights: {
      chatVolume: chatCount,
      note: chatCount > 40 ? 'High chat volume — consider co-host assist (permissioned).' : 'Chat volume within normal range.',
      banAutonomous: false
    },
    honestEmpty: !likes && !chatCount && !giftCount && !viewers
  };
}

export function buildCreatorContentPack({ topic = '', analysis = null, locale = 'uk' } = {}) {
  const titleBase = String(topic || analysis?.title || 'SYLORA LIVE').slice(0, 80);
  const moments = analysis?.moments || [];
  const clipCandidates = moments.slice(0, 3).map((m, i) => ({
    id: `clip-candidate-${i + 1}`,
    title: `${titleBase} · ${m.label}`.slice(0, 80),
    reason: m.kind,
    confidence: m.confidence,
    status: 'draft_requires_confirmation',
    evidence: m.evidence
  }));
  if (!clipCandidates.length) {
    clipCandidates.push({
      id: 'clip-candidate-fallback',
      title: `${titleBase} · highlight`.slice(0, 80),
      reason: 'insufficient_signal',
      confidence: 0.2,
      status: 'draft_requires_confirmation',
      evidence: { note: 'Not enough LIVE signal yet — proposal only.' }
    });
  }
  return {
    mode: 'creator',
    titles: [
      titleBase,
      `${titleBase} — live with Sylora`.slice(0, 80),
      `Behind ${titleBase}`.slice(0, 80)
    ],
    captions: [
      `${titleBase}. Join the conversation.`,
      `Key moment: ${moments[0]?.label || 'intro'} · ${locale}`
    ],
    subtitles: {
      plan: ['Detect speech language', 'Generate captions after recording', 'Offer translation'],
      status: analysis?.honestEmpty ? 'waiting_for_signal' : 'ready_to_prepare'
    },
    translations: { available: true, autoApply: false },
    thumbnailIdeas: [
      { style: 'face+title', text: titleBase.slice(0, 28) },
      { style: 'moment-frame', text: moments[0]?.label || 'LIVE' }
    ],
    contentIdeas: [
      'Q&A from top chat themes',
      'Short clip of gift/resonance peak',
      'Follow-up Learning thread'
    ],
    scheduling: { suggestion: null, note: 'Scheduling requires calendar permission — not auto-published.' },
    clipCandidates,
    analytics: analysis?.metrics || null,
    requiresConfirmation: true
  };
}

export function buildMeetingBrief({ title = 'Meeting', agenda = '', documents = [], participants = [] } = {}) {
  return {
    mode: 'business',
    title: String(title).slice(0, 160),
    agenda: String(agenda || '').slice(0, 4000),
    participants: participants.slice(0, 40),
    documentRefs: documents.slice(0, 20).map(d => ({ id: d.id, title: d.title })),
    prep: [
      'Confirm desired outcomes',
      'List open decisions',
      'Surface risks from docs (if any)'
    ],
    status: 'brief',
    aiInvolved: true,
    autoExecuted: false
  };
}

export function summarizeMeetingNotes({ title = 'Meeting summary', notes = '', locale = 'uk' } = {}) {
  const text = String(notes || '').trim().slice(0, 12000);
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const decisions = lines.filter(l => /decision|рішення|ustal|beschluss|decyz/i.test(l)).slice(0, 12);
  const risks = lines.filter(l => /risk|ризик|ryzyko|risiko/i.test(l)).slice(0, 12);
  const actions = lines.filter(l => /todo|task|дія|zadanie|aufgabe|action:/i.test(l)).slice(0, 12);
  return {
    mode: 'business',
    title: String(title).slice(0, 160),
    locale,
    summary: lines.slice(0, 8).join(' ') || 'No notes provided.',
    decisions,
    risks,
    actionCandidates: actions,
    sourceLength: text.length,
    requiresConfirmationForTasks: true,
    factPolicy: 'Do not invent decisions not present in notes.'
  };
}

export function proposeTasksFromDecisions(decisions = []) {
  return (decisions || []).slice(0, 20).map((d, i) => ({
    tempId: `decision-task-${i + 1}`,
    title: String(d).replace(/^(decision|рішення|todo|task)\s*[:\-]\s*/i, '').slice(0, 160),
    status: 'proposed',
    requiresConfirmation: true,
    financialOrLegal: /pay|contract|legal|financ|оплат|догов|прав/i.test(String(d))
  }));
}

export function buildLessonQuiz({ lesson, difficulty = 'adaptive', locale = 'uk' } = {}) {
  const title = lesson?.title || 'Lesson';
  const content = String(lesson?.content || '');
  const sentences = content.split(/[.!?]\s+/).map(s => s.trim()).filter(s => s.length > 20).slice(0, 6);
  const stem = sentences[0] || `What is the focus of “${title}”?`;
  const correct = sentences[1] || content.slice(0, 80) || title;
  const distractors = [
    sentences[2] || 'An unrelated platform feature',
    sentences[3] || 'A financial transfer action',
    'Sylora claiming consciousness'
  ].slice(0, 3);
  const options = shuffleStable([correct, ...distractors], lesson?.id || title);
  return {
    mode: 'learning',
    lessonId: lesson?.id,
    difficulty,
    locale,
    questions: [{
      id: 'q1',
      prompt: stem.slice(0, 280),
      options: options.map((text, i) => ({ id: `o${i + 1}`, text: String(text).slice(0, 200) })),
      correctOptionId: options.findIndex(o => o === correct) >= 0 ? `o${options.findIndex(o => o === correct) + 1}` : 'o1'
    }],
    explanations: {
      correct: 'Matches the lesson content.',
      incorrect: 'Re-read the lesson section and try a simpler explanation path.'
    }
  };
}

export function adaptiveLearningState({ progressRatio = 0, attempts = [] } = {}) {
  const wrong = attempts.filter(a => !a.correct).length;
  const total = attempts.length;
  let difficulty = 'medium';
  if (progressRatio < 0.3 || (total && wrong / total > 0.6)) difficulty = 'easier';
  else if (progressRatio > 0.7 && total && wrong / total < 0.25) difficulty = 'harder';
  return {
    knownEstimate: progressRatio,
    errorRate: total ? wrong / total : null,
    difficulty,
    nextStep: difficulty === 'easier' ? 'reteach_with_simpler_example' : difficulty === 'harder' ? 'offer_challenge_quiz' : 'continue_lesson',
    multilingualTutoring: true
  };
}

function shuffleStable(arr, seed) {
  const out = [...arr];
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function homeHubPayload({
  me,
  posts = [],
  rooms = [],
  notifications = [],
  conversations = [],
  communities = [],
  courses = [],
  enrollments = [],
  orgs = [],
  activity = [],
  videos = []
} = {}) {
  const continueItems = [];
  if (activity[0]) continueItems.push({ kind: 'sylora_activity', label: activity[0].summary, view: 'ai' });
  if (conversations[0]?.lastMessage) continueItems.push({ kind: 'message', label: conversations[0].lastMessage.text, view: 'messages' });
  const enrolled = enrollments.filter(e => e.progress < 1).slice(0, 3);
  for (const e of enrolled) {
    const c = courses.find(x => x.id === e.courseId);
    if (c) continueItems.push({ kind: 'learning', label: c.title, progress: e.progress, view: 'learning', id: c.id });
  }
  return {
    userId: me?.id || null,
    continue: continueItems.slice(0, 6),
    live: rooms.slice(0, 8).map(r => ({ id: r.id, title: r.title, host: r.host, viewerCount: r.viewerCount })),
    inboxPreview: {
      unreadNotifications: notifications.filter(n => !n.read).length,
      conversations: conversations.slice(0, 5).map(c => ({
        id: c.id,
        preview: c.lastMessage?.text || '',
        members: c.members
      }))
    },
    communities: communities.slice(0, 6),
    learning: enrolled.map(e => {
      const c = courses.find(x => x.id === e.courseId);
      return c ? { id: c.id, title: c.title, progress: e.progress } : null;
    }).filter(Boolean),
    projects: orgs.slice(0, 6).map(o => ({ id: o.id, name: o.name })),
    creator: {
      recentClips: videos.filter(v => v.format === 'clip').slice(0, 4).map(v => ({ id: v.id, title: v.title })),
      posts: posts.filter(p => p.author?.id === me?.id || p.userId === me?.id).slice(0, 3)
    },
    syloraRecommendations: [
      activity[0] ? { text: activity[0].summary, view: 'ai' } : { text: 'Talk with Sylora about your next step', view: 'ai' },
      rooms[0] ? { text: `Watch LIVE: ${rooms[0].title}`, view: 'live', id: rooms[0].id } : { text: 'Discover LIVE', view: 'live' }
    ]
  };
}
