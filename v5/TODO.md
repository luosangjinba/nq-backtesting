# V5 TODO

## TODO Organization

- Step numbers are historical execution IDs, not phase numbers.
- This file keeps Current / Next at the top and completed steps in numeric order.
- Do not move the latest completed step to the top; add or update the current/next note instead.
- If a step number appears missing before Step 357, it is outside the V5 TODO history.
- Future work should continue with the next explicit step number and update the session handoff.

## Current / Next

- Current status: Step 434 is complete. Replay playback timer/state now lives
  in `runtime/replay-playback-controller.js`; the main replay runtime delegates
  `PLAY`, `PAUSE`, and `GET_PLAYBACK_STATE` and no longer owns playback timer
  lifecycle or advancing guards.
- Next candidate: Step 435 - finish the replay runtime split by extracting
  navigation/truncation/reset cursor mutation into an explicit controller, then
  return to the next Settings contract once replay runtime boundaries are small
  enough to absorb new behavior cleanly.
- Step 379 advanced Historical Replay Review by replacing the visible default
  DOM fallback with the real chart engine while preserving no-future replay
  boundaries.
- Step 380 advances Historical Replay Review by making the real chart engine's
  pan/zoom/right-edge behavior obey replay-workstation boundaries.
- Step 381 added chart-owned crosshair readout; follow-up fix removed
  crosshair-triggered chart rerenders so hover inspection cannot call
  `setData()` on every mouse move.
- Known next issue: Layout split panes need a dedicated planning step before
  implementation because multi-chart ownership and sync rules must be explicit.
- UI decision: `Exchange / UTC` is useful as a display-timezone switch, but it
  should not stay as a prominent top-level control long term. Default to
  `Exchange`; later move timezone display switching into a display/settings
  menu. It must remain display-only and must not change replay cursor, bar
  order, or loaded windows.
- UI decision: low-frequency chart presentation controls such as `24h / 12h`,
  `OHLC`, `Change`, `Crosshair`, `Compact`, and `+16` should also move out of
  the top-level toolbar into a future chart settings surface. The target shape
  is a compact entry point such as a context-menu `Settings...` item or gear
  button that opens a settings dialog/panel with sections for symbol/status
  line/scales/canvas-style display preferences.
- UI decision: the primary OHLC readout belongs in the chart canvas top-left
  area, consistent with V4 and FX Replay. The footer/status band may still
  expose compact state, but the chart inspection/status line should be visible
  on the canvas and controlled by the same OHLC presentation setting.
- UI decision: the chart OHLC overlay follows V4 hover semantics. When
  crosshair hover identifies a bar, the top-left OHLC legend shows that bar;
  otherwise it shows the latest replay display bar.
- UI decision: Chart Settings should follow the FXReplay modal pattern: left
  section navigation, right-side grouped settings, and bottom `Cancel` / `Ok`.
  Edits inside the modal are draft route UI state until `Ok`; `Cancel`, close,
  or backdrop dismiss must discard the draft without mutating presentation,
  timezone, replay, chart, or bar-data runtime state.
- UI decision: candle body/border/wick colors are chart presentation settings.
  They belong in the Settings `Symbol` section as draft edits, normalize to
  `#rrggbb`, and apply only through presentation runtime -> chart display
  context -> chart-engine adapter. UI must not call chart series APIs directly.
- UI decision: grid and crosshair visual style are chart presentation settings.
  They belong in Settings as draft edits, normalize colors to `#rrggbb`, and
  apply only through presentation runtime -> chart display context ->
  chart-engine adapter. UI must not call Lightweight chart APIs directly.
- UI decision: remaining FXReplay Settings parity must be staged. Step 420 can
  implement pure presentation controls such as time/date labels and current
  label visibility. Price-scale modes, scale placement, lock price-to-bar ratio,
  watermark, and session breaks need explicit chart-engine/runtime acceptance
  before implementation. Template behavior is deferred until presentation
  settings persistence is designed.
- UI decision: date format, day-of-week labels, and status title mode are chart
  presentation settings. They must affect labels and titles only, not canonical
  timestamps, replay cursor, display bars, request ranges, or bar-cache keys.
- UI decision: price/time scale visibility, scale border visibility, and text
  watermark are chart-engine presentation settings. They must normalize through
  presentation runtime state and apply only through chart display context and
  the chart-engine adapter. UI must not call Lightweight APIs directly.
- UI decision: price scale side is a chart presentation setting. It supports
  `right` and `left`; hiding the scale remains controlled by
  `priceScaleVisible`. The route UI edits draft settings only, and the
  chart-engine adapter maps the side to Lightweight left/right price scale
  options.
- Planning decision: Settings work must follow the backlog matrix in
  `v5/docs/SETTINGS_BACKLOG_MATRIX.md`. Only presentation-runtime rows can be
  implemented directly from the Settings UI; chart-engine, replay-runtime,
  persistence, and pane rows need a dedicated contract step first.
- Replay contract decision: bar countdown is replay-derived display state, not
  route UI math. Replay runtime owns `countdown` on `GET_STATE`, presentation
  runtime owns only the `showBarCountdown` visibility preference, and route UI
  only renders the provided label.
- Bugfix decision: Reset View and Jump-to-cursor resume chart viewport follow.
  They must clear any previous manual/native visible range before rerendering,
  and chart sync must not write stale manual ranges after a follow-mode logical
  range has been applied.
- Bugfix decision: native wheel zoom is an active chart interaction, not an
  instantaneous event. Wheel settle must stay long enough for viewport-demand
  loading to be coalesced and flushed after interaction settle, and settle
  should re-emit an existing viewport demand because the replay bridge de-dupes
  by demand key.
- Refactor decision: chart route modularization should start with stable
  route-local UI surfaces before runtime internals. Settings can own its modal
  HTML, draft controls, tab switching, and apply/cancel bindings, but it must
  continue to mutate app state only through route-provided command callbacks.
  The route shell remains responsible for runtime orchestration, event
  subscriptions, and chart/replay command ownership.
- Refactor decision: chart replay route modules should separate route
  orchestration, static template markup, route-local UI controllers, and runtime
  bridges. Page template modules may compose UI templates, and UI controllers
  may own DOM-only behavior such as floating transport drag, but replay/chart
  mutations must still flow through route callbacks and runtime commands.
- Refactor decision: chart runtime pure helpers belong outside the runtime
  shell. State shape/normalization and viewport/range demand calculations can
  live in helper modules, while `chart-runtime.js` remains the only chart
  runtime command/event owner and the only runtime that writes chart adapters.
- Refactor decision: replay runtime pure helpers and chart synchronization
  belong outside the runtime shell. `replay-runtime-state.js` owns replay state
  shape, timestamp/timeframe math, display-bar safety filters, prefix retention
  helpers, and countdown derivation. `replay-chart-sync.js` is the only replay
  helper that dispatches chart commands. `replay-runtime.js` should remain the
  command owner/orchestrator and should not accumulate new feature logic that
  fits one of those boundaries.
- Refactor decision: prefix demand and prefix retention are a replay subsystem,
  not main-runtime inline logic. `replay-prefix-controller.js` owns left-side
  sparse prefix loading, anchor de-dupe, prefix chunk release, and sparse
  display merge after retention. `replay-runtime.js` may register the replay
  commands and reset the controller lifecycle, but it should not reintroduce
  prefix implementation bodies.
- Refactor decision: display-window loading is a replay subsystem, not
  main-runtime inline logic. `replay-display-window-controller.js` owns
  display-timeframe switching, viewport-demand display-window loads, duplicate
  display-window de-dupe, sparse backward seek attempts, display context
  snapshots, and cursor display projection. `replay-runtime.js` may register
  display commands and call projection after cursor moves, but it should not
  reintroduce display-window implementation bodies.
- Refactor decision: playback timer/state is a replay subsystem, not
  main-runtime inline logic. `replay-playback-controller.js` owns playing state,
  interval/step settings, timer lifecycle, advancing guard, and
  `PLAYBACK_CHANGED` emission. `replay-runtime.js` may register playback
  commands and inject `next` as the advance callback, but it should not
  reintroduce playback implementation bodies.
- Refactor decision: chart engine adapter modules should separate factory,
  context normalization, presentation/options mapping, DOM fallback rendering,
  and Lightweight engine integration. Adapter implementations may write their
  own engine/DOM surfaces, but callers must continue to use the stable
  `createChartEngineAdapter` API through chart runtime ownership.
- Refactor decision: Lightweight chart adapter internals should keep lifecycle,
  native input/writeback tracking, and crosshair/readout mapping separate. This
  keeps future reset/zoom/drag, multi-pane sync, order markers, and review
  overlays from accumulating in the factory or a single adapter body.
- UI decision: avoid exposing both `Cursor` and `Reset` as similar top-level
  chart actions. Step 411 moved the old top-level `Cursor` behavior into the
  Go to surface as `Jump to replay cursor`; it resumes chart viewport follow
  without advancing replay cursor or resetting replay state.
- UI decision: replace the current floating replay text-button group
  (`Next / Play / Pause / Reset`) with a compact FXReplay-style transport bar.
  Use icon buttons for step/back/play-pause/step-forward/reset or follow,
  preserve command-driven replay behavior, and avoid making replay controls
  look like a generic admin button group.
- UI decision: replace the top-level display-timeframe button row
  (`1m / 5m / 1H / 1D`) with a single current-timeframe dropdown such as
  `1m v`. The dropdown should be grouped by Seconds / Minutes / Hours / Days
  when broader intervals are supported; MVP can initially expose only the
  already supported `1m`, `5m`, `1H`, and `1D` entries.
- UI decision: the compact floating replay transport follows FXReplay
  semantics, not generic chart display controls. From left to right: drag
  handle; `|<-` means pick a bar/date and truncate future bars after it;
  slider means playback speed; `<|` means previous bar; `Play` means autoplay
  bars; `1m v` means replay playback interval, not chart display timeframe;
  `>|` means next bar; the toggle means sync the replay playback interval with
  the active chart interval. Unsupported semantics must appear disabled or be
  deferred; do not wire them to unrelated display-timeframe behavior.
- UI decision: display timeframe remains a chart display preference, not a
  replay transport control. Keep it in chart settings until a broader interval
  menu is designed, and preserve the existing display-projection/no-future
  runtime invariants.
- UI decision: the replay transport drag handle should move the floating
  controls as a viewport-level control, not as a chart-canvas overlay. It may
  leave the chart area but must remain clamped to the visible browser viewport.
  Position may remain route-local UI state; dragging must not mutate replay
  cursor, display bars, chart data, or bar-data windows. Modal/popover layers
  must remain above the floating transport.
- UI decision: `|<-` selected-bar truncation should follow FXReplay pick-mode
  semantics. Clicking the transport button enters a route-local pick mode with a
  vertical chart guide; the next chart click selects the truncation timestamp.
  A timestamp before the replay session start must not truncate and should show
  an explicit modal-style warning. A timestamp after the current replay cursor
  must also be rejected by UI/runtime guardrails. The final mutation must still
  go through a replay runtime command; UI must not directly mutate cursor,
  display bars, or persistence.
- UI decision: the Setup route remains functionally necessary as the session
  selection/creation surface, but its current MVP visual treatment is not the
  final workstation quality bar. Step 412 renamed the chart route return entry
  to `Sessions` and moved it to route-level heading navigation; give the setup
  route itself a later visual pass after the chart route's high-frequency
  replay controls and settings surfaces are cleaned up.
- New steps should state whether they advance Historical Replay Review, Live
  Execution Review, both, or necessary shared infrastructure.
- Product guardrail: Historical Replay Review and Live Execution Review can
  coexist on one chart surface. Future order/journal/review artifacts should
  share chart context, canonical time, and ownership paths instead of creating
  isolated chart products.
- Product guardrail: The heavy work after review is statistics, analysis, and
  decision support. Future AI assistance should be grounded in structured review
  artifacts, evidence, tags, orders, and outcomes, not detached chat or generic
  dashboards.
- Product guardrail: Dashboards are expected, but as review-grounded data
  visualization. They should expose metrics, distributions, timelines, and
  drilldowns back to the underlying review artifacts.

## Cross-Phase Rule - SaaS-Ready, Not SaaS-Heavy

Goal: preserve the option to become a hosted SaaS without slowing the current
replay workstation MVP with premature auth, billing, or server infrastructure.

- [x] Add SaaS readiness strategy to specs and phase docs.

Manual acceptance:

- New durable models keep user/workspace/session ownership paths.
- Feature modules use commands/events and repositories/runtimes, not direct
  persistence access.
- Phase 3 remains chart interaction work.
- Phase 4 validates replay + order + journal training value.
- Phase 6 is the earliest phase for public auth, billing, entitlement, and
  server-backed multi-user maturity.

## Completed Steps In Numeric Order

## Step 357 - MVP Architecture And V5 Bootstrap

Goal: start V5 with a fixed modular framework before implementation begins.

- [x] Step 357.1: Create V5 workspace skeleton.
- [x] Step 357.2: Write MVP architecture review.
- [x] Step 357.3: Freeze module ownership and forbidden dependencies.
- [x] Step 357.4: Define MVP product scope and non-goals.
- [x] Step 357.5: Define multi-user baseline model.
- [x] Step 357.6: Define phased implementation plan with manual acceptance
  standards.

Manual acceptance:

- V5 has its own README, architecture document, TODO, and session handoff.
- The document explicitly prevents V4-style coupling:
  - UI cannot directly write chart data;
  - features cannot directly request bars;
  - replay cursor state has one owner;
  - features cannot directly control each other.
- MVP starts with a setup page and a chart replay page.
- Multi-user is represented in the model from day one, even if auth is deferred.

## Step 358 - V5 App Shell Skeleton

Goal: create the V5 frontend shell without business features.

- [x] Step 358.1: Add V5 static entry page and source directory.
- [x] Step 358.2: Add runtime command bus and event bus.
- [x] Step 358.3: Add module registry and lifecycle hooks.
- [x] Step 358.4: Add route shell for Session Setup and Chart Replay.
- [x] Step 358.5: Add smoke tests that fail if features bypass runtime
  boundaries.

Manual acceptance:

- Opening the V5 entry shows a working shell with setup/chart routes.
- No chart, replay, or bars behavior is implemented yet.
- Boundary tests exist before feature implementation.

Checks:

- `node v5/tests/runtime-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 359 - V5 Session And User Model

Goal: add default-user session persistence APIs and frontend session state.

- [x] Step 359.1: Define users, workspaces, replay sessions, and session cursor
  schema.
- [x] Step 359.2: Add default user/workspace bootstrap.
- [x] Step 359.3: Add create/list/get replay session API.
- [x] Step 359.4: Add frontend session runtime and command contracts.
- [x] Step 359.5: Add persistence smoke tests.

Manual acceptance:

- A replay session can be created and reloaded by session id.
- All user-owned records belong to a user or workspace.
- No UI code writes session state directly.

Checks:

- `node v5/tests/session-model-smoke.js`
- `node v5/tests/default-workspace-smoke.js`
- `node v5/tests/session-repository-smoke.js`
- `node v5/tests/session-runtime-smoke.js`
- `node v5/tests/session-persistence-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 360 - V5 Session Setup Page

Goal: build the FX Replay session setup page.

- [x] Step 360.1: Build instrument/timeframe/date range form.
- [x] Step 360.2: Validate session start/end without loading full chart data.
- [x] Step 360.3: Create session and navigate to chart replay route.
- [x] Step 360.4: Add browser smoke for setup-to-session creation.

Manual acceptance:

- Setup resembles the FX Replay session creation flow.
- Creating a session does not load the whole date range into a chart.
- The chart route receives only a session id.

Checks:

- `node v5/tests/session-setup-model-smoke.js`
- `node v5/tests/session-setup-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 361 - V5 Chart Runtime Foundation

Goal: add the only chart-writing runtime.

- [x] Step 361.1: Initialize chart in chart replay route.
- [x] Step 361.2: Add chart runtime commands for replace/append/clear series.
- [x] Step 361.3: Add viewport metric reader.
- [x] Step 361.4: Add tests that feature modules cannot import chart internals.

Manual acceptance:

- Chart can render injected test bars.
- No feature module can directly call chart series APIs.

Checks:

- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-boundary-smoke.js`
- `node v5/tests/boundary-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 362 - V5 Bar Data Runtime

Goal: add the only runtime that talks to bars API and owns loaded windows.

- [x] Step 362.1: Wrap existing V4 bars endpoint/client for V5.
- [x] Step 362.2: Add bounded request planner.
- [x] Step 362.3: Add window cache and release policy.
- [x] Step 362.4: Add smoke tests against full-date-range preloading.

Manual acceptance:

- Runtime can load bounded bar windows.
- There is no API path that loads the entire session range for initial replay.

Checks:

- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/bar-data-boundary-smoke.js`
- `node v5/tests/bar-data-preload-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 363 - V5 FX Replay Initial Load

Goal: implement the first replay behavior slice on the clean V5 runtime.

- [x] Step 363.1: Resolve session start bar.
- [x] Step 363.2: Load viewport-sized prefix bars.
- [x] Step 363.3: Render prefix plus start through chart runtime.
- [x] Step 363.4: Guard against future bars in display state.
- [x] Step 363.5: Add real-data browser smoke.

Manual acceptance:

- Entering chart replay shows prefix bars plus start.
- Start bar is the latest visible replay bar.
- No bars after start are loaded into display state.
- Different screen widths may request different prefix counts.

Checks:

- `node v5/tests/replay-start-bar-smoke.js`
- `node v5/tests/replay-prefix-load-smoke.js`
- `node v5/tests/replay-initial-render-smoke.js`
- `node v5/tests/replay-no-future-bars-smoke.js`
- `node v5/tests/replay-initial-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 364 - V5 Replay Navigation

