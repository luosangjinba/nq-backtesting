# Chart Interaction Contracts

Phase: Phase 3 - Real Chart Interaction.

Phase gate: users can navigate chart time intentionally without breaking replay
reveal boundaries or causing implicit bar loads outside the bar data runtime.

## Scope

Step 376 introduces chart-owned interaction contracts for manual visible-range
movement.

In scope:

- manual visible-range movement as a runtime command;
- explicit follow pause/resume state;
- viewport demand emission after manual range changes;
- harnesses proving ownership boundaries.

Out of scope:

- full drag/zoom pointer implementation;
- crosshair readout;
- axis labels and tooltip polish;
- go-to time UI;
- replay toolbar polish;
- orders, journal, annotations, SaaS auth, billing, and server persistence.

## Concepts

- `autoFollow`: chart-owned state that determines whether replay cursor updates
  should drive the rendered viewport.
- `manualVisibleRange`: chart-owned range selected by user interaction.
- `resumeFollow`: explicit command that returns chart rendering to replay cursor
  follow mode.
- `visibleBars`: chart-owned rendered subset.
- `displayBars`: replay-owned revealed display history.

## Rules

- Chart runtime owns visible range observation, manual range state, and rendered
  visible bars.
- Replay runtime owns replay cursor, reveal state, and no-future display
  invariants.
- Bar data runtime remains the only owner of `/v4/bars` requests and cache.
- UI may request manual visible-range movement through chart commands only.
- Manual visible-range movement pauses auto-follow.
- Replay cursor movement must not automatically resume follow after the user has
  paused it manually.
- Resume follow is explicit.
- Manual movement may emit viewport demand, but must not request bars by itself.
- Manual movement must not directly mutate replay cursor or `displayBars`.
- If viewport demand is consumed, replay runtime may update `displayBars`
  through a bounded replay-owned display load.
- Manual visible ranges remain clamped to the replay right-edge limit.

## Runtime Contract

Chart runtime should expose commands for:

- setting a manual visible range;
- resuming viewport follow;
- reading interaction/follow state.

When manual range is set:

- auto-follow becomes disabled;
- the visible range is normalized and clamped;
- `chart:visibleRangeChanged` is emitted;
- viewport/prefix demand is recomputed and emitted if needed;
- chart rendering uses the manual visible range when possible.

When follow is resumed:

- auto-follow becomes enabled;
- manual visible range is cleared;
- chart rendering returns to cursor-follow behavior.

## Forbidden

- UI slicing `displayBars`.
- UI directly mutating chart runtime internals.
- Replay runtime treating manual visible range as replay state.
- Chart runtime requesting bars in response to manual movement.
- Auto-resuming follow on Next/Play after manual movement without an explicit
  resume command.
- Implementing full pointer drag/zoom in Step 376.

## Verification

Step 376 should add or update harnesses proving:

- manual visible-range movement pauses follow;
- manual movement does not directly mutate replay cursor or `displayBars`;
- replay-owned viewport demand consumption may grow display history without
  resuming follow;
- Next/Play does not auto-resume follow after manual movement;
- resume follow returns rendering to cursor-follow behavior;
- manual movement emits viewport demand without requesting bars directly.
- right-edge limit changes clamp manual visible range, readback state, and
  rendered bars together.

Expected checks:

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
