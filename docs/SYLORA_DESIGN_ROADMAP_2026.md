# SYLORA — MASTER DESIGN ROADMAP 2026

Status: LOCKED working specification for the redesign branch `design/approved-sylora-ui`.

## Product design thesis
SYLORA must feel like a coherent digital world, not a generic AI dashboard. The visual language is luminous, light, spatial and premium: crystal/glass depth, restrained metal, atmospheric layers, quiet intelligence, strong typography and deliberate motion. Purple/blue neon is not the base language. Every screen must belong to one ecosystem across desktop, tablet and mobile.

## Global shell
### Brand/header
- Approved SYLORA mark + approved futuristic wordmark.
- Brand click: Home.
- Brand hover: tiny material-reflection shift only.
- Search: opens Command Center; same action on Cmd/Ctrl+K.
- Language selector.
- LUMEN balance.
- Gifts shortcut.
- Inbox shortcut with unread state.
- Profile/avatar.
- Logout/account menu.

### Left navigation
Home, LIVE, Clips, Studio, Learning, Business, Explore, Communities; secondary: Inbox, Profile, Settings, Create. States: default, hover, pressed, focus, active, disabled where relevant. Active uses crystal selection, not a black SaaS pill.

### Mobile navigation
Home, LIVE, Sylora, Inbox, Profile. Bottom dock uses glass depth, safe-area spacing, 44px minimum touch targets and clear active state.

## Home
### Living Horizon hero
- Greeting and contextual summary.
- Sylora presence card.
- Quick actions: LIVE, Clips, Studio, Create, Inbox, Learning, Business.
- Atmospheric horizon field with very slow depth drift; no neon waves.
- Sylora card hover: +2px elevation and light refraction.
- Quick action hover: 2px depth shift; press: 80–120ms compression.

### Home ecosystem modules
- Daily Brief.
- Continue.
- Inbox preview.
- Recommended LIVE.
- People.
- For You.
- Communities.
- Learning.
- Business.
- Composer and social feed.
- Every card supports loading, empty, hover, focus and error states.

### Post actions
React, Comments, Ask Sylora, Follow, Report, Block. Report and Block are visually subordinate until invoked. Destructive confirmation is explicit.

## Sylora AI
States: idle, listening, thinking, speaking, happy, concerned, focused, curious, excited, calm. Motion includes breathing, blink, eye focus, head micro-movement, body balance, hands, facial emotion and lip-sync. Listening uses subtle spatial response; thinking uses a restrained cognitive field rather than spinner chrome.

## LIVE
Tabs: discover, following where available, battles, create, studio. Room actions: Watch, Chat, Ask Sylora, Battle/Resonance where permitted, Copilot for host. Viewer controls: video, like, gifts, chat, connection state. Host controls: mic, camera, screen, guests, AI, effects, OBS, settings, end LIVE. Gifts run in a cinematic layer separate from core UI.

## Creator Studio
Preview, scenes, sources, camera, screen share, media/overlay, audio mixer, output profile, recording, WebRTC, OBS, stream health. Connection states: disconnected, connecting, connected, degraded, error. GO LIVE is primary but not TikTok-like.

## Clips / Video
Desktop vertical-video stage with atmospheric side extension; mobile full-screen. Actions: follow, like, comments, share, save, Ask Sylora. Gestures: vertical swipe, double-tap like, long-press controls.

## Explore
Living discovery surface for People, Ideas, LIVE, Videos, Communities, Learning and Business. Mixed geometry, single material system.

## Communities
Cover, identity, members, feed, LIVE rooms, events, resources, AI community assistant. Join -> Joined morph; pending has neutral status. Admin controls separated from member controls.

## Messages / Calls
Desktop: conversation list, active thread, context rail. Mobile: list -> thread. Message states: sending, sent, delivered, read, failed. Text, voice, photo, video, file, reply, reaction, voice call, video call. Incoming call overlay: Accept, Decline; in-call: Mute, Camera, Speaker, Screen share, End.

