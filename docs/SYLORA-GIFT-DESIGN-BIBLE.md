# SYLORA Gift Design Bible

**Status:** Canonical specification for Gift Runtime V2  
**Version:** 1.1 — expanded to 20 signature gifts  
**Language:** Ukrainian  
**Rule:** No SYLORA premium gift may be produced or approved outside this specification.

---

## 1. Mission

SYLORA gifts are not rotating 3D objects, stickers, overlays, or short VFX loops. Each gift is a **miniature cinematic event that temporarily enters the livestream space**.

The target is not to reproduce TikTok LIVE gifts. The target is to establish a distinct premium language that a viewer can recognize as SYLORA without seeing the logo.

Every gift must deliver seven dramatic functions:

1. **Intrigue** — something changes before the hero object is revealed.
2. **Arrival** — the event enters or emerges with a clear physical cause.
3. **Construction / Transformation** — matter assembles, grows, opens, cracks, folds, flows, or changes state.
4. **Continuous motion** — there is no static display phase.
5. **World interaction** — light, air, particles, reflections and depth react inside the stream.
6. **Climax** — one unmistakable peak unique to this gift.
7. **Exit** — a designed ending with physical continuity, not an opacity fade.

The viewer should feel: **“this did not play over the stream; it happened inside it.”**

---

## 2. Non-negotiable rules

### 2.1 No dead time

- At least one meaningful visual, physical, camera, lighting, environmental, or material change must occur in every rolling 1.0 second window.
- Hero objects may pause only as a deliberate anticipation beat, normally 80–350 ms.
- A pause must increase tension through another channel: compressed air, settling debris, changing light, material stress, camera drift, silence, or environmental reaction.
- “Object floats and slowly rotates” is never a valid scene beat.

### 2.2 No template choreography

The following may not be copied from one gift to another as a complete pattern:

- camera path;
- reveal method;
- assembly method;
- main particle behavior;
- climax mechanism;
- destruction/dissolve method;
- ending gesture;
- audio envelope;
- shockwave profile;
- slow-motion placement.

Shared SYLORA materials and color DNA are allowed. Shared stories are not.

### 2.3 Physical causality

Every important visible action must have a physical cause and, when audible, an audio consequence. Every important sound must have a visible or environmental cause.

Examples:

- crystal impact → contact deformation/spark/shard response → crystal transient + room reflection;
- wing flap → feather articulation → air displacement → foreground particles pushed away → directional pressure sound;
- portal suction → dust direction changes → cloth/hair/particles react → inward airflow and pressure shift;
- energy wave → stream lighting changes → bloom/refraction/air distortion → pressure transient.

Random “cinematic boom” sounds are forbidden.

### 2.4 No music

No background music, songs, orchestra, choir, fanfare, melodic score, or musical stingers.

The complete emotional arc must be created with physical sound: air, material, impact, fire, water, pressure, resonance, electricity, creature sound, mechanical motion and environmental reverberation.

---

## 3. SYLORA visual DNA

### 3.1 Overall character

The visual language is **luminous, elegant, ethereal, tactile and expensive**. It combines precision-cut crystal, warm precious metal, pearlescent refraction, ivory light and restrained spectral color.

It must remain compatible with the main SYLORA product language: bright ivory/champagne surfaces with lavender, blush, pearl-blue and mint accents. Premium does not mean dark.

### 3.2 Core palette

Base environment:

- Porcelain Ivory — `#FFF9F2`
- Pearl White — `#F8F7FF`
- Champagne Light — `#F5DEB3`

Primary accents:

- Sylora Gold — `#E7B765`
- Aurora Lavender — `#BDA7FF`
- Crystal Rose — `#F3B8D3`
- Lumen Cyan — `#A8E8F2`
- Ether Mint — `#AFE5D1`

Deep values are allowed locally for contrast inside a portal, cosmic cavity, shadow or fire core, but the global identity should not collapse into a dark-theme aesthetic.

### 3.3 Materials

Each asset uses a material passport rather than a generic shader preset.

**Crystal**

- physically based IOR and thickness;
- controlled dispersion/iridescence;
- micro-scratches visible only in macro shots;
- internal caustic-like light behavior;
- edge highlights tied to geometry, not painted glow;
- fracture planes with different roughness from the polished exterior.

