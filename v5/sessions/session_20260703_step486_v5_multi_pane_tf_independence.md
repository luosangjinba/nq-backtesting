# Step 486 - V5 Multi-Pane TF Independence

Date: 2026-07-03

Status: completed

## Problem

The layout contract says there is exactly one active pane, the shared TF
dropdown displays that active pane's TF, and panes can use different TFs when
`Interval` sync is off. In practice, secondary/tertiary panes could still look
synced because their pane `displayTimeframe` started as `null` and fell back to
the global replay display timeframe. If primary changed TF before the secondary
pane had its own display state, the secondary pane could be visually rewritten
by the global primary chart sync.

## Implementation

- Added route-level initialization for non-primary pane displays after
  multi-pane hosts are rendered and replay is loaded.
- Non-primary panes with no explicit TF now receive the current effective TF in
  layout state and a pane-local `replay.setDisplayTimeframe` load.
- Pane-local display initialization is de-duped by `paneId:timeframe` to avoid
  repeated loads during layout rerenders.
- User-initiated active-pane TF changes mark non-primary pane display loads as
  satisfied, preventing the initializer from racing the user's change.
- Chart runtime host metadata now includes effective `displayTimeframe`, so
  browser acceptance can verify the actual chart context per pane rather than
  inferring TF from rendered bar counts.

## Validation

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/runtime/chart-runtime-host-sync.js`
- `node --check v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/layout-runtime-smoke.js`
- `node v5/tests/chart-runtime-pane-local-viewport-smoke.js`
- `node v5/tests/chart-runtime-pane-host-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`

## Notes

This keeps the V5 ownership rule intact: route UI dispatches layout/replay
commands, replay runtime loads pane-local display windows through bar-data
runtime, and chart runtime remains the only chart writer.
