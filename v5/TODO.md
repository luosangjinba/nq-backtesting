# V5 TODO

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
- [ ] Step 370.5: Add browser coverage for user-visible left pan demand and
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
