# Chart Interaction Contracts

Phase: Phase 3 - Real Chart Interaction.

Phase gate: users can navigate chart time intentionally without breaking replay
reveal boundaries or causing implicit bar loads outside the bar data runtime.

## Scope

Step 376 introduces chart-owned interaction contracts for manual visible-range
movement.
Step 383 adds chart-owned go-to time / jump-to-cursor navigation.
Step 384 adds chart-owned toolbar zoom/pan/reset commands.
Step 385 fixes Lightweight Charts native interaction so V5 observes native
pan/zoom/crosshair behavior without fighting the chart engine.
Step 386 fixes main chart display usability: intraday time-axis labels must be
meaningful, and Lightweight presentation settings must not shrink the engine
surface.
Step 387 consolidates replay workstation layout so controls and status do not
crowd the main chart surface.
Step 388 tunes Lightweight price scale margins for more natural initial K-line
vertical placement while preserving native price-axis scaling.
Step 389 moves chart navigation overlays away from the time axis and price axis
critical regions.

In scope:

- manual visible-range movement as a runtime command;
- explicit follow pause/resume state;
- go-to time as a chart runtime command that derives a manual visible range;
- toolbar zoom/pan as chart runtime commands that derive manual visible ranges;
- native chart-engine visible-range observation without per-frame data
  replacement;
- chart display readability required for native interaction to be usable;
- compact replay workstation layout around the chart;
- chart adapter/presentation price scale margin tuning;
- chart navigation overlay placement that preserves axis readability;
- jump-to-cursor as explicit resume-follow behavior;
- viewport demand emission after manual range changes;
- harnesses proving ownership boundaries.

Out of scope:

- full drag/zoom pointer implementation;
- crosshair readout;
- full axis label and tooltip polish beyond Step 386 time-axis readability;
- deeper visual design polish beyond compact workstation layout;
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
- Native Lightweight Charts pan/zoom remains owned by Lightweight Charts during
  pointer interaction. V5 observes the resulting visible range and updates
  chart-owned interaction state without calling `series.setData()` for every
  native interaction frame.
- Replay right-edge/no-future enforcement may correct a native visible range
  only when it exceeds the replay cursor boundary.
- Lightweight mode must use `subscribeCrosshairMove` for crosshair readout and
  must not also attach a parallel canvas `mousemove` crosshair implementation.
- High-frequency crosshair/readout updates should be deduped or throttled
  before route DOM updates.
- Lightweight time-axis ticks should use V5 display timezone/time-format
  context, and intraday ticks must not collapse into repeated day-only labels.
- Fallback DOM presentation padding must not be applied to the Lightweight
  engine surface. Lightweight chart layout should keep the main drawing surface
  at a stable usable height.
- Lightweight price scale readability should use
  `series.priceScale().applyOptions({ scaleMargins })` with bounded margins.
  It must not replace native price-axis drag scaling or apply DOM padding to the
  chart surface.
- Replay controls, timeframe, timezone, presentation toggles, and go-to controls
  may be visually consolidated, but they must continue dispatching commands and
  using events rather than taking ownership of runtime state.
- Status can move into a compact footer band, but status rendering must remain
  read-only with respect to replay/chart/bar-data state.
- The visible chart route should not expose engineering shell labels as product
  UI.
- Chart navigation overlays must not obscure the time axis, bottom chart area,
  or right price axis. Overlay placement may change visually, but command
  dispatch and chart runtime ownership must remain unchanged.
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

When native Lightweight Charts pan/zoom is observed:

- chart runtime records manual interaction state and visible range;
- chart runtime emits visible-range and viewport-demand events as needed;
- chart runtime does not rerender bars or call `setData()` just to echo the
  native range;
- only out-of-bounds future movement is corrected back to the replay right-edge
  limit.

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
- Replacing chart data on every native mousemove, wheel, drag, or crosshair
  event.
- Duplicating Lightweight Charts native wheel zoom, pressed mouse pan,
  price-axis scaling, or crosshair move behavior in V5 shell code.
- Compressing the Lightweight chart engine surface through fallback-only canvas
  padding.
- Leaving intraday Lightweight time-axis labels as repeated day-only values.
- Reintroducing stacked engineering control rows that crowd the main chart.
- Showing engineering shell labels such as `Chart Replay Shell` or
  `Chart Route` in the replay workstation UI.
- Reimplementing price-axis vertical scaling in V5 shell code when Lightweight
  already owns native price scale interaction.
- Tuning price placement by shrinking the Lightweight DOM surface.
- Placing chart navigation overlays where they cover the time axis or right
  price axis.
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
- native Lightweight pan/zoom does not create a `setData` storm and keeps
  crosshair/grid presentation subdued.
- intraday time-axis labels are distinguishable and the main chart surface has
  a stable usable height.
- replay workstation controls are compact, status remains visible, and the main
  chart remains the dominant surface.
- price scale margins are applied through Lightweight price scale APIs and stay
  compatible with native interaction.
- chart navigation overlays keep measurable clearance from the time axis and
  right price axis across desktop and low-height desktop viewports.

Expected checks:

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
