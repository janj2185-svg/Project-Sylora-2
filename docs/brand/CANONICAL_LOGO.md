# SYLORA canonical logo lock

## Production source of truth

- Repository file: `public/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png`
- Public URL: `/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png`
- Dimensions and colour space: 1100 × 650 px, sRGB PNG
- SHA-256: `dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08`

The approved Living Horizon shell also uses two locked transparent exports so
the identity is never clipped inside responsive navigation:

- Full lockup: `/assets/brand/sylora-canonical-lockup.png`, 976 × 569 px,
  SHA-256 `061430e7d2fceefb660d049838603cffc0f30433a704dd3eb239b9f59e57fa50`
- Symbol: `/assets/brand/sylora-canonical-symbol.png`, 310 × 395 px,
  SHA-256 `9975f9f178eee4cf747f258e68d268ef512b4786342aee45bf932e8a2f941df1`

These are owner-approved raster exports from the Living Horizon reference,
not reconstructed SVG or CSS geometry. Desktop and open mobile navigation use
the full lockup; compact tablet and mobile headers use the symbol.

The file is a byte-for-byte copy of
`SYLORA_FINAL_LOCKED_REDESIGN_PACKAGE/assets/brand/SYLORA_CANONICAL_LOGO_MASTER.png`.
The package checksum and the copied repository asset were independently compared
before integration.

## Locked identity

The image contains the owner-approved black four-point crystalline symbol,
champagne-gold luminous centre, geometric `SYLORA` wordmark, star detail inside
the `A`, and the tagline `YOUR AI. YOUR WORLD. YOUR LEGACY.` These elements and
their relative geometry are indivisible in the canonical master.

Do not redraw, trace, simplify, recolour, stretch, crop, replace, or reproduce
the symbol or wordmark in SVG, CSS, a font, or another image. UI surfaces must
reference one of the three locked public URLs above. A further derivative may
be introduced only through a separate, documented generation process with an
explicit visual overlay review; it must never replace or mutate the master.

## Verification

Run `node --test tests/canonical-brand.test.mjs`. The test verifies the asset
digest and dimensions, checks the shell and favicon contracts, and scans web UI
sources for logo-like asset references that do not resolve to the approved URL.
