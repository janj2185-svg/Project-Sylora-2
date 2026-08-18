# SYLORA — MASTER DESIGN ROADMAP 2026

**Status:** LOCKED product-design specification  
**Version:** 2.0  
**Date:** 2026-08-17  
**Repository:** `janj2185-svg/Project-Sylora-2`  
**Working branch:** `design/approved-sylora-ui`  
**Scope:** complete UI/UX redesign of the existing product without replacing working functionality  
**Production:** no merge and no deployment until the gates in this document pass

---

## 0. Governance and non-negotiable rules

This document remains the product-design roadmap. For brand identity, the
owner-locked canonical asset contract in `docs/brand/CANONICAL_LOGO.md` has
higher priority.

The redesign is not a new decorative CSS layer and not a sequence of unrelated screen restyles. It is a product-wide design system with one visual, spatial, interaction and motion language across Social, AI, LIVE, Creation, Business and Learning.

### Locked rules

1. The approved direction is **SYLORA Living Horizon**.
2. The approved SYLORA mark, wordmark, star detail and tagline are retained exactly. No replacement or redraw may be invented. The repository source of truth is `public/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png` with SHA-256 `dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08`.
3. Existing routes, APIs and working behavior are functional contracts, not visual references.
4. Existing `design-*.css` files are not automatically an approved baseline. They must be audited for ownership, duplication and cascade conflicts.
5. Do not add another global override stylesheet to hide structural design problems.
6. No product-wide rollout is allowed until the real Home screen passes the Home Proof Gate at 1440 px and 390 px.
7. No fake data, fake connection, fake provider, fake AI state or fake success state may be introduced for visual completeness.
8. A screen is not approved from code or CSS inspection. Approval requires a real render, screenshots, interaction checks and defect correction.
9. Working backend behavior must be preserved. Product limitations are shown honestly as partial, unavailable or blocked.
10. No merge to `main` and no production deploy until the final visual and functional gates pass.

### Change control

The following may not change without a documented design decision and a concrete reason:

- light futuristic premium direction;
- Living Horizon spatial language;
- approved brand mark and wordmark;
- semantic illumination rules;
- desktop/tablet/mobile navigation architecture;
- Home-first approval process;
- quiet, purposeful motion;
- separation of core UI and cinematic gift effects;
- honest representation of real product state.

Any approved deviation must be recorded in the roadmap or a linked design decision with:

- problem;
- proposed change;
- reason;
- affected screens;
- before/after screenshots;
- functional and accessibility impact.

---

## 1. Product design thesis

SYLORA must not look like a website with an AI widget.

It is a coherent digital world and personal operating environment. A user moves through:

`Social → AI → LIVE → Creation → Business → Learning`

without feeling that separate products have been opened.

### Character

- light futuristic premium;
- sophisticated, clean and human;
- spacious rather than empty;
- technological without looking clinical;
- atmospheric without becoming decorative noise;
- recognizably SYLORA rather than a copy of another product.

### Material language

- crystal and translucent glass;
- soft silver;
- restrained warm metallic accent;
- atmospheric depth;
- subtle volumetric light;
- precise typography and quiet shadows.

### Explicit anti-patterns

- dark-first UI;
- generic SaaS or CRM dashboard;
- crypto, casino or gaming coin aesthetics;
- cheap neon;
- purple/blue glow as the main language;
- identical cards everywhere;
- excessive glassmorphism;
- permanent animation on every element;
- copies of TikTok, Discord, ChatGPT or Apple;
- visual claims for features that are not connected.

### Living Horizon atmosphere

The background is not plain white. It is built from very light atmospheric depth:

- crystalline haze;
- an almost invisible spatial grid;
- low-contrast light fields;
- restrained glass layers;
- weak metallic reflections;
- optional slow depth movement.

Existing `sky-grid` and `aurora` concepts may be reused only after they are simplified into this system. They must not become another decorative layer competing with content.

---

## 2. Pre-implementation Design Specification Gate

Implementation of the new Home composition begins only after the following artifacts exist in explicit, inspectable form:

