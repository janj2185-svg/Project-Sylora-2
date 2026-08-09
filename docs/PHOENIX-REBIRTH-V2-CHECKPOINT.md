# Phoenix Rebirth V2 — vertical-slice checkpoint

Status: implementation checkpoint; Gate 9 human visual approval is still required before this gift may be called 100% complete.

## Implemented

- 10-second `phoenix-rebirth` V2 definition with all seven dramatic functions and no story gap over one second.
- Unique eight-shot camera choreography: macro → dolly → hero-low → orbit → boundary cross → near-camera → impact response → wide reveal.
- Procedural articulated Phoenix rig with independent wing groups and nine tail elements.
- Deterministic physical event timeline for crystal hatch, wing pressure, stream heat, inward-fire climax, ash and newborn chirp.
- Physical-only spatial audio event map; no music cues.
- V2 depth planes with a behind-streamer → front-streamer crossing, foreground embers, light spill, heat/pressure distortion and climax exposure response.
- HIGH / MEDIUM / LOW technical profiles that preserve story beats while reducing particle density and render scale.
- Portrait / compact / wide framing profiles, plus live stage resize handling.
- Haptic climax event and reduced-motion compatibility.
- Explicit disposal of Phoenix geometry/material GPU resources after playback.
- Legacy V1 fallback when WebGL2 V2 preflight is unavailable.

## Automated evidence

At this checkpoint the complete project suite passes: 62 tests, 0 failures.

Phoenix-specific checks cover the seven story functions, no-dead-time rule, definition validation, articulated hero rig, physical event map, no-music rule, three quality profiles, portrait/compact/wide framing and persistence of runtime physical-audio subscriptions after definition loading.

## Gate status

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| 1 Story treatment | PASS | Identity, climax and ending are encoded in the canonical Gift Bible and V2 definition. |
| 2 Beat sheet | PASS | Seven overlapping beats cover the full 0–10 s runtime. |
| 3 Previsualization | PARTIAL | Camera/framing logic exists; human phone/tablet/desktop visual review remains. |
| 4 Asset/rig/physics | PASS for procedural vertical slice | Articulated procedural rig, material treatment and semantic physical event timeline implemented. |
| 5 Cinematic animation | PASS in implementation | Primary flight/form motion, wing/tail secondary motion, ember tertiary motion and authored exit implemented. |
| 6 Physical sound | PASS in implementation | Causal spatial physical sound pipeline and event map; no music. |
| 7 Stream composite | PARTIAL | V2 depth compositor and segmentation adapter exist; real-subject segmentation must be visually proven in an actual LIVE feed. |
| 8 Performance mastering | PARTIAL | HIGH/MEDIUM/LOW profiles and fallback exist; real-device 120/60 FPS, thermal and memory measurements remain. |
| 9 Quality review | BLOCKED | Requires beginning-to-end runtime capture plus phone/tablet/desktop human review. |

## Definition-of-Done rule

Do not begin rebuilding gift #2 and do not label Phoenix Rebirth V2 complete until the remaining visual/performance gates above are actually observed and approved. Automated tests alone are not visual approval.
