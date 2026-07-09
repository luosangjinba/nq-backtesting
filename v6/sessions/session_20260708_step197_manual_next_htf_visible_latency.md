# V6 Session - Step 197 Manual Next HTF Visible Latency

Date: 2026-07-08

## Completed

Step 197 routed manual-next replay advancement through the chart-data projection
owner for higher display timeframes.

Commits:

- `253f9e3a feat(v6): route manual next HTF projection`
- `3019a121 test(v6): cover manual next HTF projection`
- `075e3bd2 test(v6): guard manual next projection scope`
- `360a3d75 test(v6): cover manual next HTF visible latency`

## Changes

- Manual-next now plans source-timeframe bar-data windows and projects to the
  pane display timeframe only after source bars are loaded.
- HTF manual-next appends the projected cursor bucket instead of raw source
  bars.
- The `main` chart-entry path can use active-pane display settings when the
  pane store does not contain a `main` record.
- Added runtime and browser coverage for HTF manual-next projection and visible
  latency.
- Updated routing-scope guards so initial chart entry, pane reload, and manual
  next are the only projection-owner consumers at this stage.

## Boundary Notes

This step does not route auto-play, leftward history, or reset view through
projection. Chart-data and chart-engine remain projection-free.

## Verification

- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 198 should route HTF leftward-history prepends through the projection owner
without regressing delayed/coalesced/chunked history stability.
