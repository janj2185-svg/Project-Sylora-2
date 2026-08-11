/** Overlay trigger plans for automation / browser source (existing obs-overlay.html). */
export function planOverlayTrigger({ overlayId = 'default', payload = {} } = {}) {
  return {
    action: 'overlay_trigger',
    overlayId,
    payload,
    target: '/obs-overlay.html',
    status: 'planned'
  };
}