**Gold / precious metal**

- dense polished metal, never yellow plastic;
- believable roughness variation at contacts and seams;
- physically coherent reflections;
- heavier motion and slower settling than crystal fragments of equal size.

**Fire**

- layered temperature zones;
- emissive core with smoke/heat distortion interaction;
- embers inherit parent velocity and local airflow;
- fire must illuminate nearby objects and the stream composite.

**Water**

- surface tension, droplets, ripples and refraction;
- displacement must reflect impact energy;
- droplets carry spatially coherent highlights.

**Feathers / organic elements**

- articulated motion with primary, secondary and tertiary lag;
- variation in stiffness and mass;
- no single rigid “wing mesh” behavior.

---

## 4. Lighting Bible

Light tells the story and must change with the event.

Every gift has four lighting layers:

1. **Livestream base** — sampled/adapted from the video environment.
2. **Hero key** — caused by the gift itself.
3. **Interactive spill** — affects streamer/environment matte and foreground elements.
4. **Volumetric response** — fog, shafts, dust and particulate scattering.

Rules:

- emissive objects must cast perceptible local influence;
- light intensity follows actual energy changes in the animation;
- reflections and highlights must travel as sources move;
- climax lighting may temporarily dominate the stream but must recover smoothly;
- bloom supports exposure; bloom must never replace material detail;
- lens flare is motivated only by bright sources crossing appropriate camera angles.

---

## 5. Cinematic camera language

The camera is a performer, not a spectator.

### 5.1 Shot vocabulary

Allowed shot tools include:

- macro material detail;
- low-angle hero shot;
- high-speed side pass;
- parallax orbit;
- dolly-in / dolly-out;
- rack focus;
- shallow depth-of-field reveal;
- particle tunnel pass;
- near-camera flyby;
- controlled handheld micro-response after a physical impact;
- slow-motion accent;
- wide environmental reveal.

### 5.2 Camera constraints

- Every camera move needs dramatic motivation.
- Never rotate the camera around an object merely to prove it is 3D.
- Extreme acceleration requires ease-in/ease-out consistent with apparent camera mass.
- Near-camera objects generate parallax, motion blur and directional air/SFX.
- Focus distance follows the narrative subject.
- Slow motion is reserved for one decisive physical moment, not used as filler.
- No two signature gifts may share the same ordered shot sequence.

### 5.3 Presence

At least one moment in Epic/Legendary gifts should intentionally break the “flat overlay” feeling using one or more of:

- crossing in front of the streamer;
- passing behind the streamer using depth/segmentation;
- debris crossing the virtual lens;
- a reflection or light spill onto the stream subject;
- environment distortion across real video pixels;
- an object moving from background depth into near-camera space.

---

## 6. Animation and motion system

### 6.1 Hierarchical motion

Hero animation contains at least three motion scales:

- **Primary:** flight, growth, assembly, expansion, opening, collision.
- **Secondary:** wing articulation, petals, rings, gemstones, branches, fragments.
- **Tertiary:** feather tips, sparks, dust, micro-shards, surface shimmer, heat ripple.

Secondary and tertiary motion must lag or react to the primary motion rather than move in perfect synchronization.

### 6.2 Transformation

Assembly must expose physical logic. Components need origin, path, orientation, collision/lock behavior and post-contact settling.

Valid transformation modes include:

- fracture → attraction → mechanical lock;
- growth along a branching field;
- molten flow → cooling/crystallization;
- folding/unfolding articulated surfaces;
- pressure rupture;
- particle condensation;
- dimensional extrusion;
- biological emergence.

Each gift owns its dominant transformation grammar.

### 6.3 Temporal rhythm

Legendary target duration: 8–12 seconds. Epic: 6–9 seconds. Premium: 4.5–7 seconds. Shorter tiers may exist, but narrative completeness is mandatory.

Typical rhythm is **not** a reusable fixed timeline. Instead every gift defines named story beats and unique durations. The validator only enforces that the seven dramatic functions exist and that activity coverage has no dead windows.

---

## 7. Physics

Physics exists to create weight, not to advertise a simulation engine.