1. Brand lockup specification: mark, wordmark, clear space, minimum sizes and light-surface usage.
2. Home 1440 composition specification with exact regions and hierarchy.
3. Home 390 mobile composition specification; it must not be a scaled desktop layout.
4. Typography scale and text hierarchy.
5. Spacing, radius, grid and breakpoint tokens.
6. Surface/material recipes for solid, glass, crystal and metal.
7. Semantic color and status tokens.
8. Shadow/depth levels.
9. Icon family and sizing rules.
10. Button and input state matrix.
11. Motion tokens and reduced-motion substitutions.
12. Core component inventory and ownership.
13. Content-state matrix: populated, loading, empty, error, offline, degraded and unauthorized where applicable.
14. Screenshot naming and approval record.

The first implementation may use one explicitly scoped Home prototype layer. After Home approval, its valid rules are extracted into shared tokens/components. Global override accumulation is prohibited.

---

## 3. Global design system

### Required token families

- spacing;
- radius;
- layout grid;
- breakpoints;
- surface;
- glass;
- crystal;
- metal;
- border;
- shadow;
- elevation/depth;
- typography;
- icon sizing;
- motion and easing;
- focus;
- status and semantic illumination;
- z-index/layer ownership;
- safe-area values;
- media aspect ratios.

### Required interactive states

Every interactive element defines:

- default;
- hover where a pointing device exists;
- pressed;
- focus-visible;
- loading;
- disabled.

Where meaningful it also defines:

- selected;
- unread;
- success;
- warning;
- error;
- connected;
- degraded;
- offline.

Loading must never change the control geometry or cause layout shift.

### Typography

Typography must supply hierarchy before cards, borders or glow are added. The final system must define:

- display;
- page title;
- section title;
- card title;
- body;
- compact body;
- label;
- metadata;
- numeric/metric style;
- code/log style for Developer and Admin.

Long Ukrainian, Polish, German and English strings must be tested. Truncation may not hide critical status or actions.

### Iconography

Use one coherent vector icon family. Unicode symbols are not the final production icon system. Icons need consistent stroke, optical weight, bounding box and state behavior.

### Material hierarchy

- **Solid:** readability-critical content, forms and dense data.
- **Glass:** navigation, overlays, contextual sheets and light controls.
- **Crystal:** selected, intelligent or contextually important surfaces.
- **Metal:** rare premium/value/achievement emphasis.

Glass is not the default for every card. Blur and transparency must never reduce contrast or performance.

---

## 4. Brand and global header

### Left block

- approved SYLORA mark;
- approved SYLORA wordmark;
- click returns to Home;
- first load uses a 600–800 ms material reveal;
- no rotation and no neon intro;
- hover changes surface reflection by only a few percent;
- wordmark remains stable with no permanent letter effect.

### Global Search / Command Center

Collapsed control: `⌕ Search SYLORA`.

- hover slightly brightens the glass surface;
- click expands the Command Center from the field origin;
- `Ctrl/Cmd + K` opens the same interface;
- keyboard focus goes directly to the search input;
- Escape closes and restores focus to the trigger.

Search covers:

- people;
- LIVE;
- video and clips;
- communities;
- learning;
- business;
- the user's own content.

Sylora may interpret natural-language queries only when the real AI/search capability is available. Otherwise normal search remains fully usable.

### Right block

- language;
- LUMEN balance;
- notifications;
- inbox;
- avatar/profile;
- account menu.

Each icon has default, hover, pressed and active/unread states. Unread uses a small dot or restrained halo, not a large red alarm.

---

## 5. Global navigation and workspace shell

### Desktop

Left navigation + primary workspace + contextual right rail where the active task needs one.

Primary order:

- Home;
- LIVE;
- Clips;
- Studio;
- Learning;
- Business;
- Explore;
- Communities.

Secondary order:

- Inbox;
- Profile;
- Settings;
- Create.

Active navigation uses a crystal selection capsule with a thin internal light edge. It must not look like a heavy black SaaS button.

- hover: approximately 2 px spatial shift;
- press: 80–120 ms compression;
- view transition: old content fades subtly while new content enters with an 8–12 px depth shift;
- content must not flash between routes.

