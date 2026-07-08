# V6 Session - Step 189 Real-Date Sunday Gap Leftward Extension Stability

Date: 2026-07-08

## Completed

Step 189 addressed the user-reported case where a real session range could stop
leftward extension at a Sunday `18:00` futures boundary.

Commits:

- `19923603 fix(v6): stabilize real-date leftward gap extension`
- `753f9f6a feat(v6): expose leftward history request diagnostics`

## Changes

- Added a real-date browser smoke for the `2026-05-01 / 2026-05-05` NQ session.
  It repeatedly requests leftward history and proves the chart can cross the
  prior Sunday `2026-04-26 18:00` boundary into earlier `2026-04-24` data.
- Increased leftward-history empty-window scan coverage from 12 to 24 chunks.
  This remains generic; it does not special-case `2026-04-26` or any fixed date.
- Added limited bar-data fetch retry with short backoff inside
  `bar-data-runtime`, the owner of bar requests and cache writes.
- Exposed `recentRequests` from `CHART_HISTORY_COMMANDS.GET_STATE` so future
  debugging can inspect leftward-history windows, empty scans, loaded counts,
  and scan indexes without UI modules querying bar-data internals.

## Boundary Notes

- Step 189 confirms the specific reproduced Sunday stop was caused by scan
  coverage being too shallow for a full weekend/market gap.
- The fix is intended to cover similar empty-market gaps because it scans prior
  fixed chunks whenever the API returns no bars but does not report historical
  exhaustion.
- This step does not yet add a multi-date Sunday-boundary matrix or bar-data
  owned earliest/latest available metadata. Those remain appropriate follow-up
  work.

## Verification

- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/bar-data-fetch-retry-step189-smoke.js`
- `node v6/tests/leftward-history-debug-state-step189-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/leftward-history-gap-scan-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 190 should return to bar-data owned chart boundary metadata and add a small
real-date matrix for multiple Sunday `18:00` boundaries so we can distinguish
actual data exhaustion from avoidable empty-gap stops.
