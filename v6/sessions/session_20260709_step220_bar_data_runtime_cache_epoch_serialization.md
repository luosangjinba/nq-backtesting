# V6 Session - Step 220 Bar-Data Runtime / Cache Epoch Serialization Integration

Date: 2026-07-09

## Summary

Step 220 routed bar-data runtime filtering and cache boundary metadata epoch
serialization through shared time helpers while preserving cache filtering,
requested range timestamps, boundary metadata, and chart browser behavior.

## Changes

- Updated `v6/src/bar-data/bar-data-runtime.js` so runtime window filtering
  boundaries use `unixMillisecondsToSeconds`.
- Updated `v6/src/bar-data/bar-window-cache.js` so cache slice filtering
  boundaries use `unixMillisecondsToSeconds`.
- Added a cache-local boundary timestamp serializer that uses
  `unixMillisecondsToSeconds` for earliest/latest/exhausted metadata output.

## Preserved Boundaries

- Bar-data runtime still owns command handling, fetch retry, normalization
  handoff, and cache writes.
- Bar-window cache still owns cache hit coverage, slice filtering, summaries,
  and boundary metadata serialization.
- No request windows, cache keys, requested ranges, boundary metadata values,
  chart bars, TF support, indicators, Pine Script compatibility, SMC/ICT
  overlays, trading, order tickets, prop firm rule engines, or pseudo-live
  simulation behavior were added or changed.

## Verification

- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `5c25a080 refactor(v6): share runtime window epoch conversion`
- `c2b8ec59 refactor(v6): share cache epoch serialization`

## Next

Step 221 should audit remaining timestamp conversion sites in chart-entry,
pane-intent-reload, and layout bootstrap before migrating them.
