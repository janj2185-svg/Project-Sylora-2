# SYLORA — Full UI Map

**Audit date:** 2026-08-13  
**SPA views:** `public/app.js` `SPA_SHELL_VIEWS`  
**Shell:** `public/index.html`  
**Screenshots:** `audit/screenshots/{desktop,mobile,tablet}/`

---

## Navigation structure (actual)

```
Header
├── Brand → feed
├── Search → Command Palette (⌘K)
└── Account: locale | LUMEN TEST | gifts | inbox | profile | login/logout

Left rail (primary)
├── feed (Головна)
├── live
├── clips
├── studio
├── learning (label: Наука)
├── business
├── explore (Відкриття)
└── communities

Left rail (secondary)
├── messages (Inbox)
├── profile
├── more (Налаштування)
├── Create Hub
├── Orbit XP → profile
└── Sylora mini → ai

Mobile dock
└── feed | live | ai | messages | profile

Overlays: Create Hub, Command Palette, gift-stage, incoming call
Standalone: /obs-overlay.html, /phoenix-preview.html
```

**History note:** `history.replaceState` only — browser Back does not walk SPA history.

---

## Page catalog

### 1. Home / Feed
| Field | Detail |
|-------|--------|
| Route | `/` (`feed`) |
| Nav | Side, mobile, brand |
| Purpose | Personal hub + posts |
| User sees | Greeting, Sylora card, quick actions, Daily Brief, LIVE recs, people, composer/posts |
| Components | living-horizon hero, eco strips, cards, right rail |
| Actions | Talk→AI, Create Hub, navigate modules, post/react/follow |
| APIs | `/api/feed`, `/home/hub`, `/daily-brief`, `/live`, `/users`, `/posts*`, … |
| Works | Hub aggregation REAL; posts REAL |
| Mock/static | Empty discovery for new users; AI banner when unconfigured |
| UX | Dense hub; hero + many strips |
| Responsive | Mobile OK-ish; tablet icon-rail can starve content (see tablet/01) |
| Readiness | **68%** |

### 2. Auth (inline)
| Field | Detail |
|-------|--------|
| Route | No dedicated path — gated views call `renderAuth()` |
| Purpose | Register / login |
| Forms | Register: username, email, password; Login: **identity**, password |
| APIs | `/api/auth/register`, `/login`, then `/me` |
| Works | REAL |
| Missing | Recovery, Google, phone, email verify |
| Readiness | **55%** |

### 3. LIVE hub + room
| Field | Detail |
|-------|--------|
| Route | `/live` |
| Tabs | Discover, Following, Create, Battles, Studio |
| APIs | `/api/live*`, `/live/entertainment`, `/live/battles`, `/gifts/send`, SSE events |
| Works | Create/list/chat/like/gift API; discover shows rooms |
| Partial | WebRTC without TURN; battles UX depth |
| Placeholder | Following tab empty by design |
| Broken | Gift FX playback (runtime import) |
| Readiness | **48%** |

### 4. Studio
| Field | Detail |
|-------|--------|
| Route | `/studio` (auth) |
| Purpose | Creator production: sources, scenes, WebRTC broadcast, OBS, companion, record |
| Buttons | Camera+mic, screen, scenes, broadcast, OBS connect, browser source, record |
| Works | UI REAL; scene CRUD API REAL |
| Partial | Camera permission-dependent; OBS local-only |
| Broken | Console `ownRooms is not defined` in creator intelligence path; gift overlay path |
| Readiness | **50%** |

### 5. Clips
| Route | `/clips` |
| Purpose | Vertical video list + upload |
| Status | UI REAL; empty state; upload path PARTIAL |
| Readiness | **40%** |

### 6. Videos
| Route | `/videos` |
| Nav | Not primary rail — via More / home |
| Status | Same pattern as clips |
| Readiness | **38%** |

### 7. Explore
| Route | `/explore` |
| APIs | `/api/search`, `/search/universal` |
| Status | Lexical search PARTIAL; semantic BLOCKED |
| Readiness | **45%** |

### 8. Inbox / Messages
| Route | `/messages` |
| Tabs | Chats, notifications, invites, calls, priority |
| APIs | conversations, notifications, inbox/intelligent, calls* |
| Status | DM REAL; calls PARTIAL; priority depends on intelligent inbox |
| Readiness | **55%** |

### 9. Sylora AI
| Route | `/ai` |
| UI | Assembled PNG avatar, chat, memory, realtime controls |
| APIs | `/api/ai/*` |
| Works without key | History/memory/orchestrate heuristics; chat **503** |
| Avatar | CSS/PNG — not 3D |
| Screenshot | `desktop/08-ai.png`, `mobile/03-ai.png` — unavailable banner |
| Readiness | **UI 70% / functional 25% → ~35%** |

### 10. Profile
| Route | `/profile` |
| APIs | `/me`, `/ledger`, `/stats`, `/progress` |
| Status | Edit + wallet display REAL (TEST) |
| Readiness | **60%** |

