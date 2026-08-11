/** Battles remain in ecosystem/live-entertainment — no duplicate scoring engine. */
export function battlesBridgeNote() {
  return {
    classic: 'POST /api/live/:id/resonance',
    battles2: '/api/live/battles*',
    note: 'SYLORA LIVE automation may notify on battle_event; scoring stays in existing LIVE entertainment module.'
  };
}