Systems required by Gift Runtime V2:

- rigid-body fragments with per-material mass/restitution/friction;
- spring/constraint chains for feathers, vines and flexible ornaments;
- aerodynamic drag for feathers/debris;
- local wind fields;
- radial and directional pressure waves;
- vortex/suction fields;
- collision layers for hero, fragments and virtual camera boundary;
- water impulse/ripple field;
- heat/buoyancy field for embers;
- deterministic seed for replay synchronization.

Rules:

- large gold pieces feel heavier than crystal splinters;
- feathers cannot fall like stones;
- water cannot behave like sparks;
- portal debris accelerates toward the portal center;
- post-impact objects retain momentum unless an explicit force changes it;
- camera shake amplitude depends on event energy and distance.

---

## 8. Particle system

There is no universal “sparkle emitter.”

Every gift receives a particle family passport containing:

- source geometry/volume;
- emission cause;
- material type;
- size distribution;
- lifetime distribution;
- velocity field;
- drag/gravity/buoyancy;
- collision behavior;
- light response;
- depth role: behind subject / scene / foreground lens;
- end-of-life transformation.

Particle examples must remain semantically distinct:

- Star: razor-like crystal shards + gold dust + refracted micro-prisms.
- Heart: tiny heart fragments + petal-like crystal flakes + vine dust.
- Lotus: water droplets + pollen light + butterflies + falling petal fragments.
- Cosmic Bloom: stellar dust + orbiting condensate + expanding crystalline plasma debris.
- Orbital Core: micro-meteor debris + charged dust + ring fragments.
- Crown: gemstones + dense gold motes + fine polishing dust.
- Wings: layered feathers + down-like microfibres + crystal feather chips.
- Portal: sucked dust + dimensional threads + boundary sparks + transiting debris.
- Phoenix: embers + hot ash + burning crystal feather fragments.
- Infinity: twin trail particles + metal/crystal construction dust + symmetry-breaking final motes.

---

## 9. Physical audio Bible

### 9.1 Causal audio graph

Audio is driven by animation/physics events, not by a parallel hand-timed soundtrack.

An event emits data such as:

`material + action + worldPosition + velocity + mass + impactForce + size + surface + distanceToCamera`.

The audio engine converts that event into layers selected by physical cause.

Example: giant wing flap

1. primary air displacement;
2. low-frequency pressure body;
3. primary feather friction;
4. secondary feather bed;
5. crystalline feather contact;
6. environment reflections/reverb.

Example: crystal fracture

1. structural crack;
2. large shard separation;
3. medium impacts;
4. micro-shard scatter;
5. near-camera fragment flybys;
6. pressure displacement;
7. late environmental decay.

### 9.2 Spatial rules

- HRTF/3D spatialization for moving emitters.
- Doppler used conservatively for fast flybys.
- High-frequency roll-off with distance and occlusion.
- Near-camera passes produce directional air detail.
- Behind-subject and offscreen emitters remain spatially intelligible.
- Reverb responds to the chosen virtual acoustic profile, not a permanent hall preset.

### 9.3 Dynamic range

Silence and quiet detail are design tools.

The intended contour is often: quiet detail → pressure growth → physical peak → natural decay → silence, but the exact envelope must be unique per gift.

The mix must preserve delicate micro-events before loud peaks. Loudness normalization must not crush the event into constant intensity.

### 9.4 Audio acceptance test

With eyes closed, a tester should be able to infer the broad physical sequence of the gift. If the audio could be moved to another gift without sounding wrong, it fails.

---

## 10. Livestream interaction compositor

Gift Runtime V2 must support four compositing depth planes:

1. **Far environment** — atmospheric light, distant objects, world glow.
2. **Behind streamer** — objects/debris that pass behind the segmented person.
3. **In front of streamer** — hero objects and particles that overlap the subject.
4. **Lens foreground** — near-camera debris, bloom, distortion, droplets, heat, dust.

### 10.1 Required stream reactions

Depending on the gift, the compositor can drive:

- localized exposure/light spill;
- colored rim light approximation on the subject mask;
- reflections/highlight overlays;
- refractive distortion;
- heat haze;
- volumetric shafts;
- depth-aware fog;
- pressure-wave image displacement;
- particle occlusion;
- temporary environment tint;
- virtual lens droplets/dust only when physically motivated.

