# V6 Step 11 - Visible Latency Harness

Date: 2026-07-04

## Scope

Step 11 added the first V6 guard against the V5 visible candle delay class.
The implementation measures user-visible replay timing as a phased trace
instead of treating command completion or cursor mutation as success.

## Completed Commits

- `3a64a56 feat(v6): add visible latency timeline`
- `8ef6cf8 test(v6): add cache-hit visible latency browser smoke`
- `df59b93 test(v6): enforce visible latency boundary`

## Implementation Notes

- Added `v6/src/latency/visible-latency-timeline.js` as a pure latency domain.
- Recorded required phases: input, command received, bar available, chart update
  requested, and candle visible.
- Added cache-hit assertions that fail when the visible path performs a data
  fetch.
- Added failure attribution for incomplete traces, data latency, input dispatch
  latency, and chart/frontend latency.
- Added a browser smoke using a real V6 page and Lightweight Charts adapter. It
  updates a cached forward bar, blocks `window.fetch`, waits for chart metadata
  to prove the latest logical candle is visible, and summarizes phase timings.
- Added a boundary smoke rule so latency modules cannot import chart, bar-data,
  replay, session, pane, shell, runtime, or viewport modules.

## Verification

- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

The browser smoke required normal local browser-test permissions because it
starts a temporary HTTP server and headless Chrome.

## Next Step

Step 12 should build the first real single-pane default-wall replay path through
the existing session, bar-data, replay, chart-data, chart-viewport, chart-engine,
and visible latency boundaries.
