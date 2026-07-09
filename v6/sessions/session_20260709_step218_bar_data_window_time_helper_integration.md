# V6 Session - Step 218 Bar-Data Window Time Helper Integration

Date: 2026-07-09

## Summary

Step 218 routed bar-data request-window planning and cache boundary timestamp
math through shared time helpers while preserving request ranges, cache keys,
bounded caps, and replay latency behavior.

## Changes

- Updated `v6/src/bar-data/bar-window.js` to use `time-domain` for:
  - positive minute timeframe normalization;
  - Unix millisecond timestamp parsing;
  - API minute string formatting;
  - minute-millisecond constants.
- Preserved the public `normalizeTimeframe`, `parseBarTimeMs`, and
  `formatApiTime` wrappers so existing bar-data callers do not change.
- Updated `v6/src/bar-data/bar-window-cache.js` to reuse bar-window/time-domain
  timestamp parsing and minute constants for boundary metadata and inferred
  fallback step size.
- Updated `v6/tests/tf-projection-time-domain-audit-step214-smoke.js` so
  `bar-window.js` must consume `time-domain` and must not carry a local
  timeframe normalizer.

## Preserved Boundaries

- Bar-data still owns API request-window planning, cache/window keys, bounded
  chunk size, canvas-left request caps, and boundary metadata.
- Chart-history still dispatches history extension requests instead of
  computing bar-data request windows itself.
- No database query shape, requested range metadata, replay cursor behavior,
  TF support, indicators, Pine Script compatibility, SMC/ICT overlays, trading,
  order tickets, prop firm rule engines, or pseudo-live simulation behavior were
  added or changed.

## Verification

- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `9a99d0a9 refactor(v6): route bar window through time domain`
- `a24dc5c4 refactor(v6): reuse bar time helpers in cache`

## Next

Step 219 should finish the bar-data timestamp cleanup in adapter/normalizer
boundaries while preserving database query shape, requested range metadata, and
normalized chart bar output.