### 10.2 Safety rules

- Never obscure the streamer’s face for long continuous periods.
- A full-frame flash must remain short and accessibility-aware.
- Reduced-motion mode preserves story but removes aggressive camera shake and extreme near-lens acceleration.
- Photosensitivity-safe mode limits flash frequency and peak contrast.

---

## 11. Gift Runtime V2 architecture

The existing gift engine is **Legacy V1**. It remains available only as a compatibility path until V2 reaches parity. New cinematic work must target V2 rather than adding more generic effects to V1.

### 11.1 Core modules

**GiftDefinition**  
Immutable identity, tier, duration range, palette, material passports, signature rule and forbidden similarities.

**StoryGraph**  
Named cinematic beats with dependencies and event triggers. It replaces a single normalized “progress” function as the primary authoring model.

**ShotDirector**  
Owns camera shots, focus, lens, transitions, camera inertia and near-camera events.

**AnimationDirector**  
Rig, skeletal/constraint animation, morphs, assembly, transformations and state transitions.

**PhysicsWorld**  
Rigid bodies, constraints, forces, wind, pressure, collision and deterministic simulation.

**MaterialLab**  
Shared physically based material primitives with per-gift material passports.

**ParticleDirector**  
GPU particle families, force fields, depth layers and collision response.

**LightDirector**  
Gift-emitted lights, volumetrics and stream-reactive lighting cues.

**StreamCompositor**  
Segmentation/depth masks, behind/in-front composition, video distortion and light interaction.

**PhysicalAudioEngine**  
Consumes causal animation/physics events and renders material/air/creature/environment sound spatially.

**HapticsDirector**  
Maps selected physical impacts/heartbeats/pressure moments to supported device haptics. No continuous buzzing.

**QualityGovernor**  
Adapts rendering cost without deleting signature story beats.

**GiftTelemetry**  
Frame time, dropped frames, asset latency, audio desync, GPU memory and fallback reason.

### 11.2 Event contract

Visual, physics, audio and haptic systems communicate through semantic events, for example:

```text
PHYSICS_IMPACT
  material=crystal
  mass=0.42
  impulse=8.7
  position=(x,y,z)
  velocity=(x,y,z)

WING_FLAP
  creature=phoenix
  area=large
  angularVelocity=...
  cameraDistance=...

PORTAL_PRESSURE_CHANGE
  deltaPressure=...
  radius=...
  direction=inward
```

This prevents visual motion and sound from drifting apart.

---

## 12. Performance and quality strategy

The artistic target is authored at cinematic master quality. Runtime quality is then adapted to hardware.

### 12.1 Targets

- 120 FPS render target on capable high-refresh hardware.
- Stable 60 FPS is the minimum premium runtime target for ordinary supported devices.
- Simulation uses fixed/deterministic stepping where needed so story and audio timing do not change with frame rate.
- Audio clock is authoritative for tightly synchronized critical cues.

### 12.2 Adaptive degradation order

When performance is insufficient, reduce in this order:

1. invisible/offscreen particle count;
2. secondary particle resolution;
3. volumetric sample count;
4. reflection update frequency;
5. shadow resolution for non-hero lights;
6. non-critical mesh LOD;
7. post-processing sample quality.

Never remove:

- story beats;
- signature transformation;
- signature climax;
- hero silhouette;
- causal audio event;
- required stream interaction;
- ending gesture.

### 12.3 Loading

- preload manifest per gift;
- compressed textures and geometry;
- asynchronous decode;
- shader warm-up before playback where possible;
- no network fetch inside a critical playback beat;
- deterministic fallback if one optional effect is unavailable.

---

## 13. Twenty gift identity passports

These are identity constraints, not finished animation timelines. Detailed shot-by-shot production begins only after Gift Runtime V2 is implemented.

