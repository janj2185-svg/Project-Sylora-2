# IMPLEMENTATION PLAN

## Principles

- Do not copy TikTok/Twitch/Discord/ChatGPT.
- Build around: **Human + Personal AI + Identity + Knowledge + Creator/Business Economy + Developer Ecosystem**.
- No dead tabs. Extend Settings / AI / Business / Studio.
- Honest status: DONE / PARTIAL / BLOCKED / NOT_STARTED.
- Preserve existing working core and design language.

## Stage 0 — Audit + Digital Human repair

1. Audit docs (this folder).
2. Reassemble Sylora: coherent base + gesture sheet; hide mismatched arm tubes; show avatar outside LIVE-only; sync face/body motion.

## Stage 1 — Core spine

- Identity privacy levels + profile extensions
- Permission grants API
- Personal AI agent record, memory tiers (short/long), activity log, export/delete memory
- Knowledge Graph nodes/edges + visibility
- Action Engine levels: READ / PROPOSE / PREPARE / REQUEST_CONFIRMATION / EXECUTE_ALLOWED
- Durable audit events for AI/actions/permissions

## Stage 2 — Agent + Developer foundations

- Agent manifests, install/uninstall, permissions, sandbox flag
- Marketplace listing (catalog)
- Developer apps, API keys (hashed), scopes, rate limits
- Public `/api/v1/*` surface mirroring permissioned domains
- SDK stubs: JS/TS, Python, Dart (documented clients, no fake backends)
- OAuth 2.0 / OIDC architecture docs + authorization-code scaffolding

## Stage 3 — Translation plane

- Language detect + text translation job API
- Message/LIVE chat translation hooks
- Speech→text / text→speech / voice-preserve architecture (BLOCKED without STT/TTS provider keys)
- Synthetic voice labeling contract

## Stage 4 — Creator AI

- AI Creator Studio session linked to existing Studio/LIVE (not a dead tab)
- Propose LIVE structure, overlays, polls, post-summary as confirm-gated actions
- Creator commerce catalog foundation (sandbox payments separated)

## Stage 5 — Business

- Organizations, teams, RBAC
- Company knowledge nodes
- Shared / company agents
- Enterprise AI Control Plane: allow/deny lists, budgets, kill switch, approval actions

## Stage 6 — Trust

- Provenance records for AI-created/modified content
- Reputation dimensions with transparent reasons + dispute hooks
- Security center: sessions, export, delete account requests
- Moderation depth on existing reports

## Stage 7 — Scale

- Structured metrics hooks, AI token/cost counters, health expansions
- Search: structured + semantic interface (embedding provider BLOCKED without key)
- Caching/queues interfaces on existing outbox patterns

## Definition of Done (per feature)

UI + backend + persistence + authz + loading/empty/error + mobile/desktop + tests + no critical TODO + no duplication of an existing module.
