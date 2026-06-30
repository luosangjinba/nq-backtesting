# Step 394 - V5 Replay Transport UI And Timeframe Dropdown

Date: 2026-06-30

## Goal

Replace the floating replay text-button group with a compact chart transport
and move display timeframe selection into a single dropdown.

## Scope

This step advances Historical Replay Review by improving the highest-frequency
replay controls inside the chart viewport.

In scope:

- compact icon transport styling for replay reset, play, pause, and next;
- a single display-timeframe dropdown for the supported intervals;
- browser smoke coverage for replay command behavior and display-timeframe
  switching through the dropdown;
- documentation of the recent UI decisions that should shape future settings
  and workstation cleanup.

Out of scope:

- replay runtime ownership changes;
- bar-data loading changes;
- Lightweight Charts interaction changes;
- settings dialog implementation;
- Layout split panes;
- drawing tools;
- order or journal workflows.

## Plan

- [x] Keep existing `data-replay-*` command selectors so replay behavior remains
  command-driven.
- [x] Restyle floating controls as a transport bar with a small handle and
  icon buttons.
- [x] Replace the `1m / 5m / 1H / 1D` button row with
  `data-display-timeframe-select`.
- [x] Group the dropdown by Minutes / Hours / Days while only enabling the
  currently supported V5 intervals.
- [x] Update browser smokes that previously clicked timeframe buttons.
- [x] Run targeted replay/layout smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- `v5/src/features/chart-replay/chart-replay-route.js` keeps the replay action
  selectors (`data-replay-reset`, `data-replay-play`, `data-replay-pause`,
  `data-replay-next`) but changes their visible labels to compact transport
  icons.
- Display timeframe selection now flows through
  `data-display-timeframe-select`, which dispatches the existing
  `REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME` command.
- `v5/src/styles/app.css` adds transport-specific styling and a screen-reader
  utility class for the dropdown label.
- `v5/tests/replay-floating-controls-browser-smoke.js` verifies the transport
  remains inside the chart, uses four transport buttons plus one timeframe
  dropdown, and still runs Next, timeframe switch, Go To, and Reset.
- `v5/tests/replay-display-timeframe-browser-smoke.js` now switches to `5m`
  through the dropdown and verifies display projection still works.

## Manual Acceptance

- The floating replay controls no longer read as a row of generic text buttons.
- Replay actions still work through the existing command selectors.
- Display timeframe uses one dropdown instead of four visible buttons.
- The dropdown contains the supported V5 intervals and is structured for later
  interval expansion.
- Replay cursor, reveal state, chart series ownership, native Lightweight
  interactions, and bar-data ownership are unchanged.

## Checks

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
