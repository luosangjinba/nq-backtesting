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
Step 401 clarifies that replay transport controls are viewport-level controls
rather than chart-canvas overlays, while chart viewport anchoring remains owned
by chart runtime.
Step 404 plans the drag smoothness rule: native drag frames must not be coupled
one-for-one to viewport demand loading or full chart data replacement.
Step 405 hardens native drag fidelity: runtime chart writes must wait while
Lightweight Charts is actively processing a pointer drag.
Step 406 clarifies sparse-market left drag behavior: replay display loading may
seek across empty bounded windows when the user drags materially earlier than
the current loaded display coverage.
Step 407 locks the settle-after-drag policy: newly loaded left-side bars render
after pointer release / native interaction settle, not during the active native
drag.
Step 408 adds a diagnostic-only harness for slow/fast drag observation. It
records pointer deltas, synthetic native visible-range deltas through the
Lightweight callback path, and runtime write counters without changing drag
behavior.
Step 409 accepts minor fast-drag pointer/content offset as a comparable
TradingView/Lightweight native behavior and not a current V5 correction target.
Step 410 clarifies single-pane chart shell semantics before layout split panes:
the chart route exposes one active pane (`primary`) and layout controls remain
deferred instead of implying multi-pane behavior.
Step 411 removes the ambiguous top-level `Cursor` control and keeps the
behavior inside the Go to surface as an explicit `Jump to replay cursor`
resume-follow action.
Step 412 moves session-selection navigation out of the chart control toolbar:
the route-level return action is labeled `Sessions` and lives in the heading
area instead of the active-pane controls.
Step 413 moves the primary OHLC readout into the chart canvas area as a
top-left read-only overlay, matching the FX Replay / V4 chart inspection
pattern.
Step 414 compresses the chart route chrome so route identity/navigation remains
available without consuming workstation chart space.
Step 415 upgrades chart settings to an FXReplay-style modal with left-side
sections and Ok/Cancel draft semantics, and aligns the canvas OHLC overlay with
V4 hover behavior.
Step 422 fixes Reset View / resume-follow after native drag or wheel zoom:
explicit follow resume must clear stale manual visible ranges before chart
sync writes back to the adapter.
Step 423 fixes wheel zoom left-extension loading: wheel is treated as an
active native interaction long enough for viewport-demand loading to coalesce
and flush after settle.
Step 460 defines the Layout split panes contract before implementation:
multi-pane work must extend stable active-pane semantics, keep replay cursor
shared by default, and route pane chart writes through chart runtime.

In scope:

- manual visible-range movement as a runtime command;
- explicit follow pause/resume state;
- go-to time as a chart runtime command that derives a manual visible range;
- jump-to-replay-cursor as an explicit Go to surface action;
- toolbar zoom/pan as chart runtime commands that derive manual visible ranges;
- native chart-engine visible-range observation without per-frame data
  replacement;
- settled or coalesced viewport demand consumption after native drag movement;
- chart display readability required for native interaction to be usable;
- compact replay workstation layout around the chart;
- single-pane active chart pane semantics that future layout work can reuse;
- viewport-level floating replay transport positioning;
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
- Jump-to-replay-cursor is a chart follow action exposed from the Go to surface.
  It resumes viewport follow without advancing replay cursor, resetting replay,
  or changing revealed bars.
- Toolbar zoom and pan follow the same manual movement rules: they pause
  auto-follow, derive chart-owned manual visible ranges, clamp to the replay
  right-edge limit, and may emit viewport demand without requesting bars.
- Native Lightweight Charts pan/zoom remains owned by Lightweight Charts during
  pointer interaction. V5 observes the resulting visible range and updates
  chart-owned interaction state without calling `series.setData()` for every
  native interaction frame.
- Native visible-range observation may update chart-owned manual range state
  promptly, but replay-owned viewport demand consumption should be coalesced or
  debounced so left-drag movement does not trigger a bounded bar load for every
  pointer frame.
