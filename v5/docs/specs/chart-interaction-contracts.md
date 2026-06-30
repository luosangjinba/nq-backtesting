# Chart Interaction Contracts

Phase: Phase 3 - Real Chart Interaction.

Phase gate: users can navigate chart time intentionally without breaking replay
reveal boundaries or causing implicit bar loads outside the bar data runtime.

## Scope

Step 376 introduces chart-owned interaction contracts for manual visible-range
movement.
Step 383 adds chart-owned go-to time / jump-to-cursor navigation.
Step 384 adds chart-owned toolbar zoom/pan/reset commands.

In scope:

- manual visible-range movement as a runtime command;
- explicit follow pause/resume state;
- go-to time as a chart runtime command that derives a manual visible range;
- toolbar zoom/pan as chart runtime commands that derive manual visible ranges;
- jump-to-cursor as explicit resume-follow behavior;
- viewport demand emission after manual range changes;
- harnesses proving ownership boundaries.

Out of scope:

- full drag/zoom pointer implementation;
- crosshair readout;
- axis labels and tooltip polish;
- replay toolbar polish outside chart navigation;
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
- Go-to time follows the same manual movement rules: it pauses auto-follow,
  clamps to the replay right-edge limit, and must not directly mutate replay
  cursor or `displayBars`. If viewport demand is consumed, replay runtime may
  grow `displayBars` through its bounded display-load path.
- Toolbar zoom and pan follow the same manual movement rules: they pause
  auto-follow, derive chart-owned manual visible ranges, clamp to the replay
  right-edge limit, and may emit viewport demand without requesting bars.
- Jump-to-cursor resumes chart viewport follow explicitly. It does not advance
  replay cursor.
- If viewport demand is consumed, replay runtime may update `displayBars`
  through a bounded replay-owned display load.
- Manual visible ranges remain clamped to the replay right-edge limit.

## Runtime Contract

Chart runtime should expose commands for:

- setting a manual visible range;
- going to a target time;
- zooming the current visible range in/out;
- panning the current visible range left/right;
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

When go-to time is requested:

- the target time is normalized as chart canonical time;
- chart runtime derives a visible range around the target;
- the derived range is clamped to the right-edge limit;
- auto-follow becomes disabled;
- viewport/prefix demand may be emitted.

When toolbar zoom or pan is requested:

- chart runtime derives the next visible range from the current visible range,
  manual visible range, or rendered bars;
- the derived range is clamped to the right-edge limit;
- auto-follow becomes disabled;
- viewport/prefix demand may be emitted;
- chart runtime does not request bars directly.

## Forbidden

- UI slicing `displayBars`.
- UI directly mutating chart runtime internals.
- Replay runtime treating manual visible range as replay state.
- Chart runtime requesting bars in response to manual movement.
- Auto-resuming follow on Next/Play after manual movement without an explicit
  resume command.
- Go-to time directly changing replay cursor, replay reveal state, or display
  bars. Replay-owned viewport demand handling may grow `displayBars`.
- Toolbar zoom or pan directly changing replay cursor, replay reveal state, or
  display bars. Replay-owned viewport demand handling may grow `displayBars`.
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
- toolbar zoom/pan pause follow, clamp at the replay right edge, and preserve
  reset-to-cursor as explicit follow resume.

Expected checks:

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
