# SYLORA — 14 Capability Architecture Roadmap

**Status:** canonical architecture horizon  
**Rule:** inclusion in this roadmap reserves architecture and event contracts; it does not mean a feature is production-complete.

SYLORA must grow as one connected system rather than fourteen isolated products. The capabilities below share the existing LIVE, AI, Gift Runtime V2, Creator Studio, realtime and wallet foundations.

## The fourteen capabilities

1. **SYLORA Living World** — a LIVE environment that reacts to audience, gifts, AI, time and creator state.
2. **AI Director** — context-aware camera, lighting, replay, transition and presentation cues.
3. **Interacting Gifts** — deterministic combinations where compatible gifts affect each other's physics/story rather than overlap.
4. **Collective Gifts** — many viewers contribute durable transactions toward a shared event and climax.
5. **AI Gift Evolution** — gift families evolve in story and behavior; palette reskins do not count as evolution.
6. **Living Sylora AI** — Sylora observes permitted LIVE context and responds through speech, gaze, gesture and emotion.
7. **Universal Live Translation** — multilingual speech/chat with attribution, originals, latency budgets and accessibility.
8. **AI Co-Creator** — generates editable creator assets and scenes while keeping publishing under creator control.
9. **Creator Digital Twin** — permission-scoped, inspectable and revocable assistance; impersonation/publishing authority is never assumed.
10. **LIVE Worlds** — interactive environments that preserve LIVE continuity and performance constraints.
11. **Story LIVE** — auditable audience choices alter an active story/world.
12. **Creator Economy 2.0** — subscriptions, digital goods, services, tickets/paid LIVE and creator earnings converge on one ledger/entitlement model.
13. **AI Business Partner** — evidence-backed business assistance with human control over consequential/financial actions.
14. **SYLORA Moments** — detects meaningful LIVE events and prepares editable vertical clips, captions, translations and cover metadata; publishing requires approval.

## Shared architectural rule

Every cross-system action must have a semantic event type, stable identity and explicit ownership. Durable money/audience decisions must be recoverable and auditable; visual-only cues may remain ephemeral. AI proposals and authoritative user actions are separate event classes.

The canonical event vocabulary is registered in `src/platform-vision.mjs`. Feature modules must reuse those names rather than invent incompatible equivalents.

## Build order

### Horizon A — prove the differentiator

1. Finish Gift Runtime V2 foundation and validation.
2. Produce one Phoenix Rebirth vertical slice through all nine Gift Bible gates.
3. Connect the gift to real LIVE composition.
4. Connect Living Sylora AI to the same semantic LIVE/gift events.
5. Add the first AI Director cues and Living World reactions.

This proves the core thesis: a gift happens *inside* a living AI-directed stream rather than playing as an overlay.

### Horizon B — make LIVE participatory

6. Interacting Gifts.
7. Collective Gifts.
8. LIVE Worlds.
9. Story LIVE.
10. Universal Live Translation.

### Horizon C — make creation compound

11. AI Co-Creator.
12. SYLORA Moments.
13. Permissioned Creator Digital Twin.
14. Gift Evolution.

### Horizon D — complete the economy

15. Creator Economy 2.0 with real payment/entitlement/payout infrastructure and compliance work.
16. AI Business Partner on top of trustworthy creator/business data.

## Non-negotiable gates

- A capability is never labeled complete because its UI exists.
- AI suggestions are distinct from authorized actions.
- The Digital Twin is opt-in, scoped and revocable.
- Moments never auto-publish without permission.
- Financial actions remain human-authorized and ledger-backed.
- Gift combinations must be deterministic enough for synchronized replay.
- Translation must preserve access to the original content and speaker attribution.
- Living World/AI Director cannot hide critical LIVE UI or violate reduced-motion/photosensitivity modes.
- New features must not weaken the existing 54-test working core or the Gift Runtime V2 acceptance gates.

## Immediate milestone

Do not branch into fourteen simultaneous implementations. The immediate vertical slice remains:

**Phoenix Rebirth → Gift Runtime V2 → real LIVE composite → Living Sylora reaction → first AI Director cue → first Living World reaction.**

Once that slice is visually and technically accepted, the same event contracts become the spine for the remaining capabilities.

