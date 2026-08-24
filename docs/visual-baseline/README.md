# SYLORA visual baseline evidence contract

Current repository state: **`NOT_CAPTURED`**.

This is an explicit pre-gate, not a visual-baseline pass. The final candidate gate remains closed until one successful, pinned browser run produces and promotes all 44 required PNGs plus a validated `manifest.json`. No screenshot is approved merely because it exists, and `CANDIDATE_RESTORED_BASELINE` is not owner approval or production readiness.

## Canonical candidate matrix

The candidate root is:

```text
docs/visual-baseline/candidate/
```

Every screenshot path is fixed:

```text
docs/visual-baseline/candidate/<surface>/<viewport>/uk.png
```

The 11 required surfaces are:

1. `home`
2. `live`
3. `studio`
4. `sylora`
5. `inbox`
6. `profile`
7. `settings`
8. `create-hub-open`
9. `live-create`
10. `clips-create`
11. `video-create`

The four fixed capture contexts are:

| Viewport ID | CSS viewport | DPR | Input mode |
|---|---:|---:|---|
| `390x844` | 390 × 844 | 1 | touch |
| `768x1024` | 768 × 1024 | 1 | touch |
| `1366x900` | 1366 × 900 | 1 | mouse |
| `1920x1080` | 1920 × 1080 | 1 | mouse |

This produces exactly **11 × 4 = 44 PNGs**, all in Ukrainian (`uk`). Full-page PNG width must equal the physical viewport width at the recorded DPR; height may exceed, but may not be shorter than, the viewport.

## Promotion rules

Rendering and promotion are deliberately separate. The browser job may record what it observed, but it cannot declare its own workflow successful before the workflow reaches a terminal state.

The pinned runner must:

- clear stale repeat artifacts before capture, then start both passes from independent copies of the same fixed fixture;
- freeze browser time and seeded randomness;
- install one persistent capture-only stylesheet in every navigated document that disables CSS animations, transitions and smooth scrolling and hides editable carets; verify its exact text plus computed coverage, then capture with Playwright `animations: 'allow'` and `caret: 'initial'` so Playwright cannot mutate and restore compositor state around individual frames; this is static reduced-motion evidence for deterministic capture and does not change or certify production motion;
- require zero transient press ripples and an empty Web Animations graph before the pre-open paint fence and again after each surface opens, before its canonical evidence pipeline begins;
- wait for the capability state, `document.fonts.ready`, DOM images and CSS background images; decode failures are fatal and every canonical brand raster must retain its locked 1100 × 650 intrinsic dimensions;
- run a fixed pre-open asset/paint fence before capture-only overlays are opened, so a backdrop filter cannot sample an undecoded canonical CSS background;
- launch headless with no browser channel or custom executable; hard-pin `PLAYWRIGHT_LEGACY_SCREENSHOT=1` in the isolated visual child process so Playwright omits `CDPScreenshotNewSurface`, then use browser-level CDP to prove the pinned `chromium-headless-shell` distribution, revision and executable, require `--disable-field-trial-config`, and reject any runtime `--enable-features` entry that enables `CDPScreenshotNewSurface`;
- record the exact rendered head commit, verified browser fingerprint including `screenshotBackend = legacy-force-redraw`, Playwright/Chromium versions, runner OS/image, font family, DPR and input mode without persisting the absolute executable path; this backend pin is capture-only and changes no production UI, motion or composition;
- keep Playwright's primary session out of touch ownership (`hasTouch: false`), then use one retained CDP session to reset and apply Chromium's mobile touch profile immediately before every navigation;
- after navigation, require the real document to report exactly `navigator.maxTouchPoints = 1`, primary coarse pointer and no primary hover for every mobile screenshot, without a `Navigator` or `matchMedia` JavaScript shim;
- dispatch a direct CDP touch sequence and record trusted `touchstart` plus trusted `PointerEvent.pointerType = touch` evidence for every mobile screenshot; this proves the configured Chromium emulation and input path, not physical/native hardware;
- produce exactly 44 unique canonical paths in each pass;
- require the visible canonical target rectangles to be non-overlapping, preserve every exact inline style, hide all targets without changing layout, and take two hidden full-page frames whose canonical target crops are byte-identical;
- derive every target crop from both hidden frames, require the paired crops to match, then restore every exact inline style and require the original canonical geometry, visibility and asset predicates to match;
- never use a tight-clip screenshot as the exact oracle for a full-page crop: the locked shell uses `backdrop-filter`, and Chromium legitimately samples a different compositor boundary for tight clips;
- after exact style restoration, prove scroll origin plus canonical geometry, visibility and source state before two fixed discarded full-page paint-fence frames; these are a fixed compositor fence, not a claim of universal convergence, retries or candidates for selection; because those reads can flush layout and rebuild composited backdrop layers, no DOM/layout/scroll probe may run between the first warmup and final frames A and B; take every frame across only fixed compositor-frame boundaries with no retry or cherry-picking, require A and B to be byte-identical, re-check canonical state after B, require locked canonical contrast and require every visible canonical crop to differ from its stable hidden crop, then persist only B;
- record the fail-closed compositor proof and screenshot backend in raw capture schema 7 and propagate that required provenance into promoted manifest schema 3; then re-read every PNG from disk, verify its recorded SHA-256 and dimensions, and prove that all 44 persisted digests match between independent capture and repeat passes.

