# SYLORA — Duplication Report

**Audited:** 2026-08-13. Nothing was deleted.

Format: **A → дублює B → що залишити → що видалити/об'єднати** (пізніше, не зараз).

---

## Pages / navigation

| A | дублює B | Залишити | Видалити / об'єднати |
|---|---|---|---|
| `/clips` | `/videos` | один Media hub з filter format | окремі майже копії `renderClips` / `renderVideos` |
| Settings tile «Медіа» | Home «Для тебе» Clips/Video | один вхід | другий як deep link, не окремий продукт |
| Settings «Комунікації» | sidebar Inbox | Inbox | tile як alias |
| Settings «Sylora AI» | mobile dock Sylora + rail button | `/ai` | три входи OK; прибрати четвертий hero CTA repetition |
| Settings Science/Business/Communities | primary sidebar | sidebar | tiles redundant |
| Home hub circular shortcuts | sidebar + dock | one chrome system | hub shortcuts як compact only on mobile |
| `renderProfile` | `renderProfileLegacy` | `renderProfile` | **delete legacy function** (unused) |
| Inbox Invites buttons → business/learning | those pages | pages | invites should list real invites only |
| `/phoenix-preview.html` | Gift Gallery + gift-v2 | one gift runtime | preview as /dev only |

---

## Gifts / wallet

| A | дублює B | Залишити | Об'єднати |
|---|---|---|---|
| Wallet IDs `spark…infinite-sylora` | V2 IDs `crystal-star…celestial-city` | **one ID namespace** | map or drop V2 IDs until purchasable |
| Display names on JSON gifts (Crystal Star on `spark`) | V2 passport names | one catalog source | stop dual naming |
| migration `004` 4 gifts old names | migration `008` 10 gifts | 008 | keep 004 historical; don’t re-seed old names |
| `gift-engine.js` canvas | `gift-gpu-engine.js` Three | one playback pipeline | GPU must resolve `three` or drop |
| `gift-v2/*` 20 cinematic stories | 10 atlas PNG gifts | decide product count | don’t sell 10 and document 20 |
| Profile LUMEN + Gifts page balance | same wallet | one wallet surface | |

---

## LIVE / calls / conferences

| A | дублює B | Залишити | Об'єднати |
|---|---|---|---|
| `openConferenceRoom` | `openConferenceRoomRtc` | RTC path | remove non-RTC avatar-tile room |
| LIVE SSE signal | Calls SSE signal | shared signaling module (already “webrtc_shared”) | stop parallel protocols |
| `/api/live/rtc-config` | `/api/calls/rtc-config` | one ICE helper | thin wrappers OK |
| Battles tab | `/api/live/battles` + legacy resonance button | one battle model | |
| Studio in sidebar + LIVE tab Studio | `/studio` | one Studio | |

---

## AI

| A | дублює B | Залишити | Об'єднати |
|---|---|---|---|
| `/api/ai/chat` (OpenAI, fail-closed) | `/api/ai/ask` (mock echo) | chat as only “talk to Sylora” | ask must not look like intelligence |
| `/api/ai/command` | `/api/ai/orchestrate` / `command-center` | one command API | |
| Living Sylora in-memory emotion | PNG avatar CSS emotion | honest 2.5D avatar | don’t claim a living model |
| Manual memory form | `propose_memory` tool | confirm-gated memory | |
| “gpt-5.6” label in UI | actual provider `none` | show capabilities.honesty | never show a model that is not configured |

---

## CSS / design

| A | дублює B | Залишити | Об'єднати |
|---|---|---|---|
| `styles.css` | `design-v2` … `design-scenes-v6` + consolidation + avatar-assembled | **one design system file** (or tokens + 2 layers) | 12 stacked stylesheets (~168KB) override each other |
| Collage avatar CSS in `design-living-horizon.css` | `design-avatar-assembled.css` last-wins | assembled portrait | disable/remove collage rules |
| Rig PNG parts (`sylora-rig-*`, hand tubes) | `sylora-avatar-v2-base.png` + gesture PNGs | assembled assets | obsolete rig parts are candidates |

---

## Backend / state

| A | дублює B | Залишити | Об'єднати |
|---|---|---|---|
| `store.mjs` JSON arrays | Postgres repositories | Postgres as source of truth | JSON only as local fallback, not mixed domains |
| Communities/courses/business in JSON | tables in `schema.sql` | one | current split-brain |
| `src/integrations.mjs` `PAYMENT_PROVIDER_API_KEY` | `.env.example` `SYLORA_PAYMENT_*` | one env name | |
| Ecosystem in-memory invoices/CRM | “Business OS” UI | either real or hidden | |
| Feature flags all `true` for unfinished | actual capability | flags must match runtime | |
| Patch scripts `scripts/patch-*.mjs` | current `app.js` | git history | don’t keep string-patchers as product |

---

## Assets

| A | дублює B | Залишити | Кандидат |
|---|---|---|---|
| `sylora-visemes-v1.png` + v2 | assembled single portrait | v2/assembled | v1 if unused |
| `sylora-expressions-v1/v2` | assembled (eyes layers hidden) | | unused sprite sheets ~4MB+ |
| Phoenix flight PNGs + phoenix-v3 | gift atlas + V2 runtime | one phoenix story | |

`public/assets` ≈ **45MB / 49 PNGs**. Many are leftover collage/viseme experiments.

---

## Copy / naming

Same capability, different names:

- Наука / Science / Learning / Education
- Inbox / Communications / Messages
- Відкриття / Explore / Discovery / Universal Search
- Налаштування / Personal System / more
- LIVE Entertainment Engine / Resonance / Battles 2.0

Pick one label per capability in i18n.