### Tablet

Condensed navigation with the same information architecture. Labels may collapse where discoverability remains clear.

### Mobile

Bottom dock + contextual sheets. Core dock:

- Home;
- LIVE;
- Sylora;
- Inbox;
- Profile.

Safe areas, browser chrome, virtual keyboard and 44 px touch targets must be respected.

---

## 6. HOME — Living Horizon proof screen

Home is the proof of the complete system. It is not a Facebook feed with a new skin.

### Top scene: Living Horizon

The scene gives a calm summary of the user's world:

- contextual Sylora presence;
- upcoming LIVE;
- important conversations;
- active project or idea;
- useful quick actions;
- ecosystem activity.

Example contextual copy may be generated only from real available data. Sylora remains helpful but not permanently intrusive.

### Quick actions

- Create;
- LIVE;
- Clip/Video;
- Studio;
- Inbox;
- Learning;
- Business.

Every displayed action must open the real existing workflow or show an honest unavailable/partial state.

### Feed structure

- For You;
- Following;
- Latest;
- composer;
- ecosystem modules;
- feed.

The composer supports only the modes backed by the product:

- text;
- photo;
- video;
- voice;
- LIVE;
- Sylora-assisted creation.

### Content presentation

Posts use distinct presentation modes for text, photo, video, project and LIVE. They share tokens but not identical geometry.

- hover: minimal elevation change;
- like: short tactile response;
- comment: inline expansion;
- share: glass sheet;
- save: small material pulse;
- no confetti or large celebration for routine actions.

### Home Proof Gate

The style may spread to other routes only after all of the following pass:

1. Real authenticated Home render at 1440 px.
2. Real authenticated Home render at 390 px.
3. Content-rich state.
4. New-user/empty state.
5. Loading and API-error states.
6. Offline/degraded behavior where supported.
7. Keyboard navigation and visible focus.
8. Reduced-motion render.
9. No horizontal overflow at 320 px.
10. No uncaught console error or unexplained failed network request.
11. Screenshot review followed by at least one correction pass.
12. Explicit approval record: `HOME_DESIGN_APPROVED`.

Until this gate passes, Home is a prototype and all later visual work remains blocked.

---

## 7. SYLORA AI

This must be the strongest and most distinctive product space. It must not be ChatGPT inside a card.

### Spatial model

The living Sylora is the focus. User context is arranged around her:

- conversation;
- projects;
- LIVE;
- business;
- learning;
- creation.

The interface reveals context progressively and does not surround the avatar with permanent panels.

### Required states

- Idle;
- Listening;
- Thinking;
- Speaking;
- Happy;
- Concerned;
- Focused;
- Curious;
- Excited;
- Calm.

### Avatar behavior

- breathing;
- blink;
- eye focus;
- head micro-movement;
- body balance;
- hands;
- facial emotion;
- lip-sync.

No jitter. The existing `AI → emotion → voice → gesture/avatar` pipeline is retained and exposed honestly. Decorative animation must not replace real pipeline state.

Listening uses subtle environmental response to the user's voice. Thinking uses a restrained cognitive field rather than a spinner. Speaking synchronizes voice, mouth, gaze, gesture and emotional state as far as the real pipeline supports.

When AI or voice is unavailable, Sylora shows a calm unavailable/degraded state while the rest of the product continues to function.

---

## 8. LIVE

LIVE feels like a place of presence while remaining part of SYLORA.

### Hub

- Discover;
- Following;
- Scheduled;
- My LIVE;
- Battles/interactive formats where available.

### Live room

- real video/camera state;
- creator identity;
- viewer count;
- chat;
- AI co-host;
- reactions;
- moderation;
- guests;
- share;
- fullscreen;
- gifts.

### Host controls

- Mic;
- Camera;
- Screen;
- Guests;
- Chat;
- AI;
- Effects;
- OBS;
- Settings;
- End LIVE.

Mic off changes icon/state without flooding the control with red. Camera off transitions to an avatar or honest placeholder. AI opens Sylora Copilot. A viewer joining gets a restrained presence response. Chat messages enter in approximately 150–200 ms. Gifts play in a separate cinematic layer.

