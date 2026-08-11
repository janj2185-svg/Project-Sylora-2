# Runtime / mysterious artifacts

## `public/bootstrap-diagnostics.js`
- **Purpose:** early `error` / `unhandledrejection` bridge to `/__client_error` and `/__client_rejection` before `app.js` loads.
- **Referenced from:** `public/index.html`.
- **Verdict:** keep — intentional diagnostics for production boot failures. Not a leftover.

## Untracked names `64`, `T`, `rn` (reported on older `/opt/sylora` copies)
- **Not present** in this Cloud Agent workspace as project files.
- Likely noise from a truncated `ls` / git status / object shard (`/.git/objects/64/…`) or local VPS scratch.
- **Policy:** do not auto-delete on production. Inspect on the VPS with `ls -la /opt/sylora` and `git status -uall` before removing anything.
