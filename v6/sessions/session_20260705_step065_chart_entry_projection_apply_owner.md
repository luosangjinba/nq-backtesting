# V6 Step 65 - Chart Entry Projection Apply Owner

Date: 2026-07-05

## Summary

Step 65 introduced the first projection apply owner.

`runtime.chartEntryProjectionApply` subscribes to
`chartEntryProjectionPreparation:prepared` and applies the prepared initial
default-wall projection by dispatching:

- `chartViewport.ensureIntent`;
- `chartData.replaceBars`.

The owner exposes applied state through `chartEntryProjectionApply.getState` and
emits `chartEntryProjectionApply:applied`. It still does not call chart adapter
APIs directly, call `defaultWall.load`, fetch bars, advance replay, or re-own
bar/replay state.

App shell smoke now verifies that entering the chart creates main pane
chart-data and viewport projection state while `defaultWall.getState` remains
empty. The actual chart adapter write remains behind the existing chart surface
bridges that subscribe to chart runtime events.

## Commits

- `80e83b4c docs(v6): scope step sixty five projection apply`
- `4b586035 feat(v6): add chart entry projection apply runtime`
- `1f522cad feat(v6): register chart entry projection apply runtime`

## Verification

- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 66 should add a browser-level visible chart assertion for the initial entry
path. It should verify that the initial bars are visible on canvas promptly and
that the chart uses the projected default wall, without relying only on runtime
state.
