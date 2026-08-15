# API inventory

This inventory is generated deterministically from `src/server.mjs` and `src/ecosystem/routes.mjs`. It describes registered HTTP handlers after Phase 1; it does not treat endpoint count as product progress. Frontend usage means a matching call exists in `public/`. Test-only and backend-only routes remain marked separately through status.

## Counts

| Metric | Count |
|---|---:|
| Total unique endpoints | 301 |
| Active | 247 |
| Legacy | 0 |
| Dead | 0 |
| Duplicate | 0 |
| Unverified | 54 |
| Frontend-used | 188 |
| Backend-only | 113 |

## Status contract

- `ACTIVE`: referenced by the current frontend or automated tests, or part of the Phase 1 critical data/auth surface.
- `UNVERIFIED`: handler exists, but no frontend or automated-test caller was found. It is not called dead without runtime evidence.
- `DUPLICATE`: the same method/path is registered more than once.
- `LEGACY` and `DEAD`: none are asserted in Phase 1 because no deprecation marker or conclusive unreachable-route evidence exists.
- No endpoint is mass-deleted in Phase 1. `VERIFY_BEFORE_PHASE_2` is an explicit follow-up, not a removal decision.

`AUTH` is the effective handler guard, not merely whether a Bearer header is parsed. `OWNER`, `MEMBER`, and combined labels mean that the handler or repository additionally binds the target to the session user. Because many broad ecosystem handlers predate Phase 1, every `UNVERIFIED` route still requires a focused behavioral authorization test before production enablement.

## Alias and consistency findings

- `GET/PATCH /api/me` is the only account endpoint; no duplicate `/api/auth/me` exists.
- `GET /api/identity/:userId` and `GET /api/public/u/:username` are intentional public lookup aliases by different keys. Both use the canonical user/identity repositories; their outer response shapes are retained for frontend compatibility.
- `GET /api/ai/history`, `GET /api/ai/memory/center`, and `GET /api/ai/memory/export` are different views over one owner-scoped production memory repository, not parallel stores.
- No exact method/path duplicate was found. No route is declared `DEAD` or `LEGACY` without runtime/deprecation evidence.
- Critical auth/user errors use `error`, `code`, and `message`; many noncritical legacy domain handlers still return only `error` and remain an API-consistency follow-up.

## Endpoints

