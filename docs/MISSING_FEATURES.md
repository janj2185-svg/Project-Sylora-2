# MISSING_FEATURES

Status legend used across implementation reports: **EXISTING / PARTIAL / MISSING / BLOCKED**.

| # | Pillar | Pre-audit | Notes |
|---|---|---|---|
| 1 | Personal AI | PARTIAL | Chat/voice/memory/tools exist; missing permission dashboard, short/long memory tiers, tool registry UI, full activity audit |
| 2 | Identity | PARTIAL | Profile/locale/role; missing verification, privacy levels, portfolio/skills architecture |
| 3 | Knowledge Graph | MISSING | No graph store/API |
| 4 | Agent Marketplace | MISSING | No manifests/install/pricing |
| 5 | Developer Platform | MISSING | Internal REST only |
| 6 | Universal realtime translation | MISSING | UI i18n only; provider BLOCKED without STT/TTS keys |
| 7 | AI Creator Studio | PARTIAL | Studio real; AI co-create contract-only |
| 8 | Business OS | PARTIAL | Business profiles + private conferences; no orgs/RBAC/control plane |
| 9 | Enterprise AI Control Plane | MISSING | — |
| 10 | AI-to-AI Economy | MISSING | Action permission levels needed first |
| 11 | Creator Commerce beyond gifts | PARTIAL | Free courses; paid returns `PAYMENT_PROVIDER_REQUIRED` |
| 12 | Portable Reputation | MISSING | Gift XP ≠ portable reputation |
| 13 | Trust & Security | PARTIAL | Auth/blocks/reports/CSP/rate limits; thin moderation/device/privacy center |
| 14 | Content Provenance | MISSING | Media sha256 only |
| 15 | Developer/Creator revenue share | PARTIAL | Gift share BPS; no multi-party settlement |
| 16 | SYLORA Protocol | PARTIAL | Docs/contracts only (intentional) |
| 17 | AI Action System | PARTIAL | `publish_post` / `remember` only |
| 18 | Command Center | PARTIAL | AI page + rail; not one global invoke plane |
| 19 | Global / AI Search | PARTIAL | Substring search only |
| 20 | Observability / cost control | PARTIAL | Health/ready; missing AI cost, tracing, quotas |

## Mock / placeholder inventory

- Test LUMEN economy (intentional sandbox money)
- JSON fallback runtime (intentional for tests/dev)
- Paid course enrollment blocked with explicit error
- `platform-vision.mjs` foundation-registered capabilities
- Phoenix preview demo page
- Broken Digital Human limb assembly (defect, not intentional mock)
