# Step 396 - V5 Replay Transport Semantic Alignment

Date: 2026-06-30

## Goal

Correct the floating replay transport semantics after comparing the V5 controls
against the FXReplay reference transport.

## Scope

This step advances Historical Replay Review by making the high-frequency replay
controls less misleading.

In scope:

- durable TODO decision for FXReplay transport semantics;
- moving display timeframe into chart settings;
- replacing the floating transport contents with replay-specific controls;
- keeping unsupported runtime actions disabled;
- wiring playback speed into the existing replay `Play` command payload;
- browser smoke updates for selector placement and behavior.

Out of scope:

- selected-bar truncation runtime implementation;
- previous-bar stepping runtime implementation;
- active chart interval sync runtime implementation;
- Layout split panes;
- drawing tools;
- order or journal workflows;
- chart-engine interaction changes.

## Plan

- [x] Record the transport decision in `v5/TODO.md`.
- [x] Move `data-display-timeframe-select` into the chart settings Time
  section.
- [x] Add floating replay transport semantics:
  - drag handle;
  - disabled selected-bar truncation placeholder;
  - playback speed slider;
  - disabled previous-bar placeholder;
  - play/pause;
  - disabled replay interval placeholder;
  - next bar;
  - disabled sync active chart interval placeholder.
- [x] Move replay reset out of the floating transport and keep it as a lower
  frequency command in the Go To panel.
- [x] Update browser smokes so the floating transport cannot contain chart
  display timeframe controls.
- [x] Run targeted smokes, full V5 smoke, and `git diff --check`.

## Implementation Notes

- `v5/src/features/chart-replay/chart-replay-route.js` now keeps chart display
  timeframe in Settings while the floating transport exposes
  `data-replay-interval-select` as a disabled replay interval placeholder.
- `data-replay-speed` is local UI state that changes the `intervalMs` sent to
  `REPLAY_COMMANDS.PLAY`; replay runtime still owns playback state.
- `data-replay-truncate-to-selection`, `data-replay-previous`, and
  `data-replay-sync-interval` are disabled because V5 does not yet have runtime
  commands for those FXReplay behaviors.
- Existing `data-display-timeframe-select` behavior remains command-driven
  through `REPLAY_COMMANDS.SET_DISPLAY_TIMEFRAME` and still preserves the
  no-future display projection invariant.

## Manual Acceptance

- The floating replay transport no longer exposes chart display timeframe.
- The Settings surface still lets users change display interval.
- Playback speed affects the interval used by Play.
- Unsupported transport semantics are disabled, not wired to unrelated runtime
  behavior.
- Replay cursor, reveal state, chart series ownership, and bar-data ownership
  remain unchanged.

## Checks

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

All checks passed before commit.