### 11. Gifts
| Route | `/gifts` |
| UI | Constellation grid, recipient, combo |
| APIs | `/gifts`, `/gifts/send` |
| Economy | TEST; creator share 70% copy |
| FX | BROKEN at runtime init |
| Readiness | **45%** |

### 12. More / Settings hub
| Route | `/more` |
| Purpose | Launcher to identity, agents, developer, security, dashboard, canvas, admin, media |
| Status | Navigation REAL |
| Readiness | **70%** (as hub) |

### 13. Identity
| Route | `/identity` |
| APIs | `/identity`, `/kg` |
| Status | Forms + KG PARTIAL product depth |
| Readiness | **50%** |

### 14. Agents
| Route | `/agents` |
| Status | Catalog install/uninstall PARTIAL |
| Readiness | **40%** |

### 15. Developer
| Route | `/developer` |
| Status | Apps + API keys PARTIAL; OAuth architectural |
| Readiness | **40%** |

### 16. Security / Trust
| Route | `/security` |
| APIs | security-center, reputation, memory center, privacy |
| Status | PARTIAL |
| Readiness | **48%** |

### 17. Personal Dashboard
| Route | `/dashboard` |
| APIs | `/dashboard`, tasks/goals via OS |
| Status | Data-driven when present; empty for new users |
| Readiness | **50%** |

### 18. Canvas
| Route | `/canvas` |
| Status | Workspace docs PARTIAL |
| Readiness | **42%** |

### 19. Communities
| Route | `/communities` |
| APIs | communities*, social/*, achievements |
| Status | PARTIAL |
| Readiness | **45%** |

### 20. Learning / Science
| Route | `/learning` |
| APIs | learning/*, science/*, courses*, conferences |
| Status | Broad UI; many local tools; paid courses blocked |
| Readiness | **42%** |

### 21. Business
| Route | `/business` |
| Screenshot | `desktop/20-business.png` — 0 clients/companies/invoices |
| Status | Draft finance UI; adapters stubbed |
| Readiness | **35%** |

### 22. Admin
| Route | `/admin` |
| Status | Non-admin redirected to more; admin reports/audit APIs exist |
| Readiness | **40%** |

### 23–24. Overlays
| Create Hub | Modal — create post/clip/live/community/course/event/studio |
| Command Palette | Search + slash commands + `/api/ai/command` |

### Standalone
| OBS Overlay | chat+gifts EventSource |
| Phoenix Preview | gift QA WebGL |

---

## Button interaction audit (high-value)

| Action | Status | Evidence |
|--------|--------|----------|
| Register | WORKING | UI + API |
| Login | WORKING | `identity` field |
| Logout | WORKING | session removed |
| Google auth | MISSING | 404 / blocked |
| Profile edit | WORKING | PATCH /me |
| Follow | WORKING | API |
| Like (post/live) | WORKING | API |
| Comments | WORKING | API |
| Share | NO ACTION / MISSING | no native share product |
| Notifications | PARTIAL | list only |
| Messages | WORKING | DM |
| Calls | PARTIAL | create/ring; media unverified E2E |
| Video calls | PARTIAL | same Call Engine |
| Camera / mic | PARTIAL | getUserMedia in Studio — permission BLOCKED in headless |
| Start / join stream | PARTIAL | API+signaling REAL; NAT BLOCKED |
| Gifts send | WORKING (economy) | FX BROKEN |
| Wallet purchase | FAKE/MOCK | TEST grant |
| Subscriptions | MISSING | |
| Language selector | PARTIAL | UI 13 langs; server locale uk/pl/en only |
| Settings modules | WORKING nav | depth varies |
| AI send | BLOCKED | no API key |
| AI voice realtime | BLOCKED | no API key |

---

## Responsive scores (from screenshots + CSS)

| Surface | Score | Notes |
|---------|-------|-------|
| Mobile UI | **52/100** | Dock works; density high; truncation risk at 360; gift/three errors |
| Tablet UI | **48/100** | Icon-collapsed rail; main canvas can appear empty (`tablet/01-home.png`) |
| Desktop UI | **76/100** | Cohesive light futuristic shell; three-column works |

Viewports captured: 360×800, 390×844, 768×1024, 1440×900, 1920×1080.  
412×915 / 1366×768: not separately captured — **PARTIAL coverage**.

---

## Design system (brief)

- **Direction:** light futuristic / warm cream–lavender–gold (matches SYLORA brand intent; not dark dashboard).  
- **Tokens:** CSS variables across `design-living-horizon.css` / consolidation layers.  
- **Problem:** Many stacked CSS generations (v2→v6) → drift risk; Business/Learning feel like adjacent products with same skin.  
- **Cards:** Heavy card use despite “one composition” ideals — Hub/Business especially.  
- **Motion:** `sylora-motion.js` springs; gift motion broken at runtime.  
- **A11y:** some `aria-` on dialogs; contrast generally OK on light UI; focus not systematically audited; reduced-motion present in V6 CSS.