### Connection truth

Show only real states:

- Disconnected;
- Connecting;
- Connected;
- Degraded;
- Error.

WebRTC, RTMP, OBS and external-platform state must never show fake success.

### Seven LIVE formats — unresolved canonical mapping

The previous requirement refers to seven LIVE formats, but neither the current roadmap nor the current code contains one authoritative seven-item list. The code currently exposes:

- room kinds: `talk`, `music`, `debate`, `study`, `business`, `science`, `game`, `community`, `standard`;
- battle modes: `1v1`, `2v2`, `3v3`, `team_vs_team`, `creator_vs_community`, `tournament`, `survival`, `king_of_resonance`;
- entertainment capabilities including Battles 2.0, Resonance World, Challenges, Quizzes, Mini-games, Audience vs Sylora, Stage and timers.

These categories are not silently re-labelled as “the seven formats.” Before the LIVE design stage begins, a canonical `LIVE_MODE_MATRIX` must define exactly seven product-facing layouts, each with:

- name and purpose;
- host count and participant roles;
- stage geometry;
- chat/reaction behavior;
- Sylora role and autonomy;
- guest and moderation controls;
- scoring/timer behavior where relevant;
- mobile composition;
- real backend capability and blockers.

This does not block Home, Sylora AI foundation or the general LIVE hub. It blocks only final approval of the seven specialized LIVE layouts.

---

## 9. LIVE Studio

Professional creator cockpit.

### Composition

- center: Preview;
- left: Scenes, Sources, Camera, Screen, Media, Browser Source;
- right: Chat, Guests, Sylora, Stream Health;
- bottom: Mic, audio levels, camera, record, GO LIVE.

GO LIVE is the clearest action but not an oversized TikTok copy. Dense controls use solid or low-transparency surfaces for readability. Audio meters, connection health and recording state must update from real runtime state.

---

## 10. Clips / Video Hub

### Desktop

- centered vertical video at a controlled width;
- atmospheric extension around the media rather than stretching the video;
- creator, follow, like, comment, share and save controls remain reachable;
- keyboard and pointer controls are visible on demand.

### Mobile

- full-screen immersive mode;
- vertical swipe for next/previous;
- double tap for like;
- long press for controls;
- safe-area protection for actions and captions.

Captions, muted autoplay rules and reduced-motion behavior are mandatory.

---

## 11. Explore

Explore is not a uniform tile catalogue. It is a living map of:

- Trending;
- People;
- Ideas;
- LIVE;
- Videos;
- Communities;
- Learning;
- Business.

Blocks may use different geometry, but must share one material, spacing, type and interaction system.

---

## 12. Communities

- cover;
- identity;
- members;
- feed;
- LIVE rooms;
- events;
- resources;
- AI community assistant.

Join morphs to Joined. Pending is neutral and clear. Owner/admin tools are separated from member controls. Permission-sensitive actions must be based on the real role.

---

## 13. Messages and Calls

### Desktop

Conversation list | active conversation | contextual information.

### Mobile

Conversation list → conversation. Do not compress all three desktop panes onto one screen.

### Message states and formats

- sending;
- sent;
- delivered;
- read;
- failed;
- text;
- voice;
- photo;
- video;
- file;
- reply;
- reaction.

### Calls

Incoming call uses an elegant separate overlay. Controls:

- Accept;
- Decline;
- Mute;
- Camera;
- Speaker;
- Screen Share;
- End.

Permissions, device errors and connection loss need honest states.

---

## 14. Profile

Header:

- avatar;
- name;
- username;
- status;
- followers;
- following.

Content:

- Posts;
- Clips;
- LIVE;
- Projects;
- Communities;
- Learning achievements.

Owner controls: Edit Profile, Creator Dashboard, Wallet, Settings. Visitor controls: Follow, Message, Call, Share. These states may not be mixed.

---

## 15. Creator Center

Create opens one Creation Hub, not seven unrelated popups:

- Post;
- Clip;
- Video;
- LIVE;
- Community;
- Course;
- Project.

