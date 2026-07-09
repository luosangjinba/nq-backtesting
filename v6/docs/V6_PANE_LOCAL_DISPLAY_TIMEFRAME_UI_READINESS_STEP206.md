# V6 Pane-Local Display-Timeframe UI Readiness - Step 206

## Outcome

Step 206 makes the existing shell display-timeframe control pane-target aware.

The control now resolves an explicit `paneId` before dispatching
`DISPLAY_TIMEFRAME_COMMANDS.APPLY`, and the command payload includes that
`paneId`. This removes the shell UI's dependency on hidden runtime active-pane
fallback for the primary chart target while preserving the existing top-toolbar
visual behavior.

## Implemented Boundary

- Shell UI owns menu DOM behavior, selected label text, and target-pane
  resolution for the existing control.
- Display-timeframe runtime still owns projection from source bars to selected
  display timeframe bars.
- Chart-data runtime still owns pane-local bar replacement.
- Chart surface and chart engine still render already-applied chart data.
- Pane runtime remains the source of pane identity and active-pane semantics;
  Step 206 does not add interval sync or custom timeframe UI.

## Code Changes

- `mountDisplayTimeframeControl` accepts an explicit target pane source through
  `getTargetPaneId` or `targetPaneId`.
- The control tracks the current target pane id in its own state and mirrors it
  to `data-v6-display-timeframe-pane-id` for browser observability.
- The returned controller exposes `getTargetPaneId()` and
  `setTargetPaneId(paneId)`.
- `applyDisplayTimeframe` dispatches `{ displayTimeframe, paneId }`.
- The control uses its owning document when wiring menu listeners so it remains
  testable outside the browser global document.

## Browser Coverage

`display-timeframe-target-pane-browser-step206-smoke.js` mounts the V6 shell,
sets the display-timeframe target to `secondary`, selects `5m`, and verifies:

- the menu closes and top-toolbar label changes to `5m`;
- the command targets `secondary`;
- the main pane remains on `1m`;
- the secondary pane changes to `5m`;
- main chart bars stay unchanged;
- secondary chart bars are projected into the expected 5-minute candles.

The Step 206 browser smoke is now part of the chart browser regression pack.

## Non-Goals

- Do not add custom intervals.
- Do not implement interval sync.
- Do not implement indicators or Pine Script.
- Do not change projection ownership.
- Do not add trading or order behavior.

## Next Recommendation

Step 207 should connect the shell control's target-pane resolver to the actual
chart-surface or pane-runtime active/selected pane source through an explicit
owner contract. That step should keep the same display-timeframe command shape
and remain limited to target source integration, not richer TF UI or indicators.
