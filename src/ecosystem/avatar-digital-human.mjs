/**
 * Sylora Digital Human architecture — server-side source of truth for migration status.
 * Does not invent assets. Reports ASSET_REQUIRED when no VRM/GLB is present.
 */

export const DIGITAL_HUMAN_SPEC = Object.freeze({
  preferredFormats: ['vrm', 'glb'],
  acceptedFormats: ['vrm', 'glb', 'gltf'],
  rejectedAsProduction: ['fbx-only-without-runtime', 'obj', 'png-sprite-sheet'],
  skeleton: [
    'Hips', 'Spine', 'Chest', 'Neck', 'Head',
    'LeftShoulder', 'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
    'RightShoulder', 'RightUpperArm', 'RightLowerArm', 'RightHand',
    'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot',
    'RightUpperLeg', 'RightLowerLeg', 'RightFoot'
  ],
  handBonesPreferred: true,
  eyeBones: ['LeftEye', 'RightEye'],
  jawBone: 'Jaw',
  facialBlendshapesMinimum: [
    'blink', 'blinkLeft', 'blinkRight',
    'mouthSmile', 'mouthFrown', 'mouthOpen',
    'browInnerUp', 'browDownLeft', 'browDownRight',
    'eyeWideLeft', 'eyeWideRight',
    'cheekSquintLeft', 'cheekSquintRight',
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
    'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk',
    'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_sil'
  ],
  expressions: ['neutral', 'happy', 'sad', 'surprised', 'angry', 'caring', 'serious', 'thinking'],
  hair: 'bones_or_spring_secondary_motion',
  lod: ['HIGH', 'MEDIUM', 'MOBILE', 'LOW'],
  textureBudgetMobileMb: 12,
  triangleBudgetMobile: 45000,
  triangleBudgetDesktop: 120000,
  materials: 'PBR (baseColor, normal, roughness/metalness); avoid unoptimized 8K maps on mobile',
  proportions: 'natural adult female, non-cartoon, non-uncanny; Sylora brand: warm, soft, approachable',
  canonicalPaths: [
    '/assets/avatar/sylora-digital-human.vrm',
    '/assets/avatar/sylora-digital-human.glb'
  ]
});

export const RENDERER_PLAN = Object.freeze({
  primary: 'three.js (already vendored for gifts/Phoenix) + @pixiv/three-vrm when asset lands',
  alternative: 'React Three Fiber only if SPA migrates to React for avatar island; not required for current vanilla app.js',
  systems: [
    'AnimationMixer + clip crossfade state machine',
    'procedural breathing (chest/spine)',
    'head look-at / micro-saccades',
    'eye gaze bones',
    'blink schedule',
    'facial expression blend weight lerping',
    'gesture clip blending with cooldown (reuse GestureEngine intents)',
    'IK-ready hooks (TwoBoneIK later)',
    'secondary hair/cloth springs',
    'adaptive quality tiers (reuse QUALITY_TIERS contract)'
  ],
  pipeline: [
    'User/LIVE event',
    'Context Engine',
    'Sylora AI',
    'Emotion/Behavior Engine → structured behavior',
    'Voice/TTS (+ viseme timestamps when provider supports)',
    'AvatarController (renderer-agnostic)',
    'AvatarAdapter (2d-png | 3d-vrm)',
    'Renderer'
  ]
});

export const REUSABLE_FROM_2D = Object.freeze([
  'GestureEngine cooldown/randomization',
  'Living/Emotion state machine (livingStateFrom)',
  'structured AI behavior contract',
  'Voice Provider abstraction',
  'quality tiers + FPS adapt',
  'AI → behavior → voice → animation contract',
  'anti-jitter presence lock / onAudioDelta throttle',
  'mobile framing policy (viewport bands)',
  'conversational personality anti-helpdesk rules'
]);

export const MUST_REPLACE = Object.freeze([
  'PNG gesture plate crossfades as primary body animation',
  'CSS blink veil as eyelid system',
  'CSS gaze translate as eye bones',
  'amplitude brightness as lip-sync',
  'assembled portrait as digital-human renderer'
]);

/** Probe filesystem (Node) for digital-human assets. */
export function probeDigitalHumanAssets(fs, pathJoin, roots = ['public']) {
  const found = [];
  const missing = [...DIGITAL_HUMAN_SPEC.canonicalPaths];
  for (const root of roots) {
    for (const rel of DIGITAL_HUMAN_SPEC.canonicalPaths) {
      const file = pathJoin(root, rel.replace(/^\//, '').replace(/^assets\//, 'assets/'));
      // also try public + rel
      const candidates = [
        pathJoin(root, rel.replace(/^\//, '')),
        pathJoin(process.cwd(), 'public', rel.replace(/^\//, ''))
      ];
      for (const c of candidates) {
        try {
          if (fs.existsSync(c)) {
            found.push({ path: c, url: rel });
            const idx = missing.indexOf(rel);
            if (idx >= 0) missing.splice(idx, 1);
          }
        } catch {}
      }
    }
  }
  return {
    found,
    missing,
    status: found.length ? 'ASSET_PRESENT' : 'ASSET_REQUIRED'
  };
}

export function avatarArchitectureReport(fs = null, path = null) {
  let assets = { found: [], missing: [...DIGITAL_HUMAN_SPEC.canonicalPaths], status: 'ASSET_REQUIRED' };
  if (fs && path?.join) {
    assets = probeDigitalHumanAssets(fs, path.join);
  }
  return {
    modelStatus: assets.status,
    reusableFromCurrent2d: REUSABLE_FROM_2D,
    mustReplace: MUST_REPLACE,
    assets3dFound: assets.found,
    assets3dMissing: assets.missing,
    rendererPlan: RENDERER_PLAN,
    facialRigRequirements: DIGITAL_HUMAN_SPEC.facialBlendshapesMinimum,
    visemeRequirements: DIGITAL_HUMAN_SPEC.facialBlendshapesMinimum.filter(x => x.startsWith('viseme_')),
    animationRequirements: [
      'idle_neutral', 'idle_listening', 'idle_thinking',
      'speaking_* emotion variants',
      'gesture library mapped from GestureEngine intents',
      'procedural breath/blink/gaze always-on'
    ],
    digitalHumanSpec: DIGITAL_HUMAN_SPEC,
    agentCanImplementNow: [
      'AvatarAdapter interface + 2D fallback',
      '3D adapter stub + loader hooks',
      'behavior contract + voice settings',
      'mobile framing without 3D',
      'conversational naturalness harness',
      'AnimationMixer wiring once asset arrives'
    ],
    requiresNewAsset: [
      'humanoid VRM/GLB with blendshapes + eye/jaw bones',
      'authored idle/speak/gesture clips or retargetable Mixamo set',
      'mobile LOD + texture packs',
      'optional hair secondary bones'
    ]
  };
}