Goal: implement controlled replay progression after initial loading is stable.

- [x] Step 364.1: Next reveals exactly one active-timeframe bar.
- [x] Step 364.2: Play repeatedly reveals one active-timeframe bar.
- [x] Step 364.3: Stop at session end.
- [x] Step 364.4: Prevent right-pan into unrevealed future.

Manual acceptance:

- 1M advances by one minute, 5M by five minutes, 1H by one hour.
- Future data is not rendered before reveal.

Checks:

- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-session-end-smoke.js`
- `node v5/tests/replay-right-pan-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 365 - V5 Prefix Demand And Retention

Goal: make left drag request older prefix windows and release off-screen data.

- [x] Step 365.1: Detect viewport demand when user pans left.
- [x] Step 365.2: Request older prefix chunks through bar data runtime.
- [x] Step 365.3: Merge sparse prefix chunks without full-range arrays.
- [x] Step 365.4: Release off-screen chunks according to explicit retention.

Manual acceptance:

- Dragging left can continue loading older prefix until data availability ends.
- Prefix loading is not capped by fixed day counts.
- Off-screen release is observable in runtime state.

Checks:

- `node v5/tests/prefix-demand-detect-smoke.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/tests/prefix-demand-merge-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 366 - V5 Replay Controls UI

Goal: expose the completed replay runtime behavior through usable chart-page
controls without weakening runtime ownership boundaries.

- [x] Step 366.1: Add chart replay controls shell.
- [x] Step 366.2: Wire Next through replay runtime command dispatch.
- [x] Step 366.3: Wire Play/Pause through replay runtime command dispatch.
- [x] Step 366.4: Render replay status from runtime state/events.
- [x] Step 366.5: Add browser smoke for controls-driven replay progression.
- [x] Step 366.6: Add controls UI spec if behavior stabilizes.

Manual acceptance:

- Chart replay route shows compact controls for Next, Play, and Pause.
- Controls dispatch replay commands only; UI does not mutate chart, bars, or
  replay state directly.
- Next reveals one active-timeframe bar and updates status.
- Play advances repeatedly and Pause stops playback.
- Controls show disabled/loading state while commands are in flight.
- Browser smoke verifies user clicks, chart bar count/cursor movement, and
  pause behavior.

Checks:

- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 367 - V5 Runtime Boundary Tightening

Goal: tighten the architecture seams found during audit before adding more replay
features, so V5 keeps commands as the explicit mutation path and avoids runtime
contract drift.

- [x] Step 367.1: Convert replay runtime chart-event reactions to explicit
  command dispatches, or document the exception with an ADR if the event-driven
  mutation remains intentional.
- [x] Step 367.2: Add a boundary smoke that fails when event handlers directly
  call replay mutation helpers instead of dispatching replay commands.
- [x] Step 367.3: Extract command/event names used by features into pure
  contract modules so features do not import runtime implementation modules for
  constants.
- [x] Step 367.4: Update existing features to use the new contracts while
  preserving command/event behavior.
- [x] Step 367.5: Scope router navigation state updates to the app shell/root
  instead of querying the full document.
- [x] Step 367.6: Add or update specs/ADR for runtime command contracts,
  event-notification rules, and router lifecycle boundaries.

Manual acceptance:

- Events remain notifications; runtime state mutation happens through registered
  commands except for any explicitly documented ADR exception.
- Feature modules import only command/event contracts and generic command/event
  bus APIs, not runtime implementations.
- Router does not rely on global document scans for route-link state.
- Existing replay controls, prefix demand, retention, and no-future-bars behavior
  remain unchanged.
- Runtime boundary rules are documented in `runtime-boundary-contracts.md`.

Checks:

- `node v5/tests/boundary-smoke.js`
- `node v5/tests/chart-boundary-smoke.js`
- `node v5/tests/bar-data-boundary-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 368 - V5 Replay Usability And State Persistence

Goal: make replay sessions resumable and easier to understand without weakening
the session-first runtime boundaries.

- [x] Step 368.1: Persist replay cursor updates after Next/Play advances.
- [x] Step 368.2: Restore chart replay from stored cursor state when entering a
  session route.
- [x] Step 368.3: Add read-only replay progress UI for start, cursor, end, and
  revealed count.
- [x] Step 368.4: Add a replay reset/restart command that returns a session to
  its start bar.
- [x] Step 368.5: Add browser smoke for advance, reload/renavigate, and restore.
- [x] Step 368.6: Add or update specs/session docs for cursor persistence,
  restore, and reset boundaries.

Manual acceptance:

- Next/Play progression updates the session cursor through session/runtime
  commands, not direct UI state.
- Re-entering a chart replay session can restore cursor/display state without
  loading the full session date range.
- Progress display is read-only and derived from runtime state.
- Reset/restart goes through a replay command and clears persisted progression
  back to the start bar.
- Existing no-future-bars, prefix demand, retention, and controls behavior remain
  unchanged.

Checks:

- `node v5/tests/replay-cursor-persistence-smoke.js`
- `node v5/tests/replay-restore-smoke.js`
- `node v5/tests/replay-reset-smoke.js`
- `node v5/tests/replay-restore-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 369 - V5 Viewport-Based Multi-Timeframe Display Cache

Goal: make FX Replay display history behave like a viewport-driven chart across
all display timeframes, without weakening replay cursor ownership or preloading
full history.

- [x] Step 369.1: Write the viewport display cache spec.
- [x] Step 369.2: Define `replayTimeframe` versus `displayTimeframe` contracts.
- [x] Step 369.3: Replace prefix-only demand semantics with viewport missing
  window demand.
- [x] Step 369.4: Add display-window cache retention that keeps recently loaded
  windows available for smooth right-drag return.
- [x] Step 369.5: Support arbitrary display timeframe switching through replay
  runtime commands.
- [x] Step 369.6: Guard higher-timeframe bars against future leakage relative to
  the replay cursor.
- [x] Step 369.7: Add chart controls for display timeframe switching through
  command dispatch only.
- [x] Step 369.8: Add smoke/browser coverage for viewport lazy loading,
  timeframe switching, cache reuse, and no-future display.

Manual acceptance:

- Session creation still does not load bars or full date ranges into chart
  state.
- `session.timeframe` remains the replay progression timeframe; Next/Play reveal
  exactly one replay-timeframe bar at a time.
- `displayTimeframe` can be changed independently across supported chart
  timeframes.
- For every display timeframe, visible chart bars must not expose data to the
  right of the current replay cursor.
- Session start is not a left boundary. Users can pan left and keep requesting
  older display windows until the data source has no more bars.
- Leftward history loading is viewport-driven and bounded; V5 must not preload
  all left history or the whole replay session range.
- Loaded display windows are cached by instrument/timeframe/range. Dragging back
  into a cached area should re-render from cache without a new bars fetch.
- Cache release is delayed and explicit, based on capacity/distance policy, not
  immediate off-screen release.
- Feature/UI modules dispatch commands and subscribe to events; they do not
  request bars, mutate replay cursor/display state, or write chart series
  directly.

Checks:

- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 370 - V5 Viewport Demand Runtime Wiring

Goal: route actual chart viewport demand events into bounded replay
display-window loading, so left panning loads older display history through the
runtime ownership chain instead of remaining a test-only demand signal.

- [x] Step 370.1: Add a runtime smoke proving a `chart:viewportDemand` event is
  translated into `replay.loadDisplayWindow` through command dispatch only.
- [x] Step 370.2: Add the route/app-shell wiring that subscribes to chart
  viewport demand while a chart replay session is active.
- [x] Step 370.3: Teach replay display-window loading to consume viewport
  missing-window payloads, dedupe in-flight demand, and keep requests bounded.
- [x] Step 370.4: Merge newly loaded display windows with existing display bars
  and reuse cached bar windows when panning back into known history.
- [x] Step 370.5: Add browser coverage for user-visible left pan demand and
  update the session handoff after full smoke verification.

Manual acceptance:

- A chart visible-range change that crosses loaded left coverage causes one
  bounded replay display-window load.
- The wiring dispatches replay commands only; it does not request bars or write
  chart series from the feature layer.
- Replay runtime remains the owner of display state and no-future filtering.
- Bar data runtime remains the only owner of bar requests and cache hits.
- Newly loaded display windows merge with existing display bars instead of
  replacing useful visible context with a single isolated window.
- Duplicate or overlapping viewport demand does not create duplicate in-flight
  bar requests.
- Cached display windows are reused when the viewport returns to known coverage.
- No request loads the full replay session range or full left-side history.

Checks:

- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 371 - V5 Replay Progression Display Projection

Goal: keep display timeframe semantics clean when replay progression advances,
so Next/Play move the replay cursor and then project the current display
timeframe up to that cursor instead of appending replay-timeframe bars into a
different display timeframe.

- [x] Step 371.1: Add a smoke proving `Next` on a non-replay display timeframe
  does not mix replay-timeframe bars into display bars.
- [x] Step 371.2: Refactor replay progression to advance cursor first, persist
  it, then reload/project the active display timeframe through bounded display
  windows.
- [x] Step 371.3: Preserve one-bar replay progression, cursor persistence,
  session-end behavior, and reset semantics under the projection path.
- [x] Step 371.4: Add Play/browser coverage for display projection and update
  the session handoff after full smoke verification.

Manual acceptance:

- `session.timeframe` remains the replay progression timeframe; Next/Play reveal
  exactly one replay-timeframe bar per step.
- When `displayTimeframe !== replayTimeframe`, Next/Play must not append
  replay-timeframe bars into the display bars.
- Display bars after cursor movement are derived from the current
  `displayTimeframe` and filtered by the replay cursor.
- Higher display timeframes still require complete bars before the cursor unless
  a future documented exception allows partial bars.
- The projection path uses bounded bar-data windows and cache; it does not load
  the full session range or session-to-end future.
- Reset returns the cursor to the start and projects display state at the start
  without leaking future bars.
- UI remains command/event driven and does not request bars or write chart
  series directly.

Checks:

- `node v5/tests/replay-display-progression-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-reset-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-timeframe-no-future-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 372 - V5 Chart Display Timezone Contract

Goal: freeze V5 timezone semantics before more chart, order, journal, and
annotation work makes time handling harder to change.

- [x] Step 372.1: Add a timezone spec, pure timezone contracts, and formatter
  smoke that separate canonical/request/display time.
- [x] Step 372.2: Add display timezone preference runtime commands/events with
  default `Exchange` while proving timezone changes do not reload bars.
- [x] Step 372.3: Apply display timezone formatting to replay/chart labels and
  add browser coverage that timezone changes alter labels only.
- [x] Step 372.4: Add timezone smokes to `smoke_all`, run full verification,
  and update the session handoff.
- [x] Step 372 review fix: Apply display timezone to chart candle titles,
  style timezone controls, and share canonical wall-clock parsing across request
  planning and response normalization.

Manual acceptance:

- Internal replay/cursor/bar identity remains canonical and does not change when
  display timezone changes.
- `/v4/bars` requests continue to use exchange wall-clock `YYYY-MM-DD HH:mm`.
- `Exchange` defaults to the current V4 data convention:
  `America/New_York` wall-clock for NQ/ES.
- Display timezone affects labels only: axis/status/tooltip-style text can
  change, but `displayBars`, cursor timestamp, cache keys, and request ranges do
  not.
- Timezone changes dispatch commands/events; UI does not mutate runtime state
  directly.
- Higher-timeframe no-future checks continue to use canonical cursor/bar
  timestamps, not formatted display labels.

Checks:

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/display-timezone-runtime-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/bar-data-runtime-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 373 - V5 Chart Presentation Settings Foundation

Goal: establish a small chart presentation settings foundation before chart
axis, tooltip, order, journal, and annotation workflows depend on scattered
display choices.

- [x] Step 373.1: Add chart presentation settings spec plus TODO/session plan.
- [x] Step 373.2: Add presentation settings contracts/runtime with normalized
  defaults and command/event smoke coverage.
- [x] Step 373.3: Wire chart runtime/status presentation consumers for time
  format, status fields, chart margins, right offset, and crosshair readout
  state.
- [x] Step 373.4: Add lightweight UI controls/browser coverage, full smoke,
  and final handoff updates.

Manual acceptance:

- Presentation settings changes do not request bars, mutate replay cursor, or
  mutate `displayBars`.
- UI changes presentation settings through commands/events.
- Chart runtime consumes chart-owned presentation settings and rerenders
  presentation/layout without feature modules mutating chart internals.
- Time labels continue to use the display timezone contract.
- The foundation is intentionally smaller than FXReplay's full settings panel:
  no template system, drawing settings, screenshot controls, or complete theme
  editor in this step.

Checks:

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 374 - V5 Replay Viewport Follow And Rolling Window

Goal: close the Phase 2 viewport/display gate by separating revealed
`displayBars` from chart-rendered `visibleBars`, so Next/Play keep the replay
cursor near the right side and older bars roll out of the rendered chart.

- [x] Step 374.1: Add viewport follow spec plus TODO/session plan.
- [x] Step 374.2: Add chart runtime viewport follow contract and smoke coverage
  that keeps full bars state while rendering a rolling visible subset.
- [x] Step 374.3: Wire replay runtime to sync viewport follow after initial
  load, Next/Play, Reset, and display projection.
- [x] Step 374.4: Add browser coverage proving rolling visible chart behavior
  without mutating cursor/displayBars or adding bars requests; run full smoke and
  update handoff.

Manual acceptance:

- `displayBars` remains replay-owned revealed history.
- Chart runtime owns the rendered visible subset.
- Next/Play keep the cursor bar near the right side with `rightOffsetBars`.
- Older bars roll out of the rendered chart when revealed history exceeds
  visible capacity.
- Viewport follow does not request bars, mutate replay cursor, or mutate
  `displayBars`.
- Manual drag/zoom behavior remains out of scope until Phase 3.

Checks:

- `node v5/tests/chart-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 427 - V5 Chart Engine Adapter Boundary Split

Status: completed.

Goal: continue modularization by giving chart-engine context, presentation
mapping, and fallback rendering explicit module homes while preserving the
public `createChartEngineAdapter` factory contract.

Problem:

- `chart-engine-adapter.js` mixed display-context normalization, Lightweight
  option mapping, fallback DOM rendering/input, logical-range helpers,
  crosshair metadata, and the Lightweight adapter lifecycle.
- Future settings, interaction, layout, and review features would make the
  adapter difficult to split later if all helper surfaces stayed in one file.

Implementation:

- [x] Step 427.1: Add `runtime/chart-engine-context.js` for display-context
  normalization and bar timestamp conversion helpers.
- [x] Step 427.2: Add `runtime/chart-engine-presentation.js` for Lightweight
  options, fallback metadata, logical-range whitespace helpers, and shared
  render helpers.
- [x] Step 427.3: Add `runtime/chart-engine-fallback-adapter.js` for the DOM
  fallback engine implementation and fallback input handling.
- [x] Step 427.4: Keep `chart-engine-adapter.js` as the stable factory plus the
  current Lightweight adapter implementation.
- [x] Step 427.5: Update the chart-engine boundary harness so the new
  presentation module is treated as part of the chart-engine adapter family.
- [x] Step 427.6: Reduce `chart-engine-adapter.js` from 786 lines to 427 lines
  without changing chart runtime call sites.

Manual acceptance:

- Chart runtime still imports and calls `createChartEngineAdapter` only.
- The DOM fallback adapter remains available when Lightweight Charts is not
  present.
- Presentation settings, reset view, native drag/wheel behavior, crosshair
  readout, and hidden debug bar metadata continue through existing adapter
  behavior.
- New helper modules do not register runtime commands, subscribe to app events,
  request bars, or own replay cursor state.

Checks:

- `node --check v5/src/runtime/chart-engine-adapter.js`
- `node --check v5/src/runtime/chart-engine-context.js`
- `node --check v5/src/runtime/chart-engine-presentation.js`
- `node --check v5/src/runtime/chart-engine-fallback-adapter.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-fallback-input-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 428 - V5 Lightweight Adapter Internal Split

Status: completed.

Goal: finish the chart-engine adapter boundary split by moving Lightweight
Charts lifecycle, native input/writeback tracking, and crosshair readout
mapping into explicit adapter-family modules without changing the public
factory API.