Sylora may assist with script, title, translation, thumbnail direction, moderation and stream setup only where real functionality exists.

---

## 16. Business

Business is not a 2015 CRM dashboard.

- overview;
- projects;
- AI insights;
- tasks;
- contacts;
- analytics;
- documents.

Critical metrics receive stronger hierarchy; normal metrics remain neutral. Sylora Business Assistant appears contextually. AI insight uses crystal emphasis, not a purple magic box. Charts prioritize readability over decoration.

---

## 17. Learning / Science

- discovery;
- learning path;
- lesson;
- video;
- notes;
- quiz;
- progress;
- Ask Sylora.

Sylora must know the active lesson and, where supported, the user's current position. Progress uses calm material fill. Achievement uses a short premium response without childish confetti.

---

## 18. LUMEN / Wallet

- balance;
- transactions;
- creator earnings;
- gifts;
- subscriptions;
- payouts.

No crypto exchange, casino or gaming-coin aesthetic. LUMEN is a digital asset inside the ecosystem. Balance changes may morph/count but must not flash. Financial and payout states must be unambiguous and based on real data.

---

## 19. Notifications

Categories:

- Social;
- Messages;
- LIVE;
- Business;
- Learning;
- System.

Unread uses a small luminance difference. Read surfaces settle to neutral. Mobile swipe actions must be reversible or confirmed where destructive.

---

## 20. Settings

- Account;
- Profile;
- Privacy;
- Security;
- Notifications;
- Language;
- Accessibility;
- Sylora AI;
- Voice;
- LIVE;
- Connected Platforms;
- Developer;
- Billing;
- Danger Zone.

Danger Zone is visually and spatially isolated. Delete Account is never placed beside Save.

---

## 21. Authentication

- Welcome;
- Login;
- Register;
- Google;
- Phone;
- Recovery;
- Verification.

Use a very slow Living Horizon background, material/glass fields, a thin focus ring, local field errors and a clean transition to Home.

Google, phone, recovery or verification controls may be shown as active only when supported by the real backend. Otherwise document and display the blocker honestly.

---

## 22. Admin / Security / Developer

The brand remains consistent but information density is higher:

- tables;
- filters;
- logs;
- API;
- permissions;
- moderation;
- health;
- audit.

Red is reserved for destructive, error and critical states. Dense data surfaces prioritize scanability, column alignment, keyboard operation and text contrast over glass effects.

---

## 23. Motion system

Four levels:

- **Micro — 80–160 ms:** buttons, toggles, reactions.
- **Interface — 180–320 ms:** cards, menus, drawers and sheets.
- **Navigation — 280–450 ms:** route/view transitions.
- **Atmospheric — 6–30 s:** Living Horizon, light fields, particles and Sylora idle.

Rules:

- no animation solely to attract attention;
- transform and opacity are preferred for smooth interaction motion;
- no layout-moving animation for primary controls;
- motion must preserve user input and focus;
- `prefers-reduced-motion` receives a deliberate static/shortened alternative;
- avatar and atmospheric loops must stop when hidden or offscreen where practical.

---

## 24. Semantic illumination

- **White/crystal:** interaction and material.
- **Soft silver/cyan:** intelligence and context.
- **Warm metallic:** premium value and achievement.
- **Green:** healthy, connected and success.
- **Amber:** attention and degraded state.
- **Red:** destructive, error and critical.
- **Purple/blue neon:** never the default brand language.

Glow is semantic feedback, not decoration.

---

## 25. Button, input and control system

### Button types

- Primary;
- Secondary;
- Glass;
- Icon;
- Destructive;
- Floating Contextual.

Every button needs Default, Hover, Pressed, Focus, Loading and Disabled. Success/Error are used only where the control owns that state. Loading preserves width and label geometry.

Inputs define idle, hover, focus, filled, invalid, valid, disabled and read-only. Error text is local, specific and screen-reader connected.

---

## 26. Empty, loading, error and degraded states

No key module may end as an unexplained blank area.

Every applicable module defines:

- loading;
- populated;
- empty;
- error;
- offline;
- degraded;
- unauthorized/forbidden.

