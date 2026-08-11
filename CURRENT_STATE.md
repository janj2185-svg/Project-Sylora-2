# CURRENT_STATE — SYLORA

**Date:** 2026-08-11  
**Branch intent:** ecosystem foundation + assembled Digital Human

## Stack

- Node.js 22 modular monolith (`src/server.mjs`)
- JSON store fallback + PostgreSQL/Redis hybrid when configured
- Static web shell in `public/` (no React/Next)
- OpenAI Responses + Realtime when `OPENAI_API_KEY` is set
- Gift Runtime V2 in `public/gift-v2/`
- Docker Compose: app + Postgres 17 + Redis 8

## What already worked before this pass

- Auth/sessions, feed, gifts/wallet ledger, messages, communities, courses, businesses, LIVE, Creator Studio, OBS Companion, Clips/HLS, AI chat/memory/pending actions, moderation reports/audit
- Capability contracts reserved in `src/platform-vision.mjs` / `docs/SYLORA-14-CAPABILITY-ROADMAP.md`

## Critical defect found

Sylora Digital Human used mismatched limb sprites (pink/cracked arm segments) over an arm-free torso, plus independent face/body transforms. Result: visually “broken/fragmented” character.

## Fixed in this pass

- Assembled avatar path: `sylora-avatar-v2-base.png` + gesture atlas + one `.sylora-rig-root` spring motion
- Avatar visible on AI page always (not only realtime-live)
- Legacy mismatched limb stack disabled in CSS

## New foundation added

- `src/ecosystem/core.mjs` — Personal AI permissions, Identity, Knowledge Graph, Action levels, Agent Marketplace seed, Developer apps/keys (sandbox), Organizations + AI Control Plane policies, translation prefs/sandbox, AI Search, provenance/activity audit
- Migration `010_ecosystem_foundation.sql`
- APIs under `/api/ai/*`, `/api/identity`, `/api/knowledge`, `/api/agents`, `/api/developer`, `/api/organizations`, `/api/translation`, `/api/search/ai`
- UI integrations in existing AI / Profile / Explore / Business views (no dead-tab farm)

## Persistence note

Ecosystem runtime currently uses the JSON store path with schema prepared for Postgres. Full repository dual-write to Postgres tables is the next hardening step after migration apply in deployed environments.
