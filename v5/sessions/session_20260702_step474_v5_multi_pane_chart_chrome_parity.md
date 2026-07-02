# Step 474 - V5 Multi-Pane Chart Chrome Parity

Date: 2026-07-02

Status: completed.

## Goal

Make every real layout pane carry the same chart surface elements as the
single-pane chart.

## Summary

- Added pane-local chart toolbar/reset markup to dynamically-created panes.
- Updated replay controls to enable/disable all current chart toolbar buttons.
- Updated chart navigation reset handling to use event delegation, so dynamic
  pane reset buttons are real controls.
- Extended browser smoke to verify every pane has OHLC/TF overlay, chart
  toolbar, visible price scale, and visible time scale.

## Boundaries

- Price/time scales remain chart-runtime/adapter presentation state.
- Route UI does not write chart series.
- Route UI does not request bars.
- Replay cursor/reveal and bar-data ownership are unchanged.

## Checks

- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/src/features/chart-replay/chart-replay-controls.js`
- `node --check v5/src/features/chart-replay/chart-replay-navigation.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `git diff --check`
