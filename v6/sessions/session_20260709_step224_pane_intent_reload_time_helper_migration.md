# V6 Session - Step 224 Pane Intent Reload Chart-Data Time Helper Migration

Date: 2026-07-09

## Summary

Step 224 routed pane-intent reload chart-data cursor parsing, timeframe
parsing, optional session timestamp parsing, and projection-source summary
through shared `time-domain` helpers while preserving reload behavior.

## Changes

- Updated `v6/src/pane-intent-reload/pane-intent-reload-chart-data-runtime.js`
  so window cursor parsing uses `normalizeUnixSeconds` behind the existing
  `cursorTimestampFromWindow` wrapper.
- Updated reload target/source timeframe parsing to use
  `normalizeMinuteTimeframe` behind the existing `normalizeTimeframe` wrapper.
- Updated optional session-start timestamp parsing to use
  `normalizeOptionalUnixSeconds` behind the existing `parseOptionalTimestamp`
  wrapper.
- Replaced the local projection-source summary builder with
  `summarizeProjectionSource`.

## Preserved Boundaries

- Pane-intent reload chart-data runtime still owns reload application after
  pane-intent data load events.
- Bar-data runtime still owns loaded-window reads.
- Chart-data runtime still owns chart series replacement.
- Projection remains owned by chart-data-projection.
- Loaded-window cursor selection, projection dispatch payloads, replacement
  payloads, replacement ordering, and error text were preserved.
- Layout bootstrap, TF support, indicators, Pine Script compatibility, SMC/ICT
  overlays, trading, order tickets, prop firm rule engines, journal behavior,
  and pseudo-live simulation behavior were not changed.

## Verification

- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-reload-htf-projection-browser-step196-smoke.js`
- `node v6/tests/reset-view-htf-browser-step200-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `06e38825 refactor(v6): share pane reload time parsing`
- `c244699c refactor(v6): share pane reload projection summary`

## Next

Step 225 should migrate only
`v6/src/layout/layout-pane-bootstrap-runtime.js` replay-state timestamp parsing
and minute timeframe parsing through `time-domain`.
