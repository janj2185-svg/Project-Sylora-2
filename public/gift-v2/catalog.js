export const GIFT_V2_PASSPORTS=Object.freeze([
  ['crystal-star','Crystal Star','fracture-reverse-assemble','comet-chase-macro-pullback','crystal-pressure-resonance','refracted-dust-point'],
  ['crystal-heart','Crystal Heart','grow-pulse-release','intimate-beat-pushpull','causal-final-heartbeat','heartbeat-decay-resonance'],
  ['eternal-lotus','Eternal Lotus','seed-grow-bloom','water-macro-rising-reveal','core-updraft-column','petals-final-butterfly'],
  ['cosmic-bloom','Cosmic Bloom','attract-compress-bloom','orbital-parallax-locked-wide','celestial-pressure-bloom','distant-stardust-drift'],
  ['orbital-core','Orbital Core','orbit-stop-crack-reveal','multibody-track-core-inspect','three-structural-cracks','inward-dormant-core'],
  ['royal-crown','Royal Crown','descend-lock-liquefy','luxury-macro-vertical-hero','air-arrest-gem-energy','heavy-liquid-gold-gems'],
  ['divine-wings','Divine Wings','feather-assemble-open-flap','tactile-macro-stereo-wide','single-aerodynamic-flap','depth-feathers-single-remain'],
  ['portal-infinity','Portal of Infinity','crack-construct-pull-collapse','boundary-approach-cross-snap','maximum-dimensional-suction','whoomp-mechanical-locks'],
  ['phoenix-rebirth','Phoenix Rebirth','ember-egg-hatch-fly-rebirth','chase-orbit-behind-nearlens-hover','inward-fire-release','embers-newborn-chirp'],
  ['infinity','Infinity','dual-orbit-construct-collide','symmetry-track-break','dual-loop-propagation-impact','two-particle-contact'],
  ['lumen-leviathan','Lumen Leviathan','condense-breach-swim-dive','waterline-chase-behind-tailpass','water-membrane-breach','liquid-plane-ripples'],
  ['gravity-cathedral','Gravity Cathedral','invert-assemble-inhabit-release','vertical-corridor-impossible-reveal','local-gravity-reversal','fold-to-horizon-line'],
  ['hourglass-rift','Hourglass Rift','collect-reverse-fracturetime-restore','sand-macro-timeslice-frozenwide','global-grain-reversal','last-grain-present'],
  ['aurora-serpent','Aurora Serpent','trace-materialize-coil-shed','head-track-coil-depth-scale-macro','travelling-scale-aurora','ribbon-slip-behind'],
  ['moonfall','Moonfall','approach-tide-eclipse-recede','telephoto-ground-eclipse-pullback','tidal-particle-lift','delayed-gravity-return'],
  ['prism-tempest','Prism Tempest','nucleate-storm-freeze-refract','storm-push-rainmacro-frozen-orbit','frozen-rain-spectrum-front','single-lens-droplet'],
  ['quantum-garden','Quantum Garden','fold-tessellate-inhabit-refold','surface-topology-flythrough-wide','topology-switch','single-faceted-tile'],
  ['chronos-engine','Chronos Engine','gear-engage-desync-release','gear-macro-axial-orbit-frontal','time-rate-clutch','escapement-stop'],
  ['solar-voyager','Solar Voyager','streak-deploy-surf-horizon','pursuit-sidepass-hullrush-horizon','light-pressure-slingshot','delayed-wake'],
  ['celestial-city','Celestial City','seedgrid-erect-awaken-compress','aerial-street-window-skyline','district-awakening-perspective','city-to-glass-cube']
].map(([id,name,motion,camera,climax,ending])=>Object.freeze({id,name,motion,camera,climax,ending})));

export const giftPassport=id=>GIFT_V2_PASSPORTS.find(x=>x.id===id)||null;
