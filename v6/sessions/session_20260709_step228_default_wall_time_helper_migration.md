# V6 Session - Step 228 Default Wall Runtime Time Helper Migration

Date: 2026-07-09

## Summary

Step 228 routed default-wall replay bar timestamp parsing and default-wall
displayTimeframe parsing through shared `time-domain` helpers while preserving
default-wall behavior.

## Changes

- Updated `v6/src/default-wall/default-wall-replay.js` so `normalizeBar` uses
  `normalizeUnixSeconds` behind the existing local wrapper.
- Updated `v6/tests/default-wall-replay-domain-smoke.js` to cover replay bar
  text `time` parsing.
- Updated `v6/src/default-wall/default-wall-runtime.js` so
  `normalizeDisplayTimeframe` uses `normalizeMinuteTimeframe` behind the
  existing local wrapper.
- Updated `v6/tests/default-wall-mixed-timeframe-runtime-smoke.js` to cover
  explicit string displayTimeframe input.

## Preserved Boundaries

- Default-wall runtime still owns default-wall load/next orchestration.
- Default-wall replay domain still owns replay buffer state.
- Default-wall pane projection still owns mixed-timeframe projection payloads.
- Replay runtime still owns replay cursor state.
- Chart-data runtime still owns chart series replacement/append.
- Chart-viewport runtime still owns viewport intent projection.
- Replay state shape, pane ordering, latest-bar cursor semantics,
  chart replace/append payloads, viewport intent payloads, and error text were
  preserved.
- Chart-data bars, chart-entry context, shell, session, journal, TF menu,
  indicators, Pine Script compatibility, SMC/ICT overlays, trading, order
  tickets, prop firm rule engines, and pseudo-live simulation behavior were not
  changed.

## Verification

- `node v6/tests/default-wall-replay-domain-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `eaf0b836 refactor(v6): share default wall bar time parsing`
- `3f3898af refactor(v6): share default wall timeframe parsing`

## Next

Step 229 should migrate only `v6/src/chart-data/chart-bars.js` cursor timestamp
validation through shared `time-domain` helpers while preserving strict
chart-data seconds cursor semantics.
