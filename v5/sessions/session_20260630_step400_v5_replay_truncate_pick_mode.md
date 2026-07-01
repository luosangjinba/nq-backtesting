# Step 400 - V5 Replay Truncate Pick Mode

Date: 2026-06-30

## Goal

Align the `|<-` replay transport action with FXReplay's pick-then-click
truncation workflow.

## Scope

This step advances Historical Replay Review by correcting the selected-bar
truncation interaction while preserving the Step 399 replay runtime command
boundary.

In scope:

- route-local truncate pick mode after clicking `|<-`;
- vertical chart guide while picking;
- chart-click timestamp selection through chart runtime rendered-bar data;
- before-session-start and after-cursor UI guardrails;
- browser smoke coverage for the corrected interaction.

Out of scope:

- replay playback interval sync;
- Layout split panes;
- drawing tools;
- order or journal workflows;
- direct chart-engine API ownership from the route.

## Plan

- [x] Document the corrected `|<-` pick-mode decision.
- [x] Replace crosshair-driven immediate truncation with explicit pick mode.
- [x] Dispatch `replay.truncateToTimestamp` only after a valid chart click.
- [x] Show modal-style feedback for before-session-start picks.
- [x] Update browser smoke coverage.
- [x] Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- UI remains a command/event consumer. The route may hold local pick-mode UI
  state, but replay cursor/display mutation remains owned by replay runtime.
- The route maps pointer x-position to the nearest rendered chart bar returned
  by `chart.getRenderedBars`; it does not import chart runtime or chart-engine
  internals.
- Picks before `startBarTimestamp` are rejected with an explicit warning.
- Picks after `cursorTimestamp` are rejected before command dispatch and remain
  additionally protected by replay runtime.

## Manual Acceptance

- `|<-` is available after replay initial load without needing a crosshair
  event.
- Clicking `|<-` enters pick mode and shows a vertical guide over the chart.
- Clicking a valid revealed bar truncates future bars after that timestamp.
- Clicking before session start shows a warning and does not mutate replay
  state.
- Same-timeframe truncation does not request new bars.

## Checks

- `node v5/tests/replay-truncate-smoke.js`
- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
