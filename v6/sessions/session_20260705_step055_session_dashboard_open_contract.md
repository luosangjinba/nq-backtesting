# V6 Step 55 - Session Dashboard Open Session Contract

Date: 2026-07-05

## Summary

Step 55 added the session-open contract between the simplified dashboard and the
session runtime.

The session runtime now exposes `session.open`, which selects an existing
session as the active session and emits `session:opened`. Creating a session
still saves it as the active session. Opening a missing session throws a clear
error and leaves the previous active session unchanged.

The dashboard `Sessions` rows now dispatch `session.open` before returning to
the chart workstation. This keeps the route/shell layer limited to active
session identity. It still does not request chart bars, replay loads, viewport
mutations, adapter writes, or bar-cache windows.

Follow-up correction: the session dashboard keeps one clear page hierarchy.
The duplicate top `Sessions` / `Analytics` tab strip was removed because it
repeated the lower page sections without owning navigation behavior.

## Commits

- `50ebe9d4 docs(v6): scope step fifty five session open contract`
- `be79ea77 feat(v6): add session open command`
- `9cb1f049 fix(v6): open dashboard sessions through runtime`
- `8191b57c fix(v6): remove duplicate session dashboard tabs`

## Verification

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 56 should define the session-to-workstation activation boundary: which
runtime observes the active session identity and when replay/chart data should
be loaded, without allowing dashboard or route UI to own that data flow.
