/**
 * Stream recap + content repurposing drafts.
 * Never auto-publishes.
 */

export function buildStreamRecap({ analytics, chatSample = [], aiNotes = [], gifts = [] } = {}) {
  const snap = analytics?.snapshot?.() || analytics || {};
  const topQuestions = chatSample
    .filter(m => /\?/.test(m.text || m.message || ''))
    .slice(-20)
    .map(m => ({
      platform: m.platform,
      username: m.username,
      text: m.text || m.message
    }));

  const topSupporters = summarizeSupporters(gifts);
  const topics = inferTopics(chatSample);
  const chapters = suggestChapters(snap);
  const highlightCandidates = buildHighlights(chatSample, gifts);

  return {
    summary: {
      durationHint: snap.startedAt && snap.endedAt
        ? `${snap.startedAt} → ${snap.endedAt}`
        : snap.startedAt ? 'live_or_unended' : 'not_started',
      peakViewers: snap.peakViewers || 0,
      chatTotal: snap.chatTotal || 0,
      gifts: snap.gifts || 0,
      engagement: snap.engagement || 0,
      aiInteractions: snap.aiInteractions || 0
    },
    bestMoments: highlightCandidates.slice(0, 8),
    topQuestions: topQuestions.slice(0, 12),
    topSupporters,
    engagementTimeline: {
      chatPerMin: snap.chatPerMin || 0,
      platformBreakdown: snap.platformBreakdown || {}
    },
    topics,
    chapters,
    clipTimestamps: highlightCandidates.map(h => ({ at: h.at, label: h.label })),
    titles: suggestTitles(topics, snap),
    descriptions: [
      'Highlights from this SYLORA LIVE — questions, gifts, and moments worth keeping.',
      topics[0] ? `Main theme: ${topics[0]}.` : 'Community conversation and creator energy.'
    ],
    hashtags: ['#SYLORALIVE', '#Live', ...(topics.slice(0, 3).map(t => `#${t.replace(/\s+/g, '')}`))],
    shortVideoIdeas: highlightCandidates.slice(0, 5).map(h => ({
      idea: h.label,
      at: h.at,
      publish: false
    })),
    aiNotes: aiNotes.slice(-10),
    publish: false,
    honesty: { note: 'Draft only — nothing is published without explicit user confirmation.' }
  };
}

function summarizeSupporters(gifts) {
  const map = new Map();
  for (const g of gifts) {
    const key = g.userId || g.username || 'anon';
    const row = map.get(key) || { userId: g.userId, username: g.username, amount: 0, count: 0, platform: g.platform };
    row.amount += Number(g.amount) || 0;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
}

function inferTopics(chatSample) {
  const bag = new Map();
  for (const m of chatSample) {
    const words = String(m.text || m.message || '').toLowerCase().split(/[^a-zа-яіїєґ0-9]+/i).filter(w => w.length > 4);
    for (const w of words) bag.set(w, (bag.get(w) || 0) + 1);
  }
  return [...bag.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);
}

function suggestChapters(snap) {
  return [
    { at: '00:00', title: 'Start' },
    { at: 'mid', title: 'Community questions' },
    ...(snap.gifts > 0 ? [{ at: 'gifts', title: 'Gift moments' }] : []),
    { at: 'end', title: 'Wrap-up' }
  ];
}

function buildHighlights(chat, gifts) {
  const out = [];
  for (const g of gifts.slice(-10)) {
    out.push({ at: g.timestamp || g.at, label: `Gift from ${g.username || 'viewer'}`, kind: 'gift' });
  }
  for (const m of chat.filter(x => /\?/.test(x.text || '')).slice(-8)) {
    out.push({ at: m.timestamp, label: `Q: ${(m.text || '').slice(0, 60)}`, kind: 'question' });
  }
  return out;
}

function suggestTitles(topics, snap) {
  const t = topics[0] || 'community';
  return [
    `LIVE: ${t} + real talk`,
    `Peak ${snap.peakViewers || 0} — ${t}`,
    `SYLORA LIVE recap: ${t}`
  ];
}
