/** Feature flags — env + per-user overrides. No decorative toggles. */

const DEFAULTS = Object.freeze({
  universal_command: true,
  action_engine_execute: true,
  memory_center: true,
  spaces_adapter: true,
  events_calendar: true,
  creator_marketplace: false,
  mini_apps: false,
  family_safety: false,
  passkeys_2fa: false,
  semantic_embeddings: !!process.env.SYLORA_EMBEDDING_PROVIDER,
  live_ai_copilot: true,
  realtime_translation: true,
  honesty_labels: true,
  daily_brief: true,
  intelligent_inbox: true,
  context_engine: true,
  canvas_workspace: true,
  content_history: true,
  skills_system: true
});

export function resolveFlags(overrides = {}) {
  const out = { ...DEFAULTS };
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === 'boolean' && k in out) out[k] = v;
  }
  // Env kill-switches
  if (process.env.SYLORA_FF_MARKETPLACE === '1') out.creator_marketplace = true;
  if (process.env.SYLORA_FF_FAMILY === '1') out.family_safety = true;
  if (process.env.SYLORA_FF_2FA === '1') out.passkeys_2fa = true;
  return out;
}

export function isEnabled(flags, name) {
  return !!flags?.[name];
}
