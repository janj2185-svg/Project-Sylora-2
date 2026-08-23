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

- start both passes from independent copies of the same fixed fixture;
- freeze browser time and seeded randomness;
- wait for the capability state, `document.fonts.ready`, DOM images and CSS background images;
- record the exact rendered head commit, Playwright/Chromium versions, runner OS/image, font family, DPR and input mode;
- reapply the explicit Chromium touch override after every navigation and record a native `touchstart` plus `PointerEvent.pointerType = touch` probe for every mobile screenshot;
- produce exactly 44 unique canonical paths in each pass;
- prove that all 44 PNG SHA-256 digests match between capture and repeat.

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
- all run, fixture, locale, font, DPR and input metadata is complete and internally consistent.

Run the contract tests independently with:

```bash
node --test tests/visual-baseline-contract.test.mjs
```

While the repository is `NOT_CAPTURED`, the state test passes only by proving that zero candidate PNGs exist and all 44 are missing. The separate final-completeness test is explicitly **skipped**, not passed. Any partial capture changes the state to `INCOMPLETE` and fails the test suite. Once the candidate exists, the skip disappears and all 44 files, dimensions and digests must validate.

Manual visual QA and explicit owner approval remain separate gates. Do not rename this candidate to `approved`, merge it, or deploy it based only on automated manifest validation.
