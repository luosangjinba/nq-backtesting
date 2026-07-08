# V6 Session - Step 188 Globex Session Boundary / Chart Data Range Clarity

Date: 2026-07-08

## Completed

Step 188 clarified the difference between dashboard trading dates and futures
chart data boundaries.

Commits:

- `bbabd94c docs(v6): define step 188 globex boundary`
- `ff6bda24 feat(v6): clarify session globex boundary label`

## Changes

- Added `V6_GLOBEX_SESSION_BOUNDARY_CLARITY_STEP188.md`.
- Moved session date/boundary display derivation into
  `session-dashboard-model.js`.
- Dashboard rows now keep the trading-date range and add a compact chart-data
  boundary label for Monday NQ/ES sessions.
- Added model and browser smoke coverage for the default NQ session showing
  `Chart data from prior Globex open: 2026-05-31 18:00`.

## Boundary Notes

- The dashboard label `2026-06-01 / 2026-06-05` remains the selected trading
  date range.
- For CME-style futures in this step's supported set, a Monday trading day may
  start with tradable bars from the prior Sunday `18:00`.
- Step 188 does not change bar loading, replay reveal state, chart writes,
  leftward-history request caps, or viewport projection.

## Verification

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 189 should move the chart boundary from a static session-dashboard
inference toward bar-data-owned metadata. The UI should be able to show the
actual earliest available/requested chart timestamp without directly querying
bar-data or chart runtime internals.
