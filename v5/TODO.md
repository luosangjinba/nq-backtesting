# V5 TODO

## TODO Organization

- Step numbers are historical execution IDs, not phase numbers.
- This file keeps Current / Next at the top and completed steps in numeric order.
- Do not move the latest completed step to the top; add or update the current/next note instead.
- If a step number appears missing before Step 357, it is outside the V5 TODO history.
- Future work should continue with the next explicit step number and update the session handoff.

## Current / Next

- Current status: Step 381 is complete.
- Next candidate: Step 382 should continue Phase 3 chart interaction work with
  axis/tooltip formatting polish before go-to time, order, journal, dashboard,
  AI, or SaaS work.
- Step 379 advanced Historical Replay Review by replacing the visible default
  DOM fallback with the real chart engine while preserving no-future replay
  boundaries.
- Step 380 advances Historical Replay Review by making the real chart engine's
  pan/zoom/right-edge behavior obey replay-workstation boundaries.
- Known next issue: visible UI is still an engineering shell, not final product
  UI. Crosshair readout is chart-owned, but axis labels and tooltip formatting
  still need product-grade presentation.
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
