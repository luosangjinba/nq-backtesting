# V6 Step 76 - Restart UX Polish And Semantics

Date: 2026-07-06

## Summary

Step 76 polished the replay restart control semantics.

The restart transport button no longer uses the old truncate placeholder icon.
It now has:

- a dedicated restart icon;
- `data-v6-transport-restart` for stable UI tests;
- explicit `Restart replay` title and accessible label when available;
- disabled label `Restart available after replay ends` before restart is valid.

## Important Fix

While hardening the browser test, a restart feedback race was exposed. Old
auto-play ended events can arrive after restart has begun and flip transport
back to `ended`.

Transport now refreshes current replay state after restart and after restart
projection apply. It polls briefly until replay reports a non-ended state, then
syncs the UI back to ready. This keeps the restart button disabled and Play
enabled after restart completes.

## Gates

`chart-entry-restart-browser-smoke.js` now verifies:

- restart button has the dedicated marker;
- restart SVG uses the restart path and no longer contains the old truncate
  path;
- restart title and accessible label are explicit;
- restart recovers transport from ended to ready.

## Commits

- `d6bb0e28 docs(v6): scope step seventy six restart polish`
- `03bd3070 feat(v6): clarify restart transport semantics`
- `363e749b fix(v6): refresh transport after replay restart`
- `5d4cc823 fix(v6): stabilize transport after restart`

## Verification

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

## Next

Step 77 should audit the full transport control visual state matrix: normal,
playing, ended, and restarted. Restart semantics are now correct, but the whole
transport should be checked as a set before new workflow panels or trading
features are layered on top.
