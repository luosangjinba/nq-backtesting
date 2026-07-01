# Step 403 - V5 Single Pane Timeframe Control

Date: 2026-07-01

## Goal

Make chart timeframe switching a visible single-pane control and verify that
changing TF truly reloads/renders display timeframe bars.

## Investigation

The existing display timeframe path already routes through replay runtime:

- chart route dispatches `replay.setDisplayTimeframe`;
- replay runtime loads a display window for the selected timeframe;
- replay runtime renders display bars through chart runtime;
- chart runtime owns the chart series write.

The missing product shape was not a runtime ownership problem. The chart TF
control was hidden inside Settings and the route had no explicit active pane
identity, which made the behavior hard to discover and weak for future
multi-pane work.

## Decision

Chart display TF is an active chart pane control, not a Settings-only
preference. V5 still has one pane, but the chart route now names that pane
`primary`. Future multi-pane work should extend this active pane identity rather
than replacing the single-pane command path.

Replay interval remains separate: it stays in the floating replay transport and
continues to mean playback step size.

## Implementation

- Moved the chart display TF dropdown to the visible replay workstation toolbar.
- Removed the primary chart TF dropdown from Settings.
- Added `data-active-pane-id="primary"` on the chart route and
  `data-chart-pane-id="primary"` on the chart pane/host.
- Included `paneId: "primary"` in the chart TF command payload as forward
  compatibility context.
- Updated browser smoke coverage to:
  - operate the visible toolbar TF dropdown;
  - assert Settings does not own a duplicate primary TF dropdown;
  - assert active pane id is `primary`;
  - assert switching to `5m` changes display context and rendered chart bars to
    5m boundaries.

## Manual Acceptance

- The chart TF dropdown is visible on the chart page without opening Settings.
- Changing chart TF to `5m` dispatches display timeframe reload and chart data
  changes to 5m bars.
- Settings no longer owns the primary chart TF dropdown.
- Replay interval dropdown remains in the floating replay transport and remains
  playback-step semantics.
- The single chart pane is marked as active pane `primary`.

## Checks

- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Next

Continue hardening single-pane chart controls before Layout split panes. Good
next candidates are active-pane-aware Go to/Cursor semantics, visible status
line compactness, or a minimal active-pane registry contract.