Empty states explain what the module is, why it is empty and what the user can do. Skeletons follow the geometry of real content. Sylora or provider failure must not disable unrelated parts of the product.

---

## 27. Responsive system

Required review widths:

- 1920 desktop;
- 1440 Home design proof;
- 1366 laptop;
- 768 tablet;
- 390 mobile;
- 320 lower-bound.

Responsive behavior is recomposition, not desktop scaling.

- Desktop: left navigation + workspace + contextual rail.
- Tablet: condensed navigation and rebalanced workspace.
- Mobile: bottom dock + sheets + single-task composition.

Validate safe areas, virtual keyboard, bottom dock, modals, sheets, camera, video, long localized text and overflow.

---

## 28. Touch and gestures

- tap;
- long press;
- swipe;
- drag;
- pinch only where natural.

Sheets may close with swipe-down. Clips use vertical swipe. Media viewer may use pinch zoom. Destructive actions must not execute from an accidental gesture. Keyboard/pointer alternatives are required for non-touch devices.

---

## 29. Accessibility

Target: WCAG 2.2 AA where applicable.

- full keyboard navigation;
- visible focus;
- semantic controls and screen-reader labels;
- reduced motion;
- normal-text contrast target 4.5:1;
- large text and essential UI graphics target 3:1;
- touch targets approximately 44 px or larger;
- captions/transcripts where relevant;
- text scaling to 200% without loss of function;
- correct headings, landmarks, dialog focus trapping and focus return;
- status announcements for asynchronous actions.

Futuristic appearance may not reduce usability.

---

## 30. Sound design

The interface is predominantly silent.

Sound is reserved for:

- incoming call;
- important notification;
- LIVE state change;
- gift cinematic;
- critical alert.

Sylora voice is a separate layer. Sound must respect mute, autoplay restrictions, user preferences and accessibility needs.

---

## 31. Gifts

The base gift UI belongs to the design system:

- drawer;
- preview;
- price;
- balance;
- send;
- confirmation.

AAA cinematic gift scenes remain a separate engine. They are not redesigned as part of ordinary screen styling unless an integration defect requires it. Sending a gift hands the real scene to the cinematic layer.

---

## 32. Performance and implementation discipline

### CSS architecture

1. Inventory every existing `design-*.css` file and its loaded order.
2. Identify duplicate globals, specificity escalation and dead rules.
3. Assign clear ownership to tokens, shell, components, screens and motion.
4. Do not solve conflicts with additional `!important` layers as the normal strategy.
5. After Home approval, consolidate superseded prototype rules safely.
6. Preserve selectors relied on by real behavior until their replacement is tested.

### Performance targets

On representative production-like builds and hardware:

- LCP target ≤ 2.5 s;
- CLS target ≤ 0.1;
- INP target ≤ 200 ms;
- interactive motion should remain visually smooth;
- hidden/offscreen atmospheric and avatar work should pause where practical;
- large media uses appropriate dimensions, formats and lazy loading;
- no route should load cinematic gift assets unless needed.

Targets are measured and reported, not claimed from code inspection.

---

## 33. Screen Definition of Done

A screen is complete only when:

1. It uses approved tokens/components rather than ad hoc local styling.
2. It preserves real functionality and permissions.
3. Primary actions work against real routes/APIs or show honest blockers.
4. Default, loading, empty, error and relevant degraded states exist.
5. Hover, pressed, focus, loading and disabled states are verified.
6. Desktop and mobile screenshots are captured from the real application.
7. Tablet/laptop/lower-bound behavior is checked where the stage requires it.
8. Keyboard order, labels, contrast and touch targets are checked.
9. No unexplained console errors, page errors or failed network calls remain.
10. No horizontal overflow, clipped controls or duplicate actions remain.
11. A visual defect pass is completed after the first screenshots.
12. Existing automated tests remain green.
13. The stage has a logical commit and an updated status record.

---

## 34. Required implementation order and stage gates

### Stage 00 — Audit and freeze

- analyze the current branch, commits, DOM and routes;
- inventory all `design-*.css` files and cascade order;
- classify existing work as accepted, reusable, partial or rejected;
- preserve working behavior;
- produce the pre-implementation design specification artifacts.