| Gift | Core verb | Motion signature | Camera identity | Physical climax | Ending identity |
|---|---|---|---|---|---|
| Crystal Star | fracture → reverse-assemble | extreme linear speed changing into precise shard convergence | comet chase + shard macro + hero pullback | giant crystal resonance/pressure wave through completed star | star becomes progressively finer refracted dust; one clean distant point remains |
| Crystal Heart | grow → pulse → release | organic vine growth and mass-driven heartbeat deformation | intimate macro + breathing push/pull linked to beats | final heartbeat throws a physical field of miniature hearts/petals through depth | heartbeat decays; last crystal resonance disappears |
| Eternal Lotus | seed → grow → bloom | water-led growth, petal articulation, butterfly emergence | water-surface macro rising into elegant reveal | radiant core opens and vertical air/light column lifts droplets/petals | quiet falling petals + final butterfly near lens |
| Cosmic Bloom | attract → compress → bloom | orbital gravitational compression into large radial celestial flower | accelerating orbital parallax, then locked silence before wide reveal | physical supernova-like pressure release without generic explosion styling | large-scale debris becomes distant stardust/galaxy drift |
| Orbital Core | orbit → stop → crack → reveal | mechanical celestial orbit with abrupt total stop | multi-body tracking and close core inspection | three distinct structural cracks release pressure and expose miniature universe | inward collapse/suction into a tiny dormant core |
| Royal Crown | descend → lock → liquefy | dense gold mechanics and precision gemstone seating | luxury macro product-cinema transformed into vertical hero reveal | crown arrests after rapid fall, displacing air; energy travels through seated gems | structure melts into heavy liquid gold while gems escape upward |
| Divine Wings | feather → assemble → open → flap | articulated feather layering with aerodynamic lag | wide stereoscopic expansion after tactile feather macros | one enormous recognizable wing flap moves the entire environment | air decays while thousands of feathers leave at different depths; one remains |
| Portal of Infinity | crack → construct → pull → collapse | spatial distortion and inward force fields | lens approaches boundary, partial dimensional crossing, acoustic/visual snapback | maximum suction and expansion alters stream geometry | hard inward WHOOMP and rapid mechanical ring locks |
| Phoenix Rebirth | ember → egg → hatch → fly → rebirth | living articulated creature flight with independent wing/tail inertia | chase, orbit, behind-streamer pass, near-lens flyby and hover | supernatural fire release caused by phoenix drawing its own flame inward | fire dies to embers; tiny newborn chirp/ember establishes rebirth |
| Infinity | dual orbit → construct → collide → propagate | two bodies generate a figure-eight structure under rising mechanical stress | symmetric tracking that intentionally breaks symmetry near collision | central impact launches two audible/visible waves through both loops | structure atomizes; final two particles meet with one tiny crystal contact |
| Lumen Leviathan | condense → breach → swim → dive | enormous airborne aquatic body carried by a moving water/air envelope | low waterline macro → body chase → behind-streamer crossing → near-lens tail pass | leviathan breaches through a suspended water membrane and throws a real sheet of droplets/air across the scene | creature dives into a liquid plane that closes through concentric ripples |
| Gravity Cathedral | invert → assemble → inhabit → release | architectural masses fall upward and lock into impossible ivory/gold vaults | vertical tilt, corridor dolly and impossible-perspective reveal | local gravity reverses; loose stream particles and cathedral fragments hang above the viewer while the nave fully locks | gravity normalizes and architecture folds upward into a thin luminous horizon line |
| Hourglass Rift | collect → reverse → fracture-time → restore | grains flow against gravity while nearby motion is temporally offset | extreme sand macro → time-slice lateral track → frozen wide shot | the hourglass turns without rotating; all grains reverse simultaneously and a visible temporal wave crosses the stream | time slices snap back into one present moment; last grain lands physically |
| Aurora Serpent | trace → materialize → coil → shed | long articulated spline body with muscular travelling waves and scale lag | head tracking, body parallax, coil-through-depth and scale-level macro | serpent coils around near-camera space and sheds a travelling aurora through every scale | it uncoils into a ribbon of light and physically slips behind the streamer into distance |
| Moonfall | approach → tide → eclipse → recede | massive slow celestial translation contrasted by fast gravitational micro-debris | telephoto compression → ground-level parallax → eclipse silhouette → immense pullback | lunar body produces a tidal lift: dust, droplets and loose particles rise toward it while the stream enters a pearlescent eclipse | moon recedes at impossible scale; suspended particles fall back with delayed gravity |
| Prism Tempest | nucleate → storm → freeze → refract | weather-scale turbulence with crystal rain and curved wind fields | storm-front push-in → rain-lens macro → frozen 360° reveal | all rain freezes around the viewer, then one pressure front turns the suspended field into a moving spectrum | storm evaporates into mist; one final physical droplet slides off the virtual lens |
| Quantum Garden | fold → tessellate → inhabit → refold | rigid origami-like planes become flowers/bridges/terrain without biological growth | surface macro → topological fly-through → miniature landscape wide | hundreds of folded crystal planes change topology at once, opening walkable impossible geometry around the streamer | every plane refolds in reverse order into one tiny faceted tile |
| Chronos Engine | gear → engage → desynchronize → release | heavy precision mechanics with nested clocks moving at different physical rates | gear-tooth macro → axial tunnel → mechanical orbit → locked frontal reveal | central clutch engages and splits stream particles into several time-rate bands before releasing them together | mechanism brakes tooth by tooth; final escapement click stops everything cleanly |
| Solar Voyager | streak → deploy → surf → horizon | high-speed craft motion plus huge flexible light-sail deformation | distant pursuit → sail deployment side-pass → near-camera hull rush → long horizon chase | sails catch a visible pressure front of light, deform under load and slingshot the craft past the viewer | craft becomes a hot point on the horizon while its wake reaches the camera seconds later |
| Celestial City | seed-grid → erect → awaken → compress | kilometer-scale architecture telescopes vertically while bridges and light routes activate sequentially | aerial master → street-level plunge → window pass → skyline rise | the completed floating city wakes district by district and bends perspective around the streamer without a generic blast | towers telescope into streets, streets into a grid, grid into a single luminous glass cube |

