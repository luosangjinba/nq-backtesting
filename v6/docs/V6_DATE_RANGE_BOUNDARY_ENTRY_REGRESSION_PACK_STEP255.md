# V6 Step 255 - Date Range / Loaded Boundary / Replay Entry Regression Pack

Date: 2026-07-10

## Decision

Step 255 adds a compact date-range, loaded-boundary, and replay-entry
regression pack.

The pack is the focused gate to run when changing session date ranges,
dashboard boundary presentation, chart-entry planning/bootstrap, bar-data
boundary metadata, chart viewport entry projection, playback-period boundaries,
or real-date leftward extension.

## Pack

`v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`
runs these gates in sequence:

- `v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `v6/tests/bar-data-boundary-metadata-step190-smoke.js`
- `v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`

## Coverage

- Session date ranges are stored and displayed without loading the full
  selected range into chart state.
- Loaded boundary metadata remains available to dashboard and chart-entry
  presentation.
- Chart-entry initial viewport projection keeps the latest loaded K-line
  visible without requiring user drag.
- Replay starts at the selected session boundary with the expected cursor and
  revealed state.
- Playback-period and reset-view behavior do not mutate replay or chart-data
  ownership unexpectedly.
- Real-date leftward extension can cross known loaded and empty boundary
  regions.
- Runtime boundary metadata remains owned by bar-data/chart-boundary owners.

## Owner Boundaries

- Session runtime owns selected session start/end metadata.
- Session dashboard owns read-only row and boundary presentation.
- Chart-entry runtime owns bounded initial load planning and chart-entry
  bootstrap orchestration.
- Bar-data runtime owns database/cache requests and loaded/empty boundary
  metadata.
- Chart-data runtime owns pane-local bars and revisions.
- Chart viewport owns initial/default viewport projection.
- Chart surface owns visible logical range observation and chart host
  rendering.
- Replay runtime owns cursor/reveal state.
- Playback-period controls dispatch playback-period commands and do not mutate
  chart-data or replay ownership directly.

## Non-Goals

- This pack does not replace the full chart browser regression pack.
- No runtime behavior changes were made for Step 255.
- No session setup redesign, date picker redesign, database schema change,
  import format change, new timeframes, custom interval UI, indicators, Pine
  Script compatibility, SMC/ICT overlays, trading simulation, order tickets,
  prop firm rule engines, or journal workflows were added.

## Verification

- `node v6/tests/date-range-boundary-entry-regression-pack-step255-static-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`
