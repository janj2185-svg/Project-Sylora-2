# SYLORA — Architecture Audit

## Stack
- **Runtime**: Node.js 22+, modular monolith (`src/server.mjs`)
- **Frontend**: Vanilla JS modules, layered CSS design system (v2–v6)
- **DB**: PostgreSQL + migrations (`infra/postgres/migrations/`)
- **Cache/coordination**: Redis (rate limits, LIVE fanout, peer registry)
- **AI**: OpenAI SDK (Responses + Realtime WebRTC)

## Module layout (after Phase 1 foundation)
```
src/
  server.mjs              # HTTP API + static
  store.mjs               # JSON dev persistence
  ecosystem/              # NEW — product kernel contracts
    permissions.mjs
    action-engine.mjs
    identity.mjs
    knowledge-graph.mjs
    personal-ai.mjs
  repositories/           # PostgreSQL adapters
  infra/                  # postgres, redis
  live-*, conference-*, realtime-*
public/
  app.js                  # shell + Sylora UI
  sylora-motion.js        # avatar motion rig
```

## Architectural conflicts identified
1. **Avatar v1 vs v2** — pseudo-element visemes vs layered rig; resolved via `avatar-rig` class
2. **Gesture sprites vs arm rig** — full-body gesture atlas overlapped rig arms; rig-only gestures now
3. **Dual AI entry points** — per-page AI vs global; mitigated by Command Center FAB
4. **Hybrid persistence** — communities/learning still JSON while auth/social PG; migration planned
5. **Multiple design CSS layers** — v6 loads last; living-horizon owns Sylora avatar overrides

## Integration principles (enforced)
- One Personal AI identity per user (`agent_id: personal`)
- Writes via Action Engine + confirmation boundary (existing `ai_actions` + new `ai_action_log`)
- Permissions checked server-side before memory export/delete
- Knowledge nodes scoped to `owner_id`

## Event / realtime paths
- Gifts: transactional outbox → Redis → SSE
- LIVE: Redis fanout + P2P signaling
- User: notifications + DM SSE

## Recommended modular monolith boundaries (next)
- `ecosystem/` services remain pure; `repositories/` own persistence
- Do not split microservices until PG migration completes for all domains