Problem:

- After Step 427, `chart-engine-adapter.js` still contained the full
  Lightweight implementation, including mount lifecycle, native interaction
  timers, visible-range writeback filtering, crosshair throttling, series
  creation, presentation application, and cleanup.
- Future fixes around reset/zoom/drag extension, multi-pane sync, order
  markers, and review overlays would be harder to isolate if native input and
  crosshair mapping stayed embedded in one adapter function.

Implementation:

- [x] Step 428.1: Move the Lightweight implementation into
  `runtime/chart-engine-lightweight-adapter.js`.
- [x] Step 428.2: Add `runtime/chart-engine-lightweight-interaction.js` for
  native drag/touch/wheel markers, wheel settle timing, and recent-input
  detection.
- [x] Step 428.3: Add `runtime/chart-engine-lightweight-crosshair.js` for
  crosshair event normalization, readout bar lookup, duplicate suppression, and
  animation-frame batching.
- [x] Step 428.4: Reduce `runtime/chart-engine-adapter.js` to the stable
  factory that selects Lightweight or DOM fallback adapters.
- [x] Step 428.5: Update the chart-engine boundary harness to treat the new
  Lightweight adapter implementation as part of the adapter family.

Manual acceptance:

- Chart runtime still imports only `createChartEngineAdapter`.
- DOM fallback behavior remains selected when Lightweight Charts is absent.
- Lightweight presentation settings, series writes, visible-range writeback,
  native wheel/drag settle, crosshair readout, reset view, and hidden debug bars
  continue through existing behavior.
- New Lightweight helper modules do not register app runtime commands,
  subscribe to app events, request bars, or own replay cursor state.

Checks:

- `node --check v5/src/runtime/chart-engine-adapter.js`
- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js`
- `node --check v5/src/runtime/chart-engine-lightweight-crosshair.js`
- `node --check v5/src/runtime/chart-engine-lightweight-interaction.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-fallback-input-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 429 - V5 Settings Backlog Matrix And Price Scale Side

Status: completed.

Goal: resume Settings work after the adapter modularization by documenting the
remaining settings ownership matrix and implementing one low-risk presentation
setting through the existing runtime/adapter path.

Problem:

- Remaining FXReplay-style settings were easy to discuss as a single backlog,
  but they do not share the same owner. Some are pure presentation settings,
  while others need chart-engine contracts, replay-runtime contracts, template
  persistence, or future pane ownership.
- Without a matrix, future Settings UI work could accidentally mix replay,
  chart-engine, persistence, and pane concerns into the route.
- Price scale side is a low-risk presentation setting now that chart-engine
  presentation options are isolated.

Implementation:

- [x] Step 429.1: Add `docs/SETTINGS_BACKLOG_MATRIX.md` with owner/status rows
  for implemented, planned, and deferred Settings items.
- [x] Step 429.2: Add `scaleStyle.priceScaleSide` to chart presentation
  contracts with `right`/`left` normalization.
- [x] Step 429.3: Add Settings UI draft controls for price scale side in the
  Scales section.
- [x] Step 429.4: Map price scale side through chart display context to
  Lightweight left/right price scale options and series `priceScaleId`.
- [x] Step 429.5: Update runtime, adapter, and browser smokes for default right
  side, applied left side, and invalid side rejection.

Manual acceptance:

- Price scale side changes only after Settings `Ok`; cancel/backdrop close
  discards the draft.
- `priceScaleVisible` still controls hidden/visible behavior; side only chooses
  left or right when visible.
- Changing side must not mutate replay cursor, display bars, bar requests, or
  session state.
- Non-presentation settings remain documented but not implemented until their
  runtime/adapter contracts are planned.

Checks:

- `node --check v5/src/contracts/chart-presentation-contracts.js`
- `node --check v5/src/runtime/chart-presentation-runtime.js`
- `node --check v5/src/runtime/chart-engine-context.js`
- `node --check v5/src/runtime/chart-engine-presentation.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 430 - V5 Replay Countdown Settings Contract

Status: completed.

Goal: implement the first high-risk Settings item contract-first by making bar
countdown replay-owned derived display state, then exposing only a visibility
toggle in Settings.

Problem:

- Countdown looks like a UI setting, but it depends on replay cursor, display
  timeframe, session end, and replay state. If route UI calculates it directly,
  Settings would bypass runtime ownership boundaries.
- Remaining Settings backlog items need proof that non-presentation controls can
  be added through explicit owner contracts instead of direct UI behavior.

Implementation:

- [x] Step 430.1: Add `docs/REPLAY_COUNTDOWN_CONTRACT.md` defining replay
  runtime ownership, input state, output shape, and non-mutation rules.
- [x] Step 430.2: Add replay runtime `countdown` derived state on
  `REPLAY_COMMANDS.GET_STATE`.
- [x] Step 430.3: Add presentation setting `showBarCountdown` as a route
  visibility preference only.
- [x] Step 430.4: Add Settings draft UI for `Bar countdown` in the Status line
  section.
- [x] Step 430.5: Render the route footer countdown label from replay state
  without calculating remaining time in UI.
- [x] Step 430.6: Update runtime/browser smokes proving countdown derivation,
  visibility toggle behavior, and no replay/bar-data mutation.

Manual acceptance:

- Countdown label comes from replay runtime state.
- Settings controls only whether the countdown row is visible.
- Enabling countdown must not move replay cursor, mutate `displayBars`, request
  bars, or write chart series.
- Countdown close timestamp is capped by session end.

Checks:

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/chart-presentation-runtime.js`
- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 431 - V5 Replay Runtime Boundary Split

Status: completed.

Goal: continue the larger V5 modularization work by splitting replay runtime
state helpers and chart synchronization out of the main replay command owner
before more replay/settings features are added.

Problem:

- `runtime/replay-runtime.js` had grown to 1421 lines and mixed pure replay
  state/time/display-window helpers, countdown derivation, chart command sync,
  session persistence, display-window loading, prefix retention, navigation,
  and playback.
- Leaving helper logic in the main runtime would make future Settings contracts
  and replay interactions harder to place cleanly and would repeat the V4
  failure mode of accumulating unrelated feature logic in one file.

Implementation:

- [x] Step 431.1: Define the split boundary: pure replay state helpers vs.
  replay-owned chart synchronization vs. replay command orchestration.
- [x] Step 431.2: Add `runtime/replay-runtime-state.js` for state shape,
  timestamp/timeframe normalization, display-bar filtering/merging, prefix
  retention helpers, no-future guards, and countdown derivation.
- [x] Step 431.3: Add `runtime/replay-chart-sync.js` for replay-to-chart
  command synchronization: replace bars, right-edge limit, display context, and
  viewport follow.
- [x] Step 431.4: Keep public helper exports compatible by re-exporting the
  existing replay helper API from `replay-runtime.js`.
- [x] Step 431.5: Reduce `replay-runtime.js` from 1421 lines to 1132 lines
  without changing command names, event names, replay cursor ownership, or chart
  writer ownership.

Manual acceptance:

- Replay UI and other callers still import replay commands/events and exported
  helper guards from `replay-runtime.js`.
- Only replay runtime still owns cursor/reveal state and persistence commands.
- Only chart runtime still writes chart series; replay chart sync only
  dispatches chart runtime commands.
- Countdown remains replay-derived state, not route UI math.

Checks:

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-runtime-state.js`
- `node --check v5/src/runtime/replay-chart-sync.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 432 - V5 Replay Prefix Controller Split

Status: completed.

Goal: continue replay runtime modularization by extracting prefix demand and
prefix retention into a dedicated controller before more left-extension,
viewport, or Settings behavior is added.

Problem:

- After Step 431, `replay-runtime.js` still owned prefix-demand loading,
  duplicate anchor tracking, sparse display merging, retention release, and
  replay command registration in one file.
- Prefix demand is a long-lived subsystem tied to the user-visible left-side
  chart extension behavior. Keeping it inline would make future wheel/drag
  loading fixes and session-break behavior harder to isolate.

Implementation:

- [x] Step 432.1: Define the next boundary as replay prefix-demand/retention,
  not display-window or navigation yet.
- [x] Step 432.2: Add `runtime/replay-prefix-controller.js` with an injected
  `getState`/`setState`, `dispatchCommand`, `chartSync`, and `emitEvent` API.
- [x] Step 432.3: Move prefix anchor de-dupe, prefix window loading, sparse
  display merge, chunk release, and retention event emission into the
  controller.
- [x] Step 432.4: Keep `replay-runtime.js` as the command/event owner by
  delegating `LOAD_PREFIX_DEMAND` and `APPLY_PREFIX_RETENTION` to the
  controller and resetting controller anchors on session resolve/stop.
- [x] Step 432.5: Update `runtime-boundary-smoke` so the boundary test prevents
  prefix implementations from returning to `replay-runtime.js`.
- [x] Step 432.6: Reduce `replay-runtime.js` from 1132 lines to 984 lines.

Manual acceptance:

- Prefix demand still dispatches bar-data window loads through bar-data runtime
  commands.
- Prefix controller may dispatch chart runtime commands only through
  `replay-chart-sync`.
- Replay runtime still owns replay command registration and lifecycle reset.
- Public replay helper exports remain unchanged.

Checks:

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-prefix-controller.js`
- `node v5/tests/prefix-demand-load-smoke.js`
- `node v5/tests/prefix-demand-merge-smoke.js`
- `node v5/tests/prefix-retention-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 433 - V5 Replay Display Window Controller Split

Status: completed.

Goal: continue replay runtime modularization by extracting display-window
loading, display-timeframe switching, and cursor display projection into a
dedicated controller before adding more replay or Settings behavior.

Problem:

- After Step 432, `replay-runtime.js` still owned viewport-demand
  display-window loading, duplicate display-window demand tracking,
  display-timeframe switching, sparse backward seek attempts, display context
  snapshots, and cursor projection after Next/Previous/Truncate/Reset.
- Display-window behavior is a long-lived subsystem tied to wheel/drag loading,
  higher timeframe display, no-future display guards, and future session-break
  behavior. Keeping it inline would make the runtime hard to extend cleanly.

Implementation:

- [x] Step 433.1: Define the next boundary as display-window loading and
  display-timeframe projection.
- [x] Step 433.2: Add `runtime/replay-display-window-controller.js` with
  injected `getState`/`setState`, `dispatchCommand`, `chartSync`,
  `ensureInitialSession`, and `emitEvent` APIs.
- [x] Step 433.3: Move display-window duplicate de-dupe, viewport-demand count
  normalization, sparse backward seek, display-bar merge, chart context sync,
  display events, and display context snapshots into the controller.
- [x] Step 433.4: Keep `replay-runtime.js` as command/event owner by delegating
  `SET_DISPLAY_TIMEFRAME`, `LOAD_DISPLAY_WINDOW`, `GET_DISPLAY_CONTEXT`, and
  cursor projection after navigation to the controller.
- [x] Step 433.5: Update `runtime-boundary-smoke` so display-window
  implementation bodies cannot drift back into `replay-runtime.js`.
- [x] Step 433.6: Reduce `replay-runtime.js` from 984 lines to 785 lines.

Manual acceptance:

- Display-window loading still dispatches bar-data runtime window requests.
- Display-window chart writes still go through `replay-chart-sync` and chart
  runtime commands.
- Replay runtime still owns replay command registration, cursor/reveal state,
  and lifecycle reset.
- Public replay helper exports remain unchanged.

Checks:

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-display-window-controller.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/replay-display-window-cache-smoke.js`
- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 434 - V5 Replay Playback Controller Split

Status: completed.

Goal: continue replay runtime modularization by extracting playback timer/state
management into a dedicated controller before splitting remaining cursor
navigation behavior.

Problem:

- After Step 433, `replay-runtime.js` still owned playback state, timer
  lifecycle, `PLAYBACK_CHANGED` emission, advancing guards, and play/pause
  command implementations alongside replay cursor mutation.
- Playback is a long-lived subsystem with timer behavior and can be cleanly
  injected with a replay-advance callback. Keeping it inline would make future
  transport controls, variable speed, or keyboard playback harder to isolate.

Implementation:

- [x] Step 434.1: Define the next boundary as playback timer/state, leaving
  cursor navigation/truncation/reset for the next step.
- [x] Step 434.2: Add `runtime/replay-playback-controller.js` with injected
  `getSessionId`, `advanceReplay`, and `emitEvent` APIs.
- [x] Step 434.3: Move playback snapshot, state mutation, play/pause, timer
  ticks, advancing guard, interval validation, and `PLAYBACK_CHANGED` emission
  into the controller.
- [x] Step 434.4: Keep `replay-runtime.js` as command/event owner by
  delegating `PLAY`, `PAUSE`, and `GET_PLAYBACK_STATE` to the controller and
  injecting `next` as the advance callback.
- [x] Step 434.5: Update `runtime-boundary-smoke` so playback implementation
  bodies cannot drift back into `replay-runtime.js`.
- [x] Step 434.6: Reduce `replay-runtime.js` from 785 lines to 712 lines.

Manual acceptance:

- Playback still advances through replay runtime `next`, so replay cursor and
  reveal ownership remain unchanged.
- Playback pause is still used by Previous, Truncate, Reset, and runtime stop.
- Playback state snapshots and events preserve the existing public shape.
- Public replay helper exports remain unchanged.

Checks:

- `node --check v5/src/runtime/replay-runtime.js`
- `node --check v5/src/runtime/replay-playback-controller.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/runtime-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 375 - V5 Phase 2 Closeout And Phase 3 Entry Plan

Goal: close Phase 2 deliberately after viewport follow, fix documentation drift,
and define the first Phase 3 step so local UI observations do not pull the
project into random feature order.

- [x] Step 375.1: Add Step 375 TODO/session plan.
- [x] Step 375.2: Update roadmap/TODO to mark Phase 2 gate status and fix
  Step 373 documentation drift.
- [x] Step 375.3: Record Phase 3 entry checklist, run verification, and update
  handoff.

Manual acceptance:

- Phase 2 status reflects Step 374 completion and the explicit manual viewport
  rule: auto-follow remains active until Phase 3 defines real drag/zoom.
- Step 373 TODO state matches the completed spec/session work.
- Phase 3 starts with chart interaction runtime contracts, not ad hoc toolbar
  polish or FXReplay parity details.
- No runtime code changes are made in this closeout step.

Checks:

- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 376 - V5 Chart Interaction Runtime Contracts

Goal: start Phase 3 by defining and implementing chart-owned interaction
contracts for manual visible-range movement before adding richer crosshair,
tooltip, toolbar, order, or journal UI.

- [x] Step 376.1: Add chart interaction spec plus TODO/session plan.
- [x] Step 376.2: Add chart runtime interaction state and commands for manual
  visible-range movement and follow resume.
- [x] Step 376.3: Wire replay/chart behavior so manual movement pauses
  auto-follow without directly mutating replay cursor or `displayBars`.
- [x] Step 376.4: Add browser verification, run full smoke, and update handoff.

Manual acceptance:

- Chart runtime owns manual visible-range interaction state.
- Manual visible-range movement pauses auto-follow until an explicit resume
  command.
- Replay runtime continues to own cursor and reveal state.
- Manual movement may emit viewport demand, but it must not request bars
  directly.
- Replay-owned viewport demand consumption may grow `displayBars` without
  resuming follow.
- Replay right-edge changes keep manual visible range, interaction readback, and
  rendered bars aligned.
- UI does not directly slice bars, mutate replay state, or call bar-data APIs.
- Crosshair, axis labels, go-to time, toolbar polish, orders, journal, SaaS
  auth, and billing remain out of scope.

Checks:

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 377 - V5 Chart Engine Adapter Foundation

Goal: introduce a real chart-engine adapter boundary before implementing richer
drag/zoom, crosshair, go-to time, orders, or journal overlays.

- [x] Step 377.1: Add chart-engine adapter spec plus TODO/session plan.
- [x] Step 377.2: Add adapter module and smoke coverage for DOM fallback plus
  fake Lightweight Charts integration.
- [x] Step 377.3: Wire chart runtime through the adapter without changing
  replay/bar-data ownership contracts.
- [x] Step 377.4: Add boundary/browser verification, run full smoke, and update
  handoff.

Manual acceptance:

- Chart runtime remains the only runtime that creates or calls chart-engine
  instances.
- UI, replay, and bar-data modules do not import or call chart-engine APIs.
- The adapter can use `window.LightweightCharts` when available and a DOM
  fallback when unavailable.
- Existing chart commands/events and interaction readback continue to work.
- Manual visible range and viewport follow behavior remain chart-owned.
- Engine visible range changes may emit viewport demand, but do not request bars
  directly.
- Full drag/zoom polish, crosshair, go-to time, orders, journal, SaaS auth, and
  billing remain out of scope.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 378 - V5 Minimal Real Chart Drag Zoom

Goal: add the first real chart-surface drag/zoom input path so users can
manually navigate visible time without breaking replay reveal boundaries or
letting UI own chart internals.

