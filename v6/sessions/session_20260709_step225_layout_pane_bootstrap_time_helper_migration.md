# V6 Session - Step 225 Layout Pane Bootstrap Time Helper Migration

Date: 2026-07-09

## Summary

Step 225 routed layout pane bootstrap replay cursor and source-bar fallback
timestamp parsing through shared `time-domain` helpers while preserving layout
bootstrap behavior.

## Changes

- Updated `v6/src/layout/layout-pane-bootstrap-runtime.js` so replay-state
  cursor parsing uses `normalizeUnixSeconds` behind the existing
  `timestampFromReplayState` wrapper.
- Added `timestampFromSourceBar` so fallback source-bar timestamp parsing also
  uses `normalizeUnixSeconds`.
- Extended `v6/tests/layout-pane-bootstrap-runtime-smoke.js` to cover text
  replay cursor parsing and fallback source-bar text parsing when replay cursor
  state is unavailable.

## Preserved Boundaries

- Layout pane bootstrap still owns visible-pane bootstrap orchestration.
- Chart-data runtime still owns chart series replacement.
- Chart-viewport runtime still owns viewport intent and revision projection.
- Replay runtime still owns replay state.
- Pane bootstrap payloads, pane ordering, replay cursor semantics, fallback
  behavior, and error text were preserved.
- `layout-pane-bootstrap-runtime.js` did not contain a minute timeframe parser,
  so Step 225 did not add one.
- TF support, indicators, Pine Script compatibility, SMC/ICT overlays, trading,
  order tickets, prop firm rule engines, journal behavior, and pseudo-live
  simulation behavior were not changed.

## Verification

- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

## Commits

- `d88772d7 refactor(v6): share layout bootstrap replay time parsing`
- `3b2d7043 refactor(v6): share layout bootstrap source bar time parsing`

## Next

Step 226 should audit the remaining chart-foundation timestamp and timeframe
parsing sites, classify them by owner, and select the next bounded
implementation step instead of starting a new feature directly.
