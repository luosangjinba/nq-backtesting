# Step 473 - V5 Multi-Pane OHLC And Price Scales

Date: 2026-07-02

Status: completed.

## Goal

Ensure every real layout pane has chart context: a visible price scale and OHLC
overlay.

## Summary

- Added OHLC overlay markup to dynamically-created secondary and tertiary panes.
- Updated the status controller to refresh all current pane OHLC overlays.
- Refresh OHLC overlays after layout changes so new panes populate immediately.
- Extended layout browser smoke to verify all three panes have OHLC overlays and
  visible chart price scale metadata.

## Boundaries

- Price scales remain chart-runtime/adapter presentation state.
- Route UI does not call chart series APIs.
- Route UI does not request bars.
- Replay cursor/reveal and bar-data ownership are unchanged.

## Checks

- `node --check v5/src/features/chart-replay/chart-replay-status.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-shell.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `git diff --check`
