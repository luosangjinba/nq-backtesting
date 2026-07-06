# V6 Step 58 - Chart Entry Activation Owner

Date: 2026-07-05

## Summary

Step 58 introduced the chart-entry activation owner.

`runtime.chartEntry` subscribes to `session:created` and `session:opened`, then
records active-session identity as chart-entry activation state. The state is
exposed through `chartEntry.getState` and emits `chartEntry:activated` for
future owners.

This step intentionally does not load chart bars, replay windows, viewport
intent, adapter state, or bar-cache windows. It only creates the boundary that
future replay/chart initialization can consume. Missing-session open failures
leave activation state unchanged.

## Commits

- `2677b42e docs(v6): scope step fifty eight activation owner`
- `21a1b47d feat(v6): add chart entry activation runtime`
- `0b9633b4 feat(v6): register chart entry activation runtime`

## Verification

- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 59 should define the first replay/chart initialization plan consumed from
chart-entry activation. Keep the data-loading owner explicit before wiring any
bar requests or replay loads.