| METHOD | PATH | AUTH | FRONTEND USED | STATUS | ACTION |
|---|---|---|---|---|---|
| GET | `/api/achievements` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/actions` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/actions` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/actions/:id/confirm` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/activity-graph` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/admin/audit` | ADMIN | YES | ACTIVE | KEEP |
| GET | `/api/admin/reports` | ADMIN | YES | ACTIVE | KEEP |
| PATCH | `/api/admin/reports/:id` | ADMIN | YES | ACTIVE | KEEP |
| GET | `/api/agents` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/agents` | AUTHENTICATED | YES | ACTIVE | KEEP |
| DELETE | `/api/agents/:id/install` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/agents/:id/install` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/agents/installed` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/agents/negotiations` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/agents/negotiations` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/agents/negotiations/:id/confirm` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/ai/actions/:id/cancel` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/ai/actions/:id/confirm` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ai/activity` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/ai/ask` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ai/capabilities` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/ai/chat` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/ai/command` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ai/command-center` | OWNER | NO | ACTIVE | KEEP |
| POST | `/api/ai/context` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/ai/dashboard` | OWNER | YES | ACTIVE | KEEP |
| DELETE | `/api/ai/history` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/ai/history` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/ai/intelligence` | AUTHENTICATED | YES | ACTIVE | KEEP |
| DELETE | `/api/ai/memory` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/ai/memory` | OWNER | YES | ACTIVE | KEEP |
| DELETE | `/api/ai/memory/:id` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/ai/memory/:id` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/ai/memory/center` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/ai/memory/enabled` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/ai/memory/export` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/ai/orchestrate` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| PATCH | `/api/ai/permissions` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/ai/privacy-controls` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/ai/proactive` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/ai/realtime` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/ai/realtime/transcript` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ai/status` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/auth/login` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/auth/logout` | SESSION_TOKEN | YES | ACTIVE | KEEP |
| POST | `/api/auth/register` | PUBLIC | YES | ACTIVE | KEEP |
| GET | `/api/blocks` | OWNER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/accountant/invite` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/business/accounting/export` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/budget` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/contracts` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/business/country` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/country` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/business/crm` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/crm` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/expenses/:id/confirm` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/expenses/extract` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/finance/ask` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/business/hub` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/business/inventory` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/business/invoices` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/invoices` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/invoices/:id/status` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/business/quotes` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/quotes/:id/accept` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/business/time` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/time` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/business/workflows` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/businesses` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/businesses` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/calendar` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/calendar` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/calls` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/calls/:id` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/calls/:id/:action` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/calls/:id/events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/calls/:id/signal` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/calls/history` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/calls/rtc-config` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/calls/sylora` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/calls/sylora/:id/permissions` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/canvas` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/canvas` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/commerce/products` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/commerce/products` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/commerce/products/:id/checkout` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/communities` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/communities` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/communities/:id` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/communities/:id/channels` | OWNER_OR_ADMIN | YES | ACTIVE | KEEP |
| POST | `/api/communities/:id/join` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/community-channels/:id/posts` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/community-channels/:id/posts` | MEMBER_OR_OWNER_OR_ADMIN | YES | ACTIVE | KEEP |
| POST | `/api/conference-invites/:id/accept` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/conferences` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/conferences` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/conferences/:id/ai` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/conferences/:id/events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/conferences/:id/invite` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/conferences/:id/participants` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/conferences/:id/signal` | AUTHENTICATED | YES | ACTIVE | KEEP |
| PATCH | `/api/conferences/:id/sylora` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/conferences/program` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/conferences/program/:id/qa` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/content/history` | AUTHENTICATED | NO | ACTIVE | KEEP |
| PATCH | `/api/content/history` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/content/understand` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/continuity` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/continuity` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/conversations` | MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/conversations` | MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/conversations/:id/messages` | MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/conversations/:id/messages` | MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/courses` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/courses` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/courses/:id` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/courses/:id/enroll` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/courses/:id/lessons` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/courses/:id/publish` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/daily-brief` | AUTHENTICATED | YES | ACTIVE | KEEP |
| PATCH | `/api/daily-brief` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/dashboard` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/decisions` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/decisions` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| GET | `/api/developer/apps` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/developer/apps` | OWNER | YES | ACTIVE | KEEP |
| DELETE | `/api/developer/apps/:appId/keys/:keyId` | OWNER | NO | ACTIVE | KEEP |
| GET | `/api/developer/apps/:id/keys` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/developer/apps/:id/keys` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/ecosystem/metrics` | ADMIN | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/ecosystem/status` | PUBLIC | NO | ACTIVE | KEEP |
| GET | `/api/engines` | PUBLIC | NO | ACTIVE | KEEP |
| GET | `/api/events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/feature-flags` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/feed` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/focus` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/gifts` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/gifts/send` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/gifts/stream` | PUBLIC | YES | ACTIVE | KEEP |
| GET | `/api/goals` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/goals` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| GET | `/api/guest/view` | PUBLIC | NO | ACTIVE | KEEP |
| GET | `/api/health` | PUBLIC | NO | ACTIVE | KEEP |
| GET | `/api/home/hub` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/identity` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/identity` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/identity/:userId` | PUBLIC | NO | ACTIVE | KEEP |
| GET | `/api/inbox/intelligent` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/integrations` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/integrations` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| DELETE | `/api/integrations/:id` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/integrations/status` | PUBLIC | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/kg` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/kg/edges` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/kg/nodes` | AUTHENTICATED | YES | ACTIVE | KEEP |
| DELETE | `/api/kg/nodes/:id` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/learning/assignments` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/learning/exam-plan` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/learning/flashcards` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/learning/flashcards/:deckId/review` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/learning/graph` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/learning/graph` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/learning/hub` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/learning/language-tutor` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/learning/notes` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/learning/quiz-builder` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/learning/tutor` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ledger` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/lessons/:id/progress` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/lessons/:id/quiz` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/live` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/live` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/live/:id/chat` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/chat` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/cohost` | OWNER_OR_HOST | NO | ACTIVE | KEEP |
| GET | `/api/live/:id/copilot` | OWNER_OR_HOST | YES | ACTIVE | KEEP |
| GET | `/api/live/:id/creator-insights` | OWNER_OR_HOST | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/end` | OWNER_OR_HOST | NO | ACTIVE | KEEP |
| GET | `/api/live/:id/engagement` | PUBLIC | YES | ACTIVE | KEEP |
| GET | `/api/live/:id/events` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/like` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/resonance` | OWNER_OR_HOST | YES | ACTIVE | KEEP |
| POST | `/api/live/:id/room-kind` | OWNER_OR_HOST | NO | ACTIVE | KEEP |
| POST | `/api/live/:id/signal` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/live/:id/stage` | PUBLIC | NO | ACTIVE | KEEP |
| POST | `/api/live/:id/stage` | OWNER_OR_HOST | NO | ACTIVE | KEEP |
| GET | `/api/live/:id/world` | PUBLIC | NO | ACTIVE | KEEP |
| POST | `/api/live/audience-vs-sylora` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/live/battles` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/live/battles/:id/advance` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/live/battles/:id/factor` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/live/challenges` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/live/entertainment` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/live/minigames` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/live/quizzes` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/live/quizzes/:id/answer` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/live/rtc-config` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/live/seasonal` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/me` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/me` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/media/:id/transcode` | OWNER | NO | ACTIVE | KEEP |
| GET | `/api/media/jobs/:id` | OWNER | NO | ACTIVE | KEEP |
| POST | `/api/media/upload` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/meetings/result` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/notifications` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/notifications/smart` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/onboarding` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/orgs` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/orgs/:id/ai-control` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| PATCH | `/api/orgs/:id/ai-control` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/orgs/:id/documents` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs/:id/meeting-brief` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs/:id/meeting-summary` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs/:id/proposed-tasks/confirm` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs/:id/tasks` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/orgs/:id/teams` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/orgs/:id/workspace` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| GET | `/api/platform-events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/platform-events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/platform-events/:id/register` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/platform/capabilities` | PUBLIC | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/posts` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/posts/:id/comments` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/posts/:id/comments` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/posts/:id/react` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/privacy/requests` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/progress` | OWNER | YES | ACTIVE | KEEP |
| GET | `/api/projects` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/projects` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| GET | `/api/projects/:id` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/provenance` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/public/u/:username` | PUBLIC | NO | ACTIVE | KEEP |
| POST | `/api/quizzes` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/quizzes/:id/answer` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/quizzes/:id/attempt` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/ready` | PUBLIC | NO | ACTIVE | KEEP |
| POST | `/api/reports` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/reputation` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/reputation/dispute` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/revenue-split/draft` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/science/calculators` | PUBLIC | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/science/calculators/run` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/circles` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/circles/:id/comments` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/science/citations` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/science/datasets` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/experiments` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/experiments/:id` | AUTHENTICATED | NO | ACTIVE | KEEP |
| PUT | `/api/science/experiments/:id/versions/:version` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/science/formulas` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/science/hub` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/science/library` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/match` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/science/paper-reader` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/science/projects` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/science/statistics` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/science/verify` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/science/visualization` | PUBLIC | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/search` | PUBLIC | YES | ACTIVE | KEEP |
| GET | `/api/search/ai` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/search/universal` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/security-center` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/shared-memory` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/shared-memory` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/skills` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/social/community-events` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/social/discovery` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/social/discovery/matches` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/social/fun-rooms` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/spaces` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/spaces/:id/ask` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/stats` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/studio/ai/content-pack` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/studio/ai/pipeline` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/studio/ai/plan` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/studio/ai/plan/:id/confirm` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/studio/browser-source` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/studio/browser-source/events` | SIGNED_EPHEMERAL_TOKEN | YES | ACTIVE | KEEP |
| GET | `/api/studio/scenes` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/studio/scenes` | OWNER | YES | ACTIVE | KEEP |
| DELETE | `/api/studio/scenes/:id` | OWNER | YES | ACTIVE | KEEP |
| PATCH | `/api/studio/scenes/:id` | OWNER | YES | ACTIVE | KEEP |
| POST | `/api/sylora/director/propose` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/sylora/living/react` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| GET | `/api/tasks` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| POST | `/api/tasks` | OWNER_OR_MEMBER | NO | ACTIVE | KEEP |
| PATCH | `/api/tasks/:id` | OWNER_OR_MEMBER | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/timers` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/timers/:id` | PUBLIC | NO | ACTIVE | KEEP |
| POST | `/api/timers/:id/:action` | AUTHENTICATED | NO | UNVERIFIED | VERIFY_BEFORE_PHASE_2 |
| POST | `/api/timers/assistant` | AUTHENTICATED | NO | ACTIVE | KEEP |
| POST | `/api/translate` | AUTHENTICATED | NO | ACTIVE | KEEP |
| GET | `/api/users` | AUTHENTICATED | YES | ACTIVE | KEEP |
| DELETE | `/api/users/:id/block` | OWNER_OR_MEMBER | YES | ACTIVE | KEEP |
| POST | `/api/users/:id/block` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/users/:id/follow` | AUTHENTICATED | YES | ACTIVE | KEEP |
| GET | `/api/v1/identity/me` | API_KEY_OR_OWNER | NO | ACTIVE | KEEP |
| GET | `/api/videos` | PUBLIC | YES | ACTIVE | KEEP |
| POST | `/api/videos` | AUTHENTICATED | YES | ACTIVE | KEEP |
| POST | `/api/whiteboard` | AUTHENTICATED | YES | ACTIVE | KEEP |
