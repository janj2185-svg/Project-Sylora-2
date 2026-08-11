/**
 * Ecosystem HTTP routes — mounted from server.mjs before 404.
 * Returns true when a request was handled.
 */
export async function handleEcosystemRoutes(ctx) {
  const {
    req, res, url, json, body, requireUser, route, safeText, ecosystem, store,
    aiListPendingActions
  } = ctx;
  const p = url.pathname;
  let m;

  // —— Command center / Personal AI dashboard ——
  if (req.method === 'GET' && p === '/api/ai/dashboard') {
    const user = await requireUser(req, res); if (!user) return true;
    const pending = aiListPendingActions ? await aiListPendingActions(user.id, 20) : [];
    return json(res, 200, ecosystem.dashboard(user, pending)), true;
  }
  if (req.method === 'PATCH' && p === '/api/ai/permissions') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { agent: ecosystem.updateAiPermissions(user, input.permissions || input) }), true;
  }
  if (req.method === 'GET' && p === '/api/ai/memory/export') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.exportMemory(user)), true;
  }
  if (req.method === 'DELETE' && p === '/api/ai/memory') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.clearMemory(user)), true;
  }
  if (req.method === 'GET' && p === '/api/ai/activity') {
    const user = await requireUser(req, res); if (!user) return true;
    const agent = ecosystem.ensurePersonalAgent(user);
    return json(res, 200, { agent, activity: store.data.aiActivity.filter(a => a.userId === user.id).slice(-100) }), true;
  }
  if (req.method === 'GET' && p === '/api/ai/command-center') {
    const user = await requireUser(req, res); if (!user) return true;
    const view = safeText(url.searchParams.get('view') || 'command_center', 40);
    return json(res, 200, {
      ...ecosystem.commandCenterContext(view),
      dashboard: ecosystem.dashboard(user),
      agent: ecosystem.ensurePersonalAgent(user),
      pack: ecosystem.contextPack(user, view)
    }), true;
  }
  if (req.method === 'GET' && p === '/api/ai/intelligence') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.intelligenceProfile(user)), true;
  }
  if (req.method === 'PATCH' && p === '/api/ai/proactive') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, ecosystem.setProactiveLevel(user, input.level)), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }

  // —— Identity ——
  if (req.method === 'GET' && p === '/api/identity') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { identity: ecosystem.ensureIdentity(user) }), true;
  }
  if (req.method === 'PATCH' && p === '/api/identity') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { identity: ecosystem.updateIdentity(user, input) }), true;
  }
  m = route('/api/identity/:userId', p);
  if (req.method === 'GET' && m) {
    const user = store.data.users.find(u => u.id === m.userId);
    if (!user) return json(res, 404, { error: 'USER_NOT_FOUND' }), true;
    const relation = 'public';
    return json(res, 200, { identity: ecosystem.getPublicIdentity(user, relation) }), true;
  }

  // —— Knowledge Graph ——
  if (req.method === 'GET' && p === '/api/kg') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.graphFor(user, { asAi: url.searchParams.get('asAi') === '1' })), true;
  }
  if (req.method === 'POST' && p === '/api/kg/nodes') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { node: ecosystem.addNode(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/kg/edges') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { edge: ecosystem.addEdge(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/kg/nodes/:id', p);
  if (req.method === 'DELETE' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    if (!ecosystem.deleteNode(user, m.id)) return json(res, 404, { error: 'NODE_NOT_FOUND' }), true;
    return json(res, 200, { deleted: true }), true;
  }

  // —— Action Engine ——
  if (req.method === 'GET' && p === '/api/actions') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { actions: ecosystem.listActions(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/actions') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { action: ecosystem.proposeAction(user, input) }), true;
  }
  m = route('/api/actions/:id/confirm', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.confirmEcosystemAction(user, m.id);
    return json(res, out.ok ? 200 : 404, out), true;
  }

  // —— Agent Marketplace ——
  if (req.method === 'GET' && p === '/api/agents') {
    return json(res, 200, { agents: ecosystem.listAgents(), revenueShares: ecosystem.revenueShares().agentSales }), true;
  }
  if (req.method === 'POST' && p === '/api/agents') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { agent: ecosystem.publishAgent(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/agents/installed') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { installs: ecosystem.myInstalls(user) }), true;
  }
  m = route('/api/agents/:id/install', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.installAgent(user, m.id);
    return json(res, out.ok ? 201 : 400, out), true;
  }
  m = route('/api/agents/:id/install', p);
  if (req.method === 'DELETE' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    if (!ecosystem.uninstallAgent(user, m.id)) return json(res, 404, { error: 'INSTALL_NOT_FOUND' }), true;
    return json(res, 200, { removed: true }), true;
  }

  // —— Developer Platform ——
  if (req.method === 'GET' && p === '/api/developer/apps') {
    const user = await requireUser(req, res); if (!user) return true;
    const { OAUTH_DOC } = await import('./developer-platform.mjs');
    return json(res, 200, { apps: ecosystem.listApps(user), oauth: OAUTH_DOC }), true;
  }
  if (req.method === 'POST' && p === '/api/developer/apps') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { app: ecosystem.createApp(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/developer/apps/:id/keys', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const out = ecosystem.createKey(user, m.id, input.label);
    return json(res, out.ok ? 201 : 404, out), true;
  }

  // Public v1 identity (API key or session)
  if (req.method === 'GET' && p === '/api/v1/identity/me') {
    const auth = req.headers.authorization || '';
    if (auth.startsWith('Bearer syl_')) {
      const resolved = ecosystem.resolveApiKey(auth.slice(7));
      if (!resolved) return json(res, 401, { error: 'INVALID_API_KEY' }), true;
      if (!resolved.app.scopes.includes('identity.read')) return json(res, 403, { error: 'SCOPE_DENIED' }), true;
      const owner = store.data.users.find(u => u.id === resolved.app.ownerId);
      return json(res, 200, { identity: ecosystem.getPublicIdentity(owner, 'self'), app: { id: resolved.app.id, scopes: resolved.app.scopes } }), true;
    }
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { identity: ecosystem.ensureIdentity(user) }), true;
  }

  // —— Translation ——
  if (req.method === 'POST' && p === '/api/translate') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const text = safeText(input.text, 8000);
    if (!text) return json(res, 400, { error: 'TEXT_REQUIRED' }), true;
    try {
      const job = ecosystem.translate(user, { ...input, text });
      return json(res, 200, { job }), true;
    } catch (e) { return json(res, 400, { error: e.message }), true; }
  }

  // —— AI Creator Studio (integrates with existing Studio, not a dead tab) ——
  if (req.method === 'POST' && p === '/api/studio/ai/plan') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const topic = safeText(input.topic, 200);
    if (!topic) return json(res, 400, { error: 'TOPIC_REQUIRED' }), true;
    return json(res, 200, ecosystem.creatorStudioPlan(user, topic)), true;
  }
  m = route('/api/studio/ai/plan/:id/confirm', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.confirmCreatorStudioPlan(user, m.id);
    return json(res, out.ok ? 200 : 404, out), true;
  }
  if (req.method === 'POST' && p === '/api/studio/ai/content-pack') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.creatorContentPack(user, { topic: safeText(input.topic, 200) })), true;
  }
  m = route('/api/orgs/:id/meeting-brief', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, ecosystem.meetingBrief(user, m.id, input)), true; }
    catch (e) { return json(res, e.message === 'FORBIDDEN' ? 403 : 400, { error: e.message }), true; }
  }
  m = route('/api/orgs/:id/meeting-summary', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, ecosystem.meetingSummary(user, m.id, input)), true; }
    catch (e) { return json(res, e.message === 'FORBIDDEN' ? 403 : 400, { error: e.message }), true; }
  }
  m = route('/api/orgs/:id/proposed-tasks/confirm', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.confirmProposedTasks(user, m.id, input.tasks || [])), true;
  }
  if (req.method === 'GET' && p === '/api/ai/capabilities') {
    return json(res, 200, ecosystem.capabilitiesSnapshot({
      aiConfigured: !!process.env.OPENAI_API_KEY,
      realtimeConfigured: !!process.env.OPENAI_API_KEY
    })), true;
  }
  if (req.method === 'GET' && p === '/api/home/hub') {
    const user = await requireUser(req, res); if (!user) return true;
    const roomsSource = (store.data.liveRooms || []).filter(r => r.status === 'live');
    const rooms = roomsSource.slice(0, 12).map(r => {
      const host = store.data.users.find(u => u.id === r.hostId);
      return { ...r, host: store.publicUser(host), viewerCount: r.viewerCount || 0 };
    });
    const conversations = (store.data.conversations || [])
      .filter(c => (c.memberIds || []).includes(user.id) || (c.members || []).some(m => m.id === user.id))
      .slice(0, 8);
    const hub = ecosystem.buildHomeHub(user, {
      posts: (store.data.posts || []).slice(0, 30).map(p => ({
        ...p,
        author: store.publicUser(store.data.users.find(u => u.id === p.userId))
      })),
      rooms,
      notifications: (store.data.notifications || []).filter(n => n.userId === user.id).slice(0, 20),
      conversations,
      communities: (store.data.communities || []).slice(0, 12),
      courses: (store.data.courses || []).filter(c => c.published),
      enrollments: (store.data.enrollments || []).filter(e => e.userId === user.id),
      orgs: ecosystem.listOrgs(user),
      activity: (store.data.aiActivity || []).filter(a => a.userId === user.id).slice(-10).reverse(),
      videos: (store.data.videos || []).filter(v => v.userId === user.id).slice(0, 12)
    });
    return json(res, 200, { hub }), true;
  }

  // —— AI-to-AI economy ——
  if (req.method === 'GET' && p === '/api/agents/negotiations') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { negotiations: ecosystem.listNegotiations(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/agents/negotiations') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const out = ecosystem.startNegotiation(user, input);
    return json(res, out.ok ? 201 : 400, out), true;
  }
  m = route('/api/agents/negotiations/:id/confirm', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.confirmNegotiation(user, m.id);
    return json(res, out.ok ? 200 : 404, out), true;
  }

  // —— Business OS / Enterprise control ——
  if (req.method === 'GET' && p === '/api/orgs') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { organizations: ecosystem.listOrgs(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/orgs') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.name, 120)) return json(res, 400, { error: 'NAME_REQUIRED' }), true;
    return json(res, 201, { organization: ecosystem.createOrg(user, input) }), true;
  }
  m = route('/api/orgs/:id/ai-control', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.getControlPlane(user, m.id);
    return json(res, out.ok ? 200 : 403, out), true;
  }
  if (req.method === 'PATCH' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const out = ecosystem.updateControlPlane(user, m.id, input);
    return json(res, out.ok ? 200 : 403, out), true;
  }
  m = route('/api/orgs/:id/workspace', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.listOrgWorkspace(user, m.id);
    return json(res, out.ok ? 200 : 403, out), true;
  }
  m = route('/api/orgs/:id/teams', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const out = ecosystem.createTeam(user, m.id, input.name);
    return json(res, out.ok ? 201 : 403, out), true;
  }
  m = route('/api/orgs/:id/documents', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    const out = ecosystem.addOrgDocument(user, m.id, input);
    return json(res, out.ok ? 201 : 403, out), true;
  }
  m = route('/api/orgs/:id/tasks', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    const out = ecosystem.addOrgTask(user, m.id, input);
    return json(res, out.ok ? 201 : 403, out), true;
  }

  // —— Reputation / provenance / security / commerce / search ——
  if (req.method === 'GET' && p === '/api/reputation') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { reputation: ecosystem.reputation(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/reputation/dispute') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { reputation: ecosystem.disputeReputation(user, input.dimension, input.reason) }), true;
  }
  if (req.method === 'POST' && p === '/api/provenance') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { provenance: ecosystem.addProvenance(user, input) }), true;
  }
  if (req.method === 'GET' && p === '/api/security-center') {
    const user = await requireUser(req, res); if (!user) return true;
    const capabilities = ecosystem.capabilitiesSnapshot({
      aiConfigured: !!process.env.OPENAI_API_KEY,
      realtimeConfigured: !!process.env.OPENAI_API_KEY
    });
    return json(res, 200, ecosystem.securityCenter(user, {
      blocks: store.data.blocks.filter(b => b.blockerId === user.id || b.userId === user.id),
      capabilities
    })), true;
  }
  if (req.method === 'PATCH' && p === '/api/ai/privacy-controls') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const agent = ecosystem.updatePrivacyControls(user, input || {});
    return json(res, 200, { agent }), true;
  }
  if (req.method === 'POST' && p === '/api/privacy/requests') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { request: ecosystem.requestPrivacy(user, input.type, input.details) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/commerce/products') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { products: ecosystem.listProducts(), mine: ecosystem.listProducts(user.id), paymentMode: 'sandbox' }), true;
  }
  if (req.method === 'POST' && p === '/api/commerce/products') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 201, { product: ecosystem.createProduct(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/commerce/products/:id/checkout', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.checkout(user, m.id);
    return json(res, out.ok ? 201 : 400, out), true;
  }
  if (req.method === 'GET' && p === '/api/search/ai') {
    const user = await requireUser(req, res); if (!user) return true;
    const prompt = safeText(url.searchParams.get('q') || '', 500);
    return json(res, 200, ecosystem.aiSearch(prompt)), true;
  }
  if (req.method === 'GET' && p === '/api/ecosystem/metrics') {
    const user = await requireUser(req, res); if (!user) return true;
    if (user.role !== 'admin') return json(res, 403, { error: 'ADMIN_ONLY' }), true;
    return json(res, 200, ecosystem.metricsSnapshot()), true;
  }
  if (req.method === 'GET' && p === '/api/ecosystem/status') {
    return json(res, 200, {
      core: 'personal_ai+identity+kg+actions+agents+developers+translation+business+trust',
      revenueShares: ecosystem.revenueShares(),
      translationVoicePolicy: (await import('./translation.mjs')).VOICE_POLICY
    }), true;
  }

  return false;
}