- [x] Step 378.1: Add Step 378 TODO/session plan.
- [x] Step 378.2: Add adapter-owned DOM fallback drag and wheel zoom input that
  reports visible-range changes through the existing chart runtime callback.
- [x] Step 378.3: Preserve replay/manual-follow invariants and add runtime
  smoke coverage for clamped drag/zoom changes.
- [x] Step 378.4: Add browser verification, run full smoke, and update handoff.

Manual acceptance:

- Dragging or wheel zooming the chart fallback surface emits a chart-runtime
  manual visible-range change.
- Manual interaction pauses viewport follow until explicit resume.
- Manual interaction remains clamped to the replay right-edge limit.
- Manual interaction may emit viewport demand, but it must not request bars
  directly.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- UI modules do not import or call chart-engine APIs and do not slice chart bars.
- Crosshair, axis labels, go-to time, orders, journal, dashboard, AI, SaaS auth,
  billing, and production chart packaging remain out of scope.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 379 - V5 Lightweight Charts Production Load

Goal: make V5's static page load the real Lightweight Charts engine by default,
while retaining the DOM fallback for offline/unit harnesses and preserving the
chart/replay/bar-data ownership boundaries.

- [x] Step 379.1: Add Step 379 TODO/session plan and update chart-engine spec.
- [x] Step 379.2: Vendor a pinned Lightweight Charts standalone build and load
  it before the V5 app module.
- [x] Step 379.3: Verify the browser route uses the `lightweight-charts` adapter
  path by default and still preserves manual follow/no-future invariants.
- [x] Step 379.4: Run full smoke, update handoff, and mark the step complete.

Manual acceptance:

- Opening `v5/index.html` with the local server loads `window.LightweightCharts`
  before `v5/src/app.js`.
- The chart host reports `data-chart-engine="lightweight-charts"` in the normal
  browser route.
- The DOM fallback remains available for deterministic unit/runtime tests when
  `window.LightweightCharts` is absent.
- Chart runtime remains the only module creating/calling chart-engine instances.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- Bar data runtime remains the only owner of `/v4/bars` requests and cache.
- Production chart packaging, crosshair polish, axis labels, go-to time,
  orders, journal, dashboard, AI, SaaS auth, and billing remain out of scope.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 380 - V5 Lightweight TimeScale Interaction Tuning

Goal: tune the real Lightweight Charts timeScale and interaction defaults so
native pan/zoom behaves like a replay workstation while preserving chart runtime
ownership and replay no-future boundaries.

- [x] Step 380.1: Add Step 380 TODO/session plan and update chart-engine spec
  with the real timeScale tuning rules.
- [x] Step 380.2: Tune Lightweight Charts adapter options for horizontal
  pan/zoom, right offset, right-edge stability, resize behavior, and stable
  bar spacing.
- [x] Step 380.3: Keep native engine visible-range changes inside chart runtime
  manual/follow state and clamped to the replay right-edge limit.
- [x] Step 380.4: Strengthen adapter/runtime/browser smoke coverage for
  timeScale options, normal Lightweight engine use, manual mode, resume follow,
  and no direct bar requests from chart interaction.
- [x] Step 380.5: Run full smoke, update handoff, and mark the step complete.

Manual acceptance:

- Normal browser use still reports `data-chart-engine="lightweight-charts"`.
- Lightweight timeScale has replay-workstation defaults for horizontal
  drag/zoom, stable spacing, right offset, and resize behavior.
- User-originated Lightweight visible-range changes become chart-runtime manual
  visible-range state.
- Manual chart movement pauses viewport follow until explicit resume.
- Manual chart movement remains clamped to the replay right-edge limit.
- Chart interaction may emit viewport demand, but it does not request bars
  directly.
- Replay runtime still owns cursor, reveal state, and no-future display
  invariants.
- DOM fallback remains available for deterministic unit/runtime tests.
- Crosshair, axis labels, tooltips, go-to time, order, journal, dashboard, AI,
  SaaS auth, billing, and production packaging remain out of scope.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 381 - V5 Crosshair Readout And Inspection

Goal: add chart-owned crosshair readout and time/price inspection so users can
inspect replay bars without giving UI, replay, or bar-data modules ownership of
chart internals.

- [x] Step 381.1: Add Step 381 TODO/session plan and update presentation/engine
  specs with chart-owned crosshair readout rules.
- [x] Step 381.2: Add adapter callbacks for DOM fallback hover and Lightweight
  `subscribeCrosshairMove` events, normalized to V5 chart-domain data.
- [x] Step 381.3: Add chart-runtime crosshair state, event emission, and readback
  command without mutating replay cursor, display bars, visible range, or bar
  cache.
- [x] Step 381.4: Render crosshair readout in the chart route through
  commands/events and presentation settings, including hide/show behavior.
- [x] Step 381.5: Strengthen runtime/browser smoke coverage and close the step.

Manual acceptance:

- Moving the chart crosshair updates a visible time/price/OHLC readout.
- Crosshair readout obeys the `showCrosshairReadout` presentation setting.
- Crosshair movement does not request bars, mutate replay cursor, mutate
  `displayBars`, or change visible range/follow state.
- Lightweight engine crosshair events remain behind the chart-engine adapter.
- DOM fallback keeps deterministic hover/readout coverage for runtime tests.
- Axis labels, tooltip polish, go-to time, order, journal, dashboard, AI, SaaS
  auth, billing, and production packaging remain out of scope.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 382 - V5 Axis And Tooltip Formatting Polish

Goal: make chart inspection formatting consistent across status text,
crosshair readout, candle titles, and the real chart engine without changing
replay identity, bar loading, or chart ownership boundaries.

- [x] Step 382.1: Add Step 382 TODO/session plan and update presentation specs
  with formatting ownership rules.
- [x] Step 382.2: Add shared chart formatting helpers for price, OHLC, change,
  and compact inspection text.
- [x] Step 382.3: Apply formatting helpers to chart route status/crosshair
  readout and adapter candle titles.
- [x] Step 382.4: Add adapter-owned Lightweight localization/price formatting
  defaults behind the chart-engine boundary.
- [x] Step 382.5: Strengthen browser/runtime smoke coverage and close the step.

Manual acceptance:

- Status OHLC, Change, candle titles, and crosshair inspection use consistent
  price precision and signs.
- Display timezone and 12h/24h settings still affect all visible time labels.
- Formatting changes do not request bars, mutate replay cursor, mutate
  `displayBars`, or change visible range/follow state.
- Lightweight formatting options remain inside `chart-engine-adapter.js`.
- Go-to time, orders, journal, dashboard, AI, SaaS auth, billing, and full
  settings templates remain out of scope.

Checks:

