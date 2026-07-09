# V6 Session - Step 229 Chart Data Bars Cursor Time Helper Migration

Date: 2026-07-09

## Summary

Step 229 routed chart-data cursor timestamp validation through shared
`time-domain` helpers while preserving strict chart-data cursor semantics.

## Changes

- Updated `v6/src/chart-data/chart-bars.js` so the existing
  `normalizeCursorTimestamp` wrapper calls `normalizeUnixSeconds` after its
  finite numeric validation.
- Updated `v6/tests/chart-data-domain-smoke.js` to cover numeric string cursor
  input and date/time text rejection.

## Preserved Boundaries

- Chart-data still owns chart bars filtering, merge ordering, dedupe, OHLC
  normalization, revision validation, paneId validation, and record creation.
- Chart-data cursor payloads still accept finite numeric values and numeric
  strings, but do not accept date/time text.
- Chart-data runtime still owns chart series replacement/append/prepend state.
- Chart-entry context, shell, session, journal, TF menu, indicators, Pine Script
  compatibility, SMC/ICT overlays, trading, order tickets, prop firm rule
  engines, and pseudo-live simulation behavior were not changed.

## Verification

- `node v6/tests/chart-data-domain-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `2960ee1a refactor(v6): share chart data cursor time validation`

## Next

Step 230 should inspect and close the remaining chart-entry context,
default-wall-plan, and playback-period time helper sites while preserving their
plan payloads and ownership boundaries.
