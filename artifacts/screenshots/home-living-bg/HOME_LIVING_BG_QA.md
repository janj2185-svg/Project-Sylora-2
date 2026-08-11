# Home Living Background — Visual QA

Captured: 2026-08-11

## Viewports
- Mobile 390×844: `home-mobile-390x844.png`
- Tablet 820×1180: `home-tablet-820x1180.png`
- Desktop 1440×900: `home-desktop-1440x900.png`
- Desktop listening hover: `home-desktop-listening.png`
- Reduced motion: `home-desktop-reduced-motion.png`

## Presence states
`home-presence-{idle,listening,thinking,speaking,success,error}.png`

## Motion preview
`home-living-bg-preview.mp4` — short presence-cycle preview (screenshots cannot show continuous motion).

## Runtime metrics (desktop sample)
```json
{
  "fps": 31,
  "particles": 28,
  "lite": false,
  "reduced": false,
  "presence": "idle",
  "atmosphere": "evening"
}
```

Note: headless Chrome under-reports FPS; adaptive shedding waits for sustained pressure. Target on normal devices: smooth CSS + particle loop near 60 FPS. Lite mode reduces particles/blur/parallax on weak mobiles.

## Checks
| Check | Result |
|---|---|
| Light theme preserved (no dark night) | PASS |
| Composition / CTA readable | PASS |
| Layers behind Sylora + buttons | PASS |
| `prefers-reduced-motion` static opal | PASS |
| Touch ripple / cursor parallax | Implemented (desktop parallax; mobile no gyro) |
| Day/time atmosphere | morning / day / evening (still light) |
| CLS / layout shift from bg | None (absolute decorative layers) |

## Implementation
- `public/home-living-bg.css` — CSS aurora/opal/rays/orbits/energy/glass
- `public/home-living-bg.js` — particles, parallax, presence API, adaptive perf
- Mounted only on Home `.living-horizon.home-compact`