## Profile
Avatar, identity, status, followers/following, posts, clips, LIVE, projects, communities, learning achievements. Own profile: Edit, Creator Dashboard, Wallet, Settings. Other profile: Follow, Message, Call, Share.

## Business
Overview, projects, tasks, contacts, analytics, documents, contextual Sylora insights. AI insights use crystal emphasis, not purple magic boxes. Critical metrics get stronger hierarchy; normal metrics stay quiet.

## Learning
Discover, learning path, lesson, video, notes, quiz, progress, Ask Sylora. Progress is calm material fill. Achievement uses short premium animation without confetti.

## Creator Center
Create Post, Clip, Video, LIVE, Community, Course, Project from one Creation Hub. Sylora can assist with script, title, translation, thumbnail direction, moderation and stream setup.

## LUMEN / Wallet
Balance, transactions, creator earnings, gifts, subscriptions, payouts. No casino styling. Balance changes animate numerically without flash.

## Notifications
Social, Messages, LIVE, Business, Learning, System. Unread uses luminance/halo, not aggressive red. Mobile swipe actions supported where safe.

## Settings
Account, Profile, Privacy, Security, Notifications, Language, Accessibility, Sylora/AI, Voice, LIVE, Connected Platforms, Developer, Billing, Danger Zone. Destructive actions are isolated.

## Auth
Welcome, Login, Register, Google, Phone, Recovery, Verification. Living Horizon background at very slow motion. Local inline errors. Clean transition to Home after success.

## Admin / Security / Developer
Same brand language with higher information density: tables, filters, logs, APIs, permissions, moderation, system health, audit. Red reserved for destructive/error/critical states.

## Button system
Primary, Secondary, Glass, Icon, Destructive, Floating Contextual. Every interactive control defines Default, Hover, Pressed, Focus, Loading, Disabled; Success/Error only where meaningful. Loading never changes button width.

## Motion system
- Micro: 80–160ms — buttons, toggles, reactions.
- Interface: 180–320ms — menus, cards, sheets.
- Navigation: 280–450ms — view transitions.
- Atmospheric: 6–30s — horizon light, subtle fields, Sylora idle.
- Respect `prefers-reduced-motion`.

## Semantic illumination
- Crystal white: interaction/material.
- Soft silver/cyan: intelligence/context.
- Warm metal: premium/value/achievement.
- Green: connected/success.
- Amber: attention/degraded.
- Red: destructive/error/critical.
- Purple/blue neon: never default brand language.

## Empty / Loading / Error
Every module has skeleton geometry matching real content, useful empty copy with next action, offline state, degraded AI state and non-blocking failure where possible.

## Responsive targets
1920 desktop, 1366 laptop, 768 tablet, 390 mobile, 320 lower-bound validation. Desktop uses left rail + workspace + context rail; tablet condenses; mobile uses bottom dock and sheets. No desktop-scale shrinking.

## Accessibility
Keyboard navigation, visible focus, semantic labels, reduced motion, readable contrast, text scaling, captions where relevant, ~44px minimum touch targets.

## Sound
UI is mostly silent. Sound only for incoming calls, important notifications, LIVE state changes, gift cinematics and critical alerts. Sylora voice is a separate layer.

## Acceptance gate for every screen
Hierarchy, spacing, alignment, typography, iconography, button states, hover, pressed, focus, loading, empty, error, motion, responsive behavior, touch, keyboard, overflow, duplicates, contrast, performance, Sylora presence and brand consistency. A real screenshot review is required before spreading a screen pattern across the product.

## Implementation order
1. Home 1440 real render.
2. Home mobile 390 real render.
3. Extract shared design tokens/components.
4. Sylora AI.
5. LIVE.
6. Studio + Clips + Video.
7. Social: Explore, Communities, Messages, Calls, Profile.
8. Business + Learning + Creator Center + Wallet.
9. Settings + Auth + Admin/Security/Developer.
10. Responsive/motion/accessibility pass.
11. Visual regression and final QA.
12. Merge only after the branch passes visual + functional gates.
