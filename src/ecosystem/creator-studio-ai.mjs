/** AI Creator Studio — proposals integrated with existing LIVE/Studio, never auto-publish. */

export function buildLivePackage(prompt, { id, creatorId }, now) {
  const topic = String(prompt || '').trim().slice(0, 200);
  if (!topic) throw new Error('PROMPT_REQUIRED');
  return {
    id,
    creatorId,
    topic,
    status: 'draft_proposal',
    structure: {
      coldOpen: `Hook about ${topic}`,
      acts: [
        { title: 'Context', minutes: 4, beats: ['why it matters', 'what we cover'] },
        { title: 'Deep dive', minutes: 12, beats: ['demo', 'examples', 'pitfalls'] },
        { title: 'Audience', minutes: 6, beats: ['Q&A', 'poll', 'CTA'] }
      ],
      closing: 'Summary + next LIVE'
    },
    scenes: [
      { name: 'Intro', overlays: ['title', 'topic'] },
      { name: 'Main', overlays: ['lower-third', 'chapters'] },
      { name: 'Interact', overlays: ['poll', 'Q&A'] }
    ],
    interactives: [
      { type: 'poll', question: `What do you want next about ${topic}?`, options: ['Basics', 'Advanced', 'Case study'] },
      { type: 'question_prompt', text: 'Ask me anything in chat' }
    ],
    captions: { enabled: true, languages: ['uk', 'en'] },
    translation: { enabled: true },
    moderation: { assistant: true, autoBan: false },
    postLive: {
      summary: true,
      clips: true,
      titles: [`${topic} — LIVE`, `Inside ${topic}`],
      descriptions: [`LIVE deep dive into ${topic}.`],
      thumbnails: ['auto-frame-hook', 'auto-frame-climax']
    },
    createdAt: now(),
    requiresCreatorApproval: true
  };
}

export function ensureCreatorStudioAi(store) {
  store.data.creatorStudioPlans ??= [];
  return store;
}

export function savePlan(store, plan) {
  ensureCreatorStudioAi(store);
  store.data.creatorStudioPlans.unshift(plan);
  store.save();
  return plan;
}
