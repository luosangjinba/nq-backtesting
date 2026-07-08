# V6 Pane Symbol/Interval Intent - Step 169

Date: 2026-07-08

## Boundary

Step 169 adds explicit pane-local Symbol/Interval intent state.

The existing pane record fields are now treated as intent fields:

- `instrument` is the pane-local Symbol intent.
- `displayTimeframe` is the pane-local Interval intent.

This step does not implement layout fan-out, bar reloads, chart-data
replacement, viewport projection, or replay cursor changes.

## Runtime API

New pane commands:

- `pane.setSymbolIntent`
- `pane.setIntervalIntent`

New pane events:

- `pane:symbolIntentChanged`
- `pane:intervalIntentChanged`

Compatibility:

- `pane.setDisplayTimeframe` remains available.
- `pane.setDisplayTimeframe` delegates to interval intent and still emits the
  legacy `pane:displayTimeframeChanged` event for existing display-timeframe and
  playback-period listeners.

## Ownership

- Pane runtime owns pane-local Symbol/Interval intent.
- Layout runtime owns sync toggle state only.
- A future dedicated Symbol/Interval sync runtime should fan out intent changes.
- Bar-data, chart-data, chart-viewport, chart-engine, and replay ownership is
  unchanged.

## Verification

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 170 should add the dedicated Symbol/Interval sync runtime skeleton. It
should listen to pane intent events and layout sync state, but still avoid bar
reload implementation until fan-out behavior is covered by tests.
