# SYLORA — Implementation Plan

## Completed — Phase 0 audit
- [x] CURRENT_STATE.md
- [x] ARCHITECTURE_AUDIT.md
- [x] MISSING_FEATURES.md
- [x] SECURITY_AUDIT.md
- [x] TECH_DEBT.md
- [x] IMPLEMENTATION_PLAN.md (this file)

## Completed — Phase 1 foundation (partial)
- [x] Sylora avatar rig fix (`avatar-rig`, disable gesture sprites)
- [x] `src/ecosystem/*` kernel modules
- [x] Migration `010_ecosystem_foundation.sql`
- [x] APIs: identity, AI permissions, activity, memory export/delete, knowledge nodes
- [x] Personal AI service + action audit log
- [x] Command Center FAB (global quick AI)
- [x] AI UI: permissions panel, activity log
- [x] Tests: ecosystem + avatar rig

## Next — Phase 1 completion
1. Wire Action Engine into all AI tool executions
2. Identity UI in profile (visibility per section)
3. Knowledge graph UI (minimal node list + create)
4. Short-term / long-term memory tiers in PG
5. Visual regression tests for Sylora avatar (Playwright)

## Phase 2 — Agent + Developer platform
1. Agent manifest schema + registry tables
2. Developer apps, API keys, scopes
3. Public REST v1 (`/api/v1/`) read-only identity + content
4. Agent marketplace listing (read) + install flow with permissions

## Phase 3 — Communication
1. Translation service abstraction + env providers
2. LIVE caption translation integration
3. Message translation opt-in

## Phase 4 — Creator
1. Creator Studio AI panel (scene structure, not dead tab)
2. Commerce schema (products, orders sandbox vs production flag)

## Phase 5 — Business
1. Organizations, teams, RBAC tables
2. Enterprise AI control plane UI

## Phase 6 — Trust
1. Reputation engine (transparent scores)
2. Content provenance metadata
3. Safety center UI

## Phase 7 — Scale
1. Structured logs + metrics
2. AI cost accounting per org/user
3. Vector/semantic search layer

## Definition of done (each feature)
UI + API + persistence + auth + permissions + empty/error states + mobile + tests + no critical console errors.

## Network effect check (every feature)
Must strengthen at least one of: Personal AI, Knowledge Graph, Realtime language, Agent/Developer platform, Creator/Business economy.
