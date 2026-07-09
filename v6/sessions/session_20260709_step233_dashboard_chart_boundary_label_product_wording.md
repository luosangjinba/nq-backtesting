# V6 Session - Step 233 Dashboard Chart Boundary Label Product Wording

Date: 2026-07-09

## Summary

Step 233 replaced engineering-facing dashboard chart-boundary copy with compact
product wording.

## Changes

- Updated `v6/src/shell/session-dashboard-model.js` so actual loaded chart
  boundary labels render as `Chart starts at: ...`.
- Updated prior Globex-open fallback labels to render as
  `Chart starts at prior Globex open: ...`.
- Updated dashboard model/browser smokes and the Step 232 selection guard to
  assert the new wording.

## Preserved Boundaries

- Session dashboard model still owns display-only date/boundary labels.
- Chart boundary metadata runtime still owns loaded boundary metadata.
- Bar-data remains the only owner of bar requests and cache behavior.
- Chart-data remains the only owner of chart series data.
- Replay remains the owner of replay cursor and reveal state.
- Viewport remains the owner of viewport intent.
- No TF expansion, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows were started.

## Verification

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-boundary-bridge-browser-step191-smoke.js`
- `node v6/tests/chart-foundation-post-time-helper-slice-selection-step232-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `1603f810 fix(v6): use product chart boundary labels`

## Next

Step 234 should select the next bounded chart-foundation slice.