- `node v5/tests/chart-formatting-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 383 - V5 Go-To Time And Cursor Navigation

Goal: add chart-owned intentional time navigation so users can inspect a known
time and return to the replay cursor without mutating replay state or bypassing
runtime boundaries.

- [x] Step 383.1: Add Step 383 TODO/session plan and update interaction specs
  with go-to time / jump-to-cursor rules.
- [x] Step 383.2: Add a chart runtime `goToTime` command that derives and
  clamps a manual visible range around a target timestamp.
- [x] Step 383.3: Add chart route controls for go-to time and jump-to-cursor
  using commands/events only.
- [x] Step 383.4: Preserve viewport demand behavior without direct bar requests
  and preserve replay cursor/display bars.
- [x] Step 383.5: Strengthen runtime/browser smoke coverage and close the step.

Manual acceptance:

- Entering a time moves the chart viewport to a manual visible range around the
  requested time.
- Go-to input is interpreted in the selected display timezone and converted to
  chart canonical time before dispatching the chart command.
- Go-to time pauses viewport follow and does not directly mutate replay cursor
  or `displayBars`; replay runtime may grow `displayBars` if viewport demand is
  consumed.
- Go-to time remains clamped to the replay right-edge limit.
- Jump-to-cursor resumes follow through chart runtime commands.
- Go-to time may emit viewport demand, but it must not request bars directly.
- Order, journal, dashboard, AI, SaaS auth, billing, and full settings
  templates remain out of scope.

Checks:

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 384 - V5 Chart Navigation Toolbar

Goal: add a compact chart navigation toolbar so users can zoom, scroll, and
reset to the replay cursor without breaking no-future replay boundaries or
runtime ownership.

This step advances Historical Replay Review by making chart navigation usable
from visible controls similar to a trading replay workstation.

- [x] Step 384.1: Add Step 384 TODO/session plan and update interaction specs
  with toolbar zoom/pan/reset rules.
- [x] Step 384.2: Add chart runtime commands for bounded visible-range zoom and
  pan.
- [x] Step 384.3: Add a bottom chart navigation toolbar in the chart route using
  commands/events only.
- [x] Step 384.4: Preserve viewport demand behavior and right-edge clamping
  without direct UI/replay mutation.
- [x] Step 384.5: Strengthen runtime/browser smoke coverage and close the step.

Manual acceptance:

- The chart shows compact controls for zoom out, zoom in, pan left, pan right,
  and reset/follow cursor.
- Zoom and pan pause viewport follow and update chart-owned manual visible
  range.
- Pan right remains clamped to the replay right-edge limit and cannot reveal
  unrevealed future bars.
- Pan left may emit viewport demand, but bars are loaded only through replay and
  bar-data runtimes.
- Reset resumes viewport follow through the chart runtime and does not advance
  replay cursor.
- UI does not slice `displayBars`, request bars, mutate replay state, or import
  chart internals.
- Order, journal, dashboard, AI, SaaS auth, billing, and full settings
  templates remain out of scope.

Checks:

- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-engine-boundary-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 385 - V5 Lightweight Native Interaction Fix

Goal: fix the K-line chart's mouse interaction path so Lightweight Charts
native wheel zoom, pressed-mouse pan, price-axis scaling, and crosshair behavior
work without V5 fighting the chart engine.

This step advances Historical Replay Review by making chart interaction usable
enough for replay study. It is a bug-fix/performance step, not a new product
feature.

- [x] Step 385.1: Add Step 385 TODO/session plan, Lightweight Charts vendor
  docs, and native interaction spec rules.
- [x] Step 385.2: Observe native visible-range changes without calling
  `setData()` on every interaction frame.
- [x] Step 385.3: Remove duplicate Lightweight mousemove crosshair handling and
  throttle/dedupe high-frequency readout updates.
- [x] Step 385.4: Explicitly style Lightweight grid/crosshair lines so bright
  default white lines do not dominate the chart.
- [x] Step 385.5: Add browser smoke coverage for native interaction behavior
  and close the step.

Manual acceptance:

- Wheel over the chart zooms the time axis through Lightweight Charts native
  behavior.
- Left-button drag over the chart pans horizontally through Lightweight Charts
  native behavior.
- Left-button drag on the price axis keeps native vertical scaling behavior.
- Native pan/zoom does not repeatedly call `series.setData()`.
- Replay right-edge/no-future clamping still prevents scrolling into unrevealed
  future bars.
- Crosshair readout remains functional without duplicate canvas mousemove
  handlers.
- Grid/crosshair lines are subdued and no unexpected bright white solid lines
  dominate the chart.
- UI, chart runtime, replay runtime, and bar-data runtime ownership boundaries
  remain intact.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 386 - V5 Chart Display Usability

Goal: make the main Lightweight chart readable after the native interaction
fix by correcting time-axis labels and restoring usable chart height without
changing runtime ownership boundaries.

This step advances Historical Replay Review by making the replay chart surface
usable for visual study. It is a display/layout polish step, not a replay state
or data-loading change.

- [x] Step 386.1: Add Step 386 TODO/session plan and update chart interaction
  specs with display usability requirements.
- [x] Step 386.2: Add a Lightweight `timeScale.tickMarkFormatter` so intraday
  labels show meaningful times instead of day-only `1` labels.
- [x] Step 386.3: Stop applying fallback canvas padding to the Lightweight
  engine surface so presentation margins do not shrink the chart box.
- [x] Step 386.4: Increase the chart viewport to a stable viewport-relative
  height and keep the bottom navigation toolbar as an overlay.
- [x] Step 386.5: Add browser smoke coverage for time-axis labels and chart
  surface dimensions, then close the step.

Manual acceptance:

- Intraday Lightweight time-axis ticks are distinguishable, for example
  `09:30`, rather than repeated day-only `1` labels.
- Midnight/day boundary ticks may show compact dates such as `06-01`.
- The main chart host/canvas/surface retains a usable height on desktop and is
  not compressed by presentation padding.
- Chart navigation controls remain available as an overlay and do not take
  layout height away from the main chart.
- Step 385 native wheel zoom, pressed-mouse pan, price-axis scaling, and
  crosshair ownership remain intact.
- UI, chart runtime, replay runtime, and bar-data runtime ownership boundaries
  remain intact.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 387 - V5 Replay Workstation Layout Consolidation

Goal: consolidate the chart replay route from stacked engineering rows into a
denser replay workstation layout while preserving chart/replay/bar-data runtime
ownership boundaries.

This step advances Historical Replay Review by making the replay surface closer
to an actual workstation: controls are compact, the main chart keeps priority,
and status remains visible without competing with the chart.

- [x] Step 387.1: Add Step 387 TODO/session plan and update interaction specs
  with workstation layout requirements.
- [x] Step 387.2: Replace engineering shell copy with product-facing replay
  workstation copy.
- [x] Step 387.3: Consolidate replay, timeframe, timezone, presentation, and
  go-to controls into one compact toolbar while preserving existing command
  wiring and selectors.
- [x] Step 387.4: Move session/status/load information into a compact footer
  status band below the chart.
- [x] Step 387.5: Keep the chart navigation toolbar as an overlay with bottom
  clearance and increase desktop chart priority.
- [x] Step 387.6: Add browser smoke coverage for toolbar height, chart height,
  footer visibility, and removal of engineering shell text.

Manual acceptance:

- The chart route no longer shows `Chart Replay Shell` or `Chart Route`.
- Replay controls, timeframe, timezone, presentation, and go-to controls are
  consolidated into a compact workstation toolbar.
- The main chart remains the dominant surface on desktop.
- The bottom zoom/pan/reset toolbar is not flush with the bottom edge.
- Session/status/load information is visible in a compact footer band.
- Existing chart navigation, native Lightweight interaction, go-to time, and
  presentation controls still use commands/events and do not mutate replay or
  bar data directly.

Checks:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 388 - V5 Chart Price Scale Readability

Goal: tune Lightweight Charts price scale margins so the initial K-line view has
more natural vertical placement without reimplementing price-axis scaling or
breaking native chart interactions.

This step advances Historical Replay Review by improving chart readability. It
is a chart adapter/presentation step, not a replay cursor or bar-loading
change.

- [x] Step 388.1: Add Step 388 TODO/session plan and update chart interaction
  specs/vendor notes with price scale margin rules.
- [x] Step 388.2: Add bounded Lightweight price scale margin derivation from V5
  presentation margins.
- [x] Step 388.3: Apply margins through `series.priceScale().applyOptions()`
  during mount, bar updates, and presentation updates.
- [x] Step 388.4: Expose price scale margin metadata for smoke/debug
  assertions without applying DOM padding to Lightweight.
- [x] Step 388.5: Add adapter and browser smoke coverage for default and compact
  price scale margins while preserving native interaction coverage.

Manual acceptance:

- Initial Lightweight candlestick view uses bounded price scale margins instead
  of leaving excessive empty vertical space.
- Compact presentation updates the series price scale margins without shrinking
  the DOM chart surface.
- Price-axis drag scaling remains Lightweight native behavior.
- Price scale margin changes do not mutate replay cursor, replay `displayBars`,
  or bar-data cache.
- Existing chart navigation, native pan/zoom/crosshair, and presentation
  controls remain command/event driven.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 389 - V5 Chart Overlay Visibility

Goal: keep chart navigation controls available without covering the time axis,
bottom chart area, or right price axis across common desktop and low-height
viewports.

This step advances Historical Replay Review by polishing chart readability. It
is an overlay/layout step, not a chart runtime command or replay state change.

- [x] Step 389.1: Add Step 389 TODO/session plan and update chart interaction
  specs with overlay visibility requirements.
- [x] Step 389.2: Move the chart zoom/pan/reset overlay from bottom center to
  the chart's upper-right area with price-axis clearance.
- [x] Step 389.3: Reduce overlay button footprint while preserving existing
  chart command wiring and selectors.
- [x] Step 389.4: Add multi-viewport browser smoke coverage for overlay
  clearance from top, price axis, time axis, and footer.
- [x] Step 389.5: Keep existing chart navigation and workstation layout smoke
  passing.

Manual acceptance:

- The chart zoom/pan/reset controls do not cover the time axis.
- The overlay has clearance from the right price axis.
- The overlay remains visible and usable on desktop and low-height desktop
  viewports.
- Existing zoom/pan/reset commands, native Lightweight interaction, replay
  cursor, and bar-data ownership remain unchanged.

Checks:

- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 390 - V5 Responsive Chart Visual Acceptance

Goal: add screenshot-level responsive acceptance for the replay workstation
chart across desktop, laptop, low-height, narrow, and high-DPI viewport
conditions.

This step advances Historical Replay Review by making the real chart surface
visually dependable across common browser sizes. It is a browser harness and
layout verification step, not a replay cursor, bar-loading, order, journal, or
new chart-feature step.

- [x] Step 390.1: Add Step 390 TODO/session plan with Phase 3 scope and
  non-goals.
- [x] Step 390.2: Add a responsive visual browser smoke that loads the real
  Lightweight chart across multiple viewport/device-scale scenarios.
- [x] Step 390.3: Assert no horizontal page overflow, non-collapsed chart
  dimensions, visible rendered bars, toolbar containment, price-axis clearance,
  footer/status placement, and non-empty screenshot capture.
- [x] Step 390.4: Add the new smoke to `v5/scripts/smoke_all.js`.
- [x] Step 390.5: Run targeted layout/chart smokes, full V5 smoke, and update
  the session handoff with actual results.

Manual acceptance:

- The chart remains the dominant visible replay surface across common desktop
  and laptop viewport sizes.
- Low-height and narrow viewport scenarios do not collapse the chart or create
  horizontal document overflow.
- Chart zoom/pan/reset overlay remains inside the chart viewport and clear of
  the right price-axis area.
- Footer/status information remains below the chart instead of overlaying it.
- The harness captures a non-empty browser screenshot for each scenario and
  confirms the chart rendered real bars through the chart runtime.
- Replay cursor, reveal state, native Lightweight interactions, and bar-data
  ownership remain unchanged.

Checks:

- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 391 - V5 Floating Replay Controls And Hidden Go To

Goal: restructure the replay workstation controls so replay actions live in a
floating chart control bar and Go to time is hidden behind an explicit popover,
matching the FXReplay interaction model more closely.

This step advances Historical Replay Review by reducing top-toolbar visual
noise and making replay actions feel chart-native. It is a UI composition step,
not a replay runtime, bar-loading, chart-engine, layout-splitting, drawing, or
journal step.

- [x] Step 391.1: Add Step 391 TODO/session plan with explicit non-goals for
  multi-pane Layout and drawing tools.
- [x] Step 391.2: Move Next/Play/Pause/Reset and display timeframe controls
  into a floating replay bar inside the chart viewport.
- [x] Step 391.3: Replace the permanent Go to date input with a toolbar entry
  that opens a chart-centered popover/modal containing date/time, Go, Cancel,
  and Cursor actions.
- [x] Step 391.4: Add a top-toolbar Layout entry as a disabled/placeholder
  future control without implementing split panes.
- [x] Step 391.5: Add browser smoke coverage for floating replay controls,
  hidden Go to behavior, existing replay commands, and layout containment.

Manual acceptance:

- The top workstation toolbar no longer carries primary replay controls or a
  permanent date/time input.
- Next, Play, Pause, Reset, and timeframe selection remain command-driven and
  work from the floating chart replay bar.
- The floating replay bar stays inside the chart viewport and clear of the
  right price axis and time-axis area.
- Go to opens only after an explicit action, can be cancelled, and still uses
  chart runtime commands for navigation.
- Layout is visible only as a future entry point; split panes, sync settings,
  and drawing tools remain out of scope.
- Replay cursor, reveal state, native Lightweight interactions, and bar-data
  ownership remain unchanged.

Checks:

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 392 - V5 Minimal Chart Reset Overlay

Goal: simplify the upper-right chart overlay so it only provides reset/follow
behavior and no longer duplicates Lightweight Charts native wheel zoom and drag
pan interactions.

This step advances Historical Replay Review by removing a visually heavy,
amateur-looking chart overlay. It is a UI polish step, not a replay runtime,
bar-loading, chart-engine interaction, Layout, drawing, order, or journal step.

- [x] Step 392.1: Add Step 392 TODO/session plan and record that Layout
  planning is deferred.
- [x] Step 392.2: Remove overlay zoom out, zoom in, pan left, and pan right
  buttons from the chart route.
- [x] Step 392.3: Keep only a light reset/follow icon button wired to
  `CHART_COMMANDS.RESUME_VIEWPORT_FOLLOW`.
- [x] Step 392.4: Restyle the overlay as a transparent/minimal icon action
  instead of a boxed toolbar.
- [x] Step 392.5: Update browser smoke coverage for the one-button reset
  overlay while preserving native interaction coverage.

Manual acceptance:

- The upper-right chart overlay no longer contains zoom or pan buttons.
- Reset/follow remains available through `data-chart-reset-view`.
- The reset control is visually light and does not sit inside a heavy visible
  box.
- Native Lightweight wheel zoom, drag pan, and price-axis scaling remain the
  interaction path for chart navigation.
- Reset still resumes viewport follow without mutating replay cursor, reveal
  state, or bar-data cache.

Checks:

- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/chart-overlay-visibility-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 393 - V5 Compact Workstation Shell

Goal: remove the large app-shell header from the chart route so the replay
workstation gives priority to the chart surface while preserving route
navigation back to setup.

This step advances Historical Replay Review by matching the tighter FXReplay
workstation composition: chart-first layout, hidden global chrome on the chart
route, and lower text density. It is a shell/layout step, not a replay runtime,
bar-loading, chart-engine interaction, Layout split-pane, drawing, order, or
journal step.

- [x] Step 393.1: Add a router-owned current-route marker on the app shell for
  route-scoped layout styling.
- [x] Step 393.2: Hide the global app header on the chart route while keeping
  the setup route's full header intact.
- [x] Step 393.3: Add a compact Setup route entry inside the chart workstation
  toolbar so users can still leave the chart route without relying on hidden
  shell chrome.
- [x] Step 393.4: Reduce chart-route outer padding and reclaim vertical space
  for the chart viewport.
- [x] Step 393.5: Update browser smoke coverage for route marking, hidden chart
  header, preserved setup navigation, and workstation layout height.

Manual acceptance:

- On the chart route, the top `V5 / FX Replay` app header is not visible.
- The setup route still retains the normal app header and route tabs.
- The chart route has an in-workstation Setup entry that navigates back to the
  setup page.
- The chart viewport receives more vertical room without horizontal overflow.
- Replay cursor, reveal state, chart series ownership, native Lightweight
  interactions, and bar-data ownership remain unchanged.

Checks:

- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 394 - V5 Replay Transport UI And Timeframe Dropdown

Goal: replace the floating replay text-button group with a compact
FXReplay-style transport control and move display timeframe selection into a
single dropdown.

This step advances Historical Replay Review by improving the highest-frequency
chart interaction surface. It is a UI composition step, not a replay runtime,
bar-loading, chart-engine interaction, settings modal, Layout split-pane,
drawing, order, or journal step.

- [x] Step 394.1: Add Step 394 TODO/session plan and preserve recent UI
  decisions about settings, Cursor/Reset, transport controls, timeframe
  dropdown, and Setup visual follow-up.
- [x] Step 394.2: Replace floating `Next / Play / Pause / Reset` text buttons
  with compact icon transport buttons while keeping existing command selectors.
- [x] Step 394.3: Replace the `1m / 5m / 1H / 1D` button row with a single
  `data-display-timeframe-select` dropdown grouped by Minutes / Hours / Days.
- [x] Step 394.4: Update replay display-timeframe and floating-control browser
  smokes to use the dropdown and verify the transport remains chart-contained.
- [x] Step 394.5: Run targeted replay/layout smokes, full V5 smoke, and
  `git diff --check` before commit.

Manual acceptance:

- The floating replay control reads as a compact chart transport, not a generic
  admin button group.
- Replay actions remain command-driven through the existing `data-replay-*`
  selectors and do not mutate runtime state directly from UI code.
- Display timeframe is selected through one dropdown instead of four top-level
  buttons.
- The dropdown initially exposes the supported `1m`, `5m`, `1H`, and `1D`
  intervals with grouping that can later expand.
- Replay cursor ownership, reveal state, chart series ownership, native
  Lightweight interactions, and bar-data ownership remain unchanged.

Checks:

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 395 - V5 Chart Settings Surface

Goal: move low-frequency chart display preferences out of the top-level
workstation toolbar and into a chart settings surface.

This step advances Historical Replay Review by reducing toolbar noise after the
transport controls were compacted. It is a UI composition step, not a replay
runtime, bar-loading, chart-engine interaction, Layout split-pane, drawing,
order, or journal step.

- [x] Step 395.1: Add Step 395 TODO/session plan with explicit non-goals.
- [x] Step 395.2: Remove top-level `Exchange / UTC`, `24h / 12h`, `OHLC`,
  `Change`, `Crosshair`, `Compact`, and `+16` button groups from the
  workstation toolbar.
- [x] Step 395.3: Add a compact chart `Settings` entry that opens a dialog with
  Time, Status line, and Canvas sections.
- [x] Step 395.4: Reuse the existing display timezone and chart presentation
  command wiring inside the settings surface.
- [x] Step 395.5: Update browser smoke coverage for hidden top-level controls,
  settings open behavior, and existing display preference effects.

Manual acceptance:

- The top workstation toolbar no longer shows low-frequency display preference
  button rows.
- Settings opens a chart settings surface with Time, Status line, and Canvas
  sections.
- Timezone, time format, status rows, compact margins, right offset, and
  crosshair readout toggles still work through existing commands.
- Display preference changes do not advance replay, request bars, mutate replay
  cursor, or bypass chart runtime ownership.
- Layout split panes, drawing tools, order, and journal remain out of scope.

Checks:

- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 396 - V5 Replay Transport Semantic Alignment

Goal: correct the floating replay transport semantics after comparing against
the FXReplay reference controls.

This step advances Historical Replay Review by preventing high-frequency replay
controls from misleading users. It is a UI composition and command-wiring
correction step, not a replay runtime rewrite, bar-loading change, chart-engine
interaction change, Layout split-pane, drawing, order, or journal step.

- [x] Step 396.1: Record the durable transport decision in Current / Next so
  future sessions do not confuse playback interval with chart display
  timeframe.
- [x] Step 396.2: Move the existing display timeframe dropdown into the chart
  settings surface as a display preference.
- [x] Step 396.3: Replace the floating transport contents with FXReplay-style
  semantics: drag handle, selected-bar truncation placeholder, playback speed,
  previous bar placeholder, play/pause, replay interval placeholder, next bar,
  and sync-interval placeholder.
- [x] Step 396.4: Keep unsupported semantics disabled instead of wiring them to
  unrelated runtime behavior; keep Next/Play/Pause/Reset command behavior
  correct.
- [x] Step 396.5: Update browser smoke coverage for the corrected selectors,
  display timeframe location, and no misleading transport/display mixing.
- [x] Step 396.6: Run targeted replay/settings smokes, full V5 smoke, and
  `git diff --check` before commit.

Manual acceptance:

- Floating replay controls no longer expose chart display timeframe as a
  transport interval.
- Display timeframe remains available through chart settings and still drives
  display projection through `replay.setDisplayTimeframe`.
- Transport placeholders that are not backed by runtime commands are visibly
  disabled and do not mutate replay state.
- Playback speed controls the interval used by Play without moving ownership
  out of replay runtime.
- Replay cursor ownership, reveal state, chart series ownership, native
  Lightweight interactions, and bar-data ownership remain unchanged.

Checks:

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 397 - V5 Floating Replay Controls Dragging

Goal: make the replay transport drag handle move the floating control bar inside
the chart viewport.

This step advances Historical Replay Review by making the FXReplay-style
transport behave like a movable overlay. It is a UI behavior step, not a replay
runtime, bar-loading, chart-engine interaction, Layout split-pane, drawing,
order, or journal step.

- [x] Step 397.1: Add Step 397 plan and durable drag-handle decision to TODO.
- [x] Step 397.2: Implement pointer-driven dragging from the transport drag
  handle only.
- [x] Step 397.3: Constrain the floating control bar inside the chart viewport
  with enough edge padding for chart axes.
- [x] Step 397.4: Keep drag position route-local and ensure dragging does not
  mutate replay cursor, display bars, playback state, chart series, or bar
  requests.
- [x] Step 397.5: Extend browser smoke coverage for drag movement, bounds, and
  post-drag replay control usability.
- [x] Step 397.6: Run targeted replay/layout smokes, full V5 smoke, and
  `git diff --check` before commit.

Manual acceptance:

- Dragging the handle moves the replay controls.
- Dragging the control body outside the handle does not initiate overlay
  movement.
- The control bar remains inside the chart viewport after drag.
- Next/Play/Pause still work after moving the overlay.
- Dragging does not advance replay, request bars, or bypass runtime ownership.

Checks:

- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 398 - V5 Replay Previous Bar Runtime

Goal: implement the `<|` previous-bar transport action as the inverse of
`Next` for already revealed replay bars.

This step advances Historical Replay Review by replacing another disabled
transport placeholder with real replay runtime behavior. It is a replay runtime
and UI wiring step, not a bar-loading expansion, chart-engine interaction
change, Layout split-pane, selected-bar truncation, drawing, order, or journal
step.

- [x] Step 398.1: Add `replay.previous` command/event contracts and Step 398
  TODO/session plan.
- [x] Step 398.2: Implement replay runtime previous behavior using already
  revealed replay bars; start-bar state returns a no-op reason.
- [x] Step 398.3: Persist the rewound cursor/revealed count and pause playback
  before rewinding.
- [x] Step 398.4: Enable `data-replay-previous` only when `revealedCount > 0`
  and wire it through the command bus.
- [x] Step 398.5: Add runtime and browser smoke coverage for Next then
  Previous, start-bar no-op/disabled, no bar requests, and continued
  Next/Play usability.
- [x] Step 398.6: Run targeted replay smokes, full V5 smoke, and `git
  diff --check` before commit.

Manual acceptance:

- `<|` is disabled at the start bar and enabled after at least one revealed bar.
- Clicking `<|` after Next rewinds one revealed bar and updates cursor,
  revealed count, chart bars, footer labels, and persisted session cursor.
- Previous pauses playback before rewinding.
- Previous does not request new bars and does not reveal future bars.
- Selected-bar truncation and active chart interval sync remain deferred.

Checks:

- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-restore-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 399 - V5 Replay Truncate To Selected Bar

Goal: implement the `|<-` transport action using the current crosshair-inspected
bar as the selected replay bar.

This step advances Historical Replay Review by replacing the selected-bar
truncation placeholder with command-driven replay runtime behavior. It is a
replay runtime and UI wiring step, not a chart drawing, Layout split-pane,
active chart interval sync, order, or journal step.

- [x] Step 399.1: Add `replay.truncateToTimestamp` command/event contracts and
  Step 399 TODO/session plan.
- [x] Step 399.2: Implement replay runtime truncation to a selected timestamp
  within the already revealed range.
- [x] Step 399.3: Persist the truncated cursor/revealed count and pause playback
  before truncating.
- [x] Step 399.4: Enable `data-replay-truncate-to-selection` only when the
  current crosshair bar is between replay start and cursor.
- [x] Step 399.5: Add runtime and browser smoke coverage for multi-Next then
  selected-bar truncate, persisted cursor, no future display bars, no extra bar
  requests, and continued Next/Play usability.
- [x] Step 399.6: Run targeted replay smokes, full V5 smoke, and `git
  diff --check` before commit.

Manual acceptance:

- `|<-` is disabled without a valid crosshair-selected replay bar.
- Hovering/inspecting an already revealed bar enables `|<-`.
- Clicking `|<-` moves cursor to the selected bar, removes bars after it,
  recalculates revealed count, persists cursor, and pauses playback.
- Truncation does not load the full session range or request new bars for
  same-timeframe display.
- Active chart interval sync remains deferred.

Checks:

- `node v5/tests/replay-truncate-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 400 - V5 Replay Truncate Pick Mode

Goal: align the `|<-` transport action with FXReplay's pick-then-click
truncation interaction.

This step advances Historical Replay Review by correcting the selected-bar
truncation UX while preserving the Step 399 replay runtime command boundary. It
is a route interaction and browser-smoke step, not a replay interval sync,
Layout split-pane, drawing, order, or journal step.

- [x] Step 400.1: Document the corrected `|<-` pick-mode decision and Step 400
  plan in TODO/session handoff.
- [x] Step 400.2: Replace crosshair-driven immediate truncation with
  button-entered pick mode and a vertical chart guide.
- [x] Step 400.3: Map the chart click to an existing rendered bar timestamp via
  chart runtime command data, then dispatch `replay.truncateToTimestamp`.
- [x] Step 400.4: Add modal-style guardrail feedback for clicks before session
  start and reject clicks after the current replay cursor.
- [x] Step 400.5: Update browser smoke coverage for pick mode, valid
  truncation, no extra same-timeframe bar requests, and before-start warning.
- [x] Step 400.6: Run targeted replay smokes, full V5 smoke, and `git
  diff --check` before commit.

Manual acceptance:

