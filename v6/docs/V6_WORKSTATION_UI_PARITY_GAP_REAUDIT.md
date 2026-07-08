# V6 Workstation UI Parity Gap Re-audit

Date: 2026-07-07

## Outcome

Step 129 re-audited the current V6 workstation shell against the FXReplay UI
guardrails after right-rail Session settings panel stabilization.

No workstation chrome implementation was added. The audit refreshed the stale
July 5 parity classification and confirmed that the old priority order had
already been partially completed by later steps.

## Findings

- Session dashboard separation still holds, and visible row actions remain
  Summary, Stats, Copy, and Journal.
- Top toolbar, timeframe menu, left drawing rail, right utility rail,
  right-rail Session settings panel, floating transport, bottom account/trading
  chrome, chart status/OHLC, and chart settings modal are present in the
  workstation shell.
- Chart Settings and Session settings remain distinct surfaces.
- Left drawing tools, right-rail owner actions, trading/account placeholders,
  unsupported intervals, top-toolbar deferred commands, and Session settings
  fields remain inert until explicit owners exist.
- Multi-pane UI remains deferred even though pane model and test-host coverage
  exist.
- Step 131 cleaned up readiness diagnostics visibility by keeping compact
  user-facing readiness text in the header while hiding runtime/command/gate
  telemetry from the default visible path.

## Updated Classification

Completed shell-only parity surfaces:

- top toolbar shell;
- grouped timeframe menu shell;
- left drawing rail reservation;
- right utility rail reservation;
- right-rail Session settings panel reservation;
- floating transport shell;
- bottom account/trading chrome reservation;
- chart settings modal shell;
- pane-local chart status/OHLC placement.

Runtime-owned/deferred surfaces:

- indicators, undo, redo, drawing/action history;
- account/trading, analytics, Order, and Calendar behavior;
- screenshot/export, theme, fullscreen, comparison symbol, and session-hours
  behavior;
- Session settings persistence and command/event ownership;
- multi-pane workstation UI.

Completed shell-only cleanup:

- diagnostics visibility cleanup keeps readiness controller state available for
  tests and future tooling while removing runtime/command/gate telemetry from
  normal visible header text.

## Boundary Result

The re-audit did not add UI implementation, runtime commands, chart-series
writes, viewport mutations, replay cursor ownership, bar-cache ownership,
session-settings behavior, Order exposure, or Calendar exposure.

## Verification

- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`

## Next Step

Step 132 should select one deferred owner contract family unless a newly found
regression requires a narrower fix first.
