# Phase 1.3 — browser E2E and WebRTC acceptance

Phase 1.3 verifies the deployed browser surface instead of treating API tests or a running coturn process as proof that LIVE works.

## Acceptance layers

1. **Read-only production smoke** — `/api/health`, `/api/ready`, the application shell, and 390/768/1366 px overflow checks. It performs no account or content writes.
2. **Browser account smoke** — registration, session restoration, profile navigation, logout, login, and LIVE navigation against an isolated test data file.
3. **Host + viewer LIVE** — two isolated browser contexts, a synthetic Studio camera stream, the real SYLORA LIVE signaling endpoints, a received video track, and connected peer statistics.
4. **TURN authentication** — the coturn 401 challenge, short-lived shared-secret credentials, MESSAGE-INTEGRITY, and XOR-RELAYED-ADDRESS are checked by `.github/scripts/turn-allocation-smoke.mjs`.
5. **Production relay-only probe** — two browser peers use `iceTransportPolicy: "relay"`; both selected local candidates must be `relay`, and a video track must cross the connection.

The CI host + viewer test and the authenticated allocation smoke are deliberately separate. GitHub runners are behind private addressing, while the production coturn policy denies private/link-local peer ranges. Weakening that production policy only to make a same-host CI relay pair connect would be a security regression. The relay-only media test therefore targets the real public TURN endpoint.

## Commands

Install the browser binary once:

```bash
npx playwright install --with-deps chromium
```

Run the isolated browser checks:

```bash
npm run test:e2e:smoke
```

Run the host + viewer scenario when coturn and TURN environment values are present:

```bash
SYLORA_E2E_WEBRTC=1 npm run test:e2e:webrtc
```

Run the production read-only smoke:

```bash
SYLORA_E2E_BASE_URL=https://getsylora.com npm run test:e2e:production
```

Run the production relay-only probe with an existing revocable user session token:

```bash
SYLORA_E2E_BASE_URL=https://getsylora.com \
SYLORA_E2E_AUTH_TOKEN='<ephemeral bearer token>' \
npm run test:e2e:production:relay
```

Never print, commit, upload, or store the bearer token in a Playwright report. The test sends it only in the authenticated RTC-config request. Production registration is intentionally not automated: the read-only probe must not accumulate test accounts or content.

## CI contract

`.github/workflows/ci.yml` installs pinned Playwright Chromium and runs:

- lint and build;
- the standard Node test suite;
- the real PostgreSQL migration/critical path;
- coturn health, STUN, and authenticated Allocate;
- the browser shell/account checks;
- two-context Studio host → LIVE viewer media delivery.

Failure traces, screenshots, videos, and the HTML report are retained for seven days as the `playwright-diagnostics` artifact. No production credential is used in normal pull-request CI.
