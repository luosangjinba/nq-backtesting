# V6 Session - HTF Leftward Auto Extension Bugfix

Date: 2026-07-09

## Completed

- Fixed the leftward-history input bridge so programmatic viewport updates also
  trigger delayed left-extension checks.
- Covered viewport projection, pane reload projection, and display-timeframe
  application events so non-1m panes can continue auto-extending after TF
  changes without waiting for extra mouse movement.
- Fixed fractional negative logical ranges such as `from: -0.36` being rounded
  up to zero. The extension runtime now floors the canvas-left logical index so
  any visible blank area to the left requests the next older window.
- Added a browser smoke for display-timeframe changes starting a leftward
  auto-chain.
- Updated drag stability smokes to allow prepend-driven logical range shifts
  while still verifying that hover after release does not keep dragging the
  chart.

## Verification

- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`

## Next

Continue with Step 212: Top-Toolbar Active-Pane Symbol Presentation Sync,
unless manual browser testing finds another chart-foundation blocker.
