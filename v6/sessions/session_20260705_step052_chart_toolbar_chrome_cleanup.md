# V6 Step 52 - Chart Toolbar Chrome Cleanup

Date: 2026-07-05

## Summary

Step 52 removed duplicate chart-internal toolbar chrome. The chart surface no
longer contains hidden or visible `Go to`, `Layout`, or timeframe text controls.
Those command homes are now explicit:

- Page layout belongs in the top toolbar layout menu.
- Go-to key times belong in the right utility rail.
- Pane-local symbol/OHLC status remains inside the chart surface.

The top-left chart navigation was also clarified: V6 keeps one left-arrow
control for returning to a future session dashboard/list. The unused right-arrow
placeholder was removed because it implied browser-like forward navigation and
could be confused with replay stepping.

## Commits

- `b3624e4f fix(v6): clean duplicate chart toolbar chrome`
- `e121d712 docs(v6): guard chart chrome cleanup`

## Verification

- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 53 should define the separate session dashboard/list shell that the chart
back arrow will eventually open. It should remain distinct from the chart
workstation and should not introduce chart/replay ownership into route UI.
