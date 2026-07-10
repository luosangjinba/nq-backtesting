# V6 Session - Session Switch Price Scale Reset

Date: 2026-07-10

## Scope

Fixed a chart foundation bug where opening a second replay session could inherit
the previous session's price scale. In that state, the new session's K-lines
were loaded and the time-axis projection was applied, but candles could render
outside the visible price range until the user moved the chart.

## Changes

- Added a chart-adapter `resetPriceScale` API.
- Exposed `resetPriceScale` through the chart host manager.
- Triggered price-scale autoscale reset after non-manual viewport projections,
  covering initial session entry and reset view without resetting during manual
  horizontal drag.
- Added `v6/tests/session-switch-price-scale-browser-smoke.js`.

## Verification

- `node v6/tests/session-switch-price-scale-browser-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`