**Gate:** no Home styling until structure, tokens and reference are explicit.

### Stage 01 — Home 1440 proof

- implement the real Home composition;
- run the real app;
- capture 1440 screenshot;
- perform written internal critique;
- correct defects;
- repeat screenshot.

**Gate:** hierarchy, identity and composition must clearly exceed “restyled dashboard.”

### Stage 02 — Home 390 proof

- design a true mobile composition;
- validate touch, safe area, keyboard and sheets;
- capture and correct screenshots;
- check 320 lower-bound.

**Gate:** create `HOME_DESIGN_APPROVED` only after desktop and mobile pass.

### Stage 03 — Design system extraction

- extract tokens, typography, materials, buttons, inputs, navigation, cards, overlays and motion from the approved Home;
- remove or quarantine superseded prototype rules;
- document component ownership.

**Gate:** shared components reproduce Home without regression.

### Stage 04 — Sylora AI

- living workspace;
- honest avatar/voice/emotion pipeline;
- listening/thinking/speaking and emotional states;
- desktop/mobile screenshots and reduced-motion behavior.

### Stage 05 — LIVE hub and room

- hub, room, chat, host/viewer controls, guests, moderation, gifts and connection states;
- establish the canonical seven-format matrix before specialized layouts are approved.

### Stage 06 — LIVE Studio, Clips and Video

- professional cockpit;
- real device/stream states;
- desktop vertical-video stage;
- mobile immersive gestures.

### Stage 07 — Social world

- Explore;
- Communities;
- Messages and Calls;
- Profile;
- Notifications.

### Stage 08 — Creation, Business and Learning

- Creator Center;
- Business;
- Learning/Science;
- contextual Sylora assistance.

### Stage 09 — Economy and account surfaces

- LUMEN/Wallet;
- Gifts base UI;
- Settings;
- Auth.

### Stage 10 — Admin, Security and Developer

- dense data components;
- logs, filters, tables, health, audit and permissions;
- honest error/critical state language.

### Stage 11 — System-wide responsive, motion and accessibility pass

- 1920, 1366, 768, 390 and 320;
- text scaling and reduced motion;
- keyboard and screen-reader semantics;
- touch, overflow, camera/video and modal behavior.

### Stage 12 — Final visual and functional regression

- real-route screenshot matrix;
- console and network review;
- lint/build/type checks;
- unit and integration tests;
- critical PostgreSQL path when the environment is available;
- performance observations;
- blocker register;
- final production-readiness assessment.

No stage is declared complete from CSS output alone.

---

## 35. Final Design QA checklist

For every screen:

- visual hierarchy;
- spacing;
- alignment;
- typography;
- iconography;
- buttons and controls;
- hover;
- pressed;
- focus;
- loading;
- empty;
- error;
- offline/degraded;
- animation;
- responsive behavior;
- touch and gestures;
- keyboard;
- overflow;
- contrast;
- duplicates;
- performance;
- Sylora presence;
- brand consistency;
- real functional state.

Screenshot review is mandatory. At least one correction pass is mandatory after the first major-module screenshot set.

---

## 36. Final deliverables

1. Executive summary.
2. Baseline before redesign.
3. What changed.
4. Full screen/module inventory.
5. Approved desktop/mobile screenshots.
6. Working functionality.
7. Partial functionality.
8. Blockers.
9. Test results.
10. Responsive results.
11. Accessibility results.
12. Performance observations.
13. Commit list.
14. Diff summary.
15. Remaining work before production.
16. Honest readiness percentage.

No 10/10 claim is permitted without completed real-render visual QA.

---

## 37. Current reset decision

The current visual implementation is **not accepted as the final Living Horizon design**. It is treated as a partial technical experiment because it primarily restyles the previous structure and relies on additive CSS layers.

The next allowed design action is not another platform-wide CSS pass. It is:

`Design Specification → Home 1440 → screenshot → critique → correction → Home 390 → screenshot → approval → design-system extraction`

Only after Home proves the intended SYLORA identity may the system expand to the remaining routes.
