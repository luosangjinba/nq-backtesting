# V6 Workstation Chart Slice Selection - Step 128

Date: 2026-07-07

## Decision

The next bounded workstation/chart slice should be Workstation UI Parity Gap
Re-audit.

This follows the right-rail Session settings panel stabilization. The current
parity gap audit still records several earlier shell-only gaps that have since
been reserved or regression-audited, including the left drawing rail, bottom
account/trading chrome, and Session settings panel stabilization. Before
choosing another implementation slice, Step 129 should refresh the workstation
parity classification against the live V6 shell and the FXReplay UI guardrails.

## Selected Slice

Step 129 should re-audit the current workstation shell and update stale parity
gap classification before any new workstation chart chrome is implemented.

The slice should re-audit:

- session dashboard separation and visible row-action boundaries;
- top toolbar, timeframe menu, and chart settings entry behavior;
- left drawing rail, right utility rail, and right-rail Session settings panel;
- floating transport, bottom account/trading chrome, footer status bar, and
  chart status/OHLC placement;
- settings modal parity and diagnostics visibility;
- multi-pane readiness and any remaining runtime-owned gap classification.

## Ownership Boundary

Allowed:

- docs/test audit of current V6 workstation shell parity;
- static evidence from source, docs, and existing smoke tests;
- browser evidence for existing chrome stability and non-overlap;
- updating stale parity gap classifications and next-slice recommendations.

Forbidden:

- implementing new UI during Step 129;
- dispatching chart, replay, bar-data, default-wall, display-timeframe,
  viewport, session-settings, orders, or calendar commands from audit code;
- adding chart-series writes, viewport mutations, replay cursor ownership, or
  bar cache ownership outside their runtime owners;
- exposing Order or Calendar row actions;
- changing dashboard visible row actions from Summary, Stats, Copy, and
  Journal.

## Acceptance For Step 129

- new workstation UI parity re-audit smoke passes;
- existing FXReplay UI guardrails and parity gap audit smoke are updated or
  superseded with current evidence;
- right-rail session settings panel regression audit smoke still passes;
- bottom chrome regression audit smoke still passes;
- workstation chart presentation re-audit smoke still passes;
- dashboard row-action visibility remains Summary, Stats, Copy, and Journal;
- boundary smoke passes.

## Verification

- `node v6/tests/workstation-chart-slice-selection-step128-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
