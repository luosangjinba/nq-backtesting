# V6 Workstation Chart Implementation Slice Selection

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Left Drawing Rail Reservation.

This is the smallest chart-facing slice that moves V6 closer to the FXReplay UI
kernel without adding runtime ownership. The rail is currently missing, is
explicitly called out by the parity gap audit, and can be added as an inert
shell surface next to the chart without touching chart data, chart viewport,
replay, bar data, or chart-engine adapter state.

## Selected Slice

Step 120 should reserve a vertical left drawing/tool rail.

The slice should:

- add a narrow shell-owned rail along the left side of the workstation chart
  area;
- use icon buttons for drawing/tool placeholders;
- keep all tool buttons disabled or inert until a drawing/tool owner exists;
- preserve the chart engine host as the owner of chart presentation;
- preserve existing top toolbar, right rail, bottom transport, status/OHLC, and
  dashboard row-action behavior.

## Ownership Boundary

Allowed:

- shell markup and CSS for the left rail;
- inert buttons with labels/tooltips;
- browser coverage for layout, disabled state, and chart host non-overlap.

Forbidden:

- dispatching chart, replay, bar-data, default-wall, display-timeframe, or
  viewport commands from the rail;
- importing chart-engine, chart-data, chart-viewport, replay, bar-data, or
  default-wall modules into a left-rail controller;
- making drawing tools interactive before a drawing/tool owner and contract
  exists;
- changing dashboard row-action visibility;
- exposing Order or Calendar.

## Acceptance For Step 120

- left drawing rail browser smoke passes;
- rail buttons are inert and disabled;
- chart host remains mounted, visible, and non-overlapped;
- workstation chart presentation re-audit smoke still passes;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