A raw PNG is written only after its runtime profile, diagnostics and in-memory screenshot have passed. Failed runs that reach Playwright teardown retain only the successfully validated subset, mark `metadata.json` as `INCOMPLETE_VISUAL_CAPTURE`, and omit `capture-metadata.json`. An abrupt worker termination may leave `metadata.json` absent instead. Both states are non-promotable. On an A/B mismatch, visual diagnostics retain the already-captured raw A and B frames, their digests and viewport context, plus the later catch screenshot and capability-only JSON; no retry frame or credential-bearing Playwright trace is produced.

The raw capture directory contains exactly the 44 PNGs plus two non-promotable sidecars:

```text
tmp/visual-candidate/metadata.json
tmp/visual-candidate/capture-metadata.json
```

`capture-metadata.json` must say:

```text
sourceRun.conclusion = pending-terminal-verification
```

It is intentionally rejected by the final manifest validator. The `if: always()` artifact upload therefore cannot turn a failed or interrupted workflow into promotable evidence.

Only after an authoritative GitHub Actions read shows that the exact run is terminal with `conclusion: success` may an operator create a separate verified-run record. The record has this exact shape:

```json
{
  "provider": "github-actions",
  "id": 123456789,
  "attempt": 1,
  "url": "https://github.com/OWNER/REPO/actions/runs/123456789",
  "conclusion": "success",
  "headSha": "0123456789abcdef0123456789abcdef01234567"
}
```

The run ID, run attempt, URL and head SHA must match the raw sidecar exactly. GitHub keeps the same run ID across reruns but increments `GITHUB_RUN_ATTEMPT`, so evidence from different attempts may not be paired. Use the artifact’s explicit PR head SHA throughout; do not substitute the `pull_request` event’s synthetic merge SHA from `$GITHUB_SHA`.

## Capture, terminal verification and promotion

Generate runner-owned evidence in two isolated browser passes:

```bash
npm run test:e2e:visual
```

The first pass writes `tmp/visual-candidate/`; the second writes `tmp/visual-repeat/`. Both start from the same immutable seed in different data files. A local run is diagnostic only because it has no GitHub terminal-run provenance.

GitHub uploads both directories as `sylora-visual-candidate-<head-sha>-attempt-<run-attempt>` so a rerun cannot be confused with an earlier attempt.

Inspect the repository pre-gate without changing it:

```bash
node scripts/build-visual-manifest.mjs status
```

After downloading the exact-head artifact and independently verifying its GitHub Actions run, set the explicit head SHA and keep the verified-run JSON outside the raw capture directory:

```bash
HEAD_SHA=0123456789abcdef0123456789abcdef01234567

node scripts/build-visual-manifest.mjs finalize \
  --metadata tmp/visual-candidate/capture-metadata.json \
  --verified-run tmp/verified-run.json \
  --output tmp/visual-finalized-metadata.json \
  --expected-commit "$HEAD_SHA"
```

`finalize` refuses failed, non-terminal, mismatched or malformed run records and refuses to overwrite an existing output file.

Promote only through the source adapter:

```bash
node scripts/build-visual-manifest.mjs promote \
  --source tmp/visual-candidate \
  --metadata tmp/visual-finalized-metadata.json \
  --candidate docs/visual-baseline/candidate \
  --expected-commit "$HEAD_SHA"
```

`promote` verifies both source sidecars, their pairing with the finalized run, the raw report’s canonical 44 paths and digests, and the current PNG bytes. It copies only the 44 PNGs into a new temporary candidate, builds and validates `manifest.json`, then atomically renames the directory. It refuses extra raw files and refuses to overwrite any existing candidate directory.

The non-negotiable final gate is:

```bash
node scripts/build-visual-manifest.mjs validate \
  --candidate docs/visual-baseline/candidate \
  --expected-commit "$HEAD_SHA"
```

`validate` exits successfully only when:

- the candidate directory contains exactly the 44 expected PNGs and one `manifest.json`;
- the manifest status is `CANDIDATE_RESTORED_BASELINE`;
- every matrix entry is present once, in canonical order;
- every file dimension and SHA-256 matches the current bytes;
- the browser metadata identifies the pinned Playwright `chromium-headless-shell` distribution, revision, normalized executable and `legacy-force-redraw` screenshot backend proven at runtime;
- all run, fixture, locale, font, DPR and input metadata is complete and internally consistent.

Run the contract tests independently with:

```bash
node --test tests/visual-baseline-contract.test.mjs
```

While the repository is `NOT_CAPTURED`, the state test passes only by proving that zero candidate PNGs exist and all 44 are missing. The separate final-completeness test is explicitly **skipped**, not passed. Any partial capture changes the state to `INCOMPLETE` and fails the test suite. Once the candidate exists, the skip disappears and all 44 files, dimensions and digests must validate.

Manual visual QA and explicit owner approval remain separate gates. Do not rename this candidate to `approved`, merge it, or deploy it based only on automated manifest validation.