- Native pointer drag is an active interaction phase. While it is active, V5 may
  record manual visible range and emit demand, but must not write replacement
  data or visible ranges back into the chart engine. Queued runtime chart syncs
  should flush once the native interaction settles.
- Native wheel zoom is also an active interaction phase. Its settle window must
  be long enough for viewport-demand debounce/load to defer chart writes until
  after the wheel interaction settles.
- The active native drag guard applies even when replay/bar-data work expands
  loaded chart coverage. Newly available left-side bars should render after
  mouseup / interaction settle rather than via active-drag `setData()`.
- Viewport demand identity should be stable at the load-window level. Tiny
  visible-range differences during a drag must not create distinct load keys if
  they map to the same bounded history window.
- Drag diagnostics may inject synthetic native visible-range frames in tests,
  but production behavior must continue to observe the real chart engine and
  must not use diagnostic hooks to mutate replay/chart state.
- Minor pointer/content offset during very fast native drag is acceptable when
  it is comparable to TradingView/FxReplay behavior and does not break replay
  navigation accuracy. V5 must not add compensating production writebacks that
  risk native drag fidelity or manual replay anchors.
- Consuming cached or duplicate viewport demand must not call chart
  `replaceBars` / Lightweight `series.setData()` when merged display bars are
  unchanged.
- Backward display-window loading may encounter sparse market gaps such as
  futures weekends or closed-session periods. Replay runtime may request the
  next earlier bounded display window when the current backward window adds no
  older display bars and the requested viewport is materially earlier than the
  current earliest display bar. This seek must stay capped and must keep
  individual bar requests inside bar-data runtime.
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
- Route navigation back to session selection is not a chart command. It should
  live in route-level heading/navigation UI and use clear wording such as
  `Sessions`, not `Setup` inside active-pane chart controls.
- Until multi-pane layout is implemented, the chart route must expose exactly
  one active chart pane with stable `primary` pane identity. Chart display
  timeframe, go-to, settings, replay transport, and reset/follow actions target
  that active pane by default.
- The disabled Layout entry is a deferred affordance only. It must not create
  panes, mutate chart layout state, or suggest active split-pane behavior until
  a dedicated layout ownership step defines multi-pane synchronization rules.
- Future Layout split panes must follow
  `layout-split-panes-contract.md`: layout runtime owns pane identity and sync
  flags, chart runtime owns per-pane chart hosts/visible ranges, replay runtime
  owns the shared cursor/reveal state, and Settings targets the active pane by
  default.
- The floating replay transport may be dragged outside the chart/canvas area,
  but it remains clamped to the visible browser viewport and must stay below
  modal/popover layers while those layers are open.
- Status can move into a compact footer band, but status rendering must remain
  read-only with respect to replay/chart/bar-data state.
- The current-bar OHLC readout should be visible in the chart canvas top-left
  area, not only in the footer/status band. It remains read-only route UI that
  uses replay display state and must not write chart series or mutate replay.
- The chart OHLC overlay follows V4 legend behavior: when crosshair hover has a
  bar, the overlay shows that hover bar's OHLC; otherwise it falls back to the
  latest replay display bar. This overlay remains read-only route UI.
- The visible chart route should not expose engineering shell labels as product
  UI.
- Chart Settings should use a formal modal structure with left-side sections
  such as Symbol, Status line, Scales and lines, and Canvas. Settings edits are
  draft UI state until the user confirms with Ok; Cancel/close must discard the
  draft without dispatching runtime mutation commands.
- Candle color settings belong in Chart Settings as draft presentation edits.
  Confirming with `Ok` updates presentation runtime state, then chart runtime
  passes the style through display context to the adapter. Route UI must not
  mutate Lightweight series options directly.
- Grid and crosshair style settings follow the same Settings draft path:
  presentation runtime owns normalized state, chart runtime carries it in
  display context, and the adapter maps it to chart-engine options. Route UI
  must not mutate Lightweight grid/crosshair options directly.