### 13.1 Forbidden cross-gift similarities

- Phoenix may not use Star’s shard-assembly climax.
- Star may not use Phoenix’s fire-release ending.
- Crown may not collapse like Portal.
- Portal may not dissolve into generic glitter.
- Lotus may not use Cosmic Bloom’s supernova pressure profile.
- Infinity may not use Orbital Core’s three-crack reveal.
- Wings may not use an explosion as its climax; its climax is aerodynamic.
- Heart may not use a generic radial blast without heartbeat causality.
- Lumen Leviathan may not fly with bird/wing kinematics and may not end in fire.
- Gravity Cathedral and Celestial City may share architecture materials but not assembly direction, camera grammar or ending mechanism.
- Hourglass Rift and Chronos Engine may share the theme of time but never the same time effect: one is granular/temporal refraction, the other mechanical/rate segmentation.
- Aurora Serpent may not use Phoenix wing/flyby choreography.
- Moonfall must derive spectacle from scale/tidal gravity, not fracture or explosion.
- Prism Tempest must remain a weather system, not a generic particle burst.
- Quantum Garden uses folding topology, never Lotus-style organic growth.
- Solar Voyager's climax is light-pressure propulsion, not creature flight or explosion.
- Celestial City must preserve readable architectural scale and cannot collapse like Portal.

---

## 14. Authoring pipeline for every gift

No 3D production starts with “make a pretty model.” Each gift passes these gates in order.

### Gate 1 — Story treatment

Deliverables:

- one-sentence emotional promise;
- seven dramatic functions;
- signature physical rule;
- unique climax;
- unique ending;
- “never do” list.

### Gate 2 — Beat sheet

Deliverables:

- second-by-second action map;
- no-dead-time coverage;
- causal chain per major action;
- stream interaction points;
- silence/contrast moments.

### Gate 3 — Previsualization

Deliverables:

- rough camera blocking;
- silhouette/scale check;
- streamer occlusion check;
- readable action at phone size;
- first performance budget.

### Gate 4 — Asset/rig/physics production

Deliverables:

- hero asset;
- material passports;
- rig/constraints;
- collision proxies;
- particle families;
- physics force fields.

### Gate 5 — Cinematic animation

Deliverables:

- primary/secondary/tertiary motion;
- shot choreography;
- focus/lens choreography;
- climax timing;
- authored exit.