- `|<-` is enabled when a replay session is loaded, independent of current
  crosshair state.
- Clicking `|<-` does not truncate immediately; it enters pick mode and shows a
  vertical guide over the chart.
- Clicking an already revealed chart bar between session start and cursor
  truncates through replay runtime and removes later bars.
- Clicking a chart time before replay session start shows a warning instead of
  mutating replay state.
- Same-timeframe truncation does not request additional bars.

Checks:

- `node v5/tests/replay-truncate-smoke.js`
- `node v5/tests/replay-display-contracts-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 401 - V5 Manual Replay Viewport Anchor

Goal: preserve the user's manually dragged chart viewport during replay
transport actions.

Decision: manual chart drag/zoom establishes a replay viewport anchor. After
that, Next, Previous, and Play must not resume cursor follow automatically.
Instead, chart runtime keeps manual mode and shifts the manual visible range by
the replay cursor delta so the newest replay bar keeps its screen anchor.
Reset/follow cursor remains the explicit way to leave manual mode.

Follow-up decision: right-side whitespace after a manual drag is part of the
manual anchor. Runtime may keep a manual visible range whose `to` extends beyond
the replay cursor, but chart runtime must still render only bars at or before
the replay right edge. Programmatic chart writes must ignore Lightweight native
visible-range echo callbacks so `setData()` cannot silently collapse the manual
range back to the latest rendered bar.
Native Lightweight drag events must also preserve logical right-side whitespace:
`subscribeVisibleTimeRangeChange` alone can report a range ending at the last
data bar, so the adapter must combine it with the current visible logical range
before updating chart-runtime manual anchor state.
Replay transport command execution is not a disabled UI state. Next/Previous/Play
commands should serialize while a command is in flight, but buttons should not
flash disabled or show a forbidden cursor during normal transport commands.
Replay floating controls are viewport-level controls, not chart-canvas overlays:
the drag handle may move them outside the chart area, clamped only to the visible
browser viewport.
Replay route initial loading must be disposable and session-safe: a chart route
that has been unmounted must not continue updating DOM, and an older
`LOAD_INITIAL_SESSION` request must not overwrite a newer session load.
Floating replay controls sit below modal/popover layers so Settings, Go to, and
truncate warnings remain the top interactive surface when open.

- [x] Step 401.1: Document the manual replay viewport anchor decision in
  TODO/spec/session handoff.
- [x] Step 401.2: Make chart runtime translate a manual visible range when
  replay cursor updates arrive without explicit resume.
- [x] Step 401.3: Change replay Next/Previous transport renders to avoid
  forcing viewport follow resume; Play inherits the same behavior through Next.
- [x] Step 401.4: Keep initial load and Reset as explicit follow-resume paths.
- [x] Step 401.5: Add runtime and browser smoke coverage for manual anchor
  preservation after replay transport.
- [x] Step 401.6: Run targeted replay/chart smokes, full V5 smoke, and `git
  diff --check` before commit.
- [x] Step 401.7: Preserve manual right-side whitespace across replay transport
  by rendering no future bars while keeping the user-established visible range.
- [x] Step 401.8: Guard runtime-originated Lightweight `setData()` /
  visible-range writes from being reinterpreted as user drag events.
- [x] Step 401.9: Convert native Lightweight logical right-side whitespace into
  chart-runtime manual visible range so transport anchors the newest K-line at
  the post-drag screen position.
- [x] Step 401.10: Keep replay transport buttons visually enabled during
  command-in-flight windows while serializing replay commands.
- [x] Step 401.11: Allow replay floating controls to drag outside the chart
  canvas while remaining inside the browser viewport.
- [x] Step 401.12: Guard stale route initial loads and keep popovers layered
  above viewport-level replay controls.

Manual acceptance:

- Dragging/panning the chart leaves it in manual viewport mode.
- Clicking Next/Previous or running Play after manual drag does not snap the
  newest K-line to the canvas right edge.
- The manual visible range moves by the replay cursor delta so the newest
  replay bar remains visible at the established anchor.
- If the manual visible range includes empty space to the right of the cursor,
  Next/Previous/Play preserve that empty-space anchor without rendering future
  K-lines.
- Clicking reset/follow cursor exits manual mode and resumes normal follow.

Checks:

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/replay-viewport-follow-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-session-switch-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 402 - V5 Replay Interval Sync

Goal: make the floating replay interval dropdown and active-chart sync toggle
real replay transport controls without confusing them with chart display
timeframe.

Decision: the replay interval dropdown controls replay transport step size. It
does not change the chart display interval by itself. For a 1m replay session,
selecting `5m` makes Next/Previous/Play advance in five 1m replay bars per
transport step. The sync toggle copies the active chart display interval into
the replay interval while enabled. UI remains route-local and dispatches replay
commands with `stepCount`; replay runtime still owns cursor and reveal state.

- [x] Step 402.1: Document the replay interval versus chart display interval
  decision and Step 402 plan in TODO/session/spec handoff.
- [x] Step 402.2: Add replay runtime `stepCount` support for Next, Previous,
  and Play while preserving one-bar default behavior.
- [x] Step 402.3: Enable the floating replay interval dropdown and sync toggle
  after initial replay load.
- [x] Step 402.4: Convert selected replay interval to a replay runtime
  `stepCount` payload instead of mutating chart display timeframe directly.
- [x] Step 402.5: Keep display interval sync explicit: when enabled, changing
  the chart display interval updates the replay interval selection.
- [x] Step 402.6: Add runtime and browser smoke coverage for multi-step replay
  transport, enabled interval controls, and sync behavior.
- [x] Step 402.7: Run targeted replay/control smokes, full V5 smoke, and `git
  diff --check` before commit.

Manual acceptance:

- Floating replay interval defaults to the replay session timeframe.
- Selecting `5m` on a 1m session makes Next advance five session bars.
- Previous and Play use the same selected replay interval step size.
- Turning sync on makes replay interval follow the active chart display
  interval.
- Changing replay interval alone does not change chart display interval.
- No replay interval control directly requests bars or writes chart series.

Checks:

- `node v5/tests/replay-next-smoke.js`
- `node v5/tests/replay-previous-smoke.js`
- `node v5/tests/replay-play-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 403 - V5 Single Pane Timeframe Control

Goal: make chart timeframe switching a visible single-pane control and verify
that changing TF actually reloads/render display timeframe bars.

Decision: chart display TF is an active chart pane control, not a hidden
Settings-only preference. V5 still has one pane, but the chart route now names
that pane `primary` and treats the toolbar TF dropdown as acting on the active
pane. This prepares the route for future multi-pane work without implementing
layout split panes yet.

- [x] Step 403.1: Investigate the current TF change path and confirm
  `replay.setDisplayTimeframe` owns display timeframe reload/render.
- [x] Step 403.2: Move chart TF selection out of Settings into the visible
  replay workstation toolbar.
- [x] Step 403.3: Keep replay interval separate from chart TF: replay interval
  remains in floating transport controls; chart TF remains in the toolbar.
- [x] Step 403.4: Add single-pane active pane semantics with `primary` pane
  markers and command payload context.
- [x] Step 403.5: Update browser smoke coverage to switch TF from the visible
  toolbar and assert the chart display context/data really becomes 5m bars.
- [x] Step 403.6: Update docs/session handoff and run targeted smokes,
  `smoke_all`, and `git diff --check` before commit.

Manual acceptance:

- The chart TF dropdown is visible on the chart page without opening Settings.
- Changing chart TF to `5m` dispatches display timeframe reload and chart data
  changes to 5m bars.
- Settings no longer owns the primary chart TF dropdown.
- Replay interval dropdown remains in the floating replay transport and remains
  playback-step semantics.
- The single chart pane is marked as active pane `primary` for future multi-pane
  expansion.

Checks:

- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 404 - V5 Viewport Demand Drag Smoothness

Status: completed.

Goal: reduce left-drag chart stutter by decoupling native chart drag frames from
history-demand loading and full chart data replacement.

Investigation summary:

- Lightweight native visible-range events fire at drag-frame frequency.
- Chart runtime currently observes those events immediately, records manual
  range state, computes viewport demand, and emits `chart:viewportDemand`.
- The replay viewport demand bridge consumes each emitted demand immediately.
- Demand identity includes high-frequency range details such as `from`, `to`,
  and `suggestedCount`, so tiny drag movements can produce distinct demand keys.
- Replay runtime loads/merges bounded display windows and calls chart
  `replaceBars`; the Lightweight adapter then calls `series.setData`.
- When dragging left near the loaded-history boundary, these effects can happen
  while the pointer is still moving, causing visible stutter and uneven new
  K-line appearance.

Decision:

- Native drag should remain visually owned by Lightweight Charts during pointer
  movement.
- Chart runtime should still record manual visible range promptly, but viewport
  demand consumption must be settled/throttled rather than handled per drag
  frame.
- Viewport demand keys should be stable at the load-window level, not at every
  visible-range pixel/second change.
- Cached or duplicate display windows must not cause unnecessary chart
  `setData()` calls when the merged display bars are unchanged.

Implementation:

- [x] Step 404.1: Add a small debounce/coalescing layer to
  viewport demand consumption. Target 120-180ms after the latest native range
  change, or a trailing call when drag settles.
- [x] Step 404.2: Reduce viewport demand bridge identity to stable load-window
  fields: session, instrument, display timeframe, direction, anchor, and
  normalized count. Do not include high-frequency `visibleFrom`/`visibleTo`
  unless they materially change the load window.
- [x] Step 404.3: Keep chart manual range updates immediate, but avoid
  replay/bar-data loads during every native visible-range event.
- [x] Step 404.4: Add replay runtime guard so an already-loaded display
  window or unchanged merged display bars does not trigger another
  `chart.replaceBars` / Lightweight `setData`.
- [x] Step 404.5: Add wiring/runtime smoke coverage for coalesced viewport
  demand, short duplicate suppression, and unchanged displayBars not rendering.
- [x] Step 404.6: Preserve no-future display, right-edge clamp, manual anchor,
  and prefix/display cache ownership boundaries.

Success criteria:

- Left drag remains native and responsive while the pointer is moving.
- Older bars load after demand settles or in coarse batches, not for every
  native range event.
- Repeated cached demand does not repeatedly call `series.setData`.
- Replay runtime remains the only owner of display history growth.
- Bar data runtime remains the only owner of bounded bar requests and cache.

Checks:

- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 405 - V5 Native Drag Writeback Guard

Status: completed.

Goal: keep Lightweight Charts native drag visually attached to the mouse by
blocking V5 runtime chart writebacks while a native pointer drag is active.

Problem:

- During native drag, Lightweight Charts owns the immediate chart movement.
- V5 observes native visible-range changes and stores manual range state.
- If replay/display-window work completes before pointer release, chart runtime
  can call `series.setData()` and `timeScale().setVisibleRange()` through
  `syncChartHost()`.
- That runtime writeback can interrupt Lightweight's native drag math, causing
  chart movement to feel detached from pointer movement.

Decision:

- Native pointer drag is an active interaction phase, not only a recent input
  timestamp.
- While native interaction is active, chart runtime may record observed visible
  range and emit demand, but it must not write visible range or replacement data
  back into the engine.
- Any runtime render requested during active native interaction should be
  deferred and flushed after pointer release / interaction settle.
- Explicit non-native chart commands may still update chart-owned state, but
  their engine write should also wait until the active native drag settles.

Implementation:

- [x] Step 405.1: Add Lightweight adapter native-interaction phase callbacks
  for pointer down/up, touch start/end/cancel, and wheel settle.
- [x] Step 405.2: Store native interaction state inside chart runtime and expose
  it in chart interaction state for diagnostics.
- [x] Step 405.3: Guard chart host synchronization so active native interaction
  queues runtime `setData()` / visible-range writes instead of applying them.
- [x] Step 405.4: Flush one queued chart sync after native interaction settles.
- [x] Step 405.5: Add runtime/browser smoke coverage proving runtime writes do
  not occur during active native drag and do flush after release.
- [x] Step 405.6: Update specs/session handoff and run targeted smokes, full V5
  smoke, and `git diff --check`.

Manual acceptance:

- Holding left mouse and dragging the chart keeps K-line movement visually
  attached to pointer movement.
- Crosshair and chart content do not drift because of runtime visible-range
  writebacks during drag.
- History demand and replay progression can still update internal runtime state
  during drag, but chart engine writes happen only after native drag settles.
- Manual replay viewport anchor, no-future display, and right-edge boundaries
  remain intact.

Checks:

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 406 - V5 Sparse Backward Display Seek

Status: completed.

Goal: let replay display-window loading continue left across sparse market gaps
such as futures weekend/closed-session windows instead of stopping at the first
empty or duplicate boundary.

Problem:

- On 1m NQ data, dragging left could stop around Sunday 18:00 even when the
  replay session spans multiple later days.
- A backward load from that boundary can request a bounded time window that
  contains no earlier trading bars, or only bars already present.
- Without another seek, `loadedCoverage.from` does not move left, so viewport
  demand keeps anchoring at the same boundary.
- Fast drag still has a small pointer/content drift, but after Step 405 that is
  a separate diagnostic problem rather than a runtime writeback interruption.

Decision:

- Bar-data runtime still owns only one bounded window request at a time.
- Replay runtime owns the higher-level sparse display seek: when a backward
  display request clearly targets earlier than the current earliest bar, and
  the returned window adds no older display bars, replay runtime may request the
  next earlier bounded window.
- Sparse seek must be capped to avoid unbounded API loops.
- Results should expose display-window attempts for diagnostics.

Implementation:

- [x] Step 406.1: Add replay-runtime helpers for earliest display timestamp,
  previous bounded-window anchor, and sparse backward seek eligibility.
- [x] Step 406.2: Change `loadDisplayWindow()` to attempt up to six backward
  windows when the first window adds no older display bars and the requested
  viewport is materially earlier.
- [x] Step 406.3: Keep normal duplicate/cached window behavior unchanged for
  small repeated requests near the current earliest bar.
- [x] Step 406.4: Return `displayWindow.attempts` and `seekAttempts` for
  debugging sparse/gap behavior.
- [x] Step 406.5: Add runtime smoke coverage for sparse backward seek and add it
  to full V5 smoke.
- [x] Step 406.6: Update docs/session handoff and run targeted smokes, full V5
  smoke, and `git diff --check`.
- [x] Step 406.7: Validate against real 1m NQ weekend data and continue seeking
  when a bounded window returns a few opening bars but still has a large left
  gap before the requested viewport.

Manual acceptance:

- Dragging left across a futures closed/session gap can continue loading older
  available bars instead of stopping at the gap boundary.
- Replay runtime remains the only owner of display history growth.
- Bar-data runtime remains the only owner of individual bounded bar requests.
- No-future display and manual viewport anchor behavior remain intact.

Checks:

- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/tests/replay-display-timeframe-smoke.js`
- `node v5/tests/replay-display-viewport-demand-wiring-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 407 - V5 Settle-After-Drag Loading Policy

Status: completed.

Goal: lock the product/runtime decision that left-drag history extension renders
after mouseup / native interaction settle, not while the left mouse button is
still held.

Problem:

- Step 406 made sparse backward display-window loading able to find older bars.
- A Step 407 experiment attempted active-drag `setData()` so newly loaded
  left-side bars appeared before mouseup.
- That path required suppressing Lightweight range echoes and compensating
  logical range shifts, which increased risk to native drag fidelity and manual
  replay anchoring.
- The accepted behavior is simpler and more stable: keep the drag attached to
  the pointer, then render newly loaded extension bars after release.

Decision:

- Native pointer drag remains an active interaction phase.
- While native drag is active, chart runtime may record observed visible range,
  update chart-owned manual state, and emit viewport demand.
- While native drag is active, chart runtime must not write replacement data or
  explicit visible ranges back into the chart engine, even if bar coverage has
  expanded.
- A queued chart sync flushes after pointer release / native interaction settle,
  so newly loaded left-side bars become visible after mouseup.
- Do not reintroduce active-drag `setData()` unless there is a measured,
  separate design step that proves it preserves Lightweight native drag
  fidelity and replay manual anchors.

Implementation:

- [x] Step 407.1: Revert the active-drag data-rendering experiment.
- [x] Step 407.2: Keep Step 405's writeback guard as the active policy.
- [x] Step 407.3: Strengthen browser smoke coverage so coverage-expanding
  `chart.replaceBars` during active drag still does not call `setData()`.
- [x] Step 407.4: Document the settle-after-drag loading policy in TODO,
  interaction contracts, and session handoff.

Manual acceptance:

- Holding left mouse and dragging the chart keeps K-line movement attached to
  pointer movement.
- Left-side extension bars may remain invisible while the button is held.
- After mouseup / native interaction settle, queued chart sync may render the
  newly loaded older bars.
- Replay manual anchor and no-future display behavior remain intact.

Checks:

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-display-sparse-backward-seek-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 408 - V5 Native Drag Diagnostic Harness

Status: completed.

Goal: add a repeatable diagnostic harness for fast/slow native drag analysis
without changing chart runtime behavior.