- Route heading/navigation chrome should stay compact and secondary to the
  chart surface. Session navigation remains route-level UI, while TF, Go to,
  Layout, and Settings remain active-pane controls.
- Chart route chrome compression must not change replay cursor, display bars,
  bar-data windows, chart runtime ownership, or active pane identity.
- Chart navigation overlays must not obscure the time axis, bottom chart area,
  or right price axis. Overlay placement may change visually, but command
  dispatch and chart runtime ownership must remain unchanged.
- Jump-to-cursor resumes chart viewport follow explicitly. It does not advance
  replay cursor.
- Reset View / resume-follow must clear the previous manual/native visible
  range. Once interaction mode is follow, chart host sync must not call
  adapter visible-range writes with a stale manual range after applying the
  follow logical range.
- Native interaction settle may re-emit the current viewport demand. The replay
  viewport-demand bridge must de-dupe by demand key, so this settled emission is
  a reliability guard for wheel-created left-side blank space rather than a
  separate loading path.
- The chart route should not expose a top-level button labeled `Cursor` because
  that reads like a crosshair/tool toggle. The visible action should be named
  by behavior, such as `Jump to replay cursor`.
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
- Jump-to-replay-cursor changing replay cursor, replay reveal state, or
  display bars.
- Toolbar zoom or pan directly changing replay cursor, replay reveal state, or
  display bars. Replay-owned viewport demand handling may grow `displayBars`.
- Replacing chart data on every native mousemove, wheel, drag, or crosshair
  event.
- Triggering replay display-window loads for every native visible-range event
  while the user is actively dragging.
- Including high-frequency visible range details in viewport demand identity
  when they do not materially change the bounded load window.
- Re-rendering chart data for cached or duplicate display windows whose merged
  display bars have not changed.
- Duplicating Lightweight Charts native wheel zoom, pressed mouse pan,
  price-axis scaling, or crosshair move behavior in V5 shell code.
- Compressing the Lightweight chart engine surface through fallback-only canvas
  padding.
- Leaving intraday Lightweight time-axis labels as repeated day-only values.
- Reintroducing stacked engineering control rows that crowd the main chart.
- Showing engineering shell labels such as `Chart Replay Shell` or
  `Chart Route` in the replay workstation UI.
- Placing session-selection route navigation inside the active chart-control
  toolbar as though it were a chart command.
- Hiding the primary OHLC readout only in the footer when chart users expect it
  near the canvas status line.
- Adding multi-pane chart behavior without first defining active-pane ownership,
  chart runtime routing, and sync rules.
- Letting the deferred Layout control mutate route state or chart layout.
- Reimplementing price-axis vertical scaling in V5 shell code when Lightweight
  already owns native price scale interaction.
- Tuning price placement by shrinking the Lightweight DOM surface.
- Placing chart navigation overlays where they cover the time axis or right
  price axis.
- Letting viewport-level replay transport controls cover active Settings,
  Go-to, or replay warning popovers.
- Treating movement of the floating replay transport as chart viewport
  movement.
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
- the chart route exposes one active `primary` pane, keeps Layout deferred, and
  leaves TF/Go-to/Settings visible as active-pane controls.
- Go to contains the explicit `Jump to replay cursor` action, and the top-level
  toolbar does not expose an ambiguous `Cursor` button.
- session-selection navigation is available as `Sessions` in route-level
  heading/navigation UI and is absent from the chart-control toolbar.
- current-bar OHLC is visible as a chart top-left overlay and follows the same
  show/hide presentation setting as the status OHLC row.
- price scale margins are applied through Lightweight price scale APIs and stay
  compatible with native interaction.
- chart navigation overlays keep measurable clearance from the time axis and
  right price axis across desktop and low-height desktop viewports.
- floating replay transport movement does not mutate replay/chart/bar-data
  state and remains below active popovers.

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
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
