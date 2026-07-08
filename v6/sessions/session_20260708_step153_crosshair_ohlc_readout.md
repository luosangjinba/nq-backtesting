# V6 Session - Step 153 Crosshair OHLC Readout

Date: 2026-07-08

## Completed

Step 153 implemented and gated the crosshair OHLC readout boundary.

Commits:

- `3e11cc66 feat(v6): gate crosshair ohlc readout boundary`
- `345fee43 test(v6): cover crosshair ohlc browser readout`

## Changes

- Added `CHART_SURFACE_EVENTS.CROSSHAIR_CHANGED`.
- Added Lightweight Charts crosshair subscription in the chart adapter.
- Routed crosshair state through chart-host-manager and workstation chart
  surface as pane-local interaction state.
- Updated status readout so chart-data/latest-bar changes do not populate OHLC.
- Added real browser coverage for crosshair-selected OHLC and duplicate header
  label prevention.

## Verification

- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/status-readout-chart-data-browser-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 154 should harden multi-pane crosshair readout isolation before additional
chart header behavior is layered on top.