Problem:

- User-observed drag drift is hard to describe precisely and appears speed
  sensitive.
- Step 407 deliberately kept runtime chart writes deferred during active drag,
  so remaining drift needs measurement before another behavior change.
- Headless Chrome CDP mouse movement produces reliable pointer samples in the
  harness, but does not reliably make Lightweight emit native pan frames by
  itself.

Decision:

- Step 408 is diagnostic-only.
- The harness records real CDP pointer deltas for slow and fast drags.
- The harness feeds synthetic native visible-range frames through the same
  subscribed Lightweight visible-range callback path, while V5 native
  interaction phase is active.
- The harness records `setData`, `setVisibleRange`, and
  `setVisibleLogicalRange` deltas so future investigations can separate pointer
  movement, range observation, and runtime writeback effects.
- This harness does not claim to measure Lightweight's internal native pan
  physics in headless Chrome; manual browser repro remains necessary for that
  part.

Implementation:

- [x] Step 408.1: Add `chart-native-drag-diagnostic-browser-smoke.js`.
- [x] Step 408.2: Instrument pointer samples, visible-range samples, logical
  range samples, and runtime chart write counters.
- [x] Step 408.3: Run slow and fast drag scenarios and assert range movement is
  measurable while runtime `setData` stays quiet.
- [x] Step 408.4: Add the diagnostic smoke to `v5/scripts/smoke_all.js`.
- [x] Step 408.5: Update TODO, interaction contracts, and session handoff.

Manual acceptance:

- The diagnostic smoke produces comparable slow/fast drag summaries.
- The test fails if pointer movement is not sampled, if observed range movement
  is missing, or if drag diagnostics trigger runtime `setData()`.
- Runtime behavior remains unchanged.

Checks:

- `node v5/tests/chart-native-drag-diagnostic-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 409 - V5 Accept Native Fast-Drag Offset

Status: completed.

Goal: close the fast-drag pointer/content offset investigation as an accepted
native chart-engine characteristic rather than a current V5 behavior bug.

Problem:

- Manual observation found that very fast horizontal chart dragging can make
  K-line movement feel slightly offset from pointer movement.
- The same class of offset is observable in FX Replay / TradingView-style chart
  surfaces, suggesting it is a native chart-engine interaction characteristic
  rather than a V5-specific runtime writeback issue.
- Step 407 already prevents active-drag runtime chart writes, and Step 408 adds
  diagnostics for future investigation. Continuing to force a correction now
  risks degrading stable native drag, manual anchor, and replay viewport
  behavior.

Decision:

- Treat minor fast-drag pointer/content offset as acceptable for the current V5
  replay workstation.
- Do not add production code to compensate for this offset.
- Keep Step 408's diagnostic harness as a future regression/investigation tool,
  not as an active repair plan.
- Reopen only if the offset becomes materially worse than comparable
  TradingView/FxReplay behavior or starts breaking replay navigation accuracy.
- Resume work on single-pane chart shell/UI infrastructure before layout split
  panes.

Implementation:

- [x] Step 409.1: Record the accepted fast-drag offset decision in TODO.
- [x] Step 409.2: Update chart interaction contracts to classify minor
  fast-drag offset as acceptable native behavior.
- [x] Step 409.3: Add a session handoff documenting the decision and next
  direction.
- [x] Step 409.4: Run documentation sanity check and commit.

Manual acceptance:

- V5 no longer plans active correction for minor fast-drag offset.
- Step 408 diagnostics remain available for future comparisons.
- Next planning can move back to single-pane chart shell/UI infrastructure.

Checks:

- `git diff --check`

## Step 410 - V5 Single-Pane Chart Shell Semantics

Status: completed.

Goal: make the current single-pane chart shell explicit and testable before
any layout split-pane implementation begins.

Problem:

- Single-pane chart usage is the current product path, but future layout work
  needs stable active-pane semantics instead of ad hoc DOM assumptions.
- The Layout control is visible as a future entry point, but it must remain
  clearly deferred and unable to mutate chart layout state until multi-pane
  ownership and sync rules are defined.
- The high-frequency single-pane controls, especially chart display timeframe,
  Go to, Settings, and Setup route access, must remain visible and compact.

Implementation:

- [x] Step 410.1: Add route-level single-pane metadata:
  `data-active-pane-id="primary"`, `data-active-pane-count="1"`, and
  `data-layout-mode="single"`.
- [x] Step 410.2: Mark the chart viewport and chart host as the active
  `primary` pane.
- [x] Step 410.3: Mark the Layout control as disabled/deferred/single-mode
  instead of an active multi-pane command.
- [x] Step 410.4: Strengthen workstation layout browser smoke coverage for
  active pane metadata, deferred Layout state, and visible TF/Go-to/Settings
  controls.
- [x] Step 410.5: Update interaction contracts and session handoff.

Manual acceptance:

- Chart route exposes exactly one active pane with stable `primary` identity.
- Display timeframe, Go to, Settings, replay transport, and reset/follow
  remain active-pane controls in the single-pane shell.
- Layout remains disabled and documented as deferred.
- No replay cursor, display bars, bar-data windows, or chart runtime ownership
  rules change.

Checks:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/replay-display-timeframe-browser-smoke.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 411 - V5 Go-To Cursor Follow Semantics

Status: completed.

Goal: remove the ambiguous top-level `Cursor` action and keep the same behavior
inside the Go to surface with explicit wording.

Problem:

- `Cursor` in the top toolbar reads like a crosshair/tool toggle, but its
  actual behavior is `chart.resumeViewportFollow`.
- Having both a top-level `Cursor` and chart reset/follow controls makes view
  navigation semantics harder to learn.
- The action is still useful, but it should be named by behavior and live near
  Go to time navigation.

Implementation:

- [x] Step 411.1: Remove the top-level toolbar `Cursor` button from the chart
  route.
- [x] Step 411.2: Keep the Go to popover action and rename it to
  `Jump to replay cursor`.
- [x] Step 411.3: Keep the implementation command-driven through chart runtime
  `RESUME_VIEWPORT_FOLLOW`.
- [x] Step 411.4: Update browser smoke coverage so jump-to-cursor is exercised
  through the Go to popover and the top-level ambiguous button stays absent.
- [x] Step 411.5: Update TODO, interaction contracts, and session handoff.

Manual acceptance:

- The top toolbar no longer shows a `Cursor` button.
- The Go to popover exposes `Jump to replay cursor`.
- Clicking `Jump to replay cursor` resumes chart follow mode.
- The action does not advance replay cursor, reset replay, change revealed
  count, or directly request bars.

Checks:

- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 412 - V5 Sessions Route Navigation Cleanup

Status: completed.

Goal: move session-selection navigation out of the chart-control toolbar and
make the destination wording clear.

Problem:

- The former `Setup` button returned to the session selection/creation route,
  but it sat beside active chart controls like TF, Go to, Layout, and Settings.
- That placement made route navigation look like a chart/pane command.
- The destination is better described as `Sessions` than `Setup`.

Implementation:

- [x] Step 412.1: Move the chart route's setup-route link from the chart
  control toolbar into the panel heading.
- [x] Step 412.2: Rename the visible action from `Setup` to `Sessions`.
- [x] Step 412.3: Add route-level navigation styling that keeps the action
  visually separate from chart controls.
- [x] Step 412.4: Update workstation layout browser smoke coverage so the
  heading `Sessions` action navigates back to setup and the chart toolbar has
  no setup-route link.
- [x] Step 412.5: Update TODO, interaction contracts, and session handoff.

Manual acceptance:

- The chart-control toolbar no longer contains `Setup`.
- The chart heading exposes `Sessions` as the route-level return action.
- Clicking `Sessions` returns to the session selection/creation route.
- No replay cursor, display bars, bar-data windows, or chart runtime ownership
  behavior changes.

Checks:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/app-shell-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 413 - V5 Chart OHLC Top-Left Overlay

Status: completed.

Goal: render the current-bar OHLC readout in the chart canvas top-left area,
matching V4 and FX Replay visual placement.

Problem:

- OHLC was available only in the compact footer/status band.
- FX Replay and V4 place the active chart OHLC/status readout in the canvas
  top-left area, where chart users expect to inspect it.
- The change should remain presentation-only and must not change chart runtime
  ownership or replay state.

Implementation:

- [x] Step 413.1: Add a read-only chart OHLC overlay inside the chart viewport.
- [x] Step 413.2: Populate the overlay from the same current display-bar
  formatting used by the footer OHLC status.
- [x] Step 413.3: Keep the overlay tied to the existing `showStatusOhlc`
  presentation setting.
- [x] Step 413.4: Style the overlay as top-left canvas text with pointer events
  disabled.
- [x] Step 413.5: Update browser smoke coverage, interaction contracts, TODO,
  and session handoff.

Manual acceptance:

- The chart canvas shows instrument, timeframe, and OHLC at top-left.
- The overlay hides when the OHLC presentation setting is disabled.
- The overlay is read-only and does not intercept chart mouse interaction.
- Replay cursor, display bars, bar-data windows, and chart runtime ownership are
  unchanged.

Checks:

- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 414 - V5 Compact Chart Route Chrome

Status: completed.

Goal: make the chart route's route-level chrome compact enough that the
single-pane chart surface remains visually dominant.

Problem:

- After moving `Sessions` into route-level navigation, the chart route still
  had page-like heading chrome above the active chart controls.
- FXReplay-style usage expects dense workstation chrome, not a marketing/admin
  panel heading that competes with the chart.
- The change should stay visual/route-level and must not alter replay, chart,
  or bar-data runtime behavior.

Implementation:

- [x] Step 414.1: Add stable route heading/action class names for chart-route
  chrome without changing command ownership.
- [x] Step 414.2: Compress chart heading, route action, toolbar spacing, and
  chart viewport sizing so the chart surface gets more vertical priority.
- [x] Step 414.3: Keep `Sessions` route navigation separate from active-pane
  controls.
- [x] Step 414.4: Extend workstation layout smoke coverage with route chrome
  height and chart-height assertions.
- [x] Step 414.5: Update interaction contracts, TODO, and session handoff.

Manual acceptance:

- The chart route no longer reads as a large page header above the workstation.
- `Sessions` remains visible as route navigation, not a chart command.
- TF, Go to, Layout, and Settings remain in the active chart control row.
- Replay cursor, display bars, bar-data windows, chart runtime ownership, and
  single-pane active pane identity are unchanged.

Checks:

- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-responsive-visual-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 415 - V5 FXReplay-Style Chart Settings Modal

Status: completed.

Goal: make Chart Settings behave like a formal FXReplay-style settings modal
instead of a small immediate-apply popover, while improving the chart OHLC
legend behavior.

Problem:

- Settings was visually too lightweight and did not match FXReplay's sectioned
  settings dialog pattern.
- Settings controls applied immediately, which made `Cancel` semantics
  impossible and made future settings expansion risky.
- The top-left OHLC overlay used the latest replay bar only; it did not show
  the bar currently under the crosshair like V4.

Implementation:

- [x] Step 415.1: Convert Chart Settings to a modal with left-side sections:
  `Symbol`, `Status line`, `Scales and lines`, and `Canvas`.
- [x] Step 415.2: Keep only currently functional settings in the modal:
  display timezone, time format, status line toggles, right offset, and compact
  margins.
- [x] Step 415.3: Add draft-state semantics so controls do not dispatch runtime
  mutations until `Ok`; `Cancel`, close, and backdrop dismiss discard the draft.
- [x] Step 415.4: Style the top-left OHLC overlay as a V4-like segmented legend
  and show crosshair hover bar OHLC when available.
- [x] Step 415.5: Update browser smokes for Settings draft/Ok behavior,
  timezone, crosshair OHLC, and price-scale settings.
- [x] Step 415.6: Update interaction contracts, TODO, and session handoff.

Manual acceptance:

- Settings opens as a centered modal with section navigation and bottom
  `Cancel` / `Ok`.
- Changing Settings controls does not affect chart labels, OHLC visibility, or
  price scale margins until `Ok`.
- `Cancel`/close/backdrop dismiss discard unsaved Settings edits.
- The chart OHLC overlay displays crosshair bar OHLC while hovering and falls
  back to the latest replay display bar otherwise.
- Replay cursor, display bars, bar-data windows, chart runtime ownership, and
  single-pane active pane identity are unchanged.

Checks:

- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/chart-crosshair-browser-smoke.js`
- `node v5/tests/chart-go-to-time-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 416 - V5 Candle Style Settings

Status: completed.

Goal: make the Settings `Symbol` section control real candle body, border, and
wick colors without bypassing chart presentation/runtime ownership.

Problem:

- Step 415 created the correct Settings modal shape, but candle styling was
  still hardcoded in chart adapter defaults.
- Future settings expansion needs a verified route from modal draft state to
  presentation runtime, chart display context, and chart-engine adapter.

Implementation:

- [x] Step 416.1: Add `candleStyle` defaults and normalization to chart
  presentation contracts/runtime.
- [x] Step 416.2: Add body, border, and wick up/down color inputs to the
  Settings `Symbol` section.
- [x] Step 416.3: Preserve Settings draft semantics so color changes do not
  mutate chart presentation until `Ok`.
- [x] Step 416.4: Carry candle style through chart runtime display context.
- [x] Step 416.5: Apply candle style in the chart-engine adapter for
  Lightweight series options and DOM fallback metadata.
- [x] Step 416.6: Update runtime, adapter, and browser smokes plus
  presentation/interaction docs and session handoff.

Manual acceptance:

- Settings exposes candle `Body`, `Borders`, and `Wick` color pairs.
- Changing a color in Settings does not affect the chart until `Ok`.
- `Ok` updates chart candle colors without changing replay cursor, display
  bars, bar-data windows, active pane identity, or chart runtime ownership.
- Invalid presentation colors are rejected by the presentation runtime.

Checks:

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 417 - V5 Grid And Crosshair Style Settings

Status: completed.

Goal: make Chart Settings control real grid and crosshair presentation options
without bypassing chart runtime or chart-engine adapter ownership.

Problem:

- Step 416 proved the Settings-to-adapter style path for candle colors, but grid
  and crosshair styling were still hardcoded in the chart-engine adapter.
- Future chart customization needs these options to be presentation runtime
  state, not route-local one-off UI behavior.

Implementation:

- [x] Step 417.1: Add `gridStyle` and `crosshairStyle` defaults and
  normalization to chart presentation contracts/runtime.
- [x] Step 417.2: Add Settings controls for grid visibility/color in `Canvas`
  and crosshair visibility/color/label background in `Scales and lines`.
- [x] Step 417.3: Preserve Settings draft semantics so grid/crosshair changes
  do not mutate chart presentation until `Ok`.
- [x] Step 417.4: Carry grid/crosshair style through chart runtime display
  context.
- [x] Step 417.5: Apply grid/crosshair style in the chart-engine adapter for
  Lightweight chart options and DOM fallback metadata.
- [x] Step 417.6: Update runtime, adapter, browser, display-context smokes plus
  presentation/interaction docs and session handoff.

Manual acceptance:

- Settings exposes grid vertical/horizontal visibility and color controls.
- Settings exposes crosshair vertical/horizontal visibility, line colors, and
  label background color controls.
- Changing those controls does not affect the chart until `Ok`.
- `Ok` updates chart grid/crosshair appearance without changing replay cursor,
  display bars, bar-data windows, active pane identity, or chart runtime
  ownership.
- Invalid grid/crosshair colors are rejected by the presentation runtime.

Checks:

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 418 - V5 Settings FXReplay Parity Pass

Status: completed.

Goal: improve Chart Settings parity with FXReplay's settings dialog by adding
the next low-risk presentation controls without changing replay, bar-data, or
multi-pane ownership.

Problem:

- FXReplay exposes more practical settings than V5 after Step 417, especially
  status title/open-market controls, explicit chart margins, background color,
  and scale text/line styling.
- These are presentation concerns and should flow through the existing
  presentation runtime -> chart display context -> chart-engine adapter path,
  not as route-local chart-engine calls.

Implementation:

- [x] Step 418.1: Add `showStatusTitle` and `showOpenMarketStatus` presentation
  settings and wire them to the top-left chart OHLC overlay.
- [x] Step 418.2: Add explicit top/bottom margin inputs while preserving the
  existing compact margin shortcut.
- [x] Step 418.3: Add chart background color and scale text color, line color,
  and font-size presentation settings.
- [x] Step 418.4: Carry background/scale style through chart runtime display
  context and apply them in the chart-engine adapter for Lightweight layout,
  time scale, and price scale options plus DOM fallback metadata.
- [x] Step 418.5: Preserve Settings draft semantics so all new controls remain
  local until `Ok`; `Cancel`, close, and backdrop dismiss discard edits.
- [x] Step 418.6: Update runtime, adapter, browser smokes plus presentation
  docs and session handoff.

Manual acceptance:

- Settings exposes Status line controls for title and open-market status.
- Settings exposes Canvas controls for top/bottom margins, background color,
  scale text color, scale line color, and scale text size.
- Changing these controls does not affect the chart until `Ok`.
- `Ok` updates only presentation state and chart display context; it does not
  change replay cursor, display bars, bar-data windows, active pane identity, or
  chart runtime ownership.
- Invalid background/scale colors and out-of-range scale font sizes are
  rejected by the presentation runtime.

Non-goals:

- No price-scale mode/placement implementation.
- No watermark/session-break implementation.
- No template persistence system.
- No split-pane layout or chart sync work.

Checks:

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 419 - V5 Remaining Settings Planning And Scope Lock

Status: completed.

Goal: lock the remaining FXReplay Settings parity plan before implementing more
controls, so Settings work stays inside V5 runtime ownership boundaries.

Problem:

- FXReplay Settings still includes many controls not covered by Step 418.
- Some remaining controls are simple presentation state, while others affect
  chart engine behavior, future multi-pane semantics, or persistence.
- Implementing all remaining controls in one step would risk route-local
  one-off behavior and hidden coupling to chart/replay internals.

Plan:

- [x] Step 419.1: Classify remaining FXReplay Settings controls into staged
  implementation groups.
- [x] Step 419.2: Define Step 420 as the next implementation step for pure time
  and label presentation controls.
- [x] Step 419.3: Define Step 421 as the advanced chart-engine presentation
  step for price-scale, canvas, watermark, and session-break behavior that
  needs adapter/runtime acceptance first.
- [x] Step 419.4: Explicitly defer template persistence and split-pane/pane
  settings until their ownership models exist.
- [x] Step 419.5: Update chart presentation spec, TODO, specs index, and
  session handoff.

Step 420 - Time And Label Presentation:

- Implement only controls that are pure presentation state.
- Candidate controls:
  - time-scale date format options;
  - day-of-week label display;
  - current symbol label display mode where V5 already has visible label
    ownership;
  - previous-day-close and high/low label controls only if they can be rendered
    from existing display bars without new bar requests;
  - plus button visibility if it maps to existing chart affordances without
    changing replay or bar-data state.
- Required checks:
  - presentation runtime normalization smoke;
  - chart adapter or route browser smoke for visible label changes;
  - no cursor/display-bar/request-count changes in browser smoke;
  - `v5/scripts/smoke_all.js`;
  - `git diff --check`.

Step 421 - Advanced Chart-Engine Settings:

- Implement only after checking Lightweight Charts support and V5 chart runtime
  ownership.
- Candidate controls:
  - price scale visibility/mode;
  - scale placement;
  - lock price-to-bar ratio;
  - no-overlapping-label behavior if supported by the chart engine;
  - countdown to bar close if it can be computed from replay/display time
    without introducing live timers as replay state;
  - watermark;
  - session breaks.
- Required checks:
  - adapter smoke proving options reach Lightweight/fallback metadata;
  - browser smoke proving Settings draft semantics;
  - boundary smoke proving UI does not call chart-engine APIs directly;
  - no replay cursor, display bar, or bar-data mutation on presentation changes.

Deferred:

- Template dropdown and save/apply behavior are deferred until presentation
  settings persistence is designed.
- Pane button visibility and pane-specific settings are deferred until the
  split-pane ownership and active-pane sync model is planned.
- Any control requiring additional historical bars is not a Settings-only
  presentation step and must go through bar-data/replay planning.

Manual acceptance:

- The next Settings implementation step has a bounded scope.
- Remaining FXReplay controls are not treated as one route-local checklist.
- The plan preserves V5 rules: UI dispatches commands, chart runtime owns chart
  presentation, replay runtime owns replay state, and bar-data runtime owns bar
  requests/cache.
- Template and pane settings are explicitly non-goals until their ownership
  models exist.

Checks:

- `git diff --check`

## Step 420 - V5 Time And Label Presentation Settings

Status: completed.

Goal: implement the next pure FXReplay Settings parity slice for time/date label
presentation and existing chart title labels without touching replay or bar-data
ownership.

Problem:

- `dateFormat` existed in chart presentation contracts but did not affect
  route labels, candle titles, or chart tick labels.
- FXReplay Settings exposes day-of-week label and title display controls that
  are presentation-only and can be added before advanced price-scale/canvas
  controls.

Implementation:

- [x] Step 420.1: Add supported date formats:
  `YYYY-MM-DD`, `MMM DD 'YY`, and `DD MMM 'YY`.
- [x] Step 420.2: Add `showDayOfWeekLabels` presentation state and formatting
  support.
- [x] Step 420.3: Add `statusTitleMode` for existing OHLC overlay title display:
  symbol + timeframe, symbol only, or timeframe only.
- [x] Step 420.4: Apply date/day formatting to route timestamps, fallback
  candle titles, and Lightweight tick labels through chart display context.
- [x] Step 420.5: Add Settings controls for Date format, Day of week on labels,
  and Title mode while preserving draft-only edits until `Ok`.
- [x] Step 420.6: Update runtime, adapter, browser, and timezone smokes plus
  presentation docs and session handoff.

Manual acceptance:

- Settings exposes Date format and Day of week on labels under Time scale.
- Settings exposes Status line title mode for the existing chart OHLC overlay.
- Changing these controls does not affect the chart until `Ok`.
- `Ok` updates label/title presentation without changing replay cursor,
  display bars, bar-data windows, request ranges, active pane identity, or chart
  runtime ownership.
- Invalid date formats and status title modes are rejected by the presentation
  runtime.

Non-goals:

- No price-scale mode/placement implementation.
- No countdown, watermark, or session-break implementation.
- No previous-day-close/high-low label implementation because those need a
  separate decision about deriving labels from existing display bars.
- No template persistence system.
- No split-pane or pane-specific settings work.

Checks:

- `node v5/tests/timezone-contracts-smoke.js`
- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-display-usability-browser-smoke.js`
- `node v5/tests/chart-price-scale-browser-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 421 - V5 Advanced Chart-Engine Settings

Status: completed.

Goal: implement a bounded FXReplay Settings parity slice for advanced
chart-engine presentation controls that the current runtime/adapter can own
without changing replay or bar-data behavior.

Problem:

- Remaining settings contained a mix of straightforward chart options and
  features that still need separate ownership design.
- Watermark support existed in the vendored Lightweight Charts build but had to
  be applied through the chart-engine adapter, not directly from route UI.

Implementation:

- [x] Step 421.1: Add normalized `scaleStyle.priceScaleVisible`,
  `scaleStyle.timeScaleVisible`, and `scaleStyle.scaleBordersVisible`.
- [x] Step 421.2: Add normalized `watermarkStyle` with draft-safe visible,
  text, color, and font-size settings.
- [x] Step 421.3: Pass the new settings through chart display context without
  giving route UI direct chart-engine control.
- [x] Step 421.4: Apply price/time scale visibility, scale border visibility,
  and text watermark in the Lightweight adapter; fallback canvas exposes the
  same metadata for smokes.
- [x] Step 421.5: Add Settings controls under Scales and Canvas while
  preserving `Ok`/`Cancel` draft semantics.
- [x] Step 421.6: Update runtime, adapter, browser, and viewport-demand smokes
  plus presentation docs and session handoff.

Manual acceptance:

- Settings exposes Time scale, Price scale, and Scale borders toggles.
- Settings exposes Watermark enable/text/color/font-size controls.
- Editing those controls does not mutate chart presentation until `Ok`.
- `Ok` updates chart presentation without changing replay cursor, display bars,
  bar-data requests, request ranges, or active pane identity.
- Invalid watermark color, font size, or overlong text is rejected by the
  presentation runtime.

Non-goals:

- No price-scale mode or scale placement implementation.
- No lock price-to-bar ratio or no-overlap-label implementation.
- No countdown-to-bar-close implementation.
- No session-break rendering.
- No template persistence system.
- No split-pane or pane-specific settings work.

Checks:

- `node v5/tests/chart-presentation-runtime-smoke.js`
- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/replay-display-viewport-demand-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 422 - V5 Reset View Follow Range Fix

Status: completed.

Goal: fix Reset View after native drag/zoom so it restores replay cursor follow
instead of reapplying a stale manual visible range.

Problem:

- The right-top Reset View button dispatches `chart.resumeViewportFollow`.
- `chart.resumeViewportFollow` returned to follow mode but left
  `state.visibleRange` from the prior native drag/wheel interaction intact.
- Chart host sync then applied follow logical range and immediately wrote the
  old manual visible range back into the adapter, causing reset/zoom behavior
  like the reported screenshots: follow state looked active while the viewport
  could jump, lose left extension, or re-expand unpredictably after further
  wheel/drag input.

Implementation:

- [x] Step 422.1: Make `RESUME_VIEWPORT_FOLLOW` clear `state.visibleRange`.
- [x] Step 422.2: Clear stale prefix/viewport demand when explicit follow is
  resumed.
- [x] Step 422.3: Make mounted chart sync write `adapter.setVisibleRange(...)`
  only while interaction mode is manual.
- [x] Step 422.4: Add runtime/adapter smoke coverage for the direct
  `chart.resumeViewportFollow` command after a manual visible range.
- [x] Step 422.5: Add interaction contract assertions that resumed follow has
  no visible range.

Manual acceptance:

- After native drag or wheel zoom, Reset View returns to replay cursor follow.
- Reset View must not reuse the previous manual/native visible range after
  setting follow logical range.
- Replay cursor, reveal state, display bars, and bar-data ownership remain
  unchanged by Reset View.

Checks:

- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/replay-manual-viewport-follow-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 423 - V5 Wheel Zoom Viewport Demand Settle Fix

Status: completed.

Goal: make native wheel zoom left-extension behave like drag settle: when zoom
creates left-side blank space, V5 should load and render older K-lines
automatically without requiring a follow-up left-click or drag.

Problem:

- Drag interactions have an explicit mouseup settle point, so deferred chart
  writes flush after older bars load.
- Wheel interactions used a shorter native-active window than the viewport
  demand bridge debounce. That let some demand loads and chart writes happen
  outside the intended settle window, where Lightweight could leave the visible
  canvas blank until another pointer interaction caused a refresh.
- If demand was computed during native wheel interaction, the initial demand
  event was the only trigger; there was no final settled demand emission to
  guarantee the replay bridge saw the final viewport gap.

Implementation:

- [x] Step 423.1: Treat Lightweight wheel input as an active native interaction
  for 260ms, longer than the viewport-demand bridge debounce.
- [x] Step 423.2: On native interaction settle, re-emit the current
  `viewportDemand` when one exists. The replay bridge de-dupes by demand key.
- [x] Step 423.3: Add adapter smoke coverage proving wheel remains active past
  the old 120ms window and then settles.
- [x] Step 423.4: Add runtime/adapter smoke coverage proving wheel native
  settle re-emits viewport demand for left-side extension.

Manual acceptance:

- Wheel zoom that exposes blank space to the left of loaded bars should trigger
  older-bar loading and chart refresh after wheel settle.
- Users should not need to left-click, drag, or otherwise stimulate the chart
  for the extension K-lines to appear.
- Runtime chart writes still remain deferred during active native interaction.

Checks:

- `node v5/tests/chart-engine-adapter-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-browser-smoke.js`
- `node v5/tests/chart-native-interaction-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 424 - V5 Chart Replay Settings Modularization

