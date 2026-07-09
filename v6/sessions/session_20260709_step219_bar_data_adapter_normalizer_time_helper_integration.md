# V6 Session - Step 219 Bar-Data Adapter / Normalizer Time Helper Integration

Date: 2026-07-09

## Summary

Step 219 routed database adapter and bar normalizer epoch-second conversion
through shared time helpers while preserving database query shape, requested
range metadata, and normalized chart bar output.

## Changes

- Updated `v6/src/bar-data/database-bars-adapter.js` so requested range and
  history timestamps use a shared millisecond-to-second helper.
- Added `unixMillisecondsToSeconds` to `v6/src/time-domain/time-domain.js` for
  values already known to be Unix milliseconds.
- Updated `v6/src/bar-data/bar-normalizer.js` so normalized chart bar
  timestamps use the shared millisecond-to-second helper.
- Added `unixMillisecondsToSeconds` coverage to
  `v6/tests/time-domain-helper-step215-smoke.js`, including small millisecond
  values that must not be auto-detected as seconds.

## Preserved Boundaries

- Database adapter still owns database query shape, schema metadata, requested
  range metadata, raw row mapping, and timing metadata.
- Bar normalizer still owns OHLC validation, volume normalization, dedupe, sort
  order, ISO `time` output, and chart bar `timestamp` output.
- No database query shape, requested range metadata, cache key, boundary
  metadata, TF support, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading, order tickets, prop firm rule engines, or pseudo-live simulation
  behavior were added or changed.

## Verification

- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/time-domain-helper-step215-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `ab9de1e3 refactor(v6): reuse time helper in database bars adapter`
- `fbfae5b4 refactor(v6): share millisecond timestamp conversion`

## Next

Step 220 should finish bar-data runtime/cache epoch serialization cleanup while
preserving cache filtering, requested range timestamps, and boundary metadata
output.
