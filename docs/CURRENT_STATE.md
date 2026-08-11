# CURRENT_STATE — SYLORA Repository Audit

**Date:** 2026-08-11  
**Branch base:** `main`  
**Runtime:** Node.js ≥22 ESM modular monolith (`src/server.mjs`) + vanilla ES module frontend (`public/`)

## Stack

| Layer | Reality |
|---|---|
| HTTP API | Single Node `http` server, no Express/Next |
| Persistence | Hybrid: PostgreSQL when `DATABASE_URL` set; JSON file store otherwise |
| Cache / fanout | Redis Pub/Sub + leases when `REDIS_URL` set; in-process fallback |
| AI | Official OpenAI SDK; fail-closed without `OPENAI_API_KEY` |
| Media | Local ffmpeg/ffprobe jobs; Range media; HLS jobs |
| LIVE | Authenticated WebRTC P2P (6-peer Studio cap), not SFU |
| Frontend | Vanilla JS shell + layered design CSS (v2–v6 + living horizon) |
| Companion | Loopback OBS bridge (`src/companion.mjs`) |

## Working product surfaces

- Auth (register/login/logout), sessions (SHA-256 stored tokens)
- Social feed, reactions, comments, follows, blocks, DMs, notifications
- LIVE rooms, chat, engagement, battles, SSE/realtime fanout
- Creator Studio (camera/mic/screen, mixer, recording, scene presets, OBS/Companion)
- Gift catalog + wallet ledger (test LUMEN) + Gift Runtime V2 foundation
- Clips/video upload + HLS pipeline
- Communities / courses / businesses (JSON-backed)
- Private science/business conferences with optional Sylora
- SYLORA AI chat + Realtime voice + controlled memories + pending write actions
- Admin reports + audit log
- Substring global search

## Digital Human status (pre-fix)

Sylora avatar was implemented as an armless torso + independent sleeve/hand sprites. Several hand assets are anatomically corrupted; gesture layers were defined in CSS but not mounted. Result: Sylora appeared fragmented (“розбита”) during LIVE voice. Cohesive Digital Human rebuild is part of this implementation cycle.

## Not production-claimed

Payments/payouts, object storage/CDN, SFU, managed TURN, OAuth/OIDC public developer platform, Knowledge Graph, Agent Marketplace, universal translation, portable reputation, content provenance standards, enterprise control plane — previously missing or foundation-only.

## Honest readiness

`/api/ready` requires PostgreSQL + Redis + outbox health for multi-instance production. Local/dev JSON path remains valid for tests (`npm test` clears `DATABASE_URL`/`REDIS_URL`).
