# V5 TODO

## TODO Organization

- Step numbers are historical execution IDs, not phase numbers.
- This file keeps Current / Next at the top and completed steps in numeric order.
- Do not move the latest completed step to the top; add or update the current/next note instead.
- If a step number appears missing before Step 357, it is outside the V5 TODO history.
- Future work should continue with the next explicit step number and update the session handoff.

## Current / Next

- Current status: Step 400 is complete.
- Next candidate: after Step 400, continue transport runtime semantics for
  replay playback interval selection / active chart interval sync, or decide
  whether Layout needs a dedicated planning step before implementation.
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
- UI decision: avoid exposing both `Cursor` and `Reset` as similar top-level
  chart actions. Long term, keep one visible chart action for `Reset view` /
  `Follow replay`; move the current `Cursor` behavior into the Go To surface as
  an auxiliary action such as `Use current replay time` or rename it so it
  clearly means jumping to the replay cursor without resetting zoom/follow
  state.
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
- UI decision: the replay transport drag handle should actually move the
  floating controls inside the chart viewport. Initial implementation may keep
  position as route-local UI state; dragging must not mutate replay cursor,
  display bars, chart data, or bar-data windows.
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
  final workstation quality bar. Give it a later visual pass after the chart
  route's high-frequency replay controls and settings surfaces are cleaned up.
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