### Gate 6 — Physical sound design

Deliverables:

- causal sound event map;
- material layers;
- spatial trajectories;
- environmental reverb response;
- loudness/dynamic-range validation;
- explicit check: no music.

### Gate 7 — Stream composite

Deliverables:

- foreground/background crossings;
- subject mask interaction;
- light spill;
- distortion/pressure response;
- accessibility variants.

### Gate 8 — Performance mastering

Deliverables:

- high/medium/low technical profiles;
- 120/60 FPS validation where hardware permits;
- loading budget;
- memory budget;
- thermal/mobile test;
- fallback behavior.

### Gate 9 — Quality review

The gift is rejected if any acceptance rule below fails.

---

## 15. Automated and human acceptance criteria

### 15.1 Automated validators

Gift Runtime V2 should provide tests for:

- all seven story functions declared;
- no activity gap > 1.0 second;
- no forbidden music cue type;
- every major audio cue linked to a semantic physical/animation event;
- distinct camera-shot fingerprint across the ten signature gifts;
- distinct climax type across the ten signature gifts;
- distinct ending type across the ten signature gifts;
- required depth-plane interaction for Epic/Legendary tiers;
- no long face occlusion;
- deterministic replay event order;
- asset manifest complete before playback;
- quality fallback never removes signature beats;
- audio/visual sync drift stays inside strict tolerance.

### 15.2 Human review questions

1. With the model hidden, does the motion itself communicate the gift’s identity?
2. Does every second contain a purposeful change?
3. Does the camera make the viewer feel physically present?
4. Can the viewer understand the broad story with audio only?
5. Does the stream itself visibly react?
6. Does the climax arise from the gift’s physics/story rather than a generic effect?
7. Is the ending memorable and specific?
8. Does it remain readable on a phone?
9. Does it still feel premium without maximum particle density?
10. Would any 2-second segment be mistaken for a different SYLORA gift? If yes, redesign it.

---

## 16. Definition of Done — one gift

A gift is **100% complete** only when:

- story treatment approved against this Bible;
- beat sheet has no dead time;
- all hero assets/rig/materials are final;
- primary/secondary/tertiary animation is final;
- physics interactions are stable and deterministic enough for sync;
- camera language is unique;
- stream depth interaction works;
- particles are gift-specific;
- physical-only audio is spatial and causally synchronized;
- haptics are mapped where supported;
- accessibility modes work;
- high/medium/low runtime profiles preserve the same story;
- automated validators pass;
- phone/tablet/desktop visual QA passes;
- final video capture is reviewed from beginning to end, not only still frames;
- no known placeholder asset, generic climax, generic ending or fake interaction remains.

“It renders” is not completion. “It looks beautiful in one frame” is not completion.

---

## 17. Migration policy from Legacy V1

1. Freeze creation of new V1 gifts.
2. Keep V1 only so the existing project remains functional during migration.
3. Build Gift Runtime V2 foundations and validators first.
4. Produce one vertical-slice gift through all nine authoring gates to validate the system.
5. Only after the vertical slice passes, rebuild the remaining nineteen gifts from zero against their identity passports.
6. Do not port old motion curves merely because an old gift already exists.
7. Reuse an old visual asset only when it independently passes the new material/rig/quality requirements.
8. Remove V1 playback only after V2 covers all twenty gifts and the fallback path is verified.

---

## 18. First V2 production milestone

The first milestone is **not another gift**. It is the engine foundation:

- StoryGraph + semantic event bus;
- ShotDirector;
- deterministic PhysicsWorld interfaces;
- ParticleDirector with gift-specific families;
- LightDirector;
- four-plane StreamCompositor;
- PhysicalAudioEngine driven by semantic events;
- QualityGovernor;
- activity/uniqueness/audio-causality validators;
- profiling and telemetry.

Only after this milestone is validated should the first V2 gift enter full production.

---

## 19. North-star statement

**A SYLORA gift is a living cinematic event with its own physical laws, camera language, sound identity and relationship to the streamer. It must be recognizable through motion and sound alone, never depend on generic spectacle, and never contain an empty second.**

This document is the source of truth for all future SYLORA gift design and engineering decisions.
