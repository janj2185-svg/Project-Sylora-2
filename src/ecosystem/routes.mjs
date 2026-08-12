/**
 * Ecosystem HTTP routes — mounted from server.mjs before 404.
 * Returns true when a request was handled.
 */
export async function handleEcosystemRoutes(ctx) {
  const {
    req, res, url, json, body, requireUser, route, safeText, ecosystem, store,
    aiListPendingActions, callPeerRegistry, callStreams, liveIceServers, hasTurnServer
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
    const query = safeText(url.searchParams.get('q') || '', 500);
    return json(res, 200, {
      ...ecosystem.commandCenterContext(view),
      dashboard: ecosystem.dashboard(user),
      agent: ecosystem.ensurePersonalAgent(user),
      pack: ecosystem.contextPack(user, view, { query })
    }), true;
  }
  if (req.method === 'POST' && p === '/api/ai/context') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, {
      contextEngine: ecosystem.buildContextEngine(user, {
        view: safeText(input.view || 'command_center', 40),
        query: safeText(input.query || input.q || '', 500),
        spaceId: input.spaceId || null
      })
    }), true;
  }
  if (req.method === 'POST' && p === '/api/ai/orchestrate') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const text = safeText(input.text || input.q || '', 2000);
    if (!text) return json(res, 400, { error: 'TEXT_REQUIRED' }), true;
    return json(res, 200, ecosystem.orchestrate(user, text)), true;
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
  if (req.method === 'POST' && p === '/api/ai/command') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const text = safeText(input.text || input.q || '', 2000);
    if (!text) return json(res, 400, { error: 'TEXT_REQUIRED' }), true;
    try {
      return json(res, 200, await ecosystem.universalCommand(user, text, {
        locale: input.locale || user.locale,
        executeReads: input.executeReads !== false
      })), true;
    } catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/ai/ask') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, await ecosystem.askAboutContext(user, {
      view: safeText(input.view || 'ai', 40),
      contentType: safeText(input.contentType || 'unknown', 40),
      contentId: input.contentId || null,
      question: safeText(input.question || input.text || '', 2000)
    })), true;
  }
  if (req.method === 'GET' && p === '/api/ai/memory/center') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.memoryCenter(user)), true;
  }
  if (req.method === 'PATCH' && p === '/api/ai/memory/enabled') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.setMemoryEnabled(user, input.enabled !== false)), true;
  }
  m = route('/api/ai/memory/:id', p);
  if (req.method === 'PATCH' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const memory = ecosystem.updateMemory(user, m.id, input || {});
    if (!memory) return json(res, 404, { error: 'MEMORY_NOT_FOUND' }), true;
    return json(res, 200, { memory }), true;
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
    const out = await ecosystem.confirmEcosystemAction(user, m.id);
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
    const out = await ecosystem.confirmCreatorStudioPlan(user, m.id);
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
    const roomsSource = await ecosystem.resolveLiveRooms({ limit: 12 });
    const rooms = await Promise.all(roomsSource.map(async r => {
      const host = store.data.users.find(u => u.id === r.hostId);
      return { ...r, host: store.publicUser(host), viewerCount: r.viewerCount || 0 };
    }));
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
    return json(res, 200, await ecosystem.aiSearch(prompt, user)), true;
  }
  if (req.method === 'GET' && p === '/api/search/universal') {
    const user = await requireUser(req, res); if (!user) return true;
    const prompt = safeText(url.searchParams.get('q') || '', 500);
    if (prompt.length < 2) return json(res, 200, { query: prompt, structured: [], semantic: [] }), true;
    return json(res, 200, await ecosystem.universalSearch(user, prompt)), true;
  }

  // —— Spaces / Events / Calendar / Projects ——
  if (req.method === 'GET' && p === '/api/spaces') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.listUserSpaces(user)), true;
  }
  if (req.method === 'GET' && p === '/api/platform-events') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { events: ecosystem.listEvents(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/platform-events') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    return json(res, 201, { event: ecosystem.createEvent(user, input) }), true;
  }
  m = route('/api/platform-events/:id/register', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.registerForEvent(user, m.id);
    return json(res, out.ok ? 200 : 404, out), true;
  }
  if (req.method === 'GET' && p === '/api/calendar') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { items: ecosystem.listCalendar(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/calendar') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    return json(res, 201, { item: ecosystem.createCalendarItem(user, input) }), true;
  }
  if (req.method === 'GET' && p === '/api/projects') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { projects: ecosystem.listProjects(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/projects') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.name, 120)) return json(res, 400, { error: 'NAME_REQUIRED' }), true;
    return json(res, 201, { project: ecosystem.createProject(user, input) }), true;
  }
  m = route('/api/projects/:id', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = ecosystem.projectWorkspace(user, m.id);
    return json(res, out.ok ? 200 : 404, out), true;
  }
  m = route('/api/live/:id/copilot', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const out = await ecosystem.liveCopilotBundle(user, m.id);
    return json(res, out.ok ? 200 : (out.error === 'LIVE_HOST_REQUIRED' ? 403 : 404), out), true;
  }
  if (req.method === 'GET' && p === '/api/notifications/smart') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { bundle: ecosystem.smartNotifications(user) }), true;
  }
  if (req.method === 'GET' && p === '/api/continuity') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { sessions: ecosystem.continuityList(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/continuity') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { session: ecosystem.continuityUpsert(user, input || {}) }), true;
  }
  if (req.method === 'GET' && p === '/api/feature-flags') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { flags: ecosystem.flagsFor(user) }), true;
  }

  // —— Intelligence Layer / Personal OS ——
  if (req.method === 'GET' && p === '/api/daily-brief') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { brief: await ecosystem.dailyBrief(user) }), true;
  }
  if (req.method === 'PATCH' && p === '/api/daily-brief') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { prefs: ecosystem.setDailyBriefEnabled(user, input.enabled !== false) }), true;
  }
  if (req.method === 'GET' && p === '/api/inbox/intelligent') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { inbox: ecosystem.intelligentInbox(user) }), true;
  }
  if (req.method === 'GET' && p === '/api/activity-graph') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { events: ecosystem.activityTimeline(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/content/understand') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, ecosystem.indexContent(user, input || {})), true;
  }
  if (req.method === 'GET' && p === '/api/content/history') {
    const user = await requireUser(req, res); if (!user) return true;
    const q = safeText(url.searchParams.get('q') || '', 500);
    if (q.length >= 2) return json(res, 200, ecosystem.searchContentHistory(user, q)), true;
    return json(res, 200, { history: ecosystem.listContentHistory(user) }), true;
  }
  if (req.method === 'PATCH' && p === '/api/content/history') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.setContentHistoryEnabled(user, input.enabled !== false)), true;
  }
  if (req.method === 'GET' && p === '/api/tasks') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { tasks: ecosystem.listTasks(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/tasks') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    return json(res, 201, { task: ecosystem.createTask(user, input) }), true;
  }
  m = route('/api/tasks/:id', p);
  if (req.method === 'PATCH' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const task = ecosystem.updateTask(user, m.id, await body(req));
    if (!task) return json(res, 404, { error: 'TASK_NOT_FOUND' }), true;
    return json(res, 200, { task }), true;
  }
  if (req.method === 'GET' && p === '/api/goals') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { goals: ecosystem.listGoals(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/goals') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.title, 160)) return json(res, 400, { error: 'TITLE_REQUIRED' }), true;
    return json(res, 201, { goal: ecosystem.createUserGoal(user, input) }), true;
  }
  if (req.method === 'GET' && p === '/api/decisions') {
    const user = await requireUser(req, res); if (!user) return true;
    const q = safeText(url.searchParams.get('q') || '', 200);
    return json(res, 200, {
      decisions: q ? ecosystem.findDecisions(user, q) : ecosystem.listDecisions(user, { spaceId: url.searchParams.get('spaceId') })
    }), true;
  }
  if (req.method === 'POST' && p === '/api/decisions') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.decision, 500)) return json(res, 400, { error: 'DECISION_REQUIRED' }), true;
    return json(res, 201, { decision: ecosystem.recordDecision(user, input) }), true;
  }
  if (req.method === 'GET' && p === '/api/shared-memory') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, {
      memories: ecosystem.listSharedMemory(user, {
        spaceId: url.searchParams.get('spaceId'),
        scope: url.searchParams.get('scope')
      }),
      knowledgeSpaces: ecosystem.knowledgeSpaces(user)
    }), true;
  }
  if (req.method === 'POST' && p === '/api/shared-memory') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.label, 80) || !safeText(input.value, 4000)) return json(res, 400, { error: 'MEMORY_REQUIRED' }), true;
    try { return json(res, 201, { memory: ecosystem.addSharedMemory(user, input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/dashboard') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { dashboard: await ecosystem.personalDashboard(user) }), true;
  }
  if (req.method === 'GET' && p === '/api/skills') {
    return json(res, 200, { skills: ecosystem.listSkills(), specialists: ['research', 'creator', 'business', 'translation', 'moderation', 'search', 'planning', 'learning'] }), true;
  }
  if (req.method === 'GET' && p === '/api/canvas') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { workspaces: ecosystem.listCanvas(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/canvas') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { workspace: ecosystem.createCanvas(user, input || {}) }), true;
  }
  m = route('/api/spaces/:id/ask', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    const out = await ecosystem.spaceAsk(user, m.id, safeText(input.question || input.text || '', 2000));
    return json(res, out.ok ? 200 : 404, out), true;
  }
  if (req.method === 'POST' && p === '/api/meetings/result') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { result: ecosystem.saveMeetingResult(user, input || {}) }), true;
  }
  if (req.method === 'POST' && p === '/api/studio/ai/pipeline') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.creatorPipeline(user, input || {})), true;
  }
  if (req.method === 'POST' && p === '/api/revenue-split/draft') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { draft: ecosystem.draftRevenueSplit(user, input || {}) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/verify') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.scienceVerify(user, input || {})), true;
  }
  if (req.method === 'GET' && p === '/api/learning/graph') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { graph: ecosystem.learningGraph(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/learning/graph') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, { graph: ecosystem.upsertLearningGraph(user, input.concept, input.state, input.reason) }), true;
  }
  if (req.method === 'GET' && p === '/api/integrations') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { services: ecosystem.listConnectedServices(user), note: 'OAuth tokens never exposed to frontend' }), true;
  }
  if (req.method === 'POST' && p === '/api/integrations') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!safeText(input.provider, 60)) return json(res, 400, { error: 'PROVIDER_REQUIRED' }), true;
    return json(res, 201, { service: ecosystem.connectService(user, input) }), true;
  }
  m = route('/api/integrations/:id', p);
  if (req.method === 'DELETE' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    if (!ecosystem.disconnectService(user, m.id)) return json(res, 404, { error: 'NOT_FOUND' }), true;
    return json(res, 200, { disconnected: true }), true;
  }
  if (req.method === 'POST' && p === '/api/business/workflows') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { workflow: ecosystem.createBusinessWorkflow(user, input || {}) }), true;
  }
  if (req.method === 'GET' && p === '/api/onboarding') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { onboarding: ecosystem.onboarding(user) }), true;
  }
  if (req.method === 'GET' && p === '/api/guest/view') {
    return json(res, 200, await ecosystem.guestView({
      userId: url.searchParams.get('userId'),
      contentId: url.searchParams.get('contentId'),
      liveId: url.searchParams.get('liveId'),
      visibility: url.searchParams.get('visibility') || 'public'
    })), true;
  }
  m = route('/api/public/u/:username', p);
  if (req.method === 'GET' && m) {
    const user = store.data.users.find(u => u.username === m.username);
    if (!user) return json(res, 404, { error: 'USER_NOT_FOUND' }), true;
    return json(res, 200, {
      profile: ecosystem.getPublicIdentity(user, 'public'),
      web: ecosystem.publicWebMeta(user.id),
      guest: await ecosystem.guestView({ userId: user.id, visibility: 'public' })
    }), true;
  }

  if (req.method === 'GET' && p === '/api/ecosystem/metrics') {
    const user = await requireUser(req, res); if (!user) return true;
    if (user.role !== 'admin') return json(res, 403, { error: 'ADMIN_ONLY' }), true;
    return json(res, 200, ecosystem.metricsSnapshot()), true;
  }
  if (req.method === 'GET' && p === '/api/ecosystem/status') {
    return json(res, 200, {
      core: 'personal_ai+identity+kg+actions+agents+developers+translation+business+trust+command+spaces+events',
      revenueShares: ecosystem.revenueShares(),
      translationVoicePolicy: (await import('./translation.mjs')).VOICE_POLICY,
      platform: ecosystem.platformStatus(),
      capabilities: ecosystem.capabilitiesSnapshot({
        aiConfigured: !!process.env.OPENAI_API_KEY,
        realtimeConfigured: !!process.env.OPENAI_API_KEY
      })
    }), true;
  }


  // —— LIVE Entertainment / Calls / Business Finance / Learning-Science (181–237) ——
  if (req.method === 'GET' && p === '/api/live/entertainment') {
    return json(res, 200, ecosystem.entertainmentCatalog()), true;
  }
  if (req.method === 'POST' && p === '/api/live/battles') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { battle: await ecosystem.startResonanceBattle(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/battles/:id/factor', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, await ecosystem.battleFactor(user, m.id, await body(req))), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/battles/:id/advance', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { battle: await ecosystem.advanceBattle(user, m.id) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/:id/world', p);
  if (req.method === 'GET' && m) {
    return json(res, 200, { world: await ecosystem.resonanceWorld(m.id) }), true;
  }
  if (req.method === 'POST' && p === '/api/live/challenges') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { challenge: await ecosystem.startLiveChallenge(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/live/quizzes') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { quiz: await ecosystem.startLiveQuiz(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/quizzes/:id/answer', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, ecosystem.answerLiveQuiz(user, m.id, input.optionIndex)), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/live/minigames') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { session: await ecosystem.startMiniGame(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/live/audience-vs-sylora') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { session: await ecosystem.startAudienceVsSylora(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/:id/cohost', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { cohost: await ecosystem.setCoHostAutonomy(user, m.id, input.autonomy) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/:id/room-kind', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { profile: await ecosystem.setLiveRoomKind(user, m.id, input.kind, input.title) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/live/:id/stage', p);
  if (req.method === 'GET' && m) {
    const live = await ecosystem.resolveLiveRoom(m.id);
    if (!live) return json(res, 404, { error: 'LIVE_NOT_FOUND' }), true;
    return json(res, 200, { stage: ecosystem.ensureStage(m.id, live.hostId) }), true;
  }
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { stage: await ecosystem.stageAction(user, m.id, input.action, input.userId) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/timers') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { timer: ecosystem.createTimer(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/timers/:id', p);
  if (req.method === 'GET' && m) {
    const timer = ecosystem.getTimer(m.id);
    if (!timer) return json(res, 404, { error: 'TIMER_NOT_FOUND' }), true;
    return json(res, 200, { timer }), true;
  }
  if (req.method === 'POST' && p === '/api/focus') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { session: ecosystem.startFocus(user, await body(req)) }), true;
  }

  if (req.method === 'GET' && p === '/api/calls/rtc-config') {
    const user = await requireUser(req, res); if (!user) return true;
    const iceServers = liveIceServers || [];
    return json(res, 200, {
      iceServers,
      turnConfigured: typeof hasTurnServer === 'function' ? hasTurnServer(iceServers) : false,
      engine: 'call_engine_shared_webrtc'
    }), true;
  }
  if (req.method === 'POST' && p === '/api/calls') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { call: ecosystem.startCall(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/calls/history') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { history: ecosystem.listCallHistory(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/calls/sylora') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 201, { call: ecosystem.startSyloraCall(user, input.mode) }), true;
  }
  m = route('/api/calls/sylora/:id/permissions', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { call: ecosystem.setSyloraCallPermission(user, m.id, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/calls/:id/events', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const call = ecosystem.getCall(m.id);
    try { ecosystem.assertCallParticipant(call, user.id); }
    catch (e) { return json(res, e.message === 'CALL_NOT_FOUND' ? 404 : 403, { error: e.message }), true; }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`event: presence\ndata: ${JSON.stringify({ status: 'connected', userId: user.id, callId: call.id })}\n\n`);
    if (callStreams) {
      if (!callStreams.has(call.id)) callStreams.set(call.id, new Set());
      const targets = callStreams.get(call.id);
      targets.add(res);
      const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
      req.on('close', () => {
        clearInterval(heartbeat);
        targets.delete(res);
        if (!targets.size) callStreams.delete(call.id);
      });
    }
    return true;
  }
  m = route('/api/calls/:id/signal', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const call = ecosystem.getCall(m.id);
    try { ecosystem.assertCallParticipant(call, user.id); }
    catch (e) { return json(res, e.message === 'CALL_NOT_FOUND' ? 404 : 403, { error: e.message }), true; }
    if (!['ringing', 'active'].includes(call.status)) return json(res, 409, { error: 'CALL_NOT_ACTIVE' }), true;
    const input = await body(req);
    const kind = safeText(input.kind, 30);
    const fromPeerId = safeText(input.fromPeerId, 80);
    const toPeerId = safeText(input.toPeerId, 80);
    if (!['peer-join', 'offer', 'answer', 'ice', 'peer-left'].includes(kind) || !fromPeerId) {
      return json(res, 400, { error: 'INVALID_SIGNAL' }), true;
    }
    if (callPeerRegistry) {
      if (kind === 'peer-join') {
        if (!await callPeerRegistry.claim(call.id, fromPeerId, user.id)) {
          return json(res, 409, { error: 'PEER_ID_IN_USE' }), true;
        }
      } else {
        if (await callPeerRegistry.owner(call.id, fromPeerId) !== user.id) {
          return json(res, 403, { error: 'SIGNAL_PEER_FORBIDDEN' }), true;
        }
        if (toPeerId) {
          const targetUserId = await callPeerRegistry.owner(call.id, toPeerId);
          if (!targetUserId || !(call.participants || []).some(x => x.userId === targetUserId)) {
            return json(res, 409, { error: 'SIGNAL_TARGET_UNKNOWN' }), true;
          }
        }
      }
    }
    const signal = {
      kind,
      fromPeerId,
      toPeerId: toPeerId || null,
      userId: user.id,
      data: input.data ?? null,
      at: store.now()
    };
    if (callStreams) {
      const payload = `event: signal\ndata: ${JSON.stringify(signal)}\n\n`;
      const targets = callStreams.get(call.id);
      if (targets) for (const target of targets) target.write(payload);
    }
    return json(res, 200, { ok: true, signal }), true;
  }
  m = route('/api/calls/:id', p);
  if (req.method === 'GET' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const call = ecosystem.getCall(m.id);
    try { ecosystem.assertCallParticipant(call, user.id); }
    catch (e) { return json(res, e.message === 'CALL_NOT_FOUND' ? 404 : 403, { error: e.message }), true; }
    return json(res, 200, { call }), true;
  }
  m = route('/api/calls/:id/:action', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { call: ecosystem.callAction(user, m.id, m.action, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }

  if (req.method === 'GET' && p === '/api/business/hub') {
    return json(res, 200, ecosystem.businessHub()), true;
  }
  if (req.method === 'GET' && p === '/api/business/country') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { profile: ecosystem.getBusinessCountry(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/country') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { profile: ecosystem.setBusinessCountry(user, await body(req)) }), true;
  }
  if (req.method === 'GET' && p === '/api/business/invoices') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { invoices: ecosystem.listInvoices(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/invoices') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { invoice: ecosystem.createInvoice(user, await body(req)) }), true;
  }
  m = route('/api/business/invoices/:id/status', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { invoice: ecosystem.updateInvoiceStatus(user, m.id, input.status) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/business/expenses/extract') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { extraction: ecosystem.extractExpense(user, await body(req)) }), true;
  }
  m = route('/api/business/expenses/:id/confirm', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { extraction: ecosystem.confirmExpense(user, m.id, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/business/crm') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { records: ecosystem.listCrm(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/crm') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { record: ecosystem.upsertCrm(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/quotes') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { quote: ecosystem.createBusinessQuote(user, await body(req)) }), true;
  }
  m = route('/api/business/quotes/:id/accept', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, ecosystem.acceptQuote(user, m.id, input.convertTo || 'invoice_draft')), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/business/time') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { entry: ecosystem.timeTrack(user, input.action || 'start', input) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/business/time') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { entries: ecosystem.listTimeEntries(user) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/budget') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { budget: ecosystem.setProjectBudget(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/inventory') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { item: ecosystem.inventoryItem(user, await body(req)), optional: true }), true;
  }
  if (req.method === 'POST' && p === '/api/business/accountant/invite') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    if (!input.accountantUserId) return json(res, 400, { error: 'ACCOUNTANT_REQUIRED' }), true;
    return json(res, 201, { invite: ecosystem.inviteAccountant(user, input.accountantUserId) }), true;
  }
  if (req.method === 'POST' && p === '/api/business/contracts') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { contract: ecosystem.createContract(user, await body(req)) }), true;
  }
  if (req.method === 'GET' && p === '/api/business/accounting/export') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.accountingExport(user, url.searchParams.get('format') || 'csv')), true;
  }
  if (req.method === 'POST' && p === '/api/business/finance/ask') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.financeAssist(user, input.query || input.text || '')), true;
  }

  if (req.method === 'GET' && p === '/api/learning/hub') {
    return json(res, 200, ecosystem.learningHub()), true;
  }
  if (req.method === 'GET' && p === '/api/science/hub') {
    return json(res, 200, ecosystem.scienceHub()), true;
  }
  if (req.method === 'POST' && p === '/api/learning/tutor') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, ecosystem.startTutor(user, await body(req))), true;
  }
  if (req.method === 'POST' && p === '/api/learning/flashcards') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { deck: ecosystem.createDeck(user, await body(req)) }), true;
  }
  m = route('/api/learning/flashcards/:deckId/review', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    try { return json(res, 200, { card: ecosystem.reviewCard(user, m.deckId, input.cardId, input.quality) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/learning/exam-plan') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { plan: ecosystem.createExamStudyPlan(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/learning/assignments') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { assignment: ecosystem.createLearningAssignment(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/learning/quiz-builder') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { quiz: ecosystem.buildQuiz(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/learning/notes') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { note: ecosystem.createUserSmartNote(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/whiteboard') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { board: ecosystem.createBoard(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/library') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { item: ecosystem.addLibraryItem(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/paper-reader') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { view: ecosystem.paperReader(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/citations') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { citation: ecosystem.addCitation(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/projects') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { project: ecosystem.createResearch(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/datasets') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { dataset: ecosystem.createDataset(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/learning/language-tutor') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { mode: ecosystem.languageTutor(user, await body(req)) }), true;
  }


  // —— Shared engines + Science/Social (238–255) ——
  if (req.method === 'GET' && p === '/api/engines') {
    return json(res, 200, ecosystem.sharedEngines()), true;
  }
  if (req.method === 'POST' && p === '/api/timers/assistant') {
    const user = await requireUser(req, res); if (!user) return true;
    const input = await body(req);
    return json(res, 200, ecosystem.timeAssistant(user, input.text || input.query || '')), true;
  }
  m = route('/api/timers/:id/:action', p);
  if (req.method === 'POST' && m && ['pause', 'resume', 'complete'].includes(m.action)) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { timer: ecosystem.timerAction(user, m.id, m.action) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/quizzes') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { quiz: ecosystem.createSharedQuiz(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/quizzes/:id/answer', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, ecosystem.answerSharedQuiz(user, m.id, await body(req))), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/science/experiments') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { experiment: ecosystem.createExperiment(user, await body(req)) }), true;
  }
  m = route('/api/science/experiments/:id', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { experiment: ecosystem.updateExperiment(user, m.id, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/science/experiments/:id/versions/:version', p);
  if (req.method === 'PUT' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 409, ecosystem.refuseExperimentRewrite(user, m.id, m.version)), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/science/calculators') {
    return json(res, 200, ecosystem.calculators()), true;
  }
  if (req.method === 'POST' && p === '/api/science/calculators/run') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { result: ecosystem.calculate(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/science/formulas') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { workspace: ecosystem.createFormula(user, await body(req)) }), true;
  }
  if (req.method === 'POST' && p === '/api/science/statistics') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 200, { analysis: ecosystem.statisticsAssist(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'GET' && p === '/api/science/visualization') {
    return json(res, 200, ecosystem.scienceViz()), true;
  }
  if (req.method === 'POST' && p === '/api/science/match') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.scienceMatch(user, await body(req))), true;
  }
  if (req.method === 'POST' && p === '/api/science/circles') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { circle: ecosystem.createCircle(user, await body(req)) }), true;
  }
  m = route('/api/science/circles/:id/comments', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, ecosystem.commentCircle(user, m.id, await body(req))), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/conferences/program') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { program: ecosystem.createConferenceMode(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  m = route('/api/conferences/program/:id/qa', p);
  if (req.method === 'POST' && m) {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { qa: ecosystem.conferenceQa(user, m.id, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/social/fun-rooms') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { room: ecosystem.createFunRoom(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/social/community-events') {
    const user = await requireUser(req, res); if (!user) return true;
    try { return json(res, 201, { event: ecosystem.createCommunityEvt(user, await body(req)) }), true; }
    catch (e) { return json(res, 400, { error: e.message }), true; }
  }
  if (req.method === 'POST' && p === '/api/social/discovery') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, { profile: ecosystem.upsertDiscovery(user, await body(req)) }), true;
  }
  if (req.method === 'GET' && p === '/api/social/discovery/matches') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.runDiscovery(user)), true;
  }
  if (req.method === 'GET' && p === '/api/achievements') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 200, ecosystem.achievementsFor(user)), true;
  }
  if (req.method === 'POST' && p === '/api/live/seasonal') {
    const user = await requireUser(req, res); if (!user) return true;
    return json(res, 201, { event: ecosystem.createSeasonalEvent(user, await body(req)) }), true;
  }

  return false;
}