Status: completed.

Goal: start route-level modularization before the chart replay surface becomes
harder to split, while preserving existing behavior and V5 command/event
ownership boundaries.

Problem:

- `chart-replay-route.js` had grown past 1700 lines and mixed route shell,
  settings modal template, settings draft state, settings event bindings,
  replay controls, navigation, and status rendering.
- Continuing settings work in the same file would make later separation risky:
  UI control references, draft mutations, and runtime command dispatch would be
  harder to untangle.
- A broad runtime refactor would be unnecessary risk while chart/replay
  interaction fixes are still being stabilized.

Implementation:

- [x] Step 424.1: Define the first modularization boundary as route-local
  Settings UI, not runtime internals.
- [x] Step 424.2: Extract the Settings modal HTML into
  `features/chart-replay/chart-settings-panel.js`.
- [x] Step 424.3: Move Settings draft creation, clone helpers, section tab
  switching, control rendering, and apply/cancel event binding into the
  Settings panel module.
- [x] Step 424.4: Keep the chart replay route as the owner of command dispatch
  and runtime state synchronization by passing apply/cancel callbacks into the
  settings controller.
- [x] Step 424.5: Preserve existing presentation/timezone behavior and smoke
  coverage while reducing `chart-replay-route.js` from 1737 to 1082 lines.

Manual acceptance:

- Opening Settings, editing draft values, canceling, and applying should behave
  the same as before the split.
- The Settings module must not call chart series APIs or directly control
  replay/chart runtime internals.
- Chart presentation and display timezone changes must still flow through
  existing commands and chart display context synchronization.

Checks:

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-settings-panel.js`
- `node v5/tests/display-timezone-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 425 - V5 Chart Replay Route Boundary Split

Status: completed.

Goal: continue route-level modularization with a slightly larger but still
low-risk split so future chart-route functionality has clear homes instead of
accumulating in `chart-replay-route.js`.

Problem:

- After Step 424, `chart-replay-route.js` was smaller but still mixed static
  page template markup, floating replay transport drag behavior, status
  rendering, navigation, replay command wiring, and runtime event subscriptions.
- Future settings, layout, drawing, order, or review features would become
  harder to isolate if page template and DOM-only UI interaction kept growing
  inside the route shell.

Implementation:

- [x] Step 425.1: Extract the chart replay page shell markup into
  `features/chart-replay/chart-replay-template.js`.
- [x] Step 425.2: Extract floating replay transport markup into
  `features/chart-replay/replay-floating-controls.js`.
- [x] Step 425.3: Move floating transport drag/clamp behavior into
  `createReplayFloatingControlsController(...)`.
- [x] Step 425.4: Keep replay commands, chart commands, status refresh, and
  event subscriptions in `chart-replay-route.js`.
- [x] Step 425.5: Preserve route DOM data attributes and smoke-test selectors
  so this remains a no-behavior-change modular split.

Manual acceptance:

- Chart route renders the same workstation shell, toolbar, Settings entry,
  chart pane, Go to popover, replay controls, and footer status.
- Floating replay controls can still be dragged and clamped to the viewport.
- The new template/controller modules do not dispatch replay/chart commands or
  write chart series.

Checks:

- `node --check v5/src/features/chart-replay/chart-replay-route.js`
- `node --check v5/src/features/chart-replay/chart-replay-template.js`
- `node --check v5/src/features/chart-replay/replay-floating-controls.js`
- `node v5/tests/replay-floating-controls-browser-smoke.js`
- `node v5/tests/replay-controls-browser-smoke.js`
- `node v5/tests/chart-presentation-browser-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`

## Step 426 - V5 Chart Runtime State Helpers Split

Status: completed.

Goal: reduce chart runtime coupling by moving pure state normalization and
viewport/range calculations out of `chart-runtime.js` without changing chart
runtime command/event ownership.

Problem:

- `chart-runtime.js` mixed state shape construction, payload normalization,
  viewport demand math, rendered-bar selection, host mounting, adapter sync,
  command registration, and event subscriptions.
- Future layout, multi-pane, drawing, and review features would have to touch a
  large runtime file even when they only need pure chart range helpers.

Implementation:

- [x] Step 426.1: Add `runtime/chart-runtime-state.js` for chart state shape,
  timestamp/range normalization, bar/crosshair normalization, and host metrics.
- [x] Step 426.2: Add `runtime/chart-runtime-viewport.js` for prefix demand,
  viewport demand, rendered bars, go-to, zoom, pan, and manual-anchor range
  calculations.
- [x] Step 426.3: Keep `chart-runtime.js` focused on mounted hosts, adapter
  writes, command registration, event subscription, and state mutation
  orchestration.
- [x] Step 426.4: Preserve existing command contracts and chart adapter write
  ownership.
- [x] Step 426.5: Reduce `chart-runtime.js` from 1069 lines to 606 lines.

Manual acceptance:

- Chart runtime behavior should be unchanged: bar replacement, viewport follow,
  manual/native visible ranges, reset view, go-to, zoom/pan, prefix demand, and
  viewport demand must continue to pass existing smokes.
- New helper modules must not register commands, subscribe to events, mount DOM
  hosts, or write chart adapters.
- `chart-runtime.js` remains the only chart runtime owner.

Checks:

- `node --check v5/src/runtime/chart-runtime.js`
- `node --check v5/src/runtime/chart-runtime-state.js`
- `node --check v5/src/runtime/chart-runtime-viewport.js`
- `node v5/tests/chart-runtime-smoke.js`
- `node v5/tests/chart-runtime-engine-adapter-smoke.js`
- `node v5/tests/chart-interaction-contracts-smoke.js`
- `node v5/tests/chart-navigation-toolbar-browser-smoke.js`
- `node v5/tests/replay-viewport-follow-browser-smoke.js`
- `node v5/scripts/smoke_all.js`
- `git diff --check`
