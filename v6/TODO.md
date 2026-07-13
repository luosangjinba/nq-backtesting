# V6 TODO

## Current / Next

- Latest completed Go-to foundation step: Step 403 - Schedule Domain And
  Preferences Contract. V6 now owns DST-aware `America/New_York` candidates for
  Next Day Open, Next Session, Asian, London, and New York, plus four validated,
  resettable, versioned local preferences. No Replay, Bar Data, Chart Data,
  viewport, or UI wiring was added.
- Next step: Step 404 - Shared Cursor Materialization Boundary. Extract the
  smallest reusable forward real-source-bar resolution and visible-pane
  materialization path from Manual Next, with no behavior change. Keep the
  Go-to menu disabled until the shared boundary passes existing Next/Play,
  session-gap, HTF, multi-pane, viewport, and visible-latency gates.
- Latest completed correction step: Step 402 - Go-to Replay Navigation Semantic
  Correction And Plan. The mistaken active-pane loaded-window date locator was
  reverted. `Go to` is now constrained as session-global forward replay
  navigation for Next Day Open, Next Session, Asian, London, and New York
  anchors, with configurable New York wall-clock times. Arbitrary chart-date
  inspection is a separate possible future feature.
- Latest completed foundation repair step: Step 400 - Unified Target-History
  Full-Timeframe Matrix. Fixed-duration `30m` through `12h` and session-calendar
  `1D`/`1W`/`1M` now use one target-history request/apply/fallback pipeline;
  only bucket construction differs. Real-service verification passed all nine
  target periods, and real-browser coverage confirmed `30m`, `1h`, `2h`, `1W`,
  and `1M` each use one target request with zero source fallback requests. The
  complete chart browser regression pack passes `28/28`. Periods below `30m`
  deliberately retain the source-window chain.
- Latest completed visual acceptance step: Step 401 - Unified Target-History
  Visual Acceptance. Human verification confirmed representative fixed periods
  and repaired `1W`/`1M` history fill, diagnostics, and repeated left-drag
  behavior all meet expectations.
- Latest product-direction decision: V6 is an open-source, local-first SMC/ICT
  trading-system validation and replay-practice workstation. Validation is the
  product outcome; replay remains the protected experiment/practice environment.
  Free Practice and Validation Campaigns share one runtime foundation. The
  binding constraints are in
  `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`; the research report is
  non-normative input.
- Superseded foundation selection: Step 398's journey evidence remains valid,
  but its active-pane date-locator conclusion was rejected by Step 402 after
  product-reference clarification.
- Latest completed shell modularization step: Step 397 - Replay Transport
  Presentation Modularization. Command-free DOM rendering now lives in a
  focused renderer; `replay-transport.js` fell from 512 to 418 lines and the
  final modularization pack passed `5/5`. This Replay Transport split chain is
  closed; do not keep splitting it by line count alone.
- Latest completed shell modularization step: Step 396 - Replay Transport
  Period Menu Modularization. Pure navigation and DOM menu/focus ownership now
  live behind focused modules while playback-period commands/events remain in
  the main transport; `replay-transport.js` fell from 571 to 512 lines.
- Latest completed shell modularization step: Step 395 - Replay Transport
  Position Modularization. Position clamping/snapshots and DOM drag,
  persistence, restoration, and cleanup now live behind focused modules;
  `replay-transport.js` fell from 703 to 571 lines and its browser pack passed
  `4/4`.
- Latest completed test-architecture step: Step 394 - Historical Static Test
  Consolidation. V6 reduced 201 static smokes with 61 stale failures to 127
  current smokes passing `127/127`, replacing historical handoff snapshots,
  file-shape assertions, and test-of-test chains with four current ownership
  invariant smokes. Foundation and target-history browser packs remain green.
- Latest completed architecture step: Step 393 - Production Complexity
  Reduction. V6 extracted chart range input handling and leftward-history data
  orchestration, moved 18 governance-only helpers out of production `src`, and
  now owns its pinned Lightweight Charts browser asset instead of loading it
  through V5. Foundation and target-history browser packs both passed.

- Current status: V6 opened because V5 replay viewport/manual-anchor behavior
  proved structurally unreliable. The active decision is documented in
  `v5/docs/specs/v6-rewrite-start-decision.md`.
- Current product direction: V6 is an open-source, local-first SMC/ICT trading-
  system validation and replay-practice workstation. FXReplay remains an
  interaction reference, but V6 is not a generic clone and does not currently
  target other trading styles. Validation statistics must remain auditable back
  to replay-visible chart evidence. See `v6/docs/V6_PRODUCT_DIRECTION.md` and
  `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`.
- Current foundation priority: stabilize chart data loading, timeframe
  switching, chart drag/scroll display, date ranges, replay, multi-pane, and
  pane-local reset behavior before indicators or main/sub-pane indicator work.
- Current architecture direction: Backtesting and Journal are the two primary
  modules above the chart foundation. New capabilities should be modular and
  plugin-friendly, with explicit owner boundaries and command/event contracts.
  Continue building around `v6/docs/specs/replay-viewport-intent.md`,
  `v6/docs/specs/replay-visible-latency.md`, and
  `v6/docs/specs/pane-model.md`.
- Execution plan: follow `v6/docs/V6_EXECUTION_ROADMAP.md`. The roadmap expands
  the V5 formation order into smaller V6 gates and moves the known V5 failure
  classes, visible K-line delay and primary/non-primary multi-pane confusion,
  into early stop conditions. Continue to select the next bounded foundation slice
  before starting broader feature work.
- Latest completed inserted step: Step 197.5 - UI Extraction Workflow Audit.
  V6 accepted a browser/computed-style/spec-first UI audit process inspired by
  `JCodesMore/ai-website-cloner-template`, while explicitly rejecting
  Next/React/shadcn/Tailwind adoption.
- Latest completed roadmap step: Step 276 - Timeframe/Replay Foundation
  Regression Runner. V6 now has one browser command covering display timeframe
  switching, interval menu parity, display-timeframe leftward history,
  daily/weekly/monthly projection, and the Step 274 replay-gap browser pack.
- Latest completed inserted stability step: Step 277 - HTF Leftward Source
  Window Policy. High-timeframe leftward history now sizes source requests
  proportionally to the display timeframe while preserving hard caps for fetch,
  projection, cache, and chart series replacement work.
- Latest completed planning step: Step 278 - Target Timeframe Data Phase Plan.
  V6 accepted a phase-level target-TF data infrastructure plan so high-timeframe
  chart browsing can load target bars from the data layer while replay
  precision remains source-`1m` driven.
- Latest completed selection step: Step 279 - Chart Foundation Next Slice
  Selection. V6 selected Target-Timeframe Data Contract And Schema Discovery as
  the next bounded implementation slice.
- Latest completed target-TF step: Step 280 - Target-Timeframe Data Contract
  And Schema Discovery. V6 now has a canonical target timeframe domain,
  fixed-duration/session-aware classification, V4/DuckDB source schema
  discovery notes, and an initial single-table target-bars storage direction.
- Latest completed target-TF backend step: Step 281 - Target-Timeframe Server
  Aggregation Boundary. V4 now has a backend-only `/v4/target_bars` path and
  V6 has an adapter contract, while existing `/v4/bars` and V6 chart runtimes
  remain unchanged.
- Latest completed target-TF bar-data step: Step 282 - Bar-Data Runtime
  Target-Timeframe Support. V6 bar-data can explicitly plan, load, cache,
  release, and diagnose target-TF windows without changing source-bar callers
  or routing chart-history/display-timeframe through target bars yet.
- Latest completed target-TF display preparation step: Step 283 -
  Display-Timeframe Historical Path Preparation. V6 now has a disabled-by-
  default display/history target-bars planning boundary and static coverage that
  display-timeframe and chart-history do not directly call target bars yet.
- Latest completed target-TF display opt-in step: Step 284 - Controlled
  Display-Timeframe Target-History Opt-In. V6 display-timeframe runtime can
  explicitly load target bars through bar-data target commands while default TF
  switching remains source projection and source bars are preserved for `1m`
  round trips.
- Latest completed target-TF chart-history step: Step 285 - Chart-History
  Target-Timeframe Leftward Opt-In. V6 chart-history leftward extension can
  explicitly prepend target bars through bar-data target commands while default
  leftward history remains source-window projection and source bars stay clean
  for `1m` round trips.
- Latest completed target-TF activation step: Step 286 - High-Timeframe
  Target-History Activation Policy. V6 chart-history input bridge now emits
  `targetHistory.enabled` for high display timeframes through an explicit
  activation policy, with disabled/low-TF source fallback and runtime fallback
  diagnostics.
- Latest completed target-TF browser step: Step 287 - Activated Target-History
  Browser Integration. V6 now has browser/runtime coverage proving the real
  chart surface and leftward input bridge can activate high-TF target history,
  load target bars, and preserve source bars for `1m` round trips.
- Latest completed target-TF observability step: Step 288 - Activated
  Target-History Performance Observability. V6 leftward-history state now
  reports duration, path, target/source request counts, load timings, fallback
  reason, and prepended bars for target-history and source-window paths.
- Latest completed target-TF decision step: Step 289 - Target-History
  Optimization Decision. V6 selected a small chart-history diagnostics readout
  as the next optimization target, using Step 288 diagnostics instead of
  changing activation thresholds or fallback behavior prematurely.
- Latest completed target-TF readout step: Step 290 - Target-History
  Diagnostics Readout. V6 now shows pane-local leftward extension diagnostics
  from chart-history events, including path, duration, request counts, fallback
  reason, and prepended bars, without changing chart/replay behavior.
- Latest completed target-TF readout browser step: Step 291 - Target-History
  Diagnostics Readout Browser Regression. V6 now has real browser coverage for
  the pane-local diagnostics readout on the activated high-timeframe
  target-history path while preserving source bars for `1m` round trips.
- Latest completed target-TF readout fallback step: Step 292 - Target-History
  Diagnostics Readout Fallback Browser Regression. V6 now has real browser
  coverage for the readout fallback path when target-history returns empty and
  chart-history continues through the source-window path.
- Latest completed target-TF readout pack step: Step 293 - Target-History
  Diagnostics Readout Regression Pack. V6 now has one compact browser pack that
  runs target-history diagnostics readout success and fallback paths together.
- Latest completed target-TF optimization selection step: Step 294 -
  Target-History Optimization Re-selection. V6 selected target-history request
  sizing as the next optimization slice now that diagnostics readout success and
  fallback paths are packaged.
- Latest completed target-TF sizing audit step: Step 295 - Target-History
  Request Sizing. V6 added a pure audit helper for target-history request
  sizing and deferred runtime sizing changes because current fixed HTF windows
  already meet the policy target display bar counts.
- Latest completed target-TF sizing browser step: Step 296 - Target-History
  Request Sizing Browser Diagnostics. V6 now asserts on the real `8h`
  target-history browser path that requested target bars match the policy target
  display bar count.
- Latest completed target-TF session-aware selection step: Step 297 -
  Target-History Session-Aware Sizing Selection. V6 selected `1D` as the first
  session-aware target-history sizing browser assertion slice and deferred
  `1W`/`1M`.
- Latest completed target-TF daily sizing browser step: Step 298 - Daily
  Target-History Request Sizing Browser Assertion. V6 now has real browser
  coverage proving the `1D` target-history path requests daily target bars and
  preserves source bars for `1m` round trips.
- Latest completed target-TF daily sizing pack step: Step 299 - Daily
  Target-History Sizing Pack Selection. V6 added the daily target-history
  request sizing browser smoke to the compact target-history browser regression
  pack.
- Latest completed target-TF Phase D selection step: Step 300 -
  Target-History Phase D Next Slice Selection. V6 selected `1D`
  target-history fallback browser coverage as the next bounded slice.
- Latest completed target-TF daily fallback browser step: Step 301 - Daily
  Target-History Fallback Browser Coverage. V6 now has real browser coverage
  proving empty `1D` target bars fall back to source-window projection, report
  `target-history-empty` in diagnostics/readout, and remain in the compact
  target-history browser regression pack.
- Latest completed target-TF weekly sizing selection step: Step 302 - Weekly
  Target-History Request Sizing Selection. V6 selected `1W` target-history
  request sizing browser coverage as the next slice and added pure weekly
  sizing policy coverage: `4` target display bars and `40000` source prefetch
  bars.
- Latest completed target-TF weekly sizing browser step: Step 303 - Weekly
  Target-History Request Sizing Browser Assertion. V6 now has real browser
  coverage proving the `1W` target-history path requests weekly target bars,
  applies the weekly sizing policy, preserves source bars for `1m` round trips,
  and remains in the compact target-history browser regression pack.
- Latest completed target-TF weekly fallback browser step: Step 304 - Weekly
  Target-History Fallback Browser Coverage. V6 now has real browser coverage
  proving empty `1W` target bars fall back to source-window projection, report
  `target-history-empty` in diagnostics/readout, preserve source bars for `1m`
  round trips, and remain in the compact target-history browser regression pack.
- Latest completed target-TF monthly sizing selection step: Step 305 - Monthly
  Target-History Request Sizing Selection. V6 selected `1M` target-history
  request sizing browser coverage as the next slice and added pure monthly
  sizing policy coverage: `1` target display bar and `40000` source prefetch
  bars.
- Latest completed target-TF monthly sizing browser step: Step 306 - Monthly
  Target-History Request Sizing Browser Assertion. V6 now has real browser
  coverage proving the `1M` target-history path requests monthly target bars,
  applies the monthly sizing policy, preserves source bars for `1m` round
  trips, and remains in the compact target-history browser regression pack.
- Latest completed target-TF monthly fallback browser step: Step 307 - Monthly
  Target-History Fallback Browser Coverage. V6 now has real browser coverage
  proving empty `1M` target bars fall back to source-window projection, report
  `target-history-empty` in diagnostics/readout, preserve source bars for `1m`
  round trips, and remain in the compact target-history browser regression pack.
- Latest completed target-TF Phase D re-audit step: Step 308 - Target-History
  Phase D Re-audit And Next Slice Selection. V6 confirmed fixed, daily,
  weekly, and monthly target-history success/fallback browser coverage is
  complete and selected target-history browser pack runtime/cost control as the
  next bounded slice.
- Latest completed target-TF browser pack cost step: Step 309 - Target-History
  Browser Pack Runtime Cost Control. V6 now has test-only group/member
  selection and plan logging for the target-history browser pack while
  preserving the full eight-member pack as the default comprehensive command.
- Latest completed target-TF responsiveness audit step: Step 310 -
  High-Timeframe Target-History Responsiveness Audit. V6 now has a pure audit
  model for choosing between a responsiveness harness, bounded runtime
  optimization, and materialization transition; the audit selects a focused
  browser-visible responsiveness harness as the next bounded slice.
- Latest completed target-TF responsiveness harness step: Step 311 -
  High-Timeframe Target-History Responsiveness Browser Harness. V6 now has a
  focused browser-visible harness that collects `8h`, `1D`, and `1W`
  target-history timing records and feeds them into the Step 310 audit model
  without changing runtime behavior.
- Latest completed target-TF responsiveness budget step: Step 312 -
  High-Timeframe Target-History Responsiveness Budget Decision. V6 now has a
  pure budget report for the Step 311 record shape and Step 310 default
  budgets, selecting bounded runtime optimization as the next implementation
  slice before materialization transition.
- Latest completed target-TF optimization probe step: Step 313 -
  High-Timeframe Target-History Bounded Runtime Optimization Probe. V6 now has
  a pure probe that routes Step 312 budget findings to fetch, chart-data
  replacement, viewport reapply, browser-visible apply lag, or materialization
  transition, and selected browser phase timing as the next slice before
  runtime behavior changes.
- Latest completed target-TF phase timing step: Step 314 - High-Timeframe
  Target-History Browser Phase Timing Probe. V6 now collects browser-observed
  `fetchMs`, `chartDataReplacementMs`, `viewportReapplyMs`, `applyLagMs`, and
  `visualLatencyMs` for `8h`, `1D`, and `1W` target-history records and feeds
  them into the Step 313 probe without changing runtime behavior.
- Latest completed target-TF phase budget step: Step 315 - High-Timeframe
  Target-History Phase Budget Selection. V6 now has a pure selector that routes
  phase-timed target-history records to a concrete optimization phase,
  materialization transition, or measurement completion path without changing
  runtime behavior.
- Latest completed target-TF browser phase budget step: Step 316 -
  High-Timeframe Target-History Browser Phase Budget Selection. V6 now feeds
  real browser phase-timed `8h`, `1D`, and `1W` target-history records into the
  Step 315 selector with wide budgets, proving browser selector integration
  without changing runtime behavior.
- Latest completed target-TF real-budget browser report step: Step 317 -
  High-Timeframe Target-History Real-Budget Browser Phase Report. V6 now feeds
  real browser phase-timed `8h`, `1D`, and `1W` target-history records into the
  Step 315 selector with default budgets and reports the selected path without
  changing runtime behavior.
- Latest completed target-TF selected path step: Step 318 - High-Timeframe
  Target-History Selected Path Slice Selection. V6 selected
  `target-history-browser-visible-apply-lag-optimization-plan` as the next
  bounded implementation-planning slice from the real-budget browser report,
  while keeping runtime behavior unchanged.
- Latest completed target-TF apply-lag plan step: Step 319 - High-Timeframe
  Target-History Browser-Visible Apply-Lag Optimization Plan. V6 selected
  `shell.pane-status-readout` / `chart-surface-readout-observation` as the
  current apply-lag owner boundary and selected a focused browser milestone
  assertion before any runtime behavior change.
- Latest completed target-TF apply-lag boundary step: Step 320 -
  High-Timeframe Target-History Browser-Visible Apply-Lag Boundary Browser
  Assertion. V6 now records browser milestones proving diagnostics readout is
  visible by the `LEFT_EXTENSION_LOADED` observation point, so the current
  apply-lag finding is a measurement-boundary issue rather than a runtime
  optimization target.
- Latest completed target-TF apply-lag measurement step: Step 321 -
  High-Timeframe Target-History Apply-Lag Measurement Boundary Correction. V6
  now derives apply lag from event/readout milestones, proving apply lag is
  below budget and leaving residual visual-latency attribution between
  chart-data and viewport phases as the next bounded slice.
- Latest completed target-TF visual-latency attribution step: Step 322 -
  High-Timeframe Target-History Visual-Latency Phase Attribution Stabilization.
  V6 now suppresses sub-frame chart-data/viewport noise in corrected
  target-history visual-latency attribution and selects browser rendering
  visibility attribution as the next bounded slice.
- Latest completed target-TF browser-rendering attribution step: Step 323 -
  High-Timeframe Target-History Browser Rendering Visibility Attribution. V6
  now records requestAnimationFrame/readout visibility milestones showing
  `LEFT_EXTENSION_LOADED` to readout visibility is sub-frame, so the remaining
  corrected visual-latency window sits before the left-extension event. The
  next bounded slice is target-history trigger coordination latency
  attribution.
- Latest completed target-TF trigger coordination attribution step: Step 324 -
  High-Timeframe Target-History Trigger Coordination Latency Attribution. V6
  now records display apply, target fetch, chart data, viewport projection, and
  left-extension event milestones showing the dominant pre-left-extension
  window is leftward request scheduling in
  `chart-history.leftward-history-input-bridge`. The next bounded slice is a
  leftward request scheduling plan before runtime behavior changes.
- Latest completed target-TF leftward request scheduling plan step: Step 325 -
  High-Timeframe Target-History Leftward Request Scheduling Plan. V6 selected
  a bridge-owned programmatic fast path that preserves native drag/wheel
  `requestDelayMs` scheduling while allowing high-timeframe target-history
  display application to bypass the second delayed request debounce after the
  zero-delay surface check.
- Latest completed target-TF programmatic leftward fast path step: Step 326 -
  High-Timeframe Target-History Programmatic Leftward Request Fast Path. V6 now
  keeps native visible-range input on `requestDelayMs`, arms a one-shot
  high-timeframe target-history fast path from display-timeframe application,
  and gates duplicate immediate requests per pane until `LEFT_EXTENSION_LOADED`.
- Latest completed target-TF fast path remeasurement step: Step 327 -
  High-Timeframe Target-History Fast Path Responsiveness Re-measurement. V6 now
  re-measures `8h`, `1D`, and `1W` target-history records after the fast path
  and selects `replay-coordination-materialization-transition` because
  fast-path target-history responsiveness is within budget.
- Latest completed replay coordination materialization transition selection
  step: Step 328 - Replay Coordination Materialization Transition Slice
  Selection. V6 now selects
  `replay-coordination-materialization-owner-contract` as the next bounded
  slice and keeps replay cursor, source `1m` bars, target-history request
  sizing, chart-history fast path, chart-data, and chart-viewport ownership
  unchanged before runtime materialization behavior changes.
- Latest completed replay coordination materialization owner contract step:
  Step 329 - Replay Coordination Materialization Owner Contract. V6 now defines
  the read-only owner contract, participant read/write responsibilities, and
  source-cursor target-bar no-future reveal policy before runtime
  materialization handoff changes.
- Latest completed replay coordination materialization handoff selection step:
  Step 330 - Replay Coordination Materialization Runtime Handoff Slice
  Selection. V6 now selects
  `replay-coordination-materialization-pure-handoff-plan` as the next bounded
  slice before any runtime materialization wiring.
- Latest completed replay coordination materialization pure handoff plan step:
  Step 331 - Replay Coordination Materialization Pure Handoff Plan. V6 now
  maps display materialization intent to existing bar-data/chart-data owner
  surfaces and records the first future wiring point preconditions without
  runtime wiring.
- Latest completed replay coordination materialization runtime wiring selection
  step: Step 332 - Replay Coordination Materialization Runtime Wiring Slice
  Selection. V6 now selects
  `display-timeframe-target-materialization-readiness-audit` as the next bounded
  slice before runtime materialization behavior wiring.
- Latest completed display-timeframe target materialization readiness audit
  step: Step 333 - Display-Timeframe Target Materialization Readiness Audit. V6
  now verifies the display-timeframe, bar-data, chart-data, replay cursor, and
  target-bar reveal owner surfaces required by the pure handoff plan and
  selects `display-timeframe-target-materialization-wiring-plan` next.
- Latest completed display-timeframe target materialization wiring plan step:
  Step 334 - Display-Timeframe Target Materialization Wiring Plan. V6 now
  defines the read-only runtime owner, command/data sequence, fallback gates,
  rollback criteria, and forbidden actions for the future display-timeframe
  target materialization handoff.
- Latest completed display-timeframe target materialization runtime handoff
  step: Step 335 - Display-Timeframe Target Materialization Runtime Handoff
  Wiring. V6 now routes Display-Timeframe Runtime target-history application
  through `replay.getState`, source-bar preservation, bar-data target
  plan/load, source-cursor target-bar reveal filtering, and
  `chartData.replaceBars` with `preserveSource: true`.
- Latest completed display-timeframe target materialization browser
  verification step: Step 336 - Display-Timeframe Target Materialization
  Browser Verification. V6 now verifies browser-visible `8h`, `1D`, and `1W`
  target materialization, source preservation when returning to `1m`,
  target-data-missing fallback, responsiveness, and shell/runtime boundary
  ownership.
- Latest completed display-timeframe target materialization replay coordination
  step: Step 337 - Display-Timeframe Target Materialization Replay
  Coordination Browser Regression. V6 now verifies manual next, autoplay,
  source `1m` no-bar gap skipping, target-data-missing fallback, and source
  cursor append filtering while `8h` target materialization is active.
- Latest completed target-timeframe materialization selection step: Step 338 -
  Target-Timeframe Materialization Next Slice Reselection. V6 selected
  `target-history-pack-replay-coordination-member` as the next bounded slice so
  the Step 337 replay coordination browser smoke can be run through focused
  target-history pack member controls before broader runtime changes.
- Latest completed target-history pack member step: Step 339 - Target-History
  Pack Replay Coordination Member Integration. V6 now exposes the Step 337
  replay coordination browser smoke as optional pack member
  `replay-coordination`, while the default target-history browser pack remains
  the existing eight-member pack.
- Latest completed target-timeframe materialization post-pack selection step:
  Step 340 - Target-Timeframe Materialization Post-Pack Reselection. V6
  selected `target-materialization-replay-coordination-diagnostics-readout` as
  the next bounded slice before any narrow runtime handoff.
- Latest completed target materialization diagnostics contract step: Step 341 -
  Target Materialization Replay Coordination Diagnostics Readout Owner
  Contract. V6 now defines read-only diagnostic fields, owner participants, shell
  consumption rules, and forbidden actions before runtime state wiring.
- Latest completed target materialization diagnostics runtime step: Step 342 -
  Target Materialization Replay Diagnostics Runtime State Surface. V6 now has a
  read-only diagnostics runtime snapshot surface, `getSnapshot` command,
  `snapshotReady` event, and app registration without visible UI, target loading,
  replay cursor, chart-data, or viewport behavior changes.
- Latest completed target materialization diagnostics wiring plan step: Step
  343 - Target Materialization Replay Diagnostics Runtime Wiring Plan. V6 now
  has a pure producer/consumer wiring plan from Display-Timeframe, Manual Next,
  and Auto Play events into a future diagnostics update surface, still without
  live subscriptions, visible UI, target loading, replay cursor, chart-data, or
  viewport behavior changes.
- Latest completed target materialization diagnostics update command step:
  Step 344 - Target Materialization Replay Diagnostics Update Command Surface.
  V6 now exposes `targetMaterializationReplayDiagnostics.updateSnapshot` with
  normalization, validation, cloned readback, rejected-update safety, and no
  producer subscriptions, visible UI, target loading, replay cursor, chart-data,
  or viewport behavior changes.
- Latest completed target materialization diagnostics mapper step: Step 345 -
  Target Materialization Replay Diagnostics Producer Payload Mappers. V6 now has
  pure mappers from Display-Timeframe, Manual Next, and Auto Play event payloads
  into diagnostics update payloads, still without live subscriptions, producer
  runtime dispatches, visible UI, target loading, replay cursor, chart-data, or
  viewport behavior changes.
- Latest completed target materialization diagnostics event wiring step: Step
  346 - Target Materialization Replay Diagnostics Producer Event Runtime Wiring.
  V6 diagnostics runtime now subscribes to Display-Timeframe, Manual Next, and
  Auto Play producer events, maps payloads through the Step 345 mappers, and
  updates snapshots through the Step 344 path, without modifying producer
  runtimes, visible UI, target loading, replay cursor, chart-data, or viewport
  behavior.
- Latest completed target materialization diagnostics browser read step: Step
  347 - Target Materialization Replay Diagnostics Browser Read Coverage. V6 now
  has browser coverage proving real Display-Timeframe, Manual Next, and Auto
  Play flows update diagnostics snapshots readable through `getSnapshot`,
  without visible UI, producer runtime changes, target loading, replay cursor,
  chart-data, or viewport behavior changes.
- Latest completed target materialization diagnostics readout owner step: Step
  348 - Target Materialization Replay Diagnostics Readout Owner Plan. V6 now
  has a plan-only `shell.pane-status-readout` developer-collapsed pane-local
  diagnostics readout owner, first visible fields, internal-only fields,
  hide/collapse rules, and command/event-only consumption boundary without
  visible UI, producer runtime changes, target loading, replay cursor,
  chart-data, viewport, request sizing, or fast-path behavior changes.
- Latest completed target materialization diagnostics readout model step: Step
  349 - Target Materialization Replay Diagnostics Readout View Model. V6 now
  has a pure shell readout view model mapping empty, normal,
  target-history-active, and fallback diagnostics snapshots into stable
  hidden/collapsed states and first-visible rows while keeping internal-only
  fields hidden and visible DOM UI unwired.
- Latest completed target materialization diagnostics DOM wiring plan step:
  Step 350 - Target Materialization Replay Diagnostics Readout DOM Wiring Plan.
  V6 now has a plan-only pane-status DOM wiring contract with container
  placement, dataset attributes, command/event snapshot consumption, Step 349
  view-model routing, rendering rules, and rollback criteria before visible UI
  wiring.
- Latest completed target materialization diagnostics DOM wiring step: Step
  351 - Target Materialization Replay Diagnostics Readout DOM Wiring. V6 now
  mounts pane-local materialization diagnostics readout containers under
  `shell.pane-status-readout`, reads `getSnapshot`, refreshes on
  `snapshotReady`, routes through the Step 349 view model, and renders
  hidden/collapsed states without producer runtime, target loading, replay
  cursor, chart-data, viewport, request sizing, or fast-path behavior changes.
- Latest completed target materialization diagnostics readout producer-flow
  step: Step 352 - Target Materialization Replay Diagnostics Readout Producer
  Flow Browser Regression. V6 now verifies real Display-Timeframe
  materialization, Manual Next, and Auto Play producer flows update the
  pane-status materialization diagnostics readout without direct diagnostics
  update dispatch, producer runtime changes, target loading, replay cursor,
  chart-data, viewport, request sizing, or fast-path behavior changes.
- Latest completed target-history pack readout producer-flow member step:
  Step 353 - Target Materialization Replay Diagnostics Readout Producer Flow
  Pack Member. V6 now exposes the Step 352 producer-flow readout browser smoke
  as optional target-history pack member `readout-producer-flow` while keeping
  the default eight-member pack and existing `replay-coordination` optional
  member unchanged.
- Latest completed target-history pack readout producer-flow combination step:
  Step 354 - Target Materialization Replay Diagnostics Readout Pack Combination
  Verification. V6 now verifies
  `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow` runs
  Step 337 then Step 352 browser smokes in order, while keeping the default
  eight-member pack and standalone optional members unchanged.
- Latest completed target materialization diagnostics/readout chain selection
  step: Step 355 - Target Materialization Diagnostics Readout Chain Closeout And
  Next Slice Selection. V6 now records the Step 337/352/354 evidence chain,
  stops adding observability-only diagnostics UI or pack wiring for now, and
  selects `narrow-replay-materialization-runtime-handoff-readiness-audit` as the
  next bounded target-materialization foundation slice.
- Latest completed narrow replay materialization handoff readiness step: Step
  356 - Narrow Replay Materialization Runtime Handoff Readiness Audit. V6 now
  selects the future owner boundary
  `runtime.replay-coordination-materialization-handoff`, lists the exact
  event/command surfaces for the future handoff, keeps diagnostics read-only,
  keeps Display-Timeframe as TF-switch owner, and still avoids runtime behavior,
  replay cursor, target loading, chart-data, viewport, request sizing, and
  fast-path behavior changes.
- Latest completed narrow replay materialization handoff plan step: Step 357 -
  Narrow Replay Materialization Runtime Handoff Plan. V6 now defines the
  plan-only `chartEntryManualNext:advanced` trigger, future command sequence,
  fallback gates, forbidden surfaces, and selected
  `runtime.replay-coordination-materialization-handoff` owner without runtime
  behavior, producer runtime, replay cursor, target loading, chart-data,
  viewport, request sizing, or fast-path behavior changes.
- Latest completed narrow replay materialization handoff executor step:
  Step 358 - Narrow Replay Materialization Runtime Handoff Pure Executor
  Harness. V6 now evaluates the Step 357 plan from injected results only,
  returns a `chartData.replaceBars` intent on the happy path, returns named
  fallback gates for source `1m`, missing data, target plan/load misses, and
  future-only target bars, and still avoids runtime behavior, producer runtime,
  replay cursor, target loading, chart-data, viewport, request sizing, and
  fast-path behavior changes.
- Latest completed narrow replay materialization handoff wiring readiness step:
  Step 359 - Narrow Replay Materialization Runtime Handoff Wiring Readiness
  Audit. V6 now audits the future app registration point, Manual Next advanced
  subscription placement, command dispatch wrapper shape, rollback criteria,
  and confirms the future helper can be registered as a new runtime without
  modifying Manual Next, Auto Play, Display-Timeframe, diagnostics, replay,
  viewport, or shell target-bar surfaces.
- Latest completed narrow replay materialization handoff runtime plan step:
  Step 360 - Narrow Replay Materialization Runtime Handoff Runtime Plan. V6 now
  defines the plan-only future runtime lifecycle, Manual Next advanced
  subscription cleanup, command dispatch wrapper order, Step 358 executor
  invocation, rollback gates, and keeps app registration/live runtime wiring
  deferred.
- Latest completed narrow replay materialization handoff runtime contract step:
  Step 361 - Narrow Replay Materialization Runtime Handoff Runtime Contract. V6
  now defines the contract-only future factory signature, dependency injection
  shape, wrapper/fallback/diagnostics result shapes, app registration
  preconditions, and keeps app registration/live runtime wiring deferred.
- Latest completed narrow replay materialization handoff unwired skeleton step:
  Step 362 - Narrow Replay Materialization Runtime Handoff Unwired Runtime
  Skeleton. V6 now adds an unwired
  `replay-coordination-materialization-runtime-handoff` factory with injectable
  `subscribeEvent`, `dispatchCommand`, and executor dependencies, start/stop
  cleanup tests, command-result wrapper helpers, and no `v6/src/app.js`
  registration.
- Latest completed narrow replay materialization handoff app registration
  readiness step: Step 363 - Narrow Replay Materialization Runtime Handoff App
  Registration Readiness Audit. V6 now audits the exact future `v6/src/app.js`
  import/register position, dependency injection source for `subscribeEvent`,
  `dispatchCommand`, and executor, rollback plan, focused browser coverage,
  and keeps the runtime unregistered.
- Latest completed narrow replay materialization handoff app registration plan
  step: Step 364 - Narrow Replay Materialization Runtime Handoff App
  Registration Plan. V6 now defines the exact minimal future `v6/src/app.js`
  diff, focused browser smoke, verification order, and rollback gates while
  keeping the runtime unregistered.
- Latest completed replay coordination materialization runtime handoff app
  registration step: Step 365 - Replay Coordination Materialization Runtime
  Handoff App Registration. V6 now registers
  `runtime.replay-coordination-materialization-handoff` in `v6/src/app.js`
  after Manual Next and before Manual Previous, injects app-level
  `subscribeEvent` and `dispatchCommand`, and verifies the registration with a
  focused browser smoke while keeping replay source `1m` authority explicit.
- Latest completed replay coordination materialization runtime handoff pack
  member step: Step 366 - Replay Coordination Materialization Runtime Handoff
  Pack Member. V6 now exposes the Step 365 focused app-registration browser
  smoke as optional target-history diagnostics pack member
  `handoff-registration`, preserving the default eight-member pack and the
  existing optional members.
- Latest completed HTF leftward extension performance measurement step:
  Step 367 - HTF Leftward Extension Performance Measurement After Runtime
  Handoff. V6 now has measurement-only browser coverage for `4h`, `8h`, `1D`,
  and `1W` after handoff runtime registration, separating source request,
  target request, chart-data replacement, viewport reapply, visible apply lag,
  browser paint lag, and runtime duration without changing runtime behavior.
- Latest completed HTF leftward extension bottleneck owner selection step:
  Step 368 - HTF Leftward Extension Bottleneck Owner Selection After Handoff
  Measurement. V6 now has a pure selector for Step 367 phase records and
  selected `target-history-real-chart-paint-visibility-measurement` as the next
  slice because the observed largest bucket was the test-only browser paint
  observation window while request/runtime phases stayed low.
- Latest completed HTF leftward extension real chart paint visibility step:
  Step 369 - HTF Leftward Extension Real Chart Paint Visibility Measurement.
  V6 now has browser/harness-only canvas-signature measurement for `4h`, `8h`,
  `1D`, and `1W`, showing chart signatures already changed by
  `viewport-projected` and selecting real drag-triggered HTF leftward-extension
  interaction measurement as the next slice.
- Latest completed HTF drag-triggered leftward extension measurement step:
  Step 370 - HTF Drag-Triggered Leftward Extension Interaction Measurement. V6
  now has browser/harness-only real CDP wheel measurement for `4h`, `8h`,
  `1D`, and `1W`, showing the first wheel attempt triggers target fetch
  quickly while the remaining observed window needs low-overhead runtime
  milestone attribution before optimization.
- Latest completed HTF drag-triggered low-overhead milestone step: Step 371 -
  HTF Drag-Triggered Low-Overhead Runtime Milestone Attribution. V6 now has
  low-overhead real wheel-triggered milestone attribution for `4h`, `8h`,
  `1D`, and `1W`, identifying `inputToTargetFetchStartMs` around the existing
  `requestDelayMs=500` scheduling window as the dominant remaining delay.
- Latest completed HTF target-history request scheduling policy step:
  Step 372 - HTF Target-History Request Scheduling Policy Selection. V6 now
  selects `native-target-history-reduced-delay-with-coalescing`: future HTF
  target-history native visible-range requests should use `100ms` coalescing
  while low-TF/native and target-history-disabled paths keep
  `requestDelayMs=500`.
- Latest completed HTF target-history reduced-delay resolver step: Step 373 -
  HTF Target-History Native Visible-Range Reduced Delay Resolver. V6 now has
  pure resolver support for `nativeTargetHistoryDelayMs: 100` on native
  target-history visible-range requests while bridge runtime wiring remains
  unchanged.
- Latest completed HTF target-history native bridge wiring step: Step 374 - HTF
  Target-History Native Reduced Delay Bridge Wiring. V6 now passes
  `nativeTargetHistoryDelayMs: 100` from the bridge for native visible-range
  requests with target-history enabled. Browser measurement improved `8h`
  `inputToTargetFetchStartMs` to `132.1ms`, while `4h`, `1D`, and `1W` still
  measured around `448-479ms`, so the next slice is branch attribution.
- Latest completed HTF target-history schedule attribution step: Step 375 - HTF
  Target-History Native Reduced Delay Branch Attribution. V6 now reports real
  wheel schedule branch selection for `4h`, `8h`, `1D`, and `1W`. The native
  `100ms` branch is present with target-history enabled, but the slow cases
  still show runtime-originated `500ms` delayed schedules, so the next slice is
  a narrow runtime delayed-schedule suppression fix.
- Latest completed HTF target-history runtime suppression step: Step 376 - HTF
  Target-History Runtime Delayed-Schedule Suppression. V6 now suppresses
  HTF target-history `runtime-surface-check` and
  `runtime-left-extension-loaded` delayed `500ms` schedules in the input
  bridge, while preserving low-TF/native source, target-history-disabled, and
  programmatic fast-path behavior. Browser timing now shows `4h`, `8h`, `1D`,
  and `1W` target fetches in the reduced-delay window.
- Latest completed HTF target-history budget guard step: Step 377 - HTF
  Target-History Reduced-Delay Browser Budget Guard. V6 now has a focused
  browser guard that fails if `4h`, `8h`, `1D`, or `1W` target-history fetch
  timing falls back to the old roughly `500ms` window. The observed run stayed
  between `119.4ms` and `140.1ms`, with native `100ms` scheduling verified.
- Latest completed target-history pack reduced-delay member step: Step 378 -
  Target-History Pack Reduced-Delay Budget Member. V6 now exposes the Step 377
  browser budget guard as optional pack member `reduced-delay-budget`, while
  preserving the default eight-member pack and existing optional members.
- Latest completed target-history pack optional combination step: Step 379 -
  Target-History Pack Reduced-Delay Optional Combination. V6 verified the
  combined optional pack path
  `replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget`,
  with the Step 377 budget guard still passing after the other optional browser
  members.
- Latest completed HTF leftward performance chain re-audit step: Step 380 -
  HTF Leftward Extension Performance Chain Re-audit. V6 closed HTF
  target-history leftward-extension latency for now, with the Step 377
  standalone budget guard, Step 378 optional member, Step 379 combined optional
  pack path, and Step 371 attribution harness protecting the reduced-delay
  behavior.
- Latest completed chart-foundation regression refresh step: Step 381 - Chart
  Foundation Regression Refresh. V6 re-ran the Step 276 foundation pack and the
  Step 377 reduced-delay guard; all refreshed coverage passed, and the next
  bounded slice is replay-gap browser pack runtime cost because Step 274
  consumed `90350ms` inside the `105292ms` foundation pack run.
- Latest completed replay-gap cost audit step: Step 382 - Replay Gap Regression
  Pack Cost Audit. V6 attributed the Step 274 runtime concentration to browser
  harness shape plus manual-step scenario size: serial child-process member
  execution, fresh page setup per case, long `15:34 -> 18:00` Manual Next loops,
  and HTF projection work in the three manual HTF cases.
- Latest completed replay-gap timing probe step: Step 383 - Replay Gap Manual
  Path Timing Probe. V6 measured all six manual replay-gap cases and confirmed
  the Manual Next loop is the dominant cost: low-TF cases spend roughly
  `4.4-5.0s` in the loop, while HTF cases spend `9.1s` (`1D`), `17.4s`
  (`1W`), and `14.9s` (`1M`) with the same `86` Manual Next calls.
- Latest completed replay-gap near-gap fixture plan step: Step 384 - Replay
  Gap Near-Gap Manual Fixture Plan. V6 selected a standalone near-gap manual
  browser fixture starting from `2026-06-01T16:58:00.000Z`, preserving
  `1m`/`5m`/`15m` and `1D`/`1W`/`1M` gap assertions while keeping Step 274 and
  Step 276 membership unchanged.
- Latest completed replay-gap near-gap fixture browser step: Step 385 - Replay
  Gap Near-Gap Manual Fixture Browser Probe. The standalone browser command
  passed for `1m`/`5m`/`15m` and `1D`/`1W`/`1M`, proving
  `16:58 -> 16:59 -> 18:00 -> 18:01` with `2` pre-gap Manual Next calls while
  keeping Step 274 and Step 276 membership unchanged.
- Latest completed replay-gap fast pack selection step: Step 386 - Replay Gap
  Fast Pack Integration Selection. V6 selected a fast/full replay-gap pack
  split: keep Step 274 as the full long-path confirmation command, keep Step
  276 using Step 274 for now, and implement a new standalone fast replay-gap
  pack next.
- Latest completed replay-gap fast pack implementation step: Step 387 - Replay
  Gap Fast Browser Pack Implementation. V6 added a standalone fast replay-gap
  browser pack that runs the Step 385 near-gap manual fixture plus existing
  low-TF and HTF auto-play gap smokes, passing `3/3` in `24532ms` while leaving
  Step 274 and Step 276 membership unchanged.
- Latest completed foundation pack replay-gap selection step: Step 388 -
  Foundation Pack Replay Gap Fast/Full Selection. V6 selected Step 276
  replay-gap mode controls with fast default: unset/`fast` should run the Step
  387 fast pack, while `FOUNDATION_REPLAY_GAP_MODE=full` should run the full
  Step 274 pack.
- Latest completed foundation pack replay-gap mode step: Step 389 - Foundation
  Pack Replay Gap Fast/Full Mode Implementation. Step 276 now defaults to the
  Step 387 fast replay-gap pack, supports
  `FOUNDATION_REPLAY_GAP_MODE=full` for the full Step 274 pack, fails invalid
  modes before browser members start, and passed the default fast foundation
  run `8/8` in `44597ms`.
- Latest completed foundation replay-gap mode documentation step: Step 390 -
  Foundation Replay Gap Mode Documentation Closeout. V6 documented the default
  fast foundation command, explicit full replay-gap foundation command, direct
  Step 387 fast pack, direct Step 274 full pack, and Step 385 near-gap fixture.
- Latest completed chart-foundation runtime refresh selection step: Step 391 -
  Chart Foundation Runtime Refresh Selection. V6 compared the current default
  fast Step 276 runtime `44597ms` against the older full Step 381 runtime
  `105292ms`, selected no additional immediate browser runtime refresh, and
  closed the replay-gap pack cost-control chain for now while keeping the full
  replay-gap command explicit.
- Latest completed architecture remediation step: Step 392 - V6 Architecture
  Remediation. V6 repaired the registered replay materialization handoff,
  isolated async listener failures and stale writes, unified target display
  materialization, made Manual Next source-bar driven before one cursor commit,
  consolidated active-pane ownership under Pane Runtime, added a V6 package
  boundary, and extracted runtime composition and chart layout domains. The
  default foundation pack passed `8/8` in `39103ms`.
- Latest stability work: 2026-07-09 unified leftward extension planner.
  Leftward-history requests now use one planner for all display timeframes. The
  planner separates display timeframe bucket math from source timeframe bar
  requests, so 1m, 5m, 15m, and future minute-based TFs share the same
  canvas-left extension rule instead of per-TF special cases. Programmatic
  viewport projection, pane reload projection, and display timeframe
  application still trigger delayed left-extension checks, while drag stability
  smokes guard against sticky hover-drag behavior.
- Latest session-switch fix: 2026-07-10 price scale reset on non-manual
  viewport projection. Opening a second session or pressing reset view no longer
  inherits the previous session's price axis; chart surface now asks the chart
  host to autoscale price after default projections, repeats that autoscale
  after chart layout settles, and preserves manual horizontal drag behavior.
- Latest inserted stability fix: 2026-07-10 wheel-zoom leftward prepend range
  stabilization. Chart surface now treats recent wheel-initiated leftward
  history prepends as a short stabilization window, rechecking the measured
  logical range after Lightweight Charts settles and reapplying the compensated
  range only when the wheel/prepend path drifted.
- Latest session setup fix: 2026-07-10 `datetime-local` inputs are parsed as
  chart/data-axis literal UTC timestamps instead of browser-local timestamps.
  Creating a session at `2026-05-04 09:30` now stores `2026-05-04T09:30:00Z`
  instead of shifting to the operator machine timezone.
- Latest replay gap fix: 2026-07-10 manual-next replay now skips non-trading
  gaps to the next available source bar and keeps replay cursor index/revealed
  count aligned to the skipped source time. After crossing a session break from
  `16:59` to `18:00`, the next manual `Next` continues to `18:01` instead of
  stopping at the first post-break bar. The fix covers 1m source replay and HTF
  display projection paths such as 5m and 15m.
- Latest Recent Sessions fix: 2026-07-10 persisted session metadata now advances
  the generated `v6-session-000N` sequence on app boot, so creating sessions
  after a reload no longer reuses old IDs and overwrites older Recent Sessions
  rows.

## Next Executable Steps

### Step 393 - Production Complexity Reduction

Status: proposed.

Notes for execution:

- use the accepted Step 392 remediation:
  `v6/docs/V6_ARCHITECTURE_REMEDIATION_STEP392.md`;
- split chart input/range stabilization from the chart surface;
- split target/source orchestration from the leftward-history runtime;
- identify selection/audit/readiness helpers with no production consumer and
  move them out of `src` without weakening their tests;
- move the browser Lightweight Charts asset out of the V5 legacy directory;
- keep license selection as an explicit owner decision;
- keep the Step 391 decision that no additional immediate browser runtime
  refresh is required unless a new concrete risk appears;
- keep the default fast foundation command documented:
  `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`;
- keep the explicit full replay-gap foundation command documented:
  `FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`;
- keep standalone fast pack command directly runnable:
  `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`;
- keep standalone command
  `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`;
- keep at least one long-path manual source assertion available for confidence;
- leave Step 274 full pack membership unchanged;
- do not modify `v6/src/app.js`;
- do not add new command surfaces;
- do not modify the Step 362 skeleton;
- preserve diagnostics runtime as read-only observability;
- preserve Display-Timeframe Runtime as the TF-switch owner;
- keep replay source `1m` authority explicit;
- keep target bars display materialization input only;
- do not route target bars through replay runtime;
- preserve standalone Step 337, Step 352, Step 365 browser smoke commands and
  the optional `handoff-registration` pack member;
- do not introduce direct `updateSnapshot` usage into producer-flow browser
  tests;
- keep shell consumption as command/event snapshot reading only through
  `getSnapshot` and `snapshotReady`;
- keep internal-only fields hidden from readout row text;
- do not call target APIs from shell readout code;
- do not modify producer runtimes;
- keep source `1m` replay cursor authority and the Step 329 target-bar
  no-future reveal policy explicit;
- keep the Step 331 owner-surface mapping explicit;
- keep target-history request sizing unchanged;
- keep target-history request sizing unchanged;
- use Step 309 pack group/member controls for focused regression checks and
  keep the full pack available for confirmation;
- preserve the full Step 293 pack as the available comprehensive
  target-history browser regression command;
- add static coverage for the re-audit decision and next executable step;
- do not change replay cursor movement, no-bar gap skipping, chart viewport
  intent, chart-engine behavior, journal, order-ticket, prop-firm, indicator,
  or seconds behavior.

Acceptance:

- chart surface and leftward-history runtime each lose at least one durable
  responsibility through an explicit module boundary;
- one-time governance helpers no longer inflate the production dependency
  surface;
- V6 no longer loads its browser chart asset from the V5 legacy directory;
- active runtime, replay cursor, target no-future, viewport, and chart-engine
  ownership remain unchanged;
- default fast foundation, focused target-history, and boundary gates pass;
- license choice is documented as accepted or explicitly blocked on the owner.

## Completed Steps

### Step 392 - V6 Architecture Remediation

Completed in the architecture-remediation commit series.

Verification:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  passed `8/8` in `39103ms`;
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`;
- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`;
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`;
- `node v6/tests/pane-active-visual-outline-browser-smoke.js`;
- `node v6/tests/boundary-smoke.js`;
- `git diff --check`.

Notes:

- Repaired the previously registered but non-functional replay target
  materialization handoff contracts.
- Added async listener isolation and stale materialization commit protection.
- Enforced target-bar no-future and cursor-coverage fallback rules.
- Changed production Manual Next to resolve a real source bar before one final
  cursor commit.
- Consolidated active-pane ownership under Pane Runtime.
- Added the V6 package boundary and extracted runtime composition and pure
  chart layout rules.

### Step 391 - Chart Foundation Runtime Refresh Selection

Completed in this chart-foundation runtime refresh selection commit series.

Verification:

- `node v6/tests/chart-foundation-runtime-refresh-selection-step391-static-smoke.js`
- `node v6/tests/foundation-replay-gap-mode-closeout-step390-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Compared the current default fast Step 276 runtime `44597ms` against the older
  full Step 381 runtime `105292ms`.
- Recorded Step 274 full replay-gap member cost `90350ms`, Step 387 standalone
  fast pack runtime `24532ms`, and Step 389 default foundation fast replay-gap
  member runtime `28243ms`.
- Selected no additional immediate browser runtime refresh because the current
  default foundation command was already rerun after the Step 276 fast/full
  mode split.
- Closed the replay-gap pack cost-control chain for now.
- Preserved the explicit full replay-gap foundation command and direct Step 274
  full pack as the broad long-path confirmation path.
- Selected Step 392 - Chart Foundation Post Replay-Gap Cost Control Re-audit
  as the next bounded chart-foundation slice.
- Did not modify runner behavior, production runtime behavior, `v6/src/app.js`,
  command surfaces, replay cursor movement, no-bar gap skipping, chart viewport,
  chart engine, Step 274 membership, Step 276 behavior, Step 387 membership, or
  the Step 362 runtime skeleton.

### Step 390 - Foundation Replay Gap Mode Documentation Closeout

Completed in this foundation replay-gap mode documentation closeout commit
series.

Verification:

- `node v6/tests/foundation-replay-gap-mode-closeout-step390-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-mode-closeout-step389-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Documented default fast foundation command:
  `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`.
- Documented explicit full replay-gap foundation command:
  `FOUNDATION_REPLAY_GAP_MODE=full node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`.
- Documented direct Step 387 fast replay-gap pack command.
- Documented direct Step 274 full replay-gap pack command.
- Documented direct Step 385 near-gap manual fixture command.
- Preserved Step 274 as the full replay-gap confirmation command.
- Preserved Step 387 as the standalone fast replay-gap command.
- Did not modify runner behavior, production runtime behavior, `v6/src/app.js`,
  command surfaces, replay cursor movement, no-bar gap skipping, chart viewport,
  chart engine, Step 274 membership, Step 276 behavior, Step 387 membership, or
  the Step 362 runtime skeleton.
- Selected Step 391 - Chart Foundation Runtime Refresh Selection as the next
  bounded chart-foundation slice.

### Step 389 - Foundation Pack Replay Gap Fast/Full Mode Implementation

Completed in this foundation pack replay-gap fast/full mode implementation
commit series.

Verification:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-mode-step389-static-smoke.js`
- `node v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Step 276 now resolves its replay-gap member from
  `FOUNDATION_REPLAY_GAP_MODE`.
- Unset mode and explicit `fast` mode use the Step 387 fast replay-gap pack.
- Explicit `full` mode uses the Step 274 full replay-gap pack.
- Invalid modes fail before browser members start.
- Default Step 276 fast run passed `8/8` in `44597ms`.
- Preserved Step 274 as the full replay-gap confirmation command.
- Preserved Step 387 as the standalone fast replay-gap command.
- Preserved at least one long-path manual source assertion through the full
  Step 274 command.
- Did not modify production runtime behavior, `v6/src/app.js`, command
  surfaces, replay cursor movement, no-bar gap skipping, chart viewport, chart
  engine, Step 274 membership, Step 387 membership, or the Step 362 runtime
  skeleton.
- Selected Step 390 - Foundation Replay Gap Mode Documentation Closeout as the
  next bounded chart-foundation slice.

### Step 388 - Foundation Pack Replay Gap Fast/Full Selection

Completed in this foundation pack replay-gap fast/full selection commit series.

Verification:

- `node v6/tests/foundation-pack-replay-gap-fast-full-selection-step388-static-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected Step 276 replay-gap fast/full mode controls.
- Selected default `fast` mode for routine foundation regression runs.
- Selected explicit `FOUNDATION_REPLAY_GAP_MODE=full` for broad replay-gap
  foundation confirmation.
- Preserved Step 274 as the full replay-gap confirmation command.
- Preserved Step 387 as the standalone fast replay-gap command.
- Preserved at least one long-path manual source assertion through the full
  Step 274 command.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, Step 274
  membership, Step 276 membership, or the Step 362 runtime skeleton.
- Selected Step 389 - Foundation Pack Replay Gap Fast/Full Mode Implementation
  as the next bounded chart-foundation slice.

### Step 387 - Replay Gap Fast Browser Pack Implementation

Completed in this replay-gap fast browser pack implementation commit series.

Verification:

- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`
- `node v6/tests/replay-gap-fast-browser-regression-pack-step387-static-smoke.js`
- `node v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added standalone command
  `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`.
- Fast pack members are Step 385 near-gap manual fixture, Step 263 low-TF
  auto-play gap smoke, and Step 273 HTF auto-play gap smoke.
- The fast pack passed `3/3` in `24532ms`.
- Preserved Step 274 as the full long-path replay-gap confirmation command.
- Preserved Step 276 membership; it still uses the full Step 274 command.
- Preserved at least one long-path manual source assertion through the full
  Step 274 command.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, Step 274
  membership, Step 276 membership, or the Step 362 runtime skeleton.
- Selected Step 388 - Foundation Pack Replay Gap Fast/Full Selection as the
  next bounded chart-foundation slice.

### Step 386 - Replay Gap Fast Pack Integration Selection

Completed in this replay-gap fast pack integration selection commit series.

Verification:

- `node v6/tests/replay-gap-fast-pack-integration-selection-step386-static-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected a fast/full replay-gap pack split.
- Kept Step 274 as the full replay-gap confirmation command.
- Kept Step 276 using the full Step 274 command for now.
- Selected future fast pack command
  `node v6/tests/replay-gap-fast-browser-regression-pack-step387-smoke.js`.
- Chose fast members: Step 385 near-gap manual fixture, low-TF auto-play gap
  smoke, and HTF auto-play gap smoke.
- Preserved at least one long-path manual source assertion through the full
  Step 274 command.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, Step 274
  membership, Step 276 membership, or the Step 362 runtime skeleton.
- Selected Step 387 - Replay Gap Fast Browser Pack Implementation as the next
  bounded chart-foundation slice.

### Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe

Completed in this replay-gap near-gap manual fixture browser commit series.

Verification:

- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-step385-static-smoke.js`
- `node v6/tests/replay-gap-near-gap-manual-fixture-plan-step384-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added standalone command
  `node v6/tests/replay-gap-near-gap-manual-fixture-step385-smoke.js`.
- Covered low-TF `1m`/`5m`/`15m` and HTF `1D`/`1W`/`1M`.
- Proved the path `16:58 -> 16:59 -> 18:00 -> 18:01` in all six cases.
- Reduced the pre-gap Manual Next count from the long-path `86` loop to `2`
  before the final post-gap next.
- Kept Step 274 and Step 276 pack membership unchanged.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, or the
  Step 362 runtime skeleton.
- Selected Step 386 - Replay Gap Fast Pack Integration Selection as the next
  bounded chart-foundation slice.

### Step 384 - Replay Gap Near-Gap Manual Fixture Plan

Completed in this replay-gap near-gap manual fixture plan commit series.

Verification:

- `node v6/tests/replay-gap-near-gap-manual-fixture-plan-step384-static-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Designed a standalone near-gap manual browser fixture starting close to
  `2026-06-01T16:58:00.000Z`.
- Preserved low-TF `1m`/`5m`/`15m` and HTF `1D`/`1W`/`1M` gap assertions.
- Kept the existing long-path manual source coverage available for confidence.
- Kept Step 274 and Step 276 pack membership unchanged.
- Selected Step 385 - Replay Gap Near-Gap Manual Fixture Browser Probe as the
  next bounded chart-foundation slice.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 383 - Replay Gap Manual Path Timing Probe

Completed in this replay-gap manual path timing probe commit series.

Verification:

- `node v6/tests/replay-gap-manual-path-timing-probe-step383-smoke.js`
- `node v6/tests/replay-gap-manual-path-timing-probe-step383-static-smoke.js`
- `node v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a harness-only browser timing probe covering low-TF manual cases
  `1m`, `5m`, `15m` and HTF manual cases `1D`, `1W`, `1M`.
- Preserved the replay-gap assertions while reporting page setup,
  session/apply, timeframe apply, Manual Next loop, final next, readout, and
  cleanup timings.
- Confirmed all six cases use `86` Manual Next calls before the final
  post-gap next.
- Confirmed the Manual Next loop is the dominant cost, especially `1W`
  `17361.9ms` and `1M` `14931.7ms`.
- Selected Step 384 - Replay Gap Near-Gap Manual Fixture Plan as the next
  bounded chart-foundation slice.
- Did not modify runtime behavior, `v6/src/app.js`, Step 274 pack membership,
  Step 276 pack membership, command surfaces, replay cursor movement, no-bar
  gap skipping, chart viewport, chart engine, or the Step 362 runtime skeleton.

### Step 382 - Replay Gap Regression Pack Cost Audit

Completed in this replay-gap regression pack cost audit commit series.

Verification:

- `node v6/tests/replay-gap-regression-pack-cost-audit-step382-static-smoke.js`
- `node v6/tests/chart-foundation-regression-refresh-step381-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Audited the Step 274 replay-gap browser pack cost concentration from the Step
  381 refresh.
- Identified the likely cost owner as browser harness shape plus manual-step
  scenario size, not production replay behavior.
- Cost contributors are serial child-process member execution, fresh page setup
  per case, long `15:34 -> 18:00` Manual Next loops, and HTF projection
  assertions in the three manual HTF cases.
- Preserved all existing manual-next, auto-play, low-TF, and HTF replay-gap
  assertions.
- Selected Step 383 - Replay Gap Manual Path Timing Probe as a measurement-only
  next slice before any runner split or cost-control change.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, replay
  cursor movement, no-bar gap skipping, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 381 - Chart Foundation Regression Refresh

Completed in this chart-foundation regression refresh commit series.

Verification:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/chart-foundation-regression-refresh-step381-static-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Step 276 foundation pack passed `8/8` in `105292ms`.
- Step 377 reduced-delay guard passed with `4h` `114.3ms`, `8h`
  `128.8ms`, `1D` `132.3ms`, and `1W` `132.5ms`.
- The refreshed chart-foundation behavior is green.
- The weakest signal is runtime cost in Step 274 replay-gap coverage:
  `replay-gap-browser-regression-pack-step274-smoke.js` consumed `90350ms`,
  with `htf-manual-next-replay-gap-browser-step273-smoke.js` at `50161ms` and
  `manual-next-session-gap-browser-step258-smoke.js` at `27270ms`.
- Selected Step 382 - Replay Gap Regression Pack Cost Audit as the next
  bounded chart-foundation slice.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, shell
  readout code, target-history request sizing, replay, chart viewport, chart
  engine, or the Step 362 runtime skeleton.

### Step 380 - HTF Leftward Extension Performance Chain Re-audit

Completed in this HTF leftward extension performance chain re-audit commit
series.

Verification:

- `node v6/tests/high-timeframe-leftward-extension-performance-chain-reaudit-step380-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Re-audited Steps 367-379 and closed HTF target-history leftward-extension
  latency for now.
- Current reduced-delay evidence is protected by the Step 377 standalone
  browser budget guard, Step 378 optional pack member, Step 379 combined
  optional pack path, and Step 371 attribution harness.
- Selected Step 381 - Chart Foundation Regression Refresh as the next bounded
  slice outside the narrow HTF latency chain.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, shell
  readout code, target-history request sizing, replay, chart viewport, chart
  engine, or the Step 362 runtime skeleton.

### Step 379 - Target-History Pack Reduced-Delay Optional Combination

Completed in this target-history pack reduced-delay optional combination commit
series.

Verification:

- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-optional-combination-step379-static-smoke.js`
- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `git diff --check`

Notes:

- Verified combined optional pack order:
  `replay-coordination`, `readout-producer-flow`, `handoff-registration`,
  `reduced-delay-budget`.
- Default Step 293 pack membership remains the same eight tests.
- Step 377 budget guard passed as the fourth optional member.
- Observed combined-run reduced-delay timings: `4h` `116.0ms`, `8h`
  `132.9ms`, `1D` `134.2ms`, and `1W` `137.5ms`.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, shell
  readout code, target-history request sizing, replay, chart viewport, chart
  engine, or the Step 362 runtime skeleton.

### Step 378 - Target-History Pack Reduced-Delay Budget Member

Completed in this target-history pack reduced-delay budget member commit
series.

Verification:

- `node v6/tests/target-history-pack-reduced-delay-budget-member-step378-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=reduced-delay-budget node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

Notes:

- Added optional target-history diagnostics pack member `reduced-delay-budget`.
- The new member runs only
  `v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`.
- Default Step 293 pack membership remains the same eight tests.
- Existing optional members `replay-coordination`, `readout-producer-flow`, and
  `handoff-registration` remain available and in the same order.
- Observed optional member run selected `plan members 1/8 reduced-delay-budget`
  and measured `4h` `124.8ms`, `8h` `139.5ms`, `1D` `132.8ms`, and `1W`
  `129.9ms`.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, shell
  readout code, target-history request sizing, replay, chart viewport, chart
  engine, or the Step 362 runtime skeleton.

### Step 377 - HTF Target-History Reduced-Delay Browser Budget Guard

Completed in this HTF target-history reduced-delay browser budget guard commit
series.

Verification:

- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-browser-step377-smoke.js`
- `node v6/tests/high-timeframe-target-history-reduced-delay-budget-boundary-step377-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `git diff --check`

Notes:

- Added a focused browser budget guard separate from the broader Step 371
  attribution smoke.
- The guard asserts `4h`, `8h`, `1D`, and `1W` target fetches start under
  `300ms`.
- The guard verifies native `100ms` schedule resolution and `100ms` timer
  scheduling for each tested HTF.
- The guard verifies any observed runtime delayed `500ms` reason has a matching
  `schedule-suppressed` trace.
- Observed timing: `4h` `119.4ms`, `8h` `140.1ms`, `1D` `127.7ms`, and `1W`
  `139.7ms`.
- Did not modify runtime behavior, `v6/src/app.js`, command surfaces, shell
  readout code, target-history request sizing, replay, chart viewport, chart
  engine, or the Step 362 runtime skeleton.

### Step 376 - HTF Target-History Runtime Delayed-Schedule Suppression

Completed in this HTF target-history runtime delayed-schedule suppression
commit series.

Verification:

- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-step376-smoke.js`
- `node v6/tests/leftward-history-input-bridge-runtime-delayed-suppression-boundary-step376-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `git diff --check`

Notes:

- Suppressed HTF target-history delayed `runtime-surface-check` and
  `runtime-left-extension-loaded` schedules in the input bridge.
- Native visible-range target-history remains `100ms`.
- Low-TF/native source and target-history-disabled paths continue to use the
  normal delayed schedule.
- Programmatic target-history fast path remains immediate.
- Browser timing after suppression: `4h` `113.3ms`, `8h` `121.4ms`,
  `1D` `125.7ms`, and `1W` `120.4ms` from input to target fetch.
- Did not modify `v6/src/app.js`, command surfaces, shell readout code,
  target-history request sizing, replay, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 375 - HTF Target-History Native Reduced Delay Branch Attribution

Completed in this HTF target-history native reduced-delay branch attribution
commit series.

Verification:

- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-step375-smoke.js`
- `node v6/tests/leftward-history-input-bridge-schedule-branch-attribution-boundary-step375-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a harness-only bridge trace hook for `schedule-resolved` and
  `timer-scheduled` records.
- Browser attribution showed the native `100ms` target-history branch is
  present for `4h`, `8h`, `1D`, and `1W`.
- Browser attribution showed `8h` reaches target fetch near the reduced-delay
  window (`130.1ms` in the observed run).
- Browser attribution showed `4h`, `1D`, and `1W` still line up with the old
  roughly `500ms` window because runtime-originated
  `runtime-surface-check`/`runtime-left-extension-loaded` delayed schedules
  remain active in the interaction window.
- Step 376 should narrowly suppress those runtime delayed schedules only when
  they would dominate an active HTF target-history native reduced-delay
  schedule.
- Did not modify `v6/src/app.js`, command surfaces, shell readout code,
  target-history request sizing, replay, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 374 - HTF Target-History Native Reduced Delay Bridge Wiring

Completed in this HTF target-history native reduced-delay bridge wiring commit
series.

Verification:

- `node v6/tests/leftward-history-input-bridge-native-target-delay-step374-smoke.js`
- `node v6/tests/leftward-history-input-bridge-native-target-delay-boundary-step374-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/leftward-history-input-target-activation-step286-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-request-schedule-boundary-step373-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Wired `nativeTargetHistoryDelayMs: 100` into the bridge only for native
  visible-range requests with target-history enabled.
- Low-TF/native and target-history-disabled paths stay on `requestDelayMs=500`.
- Existing programmatic target-history fast path remains `delayMs: 0`.
- Browser measurement after wiring showed `8h` improved to `132.1ms`.
- Browser measurement still showed `4h` at `479.2ms`, `1D` at `462.8ms`, and
  `1W` at `447.9ms`; Step 375 should attribute the real-wheel branch
  difference.
- Did not modify `v6/src/app.js`, command surfaces, shell readout code,
  target-history request sizing, replay, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 373 - HTF Target-History Native Visible-Range Reduced Delay Resolver

Completed in this HTF target-history native visible-range reduced delay resolver
commit series.

Verification:

- `node v6/tests/leftward-history-request-schedule-step373-smoke.js`
- `node v6/tests/leftward-history-request-schedule-boundary-step373-static-smoke.js`
- `node v6/tests/leftward-history-request-schedule-step326-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-step372-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added pure resolver support for `nativeTargetHistoryDelayMs`.
- HTF target-history native visible-range scheduling can resolve to `100ms`
  with mode `native-target-history-reduced-delay`.
- Native target-history without the new option still resolves to
  `requestDelayMs=500`, preserving current bridge behavior.
- Low-TF/native and target-history-disabled paths stay on `requestDelayMs=500`.
- Existing programmatic target-history fast path stays `delayMs: 0`.
- Updated Step 372 boundary coverage so it no longer blocks Step 373 resolver
  implementation while still proving bridge runtime wiring is unchanged.
- Did not modify `v6/src/app.js`, command surfaces, shell readout code,
  target-history request sizing, replay, chart viewport, chart engine, or the
  Step 362 runtime skeleton.

### Step 372 - HTF Target-History Request Scheduling Policy Selection

Completed in this HTF target-history request scheduling policy selection commit
series.

Verification:

- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-step372-smoke.js`
- `node v6/tests/high-timeframe-target-history-request-scheduling-policy-selection-boundary-step372-static-smoke.js`
- `node v6/tests/leftward-history-request-schedule-step326-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-boundary-step371-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure policy selector for HTF target-history native visible-range
  scheduling.
- Selected `native-target-history-reduced-delay-with-coalescing`.
- Future HTF target-history native visible-range delay is `100ms`.
- Low-TF/native and target-history-disabled native paths stay on
  `requestDelayMs=500`.
- Existing programmatic target-history fast path remains unchanged.
- Rejected keeping native `500ms` because Step 371 showed it is the dominant
  delay.
- Rejected native zero-delay fast path for this slice because it risks bypassing
  drag/wheel coalescing and sticky-drag protections.
- Did not change bridge/resolver runtime behavior, command surfaces,
  `v6/src/app.js`, shell readout code, or the Step 362 runtime skeleton.

### Step 371 - HTF Drag-Triggered Low-Overhead Runtime Milestone Attribution

Completed in this HTF drag-triggered low-overhead runtime milestone attribution
commit series.

Verification:

- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-browser-step371-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-low-overhead-runtime-milestones-boundary-step371-static-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-boundary-step370-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added low-overhead real CDP wheel milestone attribution for `4h`, `8h`,
  `1D`, and `1W`.
- The observed run identified `inputToTargetFetchStartMs` around
  `460-536ms`, matching the existing `requestDelayMs=500` scheduling window.
- Target fetch, fetch-to-chart-data, and left-extension-to-readout were low.
- Source requests stayed zero on the target-history path.
- Selected HTF target-history request scheduling policy selection as Step 372.
- Preserved default and optional target-history diagnostics pack membership.
- Did not modify runtime behavior, command surfaces, `v6/src/app.js`, shell
  readout code, or the Step 362 runtime skeleton.

### Step 370 - HTF Drag-Triggered Leftward Extension Interaction Measurement

Completed in this HTF drag-triggered leftward-extension interaction measurement
commit series.

Verification:

- `node v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-browser-step370-smoke.js`
- `node v6/tests/high-timeframe-drag-triggered-leftward-extension-interaction-boundary-step370-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-boundary-step369-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser/harness-only real CDP wheel measurement for `4h`, `8h`, `1D`,
  and `1W`.
- The observed run showed `inputAttemptIndex: 0` and `inputDeltaX: -960` for
  all four TFs, so the first wheel attempt triggered target-history loading.
- Target fetch started quickly after input and target request duration was
  effectively zero in the mocked harness.
- Source requests stayed zero and chart-data replacement was not the measured
  cost.
- The remaining observed window needs low-overhead milestone attribution
  because Step 370 canvas sampling can contaminate viewport/paint buckets.
- Preserved default and optional target-history diagnostics pack membership.
- Did not modify runtime behavior, command surfaces, `v6/src/app.js`, shell
  readout code, or the Step 362 runtime skeleton.

### Step 369 - HTF Leftward Extension Real Chart Paint Visibility Measurement

Completed in this HTF real chart paint visibility measurement commit series.

Verification:

- `node v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-browser-step369-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-real-chart-paint-visibility-boundary-step369-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-boundary-step368-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser/harness-only canvas-signature measurement for `4h`, `8h`,
  `1D`, and `1W`.
- The observed run showed `firstPaintStage: viewport-projected` and
  `realChartPaintVisibleLagMs: 0` for all four TFs.
- The large observation window came from harness canvas sampling / delayed
  observation, not chart-surface paint delay.
- Selected real drag-triggered HTF leftward-extension interaction measurement
  as Step 370 because the original perceived slowness was tied to dragging.
- Preserved default and optional target-history diagnostics pack membership.
- Did not modify runtime behavior, command surfaces, `v6/src/app.js`, shell
  readout code, or the Step 362 runtime skeleton.

### Step 368 - HTF Leftward Extension Bottleneck Owner Selection After Handoff Measurement

Completed in this HTF leftward-extension bottleneck owner selection commit
series.

Verification:

- `node v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-step368-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-bottleneck-owner-selection-boundary-step368-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-after-handoff-step367-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure selector for Step 367-style phase records.
- Consumed the observed Step 367 phase summary and selected
  `target-history-real-chart-paint-visibility-measurement` as the next slice.
- Deferred request sizing / target load, chart-data replacement, viewport
  reapply, and visible apply lag because they were within budget or effectively
  zero in the observed run.
- Preserved default and optional target-history diagnostics pack membership.
- Did not modify runtime behavior, command surfaces, `v6/src/app.js`, shell
  readout code, or the Step 362 runtime skeleton.

### Step 367 - HTF Leftward Extension Performance Measurement After Runtime Handoff

Completed in this HTF leftward-extension performance measurement commit series.

Verification:

- `node v6/tests/high-timeframe-leftward-extension-performance-after-handoff-step367-static-smoke.js`
- `node v6/tests/high-timeframe-leftward-extension-performance-after-handoff-browser-step367-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added focused browser measurement for `4h`, `8h`, `1D`, and `1W`.
- The measurement separates source request, target request, chart-data
  replacement, viewport reapply, visible apply lag, browser paint lag, visual
  latency, and runtime duration.
- The browser smoke prints a concise Step 367 phase summary for the four TFs.
- Preserved default and optional target-history diagnostics pack membership.
- Did not modify runtime behavior, command surfaces, `v6/src/app.js`, shell
  readout code, or the Step 362 runtime skeleton.

### Step 366 - Replay Coordination Materialization Runtime Handoff Pack Member

Completed in this replay coordination materialization runtime handoff pack
member commit series.

Verification:

- `node v6/tests/target-history-pack-handoff-registration-member-step366-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow,handoff-registration node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added optional target-history diagnostics pack member
  `handoff-registration`.
- The member runs
  `v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`.
- Preserved default target-history diagnostics pack count at eight.
- Preserved existing optional members `replay-coordination` and
  `readout-producer-flow`.
- Verified the new member alone and combined with the two existing optional
  members.
- Did not modify `v6/src/app.js`.
- Did not add command surfaces or change runtime behavior.

### Step 365 - Replay Coordination Materialization Runtime Handoff App Registration

Completed in this replay coordination materialization runtime handoff app
registration commit series.

Verification:

- `node v6/tests/replay-coordination-materialization-runtime-handoff-app-registration-browser-step365-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Registered
  `createReplayCoordinationMaterializationRuntimeHandoff({ subscribeEvent, dispatchCommand })`
  in `v6/src/app.js`.
- Added `dispatchCommand` app import from `./runtime/commands.js`.
- Added runtime factory app import from
  `./replay/replay-coordination-materialization-runtime-handoff.js`.
- Preserved registration order after Manual Next and before Manual Previous.
- Added focused browser smoke proving the runtime is registered and Manual Next
  remains source `1m` driven while `8h` target materialization is active.
- Updated historical static tests so older plan/contract/skeleton/readiness
  checks no longer assert that current `v6/src/app.js` is unregistered.
- Did not add new command surfaces.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 364 - Narrow Replay Materialization Runtime Handoff App Registration Plan

Completed in this narrow replay materialization runtime handoff app registration
plan commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-step364-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-boundary-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-plan-closeout-step364-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added plan-only helper
  `v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-plan.js`.
- Defined the exact future `v6/src/app.js` diff for command import, runtime
  import, and runtime registration.
- Defined dependency injection plan for `subscribeEvent`, `dispatchCommand`,
  and the default executor.
- Defined focused Step 365 browser smoke shape and verification order.
- Defined rollback gates for removing the app import, command import,
  registration call, and focused browser smoke.
- Did not modify `v6/src/app.js`.
- Did not register runtime, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 363 - Narrow Replay Materialization Runtime Handoff App Registration Readiness Audit

Completed in this narrow replay materialization runtime handoff app registration
readiness audit commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-step363-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-boundary-step363-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-app-registration-readiness-closeout-step363-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added audit-only helper
  `v6/src/replay/narrow-replay-materialization-runtime-handoff-app-registration-readiness-audit.js`.
- Identified the future `v6/src/app.js` runtime import path and placement.
- Identified the future runtime registry insertion point after Manual Next and
  before Manual Previous.
- Defined future dependency injection source for `subscribeEvent`,
  `dispatchCommand`, and executor.
- Defined focused future browser coverage and rollback plan.
- Did not add runtime to `v6/src/app.js`.
- Did not register commands, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 362 - Narrow Replay Materialization Runtime Handoff Unwired Runtime Skeleton

Completed in this narrow replay materialization runtime handoff unwired runtime
skeleton commit series.

Verification:

- `node v6/tests/replay-coordination-materialization-runtime-handoff-step362-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-boundary-step362-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-handoff-closeout-step362-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added unwired runtime skeleton module
  `v6/src/replay/replay-coordination-materialization-runtime-handoff.js`.
- Implemented contract-shaped factory
  `createReplayCoordinationMaterializationRuntimeHandoff(dependencies)`.
- Used injectable `subscribeEvent`, `dispatchCommand`, and executor
  dependencies.
- Added command-result wrapper helper and result builder helper.
- Verified start/stop cleanup with injected fake dependencies.
- Did not add runtime to `v6/src/app.js`.
- Did not import real runtime command/event bus helpers.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 361 - Narrow Replay Materialization Runtime Handoff Runtime Contract

Completed in this narrow replay materialization runtime handoff runtime contract
commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-step361-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-boundary-step361-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-contract-closeout-step361-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the contract-only
  `narrow-replay-materialization-runtime-handoff-runtime-contract` helper.
- Defined future factory signature:
  `createReplayCoordinationMaterializationRuntimeHandoff(dependencies)`.
- Defined dependency shape for injected `subscribeEvent`, `dispatchCommand`,
  and `executeNarrowReplayMaterializationRuntimeHandoffPlan`.
- Defined wrapper result, fallback result, and no-op diagnostics result shapes.
- Defined app registration preconditions before live wiring.
- Did not add runtime to `v6/src/app.js`.
- Did not register commands, subscribe to events, dispatch commands, emit
  diagnostics events, or change runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 360 - Narrow Replay Materialization Runtime Handoff Runtime Plan

Completed in this narrow replay materialization runtime handoff runtime plan
commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-step360-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-boundary-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-runtime-plan-closeout-step360-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the plan-only
  `narrow-replay-materialization-runtime-handoff-runtime-plan` helper.
- Defined future lifecycle: create helper, subscribe on start, handle events
  through a dispatch wrapper, invoke the Step 358 executor, and cleanup on stop.
- Preserved command wrapper order: `pane.getById`, `replay.getState`,
  `chartData.getSourceBars`, `barData.planTargetWindow`,
  `barData.loadTargetWindow`, and `chartData.replaceBars`.
- Recorded rollback gates for disabling runtime registration, skipping
  subscription, disabling wrapper, preserving current display on fallback, and
  stop cleanup.
- Did not add runtime to `v6/src/app.js`.
- Did not register commands, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 359 - Narrow Replay Materialization Runtime Handoff Wiring Readiness Audit

Completed in this narrow replay materialization runtime handoff wiring readiness
audit commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-step359-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-boundary-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-wiring-readiness-closeout-step359-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the pure wiring readiness audit for
  `replay-coordination-materialization-runtime-handoff`.
- Identified `v6/src/app.js` runtime registry before lifecycle start as the
  future app registration surface.
- Identified `chartEntryManualNext:advanced` subscription inside the future
  runtime helper start lifecycle.
- Identified the future command dispatch wrapper surfaces: `pane.getById`,
  `replay.getState`, `chartData.getSourceBars`, `barData.planTargetWindow`,
  `barData.loadTargetWindow`, and `chartData.replaceBars`.
- Recorded rollback criteria for removing app registration, subscription, and
  dispatch wrapper while preserving Step 357/358 pure helpers.
- Did not register commands, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 358 - Narrow Replay Materialization Runtime Handoff Pure Executor Harness

Completed in this narrow replay materialization runtime handoff pure executor
commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-step358-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-boundary-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-executor-closeout-step358-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the pure
  `narrow-replay-materialization-runtime-handoff-pure-executor` harness.
- Consumed the Step 357 plan from
  `narrow-replay-materialization-runtime-handoff-plan`.
- Returned a `chartData.replaceBars` intent with `preserveSource: true` on the
  happy path.
- Reused the source-cursor target-bar no-future reveal policy.
- Returned named fallback gates for source `1m`, missing pane context, missing
  replay cursor, missing source bars, target plan miss, target load miss, and
  all target bars filtered as future.
- Did not register commands, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 357 - Narrow Replay Materialization Runtime Handoff Plan

Completed in this narrow replay materialization runtime handoff plan commit
series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-step357-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-boundary-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-plan-closeout-step357-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the plan-only
  `narrow-replay-materialization-runtime-handoff-plan` helper.
- Kept future owner boundary
  `runtime.replay-coordination-materialization-handoff`.
- Kept future module
  `replay-coordination-materialization-runtime-handoff`.
- Defined `chartEntryManualNext:advanced` as the future trigger, with Auto Play
  covered through Manual Next.
- Defined command order: `pane.getById`, `replay.getState`,
  `chartData.getSourceBars`, `barData.planTargetWindow`,
  `barData.loadTargetWindow`, and `chartData.replaceBars`.
- Defined fallback gates before runtime wiring.
- Did not register commands, subscribe to events, dispatch commands, or change
  runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 356 - Narrow Replay Materialization Runtime Handoff Readiness Audit

Completed in this narrow replay materialization runtime handoff readiness audit
commit series.

Verification:

- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-step356-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-boundary-step356-static-smoke.js`
- `node v6/tests/narrow-replay-materialization-runtime-handoff-readiness-closeout-step356-static-smoke.js`
- `node v6/tests/target-materialization-diagnostics-readout-chain-closeout-step355-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected future owner boundary
  `runtime.replay-coordination-materialization-handoff`.
- Selected a new replay-coordination runtime helper instead of adding behavior
  to Manual Next, Auto Play, Display-Timeframe, or diagnostics runtime.
- Listed `chartEntryManualNext:advanced` as the future primary trigger.
- Listed allowed future command surfaces: `pane.getById`, `replay.getState`,
  `chartData.getSourceBars`, `barData.planTargetWindow`,
  `barData.loadTargetWindow`, and `chartData.replaceBars`.
- Kept Auto Play covered through Manual Next advanced events.
- Kept diagnostics runtime read-only observability.
- Did not register commands, subscribe to events, or change runtime behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 355 - Target Materialization Diagnostics Readout Chain Closeout And Next Slice Selection

Completed in this target materialization diagnostics/readout chain selection
commit series.

Verification:

- `node v6/tests/target-materialization-diagnostics-readout-chain-selection-step355-smoke.js`
- `node v6/tests/target-materialization-diagnostics-readout-chain-boundary-step355-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-combination-closeout-step354-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Recorded that Step 337, Step 352, and Step 354 cover the diagnostics/readout
  chain from replay coordination through pane-status DOM readout.
- Selected `narrow-replay-materialization-runtime-handoff-readiness-audit` as
  the next bounded target-materialization foundation slice.
- Explicitly stopped adding observability-only diagnostics UI or pack wiring for
  now.
- Preserved the default eight-member target-history diagnostics pack.
- Preserved optional members `replay-coordination` and `readout-producer-flow`.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 354 - Target Materialization Replay Diagnostics Readout Pack Combination Verification

Completed in this target-history pack readout producer-flow combination
verification commit series.

Verification:

- `node v6/tests/target-history-pack-readout-producer-flow-combination-step354-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-readout-producer-flow-member-closeout-step353-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Verified `TARGET_HISTORY_PACK_MEMBERS=replay-coordination,readout-producer-flow`
  runs Step 337 then Step 352 browser smokes in order.
- Confirmed the default target-history diagnostics pack remains eight members.
- Confirmed standalone optional member order follows the requested member list.
- Preserved standalone Step 337 and Step 352 browser smoke commands.
- Did not modify pack runner behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 353 - Target Materialization Replay Diagnostics Readout Producer Flow Pack Member

Completed in this target-history pack readout producer-flow member commit
series.

Verification:

- `node v6/tests/target-history-pack-readout-producer-flow-member-step353-static-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added optional target-history pack member `readout-producer-flow`.
- Mapped `readout-producer-flow` to the Step 352 producer-flow readout browser
  smoke.
- Kept the default target-history pack at eight members.
- Kept existing optional member `replay-coordination` unchanged.
- Verified `TARGET_HISTORY_PACK_MEMBERS=readout-producer-flow` runs only the
  Step 352 browser smoke.
- Did not modify Step 352 standalone browser behavior.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 352 - Target Materialization Replay Diagnostics Readout Producer Flow Browser Regression

Completed in this target materialization replay diagnostics readout producer
flow regression commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-browser-step352-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-producer-flow-boundary-step352-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser coverage for real Display-Timeframe materialization updating
  the pane-status materialization diagnostics readout.
- Added browser coverage for real Manual Next updating the visible readout row.
- Added browser coverage for real Auto Play start/tick/stop updating the
  visible readout row.
- Verified fallback readout rendering from an empty target-bars response.
- Verified returning to normal `1m` replay hides the readout with no rows.
- Verified internal-only fields remain out of row text.
- Did not dispatch `updateSnapshot` directly from the producer-flow browser
  smoke.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 351 - Target Materialization Replay Diagnostics Readout DOM Wiring

Completed in this target materialization replay diagnostics readout DOM wiring
commit series.

Verification:

- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-browser-step351-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step351-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Mounted pane-local materialization diagnostics containers under
  `shell.pane-status-readout` after `[data-v6-target-history-diagnostics]`.
- Read the initial diagnostics snapshot through `getSnapshot`.
- Refreshed the readout on `snapshotReady`.
- Routed every snapshot through the Step 349 view model.
- Rendered hidden/normal snapshots as hidden containers with no rows.
- Rendered target-history-active and fallback snapshots as collapsed
  first-visible rows.
- Kept internal-only fields out of visible rows.
- Did not modify producer runtimes.
- Did not change target loading, replay cursor movement, chart-data writes,
  viewport behavior, request sizing, or chart-history fast-path behavior.

### Step 350 - Target Materialization Replay Diagnostics Readout DOM Wiring Plan

Completed in this target materialization replay diagnostics readout DOM wiring
plan commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-plan-step350-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-boundary-step350-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-dom-wiring-closeout-step350-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected `[data-v6-pane-status-readout]` as the future pane-local container.
- Selected insertion after `[data-v6-target-history-diagnostics]`.
- Defined future materialization diagnostics dataset attributes.
- Defined command/event-only consumption through `getSnapshot` and
  `snapshotReady`.
- Required all snapshot payloads to route through the Step 349 view model.
- Defined hidden/collapsed rendering rules and rollback criteria.
- Did not wire visible DOM UI or change producer runtimes.
- Kept target-bar loading, replay cursor movement, chart-data writes, viewport
  intent, target-history request sizing, and chart-history fast-path behavior
  unchanged.

### Step 349 - Target Materialization Replay Diagnostics Readout View Model

Completed in this target materialization replay diagnostics readout view model
commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-step349-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-boundary-step349-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-view-model-closeout-step349-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure `shell` readout view model.
- Mapped empty/not-ready diagnostics to hidden `snapshot-not-ready`.
- Mapped normal replay diagnostics to hidden `normal-replay`.
- Mapped target-history materialization diagnostics to collapsed
  `target-history-active`.
- Mapped fallback diagnostics to collapsed `fallback`.
- Exposed rows only for the Step 348 first visible fields.
- Kept Step 348 internal-only fields hidden from rows.
- Did not wire visible DOM UI or change producer runtimes.
- Kept target-bar loading, replay cursor movement, chart-data writes, viewport
  intent, target-history request sizing, and chart-history fast-path behavior
  unchanged.

### Step 348 - Target Materialization Replay Diagnostics Readout Owner Plan

Completed in this target materialization replay diagnostics readout owner plan
commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-plan-step348-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-boundary-step348-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-readout-owner-closeout-step348-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected `shell.pane-status-readout` as the readout owner.
- Selected `developer-collapsed-pane-status-readout` as the first placement.
- Listed first visible fields and internal-only fields.
- Defined hide/collapse rules for normal replay, target-history active state,
  fallback state, pane locality, snapshot readiness, and workflow conflicts.
- Kept shell consumption to `getSnapshot` and `snapshotReady`.
- Did not wire visible UI or change producer runtimes.
- Kept target-bar loading, replay cursor movement, chart-data writes, viewport
  intent, target-history request sizing, and chart-history fast-path behavior
  unchanged.

### Step 347 - Target Materialization Replay Diagnostics Browser Read Coverage

Completed in this target materialization replay diagnostics browser read commit
series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-browser-read-step347-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-browser-read-boundary-step347-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser coverage for diagnostics snapshots after display timeframe
  target materialization, manual next, autoplay start, autoplay tick, and
  autoplay stop.
- Read path uses `targetMaterializationReplayDiagnostics.getSnapshot`.
- The browser smoke does not call `updateSnapshot` and does not add visible UI.
- Producer runtimes remain unchanged.
- Kept target-bar loading, replay cursor movement, chart-data writes, viewport
  intent, target-history request sizing, and chart-history fast-path behavior
  unchanged.

### Step 346 - Target Materialization Replay Diagnostics Producer Event Runtime Wiring

Completed in this target materialization replay diagnostics producer event
runtime commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-producer-event-runtime-step346-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-event-boundary-step346-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Diagnostics runtime now subscribes to the five accepted producer events.
- Producer payloads are mapped through the Step 345 mappers and applied through
  the Step 344 update path.
- `null` mapper results are ignored, and invalid update candidates remain
  rejected without corrupting the current snapshot.
- Producer runtimes remain unchanged.
- Kept visible UI, target-bar loading, replay cursor movement, chart-data
  writes, viewport intent, target-history request sizing, and chart-history
  fast-path behavior unchanged.

### Step 345 - Target Materialization Replay Diagnostics Producer Payload Mappers

Completed in this target materialization replay diagnostics mapper commit
series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-step345-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-producer-payload-mappers-boundary-step345-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added pure producer payload mappers for Display-Timeframe, Manual Next, and
  Auto Play events.
- Mapper outputs are compatible with the Step 344 `updateSnapshot` command.
- Malformed payloads produce safe partial updates or `null`.
- Kept producer-event subscriptions, producer runtime dispatches, visible UI,
  target-bar loading, replay cursor movement, chart-data writes, viewport
  intent, target-history request sizing, and chart-history fast-path behavior
  unchanged.

### Step 344 - Target Materialization Replay Diagnostics Update Command Surface

Completed in this target materialization replay diagnostics update command
commit series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-update-command-step344-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-update-command-boundary-step344-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `targetMaterializationReplayDiagnostics.updateSnapshot`.
- Valid updates are normalized, validated, cloned, readable through
  `getSnapshot`, and emitted through `snapshotReady`.
- Invalid updates return `status: rejected` and do not corrupt the current
  diagnostics snapshot.
- Kept producer-event subscriptions, visible UI, target-bar loading, replay
  cursor movement, chart-data writes, viewport intent, target-history request
  sizing, and chart-history fast-path behavior unchanged.

### Step 343 - Target Materialization Replay Diagnostics Runtime Wiring Plan

Completed in this target materialization replay diagnostics wiring plan commit
series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-wiring-plan-step343-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-wiring-boundary-step343-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the pure diagnostics runtime wiring plan.
- Named Display-Timeframe, Manual Next, and Auto Play producer events.
- Defined the future `targetMaterializationReplayDiagnostics.updateSnapshot`
  update surface, but did not implement it yet.
- Kept shell consumption on `snapshotReady` and `getSnapshot`.
- Kept visible UI, live subscriptions, target-bar loading, replay cursor
  movement, chart-data writes, viewport intent, target-history request sizing,
  and chart-history fast-path behavior unchanged.

### Step 342 - Target Materialization Replay Diagnostics Runtime State Surface

Completed in this target materialization replay diagnostics runtime commit
series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-runtime-step342-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-runtime-boundary-step342-static-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the read-only diagnostics runtime state surface.
- Registered `targetMaterializationReplayDiagnostics.getSnapshot` and
  `targetMaterializationReplayDiagnostics:snapshotReady`.
- Cloned snapshot payloads before returning or emitting them.
- Kept visible UI, target-bar loading, replay cursor movement, chart-data
  writes, viewport intent, target-history request sizing, and chart-history
  fast-path behavior unchanged.

### Step 341 - Target Materialization Replay Coordination Diagnostics Readout Owner Contract

Completed in this target materialization replay diagnostics contract commit
series.

Verification:

- `node v6/tests/target-materialization-replay-diagnostics-contract-step341-smoke.js`
- `node v6/tests/target-materialization-replay-diagnostics-boundary-step341-static-smoke.js`
- `node v6/tests/target-timeframe-materialization-post-pack-closeout-step340-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added the read-only diagnostics/readout owner contract.
- Defined accepted diagnostic fields for display apply, manual next, autoplay,
  fallback, source cursor authority, target bars display-only state, and latest
  source/display timestamps.
- Documented shell consumption as diagnostic snapshot reading with no direct
  target API access.
- Runtime behavior is unchanged.

### Step 340 - Target-Timeframe Materialization Post-Pack Reselection

Completed in this target-timeframe materialization post-pack selection commit
series.

Verification:

- `node v6/tests/target-timeframe-materialization-post-pack-selection-step340-smoke.js`
- `node v6/tests/target-timeframe-materialization-post-pack-boundary-step340-static-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-closeout-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure post-pack materialization selector.
- Selected `target-materialization-replay-coordination-diagnostics-readout`.
- Explicitly deferred narrow runtime handoff until diagnostics/readout ownership
  is defined.
- Runtime behavior is unchanged.

### Step 339 - Target-History Pack Replay Coordination Member Integration

Completed in this target-history pack replay coordination member commit series.

Verification:

- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-pack-replay-coordination-member-step339-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=replay-coordination node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-browser-pack-cost-control-closeout-step309-static-smoke.js`
- `node v6/tests/target-timeframe-materialization-next-slice-closeout-step338-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added optional target-history pack member `replay-coordination`.
- The optional member points to the Step 337 replay coordination browser smoke.
- Default `all`, `fallback`, `session-aware`, and `sizing` groups keep their
  existing member sets.
- Runtime behavior is unchanged.

### Step 338 - Target-Timeframe Materialization Next Slice Reselection

Completed in this target-timeframe materialization next-slice selection commit
series.

Verification:

- `node v6/tests/target-timeframe-materialization-next-slice-selection-step338-smoke.js`
- `node v6/tests/target-timeframe-materialization-next-slice-boundary-step338-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-closeout-step337-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure target-timeframe materialization next-slice selector.
- Selected `target-history-pack-replay-coordination-member` as the next bounded
  slice.
- Recorded owner boundary, affected test harness, forbidden runtime actions,
  and rollback criteria.
- Kept runtime behavior unchanged.

### Step 337 - Display-Timeframe Target Materialization Replay Coordination Browser Regression

Completed in this display-timeframe target materialization replay coordination
commit series.

Verification:

- `node v6/tests/display-timeframe-target-materialization-replay-coordination-browser-step337-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-replay-coordination-boundary-step337-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-closeout-step336-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser-visible replay coordination coverage with `8h` target
  materialization active.
- Confirmed manual next and autoplay remain source `1m` cursor driven through a
  no-bar gap.
- Confirmed target-data-missing fallback remains available during replay
  coordination.
- Fixed manual-next HTF append filtering by using replay source cursor time as
  the chart-data append cursor instead of the projected HTF bucket timestamp.
- Kept target window planning/loading out of replay, manual-next, and autoplay
  runtimes.

### Step 336 - Display-Timeframe Target Materialization Browser Verification

Completed in this display-timeframe target materialization browser verification
commit series.

Verification:

- `node v6/tests/display-timeframe-target-materialization-browser-step336-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-browser-boundary-step336-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-closeout-step335-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser-visible verification for `8h`, `1D`, and `1W`
  display-timeframe target materialization.
- Confirmed source `1m` bars remain preserved and switching back to `1m`
  restores source projection.
- Confirmed target-data-missing fallback reports
  `target-history-no-visible-bars` and returns to source-window projection
  without shrinking preserved source bars.
- Fed browser records into the high-timeframe responsiveness audit and accepted
  the current runtime handoff as materialization-ready.
- Kept shell target API calls, replay cursor reads, target window
  planning/loading, and chart-data replacement out of shell code.

### Step 335 - Display-Timeframe Target Materialization Runtime Handoff Wiring

Completed in this display-timeframe target materialization runtime handoff
commit series.

Verification:

- `node v6/tests/display-timeframe-target-materialization-handoff-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-step335-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-runtime-boundary-step335-static-smoke.js`
- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a neutral target-bar reveal policy and a display-timeframe-owned
  target materialization handoff helper.
- Display-Timeframe Runtime now reads source cursor state, preserves source
  bars, plans/loads target windows through Bar Data Runtime, filters target bars
  with source-cursor reveal policy, and applies display bars through Chart Data
  Runtime with `preserveSource: true`.
- Source cursor missing, target load failure, and no-visible-target-bar cases
  fall back to source projection.
- No replay cursor movement, no-bar gap skipping, target-history request
  sizing, chart-history fast-path scheduling, direct viewport intent mutation,
  chart-engine, shell, journal, order-ticket, prop-firm, indicator, or seconds
  behavior changed.

### Step 334 - Display-Timeframe Target Materialization Wiring Plan

Completed in this display-timeframe target materialization wiring plan commit
series.

Verification:

- `node v6/tests/display-timeframe-target-materialization-wiring-plan-step334-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-wiring-boundary-step334-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-closeout-step333-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure display-timeframe target materialization wiring plan.
- The plan keeps Display-Timeframe Runtime as the future handoff owner and
  lists the exact command/data sequence through existing replay, bar-data, and
  chart-data owner surfaces.
- The plan records fallback gates and rollback criteria before runtime behavior
  wiring.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart-history fast-path scheduling, chart viewport intent,
  chart-engine, shell, journal, order-ticket, prop-firm, indicator, or seconds
  behavior changed.

### Step 333 - Display-Timeframe Target Materialization Readiness Audit

Completed in this display-timeframe target materialization readiness audit
commit series.

Verification:

- `node v6/tests/display-timeframe-target-materialization-readiness-audit-step333-smoke.js`
- `node v6/tests/display-timeframe-target-materialization-readiness-boundary-step333-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-closeout-step332-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure display-timeframe target materialization readiness audit.
- Added static source-surface coverage proving the existing display-timeframe,
  bar-data, chart-data, replay cursor, and target-bar reveal policy surfaces
  needed by the pure handoff plan exist.
- The audit resolves to `ready` and selects
  `display-timeframe-target-materialization-wiring-plan` next.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 332 - Replay Coordination Materialization Runtime Wiring Slice Selection

Completed in this replay coordination materialization runtime wiring slice
selection commit series.

Verification:

- `node v6/tests/replay-coordination-materialization-runtime-wiring-selection-step332-smoke.js`
- `node v6/tests/replay-coordination-materialization-runtime-wiring-boundary-step332-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-closeout-step331-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure runtime wiring slice selector.
- Selected `display-timeframe-target-materialization-readiness-audit` as the
  first bounded runtime wiring slice.
- Added static boundary coverage proving the selector does not expose command
  bus, event bus, direct chart-engine writes, replay cursor mutation, shell
  target APIs, or viewport mutation.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 331 - Replay Coordination Materialization Pure Handoff Plan

Completed in this replay coordination materialization pure handoff plan commit
series.

Verification:

- `node v6/tests/replay-coordination-materialization-pure-handoff-plan-step331-smoke.js`
- `node v6/tests/replay-coordination-materialization-pure-handoff-boundary-step331-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-closeout-step330-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure handoff plan mapping display materialization intent to existing
  bar-data/chart-data owner surfaces.
- Recorded `display-timeframe-target-materialization-handoff` as the first
  future wiring point and listed its preconditions.
- Added static boundary coverage proving the plan does not expose command bus,
  event bus, direct chart-engine writes, replay cursor mutation, shell target
  APIs, or viewport mutation.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 330 - Replay Coordination Materialization Runtime Handoff Slice Selection

Completed in this replay coordination materialization runtime handoff slice
selection commit series.

Verification:

- `node v6/tests/replay-coordination-materialization-handoff-slice-selection-step330-smoke.js`
- `node v6/tests/replay-coordination-materialization-handoff-boundary-step330-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-closeout-step329-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure runtime handoff slice selector.
- Selected `replay-coordination-materialization-pure-handoff-plan` as the first
  bounded slice before runtime materialization wiring.
- Added static boundary coverage proving the selector does not expose runtime
  commands/events, chart-engine writes, replay cursor mutation, or viewport
  mutation.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 329 - Replay Coordination Materialization Owner Contract

Completed in this replay coordination materialization owner contract commit
series.

Verification:

- `node v6/tests/replay-coordination-materialization-owner-contract-step329-smoke.js`
- `node v6/tests/replay-coordination-materialization-owner-contract-boundary-step329-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-closeout-step328-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a replay-owned materialization owner contract module.
- Defined read/write/forbidden responsibilities for replay runtime, bar-data
  runtime, chart-data runtime, chart-history, display-timeframe runtime, and
  chart-viewport runtime.
- Added a pure target-bar reveal policy that uses source `1m` replay cursor
  state to distinguish hidden, cursor-capped in-progress, and complete target
  bars.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 328 - Replay Coordination Materialization Transition Slice Selection

Completed in this replay coordination materialization transition selection
commit series.

Verification:

- `node v6/tests/replay-coordination-materialization-transition-selection-step328-smoke.js`
- `node v6/tests/replay-coordination-materialization-transition-boundary-step328-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-closeout-step327-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a replay-owned pure materialization transition selector.
- Selected `replay-coordination-materialization-owner-contract` as the first
  bounded transition slice after Step 327 reported `materialization-ready`.
- Added static boundary coverage tying the selection to Step 327, the Step 278
  phase plan, and V6 runtime ownership boundaries.
- No replay cursor movement, no-bar gap skipping, bar-data requests,
  chart-data projection, chart-history runtime loading, target-history request
  sizing, chart viewport intent, chart-engine, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 327 - High-Timeframe Target-History Fast Path Responsiveness Re-measurement

Completed in this target-history fast path remeasurement commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-browser-step327-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-programmatic-leftward-fast-path-closeout-step326-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-fast-path-remeasurement-closeout-step327-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure fast-path responsiveness remeasurement decision helper.
- Added browser coverage over `8h`, `1D`, and `1W` target-history records after
  the programmatic leftward request fast path.
- The current result is `materialization-ready` and selects
  `replay-coordination-materialization-transition`.
- No chart-history runtime loading, target-history request sizing, chart
  viewport intent, chart-engine, replay, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 326 - High-Timeframe Target-History Programmatic Leftward Request Fast Path

Completed in this target-history programmatic fast path commit series.

Verification:

- `node v6/tests/leftward-history-request-schedule-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-fast-path-step326-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-programmatic-leftward-fast-path-closeout-step326-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure leftward-history request schedule resolver.
- Wired a one-shot programmatic target-history fast path into
  `leftward-history-input-bridge`.
- Preserved native visible-range drag/wheel `requestDelayMs` scheduling.
- Added a per-pane fast-path gate to prevent duplicate immediate requests until
  `LEFT_EXTENSION_LOADED`.
- No chart-history runtime loading, target-history request sizing, chart
  viewport intent, chart-engine, replay, shell, journal, order-ticket,
  prop-firm, indicator, or seconds behavior changed.

### Step 325 - High-Timeframe Target-History Leftward Request Scheduling Plan

Completed in this target-history leftward request scheduling plan commit
series.

Verification:

- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-plan-step325-smoke.js`
- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-boundary-step325-static-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-leftward-request-scheduling-closeout-step325-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure leftward request scheduling planner for the Step 324 attribution
  result.
- Added static boundary coverage for the current bridge scheduling behavior.
- Selected `target-history-programmatic-leftward-request-fast-path` as the next
  slice.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 324 - High-Timeframe Target-History Trigger Coordination Latency Attribution

Completed in this target-history trigger coordination attribution commit
series.

Verification:

- `node v6/tests/high-timeframe-target-history-trigger-coordination-attribution-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-browser-step324-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-trigger-coordination-closeout-step324-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure trigger coordination attribution helper for corrected
  target-history visual-latency records.
- Added browser integration recording display apply, target fetch, chart data,
  viewport projection, and left-extension event milestones.
- The browser smoke classifies the current remaining window as
  `target-history-leftward-request-scheduling-plan`, owned by
  `chart-history.leftward-history-input-bridge`.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 323 - High-Timeframe Target-History Browser Rendering Visibility Attribution

Completed in this target-history browser rendering attribution commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-browser-step323-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-rendering-attribution-closeout-step323-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure browser rendering/visibility attribution helper for corrected
  target-history visual-latency records.
- Added browser integration recording `requestAnimationFrame` and diagnostics
  readout visibility milestones after target-history left extension.
- The browser smoke classifies the current remaining window as
  `target-history-trigger-coordination-latency-attribution`, not browser
  rendering or chart-engine paint.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 322 - High-Timeframe Target-History Visual-Latency Phase Attribution Stabilization

Completed in this target-history visual-latency attribution commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-browser-step322-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-step321-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-visual-latency-attribution-closeout-step322-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure stabilizer for corrected target-history visual-latency
  attribution.
- Added browser integration proving corrected records stabilize to
  `target-history-browser-rendering-visibility-attribution`.
- Sub-frame chart-data/viewport timing no longer drives runtime optimization
  selection.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 321 - High-Timeframe Target-History Apply-Lag Measurement Boundary Correction

Completed in this target-history apply-lag measurement boundary correction
commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-step321-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-measurement-boundary-closeout-step321-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added an event-driven browser report for corrected target-history apply-lag
  measurement.
- The corrected `applyLagP95Ms` is below the default budget and no longer
  selects browser-visible apply-lag optimization.
- The remaining finding is corrected visual latency; current phase attribution
  can land on chart-data replacement or viewport reapply due sub-frame timing
  noise.
- The next slice is visual-latency phase attribution stabilization.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 320 - High-Timeframe Target-History Browser-Visible Apply-Lag Boundary Browser Assertion

Completed in this target-history apply-lag boundary browser assertion commit
series.

Verification:

- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-step320-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-boundary-browser-closeout-step320-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a focused browser smoke for target-history apply-lag milestones.
- The smoke records chart-data applied, viewport projected, left-extension
  loaded, and diagnostics readout visible milestones.
- The readout is visible by the `LEFT_EXTENSION_LOADED` listener observation,
  so the current high apply-lag result is a measurement-boundary issue.
- The next slice is apply-lag measurement boundary correction.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 319 - High-Timeframe Target-History Browser-Visible Apply-Lag Optimization Plan

Completed in this target-history apply-lag optimization plan commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-step319-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-apply-lag-optimization-plan-closeout-step319-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure apply-lag optimization planner for the Step 318 selected path.
- The current evidence maps the apply-lag boundary to
  `shell.pane-status-readout` / `chart-surface-readout-observation`.
- The next slice is a focused browser milestone assertion that separates
  chart-data applied, viewport projected, left-extension loaded, and diagnostics
  readout-visible timings.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 318 - High-Timeframe Target-History Selected Path Slice Selection

Completed in this target-history selected path slice selection commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-step318-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-selected-path-slice-selection-closeout-step318-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a pure selected-path planner for Step 315/317 selector outputs.
- The current real-budget browser sample selected
  `target-history-browser-visible-apply-lag-optimization`.
- The next implementation-planning slice is
  `target-history-browser-visible-apply-lag-optimization-plan`.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 317 - High-Timeframe Target-History Real-Budget Browser Phase Report

Completed in this target-history real-budget browser report commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-step317-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js`
- `node v6/tests/high-timeframe-target-history-real-budget-browser-phase-report-closeout-step317-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a real-budget browser phase report for `8h`, `1D`, and `1W`
  target-history records.
- The browser smoke feeds records into
  `selectHighTimeframeTargetHistoryPhaseBudget` with default phase and
  responsiveness budgets.
- The report accepts the concrete selector path: phase optimization,
  materialization transition, or measurement completion.
- The next slice is selected-path implementation planning.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 316 - High-Timeframe Target-History Browser Phase Budget Selection

Completed in this target-history browser phase budget selection commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-step316-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-budget-selection-closeout-step316-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added browser integration for `selectHighTimeframeTargetHistoryPhaseBudget`.
- The browser smoke feeds real phase-timed `8h`, `1D`, and `1W`
  target-history records into the selector.
- The smoke uses wide budgets to verify selector integration without creating a
  machine-dependent performance gate.
- The next slice is a real-budget browser phase report using default budgets.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 315 - High-Timeframe Target-History Phase Budget Selection

Completed in this target-history phase budget selection commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-phase-budget-selection-step315-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-phase-budget-selection-closeout-step315-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `selectHighTimeframeTargetHistoryPhaseBudget`, a pure selector over
  Step 314 records and Step 313 probe output.
- The selector routes to fetch, chart-data replacement, viewport reapply,
  browser-visible apply-lag optimization, materialization transition, or
  measurement completion.
- The next slice is browser selector integration so real Step 314 records can
  decide the next implementation path.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 314 - High-Timeframe Target-History Browser Phase Timing Probe

Completed in this target-history browser phase timing commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-browser-phase-timing-step314-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-browser-phase-timing-closeout-step314-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a browser phase-timing smoke for `8h`, `1D`, and `1W`
  target-history records.
- Records now include observed `fetchMs`, `chartDataReplacementMs`,
  `viewportReapplyMs`, `applyLagMs`, and `visualLatencyMs`.
- Extended records feed the Step 313 runtime optimization probe.
- The browser smoke uses wide timing thresholds to verify record shape and
  probe compatibility without creating a machine-dependent performance gate.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 313 - High-Timeframe Target-History Bounded Runtime Optimization Probe

Completed in this target-history runtime optimization probe commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-step313-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/high-timeframe-target-history-runtime-optimization-probe-closeout-step313-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `createHighTimeframeTargetHistoryRuntimeOptimizationProbe`, a pure
  probe over Step 312 budget reports and Step 311-style records.
- The probe routes exceeded budgets to `fetch`, `chart-data-replacement`,
  `viewport-reapply`, or `browser-visible-apply-lag` when phase data is
  available or inferable.
- The probe explicitly reports materialization readiness when budgets pass and
  routes incomplete samples back to the responsiveness harness.
- The next slice is browser phase timing because the current real browser
  records do not yet split fetch, chart-data replacement, and viewport reapply
  timings.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 312 - High-Timeframe Target-History Responsiveness Budget Decision

Completed in this target-history responsiveness budget decision commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-step312-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-browser-closeout-step311-static-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-budget-decision-closeout-step312-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `createHighTimeframeTargetHistoryResponsivenessBudgetReport`, a pure
  report helper for Step 311 records and Step 310 audit budgets.
- The report distinguishes `measurement-incomplete`,
  `optimize-before-materialization`, and `materialization-transition-ready`.
- Budget findings identify exceeded `fallbackRate`, `durationP95Ms`,
  `visualLatencyP95Ms`, and `applyLagP95Ms` budgets.
- The next implementation slice is bounded runtime optimization probe/report
  before replay/materialization transition.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 311 - High-Timeframe Target-History Responsiveness Browser Harness

Completed in this target-history responsiveness browser harness commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-responsiveness-browser-step311-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-browser-closeout-step311-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a focused browser-visible responsiveness harness for `8h`, `1D`, and
  `1W` target-history samples.
- Each sample records browser visibility, extension duration, visual latency,
  apply lag, path, fallback reason, request counts, prepended bars, and matching
  target fetch metadata.
- The harness feeds its records into the Step 310 pure audit model with wide
  test thresholds so the smoke validates measurement shape without creating a
  machine-dependent performance gate.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 310 - High-Timeframe Target-History Responsiveness Audit

Completed in this target-history responsiveness audit commit series.

Verification:

- `node v6/tests/high-timeframe-target-history-responsiveness-audit-step310-smoke.js`
- `node v6/tests/target-history-phase-d-reaudit-step308-smoke.js`
- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/high-timeframe-target-history-responsiveness-audit-closeout-step310-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `auditHighTimeframeTargetHistoryResponsiveness`, a pure decision model
  for target-history responsiveness records.
- The audit distinguishes missing browser measurements, high fallback rate,
  exceeded duration/visible/apply budgets, and materialization readiness.
- The current selection is `responsiveness-harness` because V6 has complete
  target-history path coverage and pack cost controls, but not a dedicated
  high-timeframe browser-visible responsiveness harness.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 309 - Target-History Browser Pack Runtime Cost Control

Completed in this target-history browser pack cost-control commit series.

Verification:

- `node v6/tests/target-history-pack-cost-control-step309-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `TARGET_HISTORY_PACK_MEMBERS=monthly-fallback node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-browser-pack-cost-control-closeout-step309-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a test-only target-history pack cost-control helper with `all`,
  `fallback`, `fixed`, `session-aware`, and `sizing` groups.
- Added comma-separated member selection through
  `TARGET_HISTORY_PACK_MEMBERS`, which overrides `TARGET_HISTORY_PACK_GROUP`.
- The Step 293 browser pack now logs its selected plan and still defaults to
  the full eight-member target-history browser pack.
- A targeted `monthly-fallback` pack run and the full eight-member pack both
  pass.
- No runtime target-history, chart-history, chart-engine, replay, shell,
  journal, order-ticket, prop-firm, indicator, or seconds behavior changed.

### Step 308 - Target-History Phase D Re-audit And Next Slice Selection

Completed in this target-history Phase D re-audit commit series.

Verification:

- `node v6/tests/target-history-phase-d-reaudit-step308-smoke.js`
- `node v6/tests/target-history-phase-d-selection-step300-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-phase-d-reaudit-closeout-step308-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `auditTargetHistoryPhaseDCoverage` and
  `selectTargetHistoryPhaseDPostCoverageSlice`.
- The audit confirms eight expected target-history browser paths are covered:
  fixed success/fallback, daily success/fallback, weekly success/fallback, and
  monthly success/fallback.
- The selector chooses `target-history-browser-pack-cost-control` as the next
  bounded slice.
- High-timeframe responsiveness and replay/materialization transition remain
  candidates after the browser pack cost is controlled.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 307 - Monthly Target-History Fallback Browser Coverage

Completed in this monthly target-history fallback browser commit series.

Verification:

- `node v6/tests/monthly-target-history-fallback-browser-step307-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/monthly-target-history-fallback-browser-closeout-step307-static-smoke.js`
- `git diff --check`

Notes:

- Added `v6/tests/monthly-target-history-fallback-browser-step307-smoke.js`.
- The smoke drives a real browser `1M` target-history path with empty target
  bars.
- It asserts fallback to `target-history-fallback-source-window` and
  `target-history-empty` diagnostics/readout state.
- It keeps monthly sizing assertions at `1` display bar and `40000` source
  minutes.
- Added the monthly fallback smoke to the Step 293 target-history browser
  regression pack.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 306 - Monthly Target-History Request Sizing Browser Assertion

Completed in this monthly target-history request sizing browser commit series.

Verification:

- `node v6/tests/monthly-target-history-request-sizing-browser-step306-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/monthly-target-history-request-sizing-browser-closeout-step306-static-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/monthly-target-history-request-sizing-browser-step306-smoke.js`.
- The smoke drives a real browser `1M` target-history leftward path.
- It asserts `/v4/target_bars` is requested with `tf=1M`.
- It asserts monthly sizing is `session-aware-policy-sized`, target display
  bars are `1`, and monthly policy prefetches `40000` source minutes.
- It confirms switching back to `1m` preserves source bars.
- Added the monthly sizing smoke to the Step 293 target-history browser
  regression pack.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 305 - Monthly Target-History Request Sizing Selection

Completed in this monthly target-history request sizing selection commit series.

Verification:

- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/weekly-target-history-fallback-browser-closeout-step304-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/monthly-target-history-request-sizing-selection-closeout-step305-static-smoke.js`
- `git diff --check`

Notes:

- Added `selectMonthlyTargetHistorySizingSlice` to
  `v6/src/chart-history/target-history-request-sizing.js`.
- The selector chooses `1M` after weekly target-history success/fallback are
  packed.
- The sizing smoke now asserts monthly session-aware policy values:
  `targetDisplayBars=1` and `prefetchSourceBars=40000`.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 304 - Weekly Target-History Fallback Browser Coverage

Completed in this weekly target-history fallback browser commit series.

Verification:

- `node v6/tests/weekly-target-history-fallback-browser-step304-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-fallback-browser-closeout-step304-static-smoke.js`
- `git diff --check`

Notes:

- Added `v6/tests/weekly-target-history-fallback-browser-step304-smoke.js`.
- The smoke drives a real browser `1W` target-history path with empty target
  bars.
- It asserts fallback to `target-history-fallback-source-window` and
  `target-history-empty` diagnostics/readout state.
- It keeps weekly sizing assertions at `4` display bars and `40000` source
  minutes.
- Added the weekly fallback smoke to the Step 293 target-history browser
  regression pack.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 303 - Weekly Target-History Request Sizing Browser Assertion

Completed in this weekly target-history request sizing browser commit series.

Verification:

- `node v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-request-sizing-browser-closeout-step303-static-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/weekly-target-history-request-sizing-browser-step303-smoke.js`.
- The smoke drives a real browser `1W` target-history leftward path.
- It asserts `/v4/target_bars` is requested with `tf=1W`.
- It asserts weekly sizing is `session-aware-policy-sized`, target display
  bars are `4`, and weekly policy prefetches `40000` source minutes.
- It confirms switching back to `1m` preserves source bars.
- Added the weekly sizing smoke to the Step 293 target-history browser
  regression pack.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 302 - Weekly Target-History Request Sizing Selection

Completed in this weekly target-history request sizing selection commit series.

Verification:

- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-session-aware-sizing-selection-step297-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/weekly-target-history-request-sizing-selection-closeout-step302-static-smoke.js`
- `git diff --check`

Notes:

- Added `selectWeeklyTargetHistorySizingSlice` to
  `v6/src/chart-history/target-history-request-sizing.js`.
- The selector chooses `1W` after daily target-history success/fallback are
  packed.
- The sizing smoke now asserts weekly session-aware policy values:
  `targetDisplayBars=4` and `prefetchSourceBars=40000`.
- `1M` remains deferred.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 301 - Daily Target-History Fallback Browser Coverage

Completed in this daily target-history fallback browser commit series.

Verification:

- `node v6/tests/daily-target-history-fallback-browser-step301-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/daily-target-history-fallback-closeout-step301-static-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/daily-target-history-fallback-browser-step301-smoke.js`.
- The smoke drives a real browser `1D` target-history path with empty target
  bars.
- It asserts fallback to `target-history-fallback-source-window` and
  `target-history-empty` diagnostics/readout state.
- It keeps session-aware sizing assertions at `12` display bars and `17280`
  source minutes.
- Added the daily fallback smoke to the Step 293 target-history browser
  regression pack.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 300 - Target-History Phase D Next Slice Selection

Completed in this target-history Phase D selection commit series.

Verification:

- `node v6/tests/target-history-phase-d-selection-step300-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/chart-history/target-history-phase-d-selection.js`.
- The selector chooses `daily-fallback-browser-coverage` when daily success is
  packed and fixed success/fallback are packed.
- `1W` request-sizing and display-history responsiveness remain next
  candidates after daily fallback is covered.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 299 - Daily Target-History Sizing Pack Selection

Completed in this daily target-history sizing pack commit series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js` to
  `v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`.
- Static membership coverage now requires the daily sizing smoke.
- The pack now covers fixed target-history success, target-history fallback,
  and daily target-history request sizing.
- No runtime behavior changed.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 298 - Daily Target-History Request Sizing Browser Assertion

Completed in this daily target-history request sizing browser commit series.

Verification:

- `node v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/daily-target-history-request-sizing-browser-step298-smoke.js`.
- The smoke drives a real browser `1D` target-history leftward path.
- It asserts `/v4/target_bars` is requested with `tf=1D`.
- It asserts request sizing is `session-aware-policy-sized`, target display
  bars are `12`, and daily policy prefetches `17280` source minutes.
- It confirms switching back to `1m` preserves source bars.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 297 - Target-History Session-Aware Sizing Selection

Completed in this target-history session-aware sizing selection commit series.

Verification:

- `node v6/tests/target-history-session-aware-sizing-selection-step297-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `git diff --check`

Notes:

- Added `selectSessionAwareTargetHistorySizingSlice` to
  `v6/src/chart-history/target-history-request-sizing.js`.
- The selector chooses `1D` when backend target history and display capability
  both support it.
- `1W` and `1M` remain deferred until daily target-history sizing is browser
  covered.
- No runtime sizing change was made.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 296 - Target-History Request Sizing Browser Diagnostics

Completed in this target-history request sizing browser diagnostics commit
series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

Notes:

- The Step291 browser smoke now imports
  `v6/src/chart-history/target-history-request-sizing.js` in the page.
- The real `8h` target-history path asserts `adequate` sizing, 20 estimated
  target bars, 20 policy target display bars, and zero difference.
- The smoke also asserts target response size and `targetHistory.barCount`
  match the sizing audit.
- No runtime sizing change was made.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 295 - Target-History Request Sizing

Completed in this target-history request sizing audit commit series.

Verification:

- `node v6/tests/target-history-request-sizing-step295-smoke.js`
- `node v6/tests/leftward-source-window-policy-step277-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/chart-history/target-history-request-sizing.js`.
- The audit helper compares estimated fixed-duration target bars against the
  policy target display bars.
- Current fixed high-timeframe source-window policy already sizes normal
  target-history windows to 20 display bars for `4h`, `8h`, and `12h`.
- Session-aware target-history requests are marked policy-sized because exact
  target bucket count depends on calendar/session semantics.
- No runtime sizing change was made.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 294 - Target-History Optimization Re-selection

Completed in this target-history optimization re-selection commit series.

Verification:

- `node v6/tests/target-history-optimization-reselection-step294-smoke.js`
- `node v6/tests/target-history-optimization-decision-step289-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `git diff --check`

Notes:

- Added `reselectTargetHistoryOptimization` to
  `v6/src/chart-history/target-history-optimization-decision.js`.
- The original Step 289 decision helper remains unchanged for existing callers.
- When diagnostics readout is already complete and baseline diagnostics are
  healthy, the re-selection chooses `tune-target-request-sizing`.
- High fallback rate still selects `harden-fallback`; slow target-history still
  selects `tune-activation-policy`.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 293 - Target-History Diagnostics Readout Regression Pack

Completed in this target-history diagnostics readout pack commit series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js`.
- Added static membership coverage in
  `v6/tests/target-history-diagnostics-readout-regression-pack-step293-static-smoke.js`.
- The pack runs the Step291 success browser smoke and Step292 fallback browser
  smoke sequentially.
- The pack is test orchestration only and does not change chart-history,
  bar-data, chart-data, replay, chart-engine, viewport, journal, order-ticket,
  prop-firm, indicator, or seconds behavior.

### Step 292 - Target-History Diagnostics Readout Fallback Browser Regression

Completed in this target-history diagnostics fallback readout browser commit
series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `git diff --check`

Notes:

- Added
  `v6/tests/target-history-diagnostics-readout-fallback-browser-step292-smoke.js`.
- The smoke drives real browser activation of the `8h` target-history path and
  forces target bars to return empty.
- It asserts the pane-local diagnostics readout reports `path=fallback`,
  `target-history-empty`, target/source request counts, and prepended bars.
- It confirms fallback source-window loading extends source bars.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 291 - Target-History Diagnostics Readout Browser Regression

Completed in this target-history diagnostics readout browser commit series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`
- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `git diff --check`

Notes:

- Added `v6/tests/target-history-diagnostics-readout-browser-step291-smoke.js`.
- The smoke drives real browser activation of the `8h` target-history path.
- It asserts the pane-local diagnostics readout dataset/text/title after the
  chart-history event reaches shell code.
- It preserves source bars for high-TF-to-`1m` round trips.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 290 - Target-History Diagnostics Readout

Completed in this target-history diagnostics readout commit series.

Verification:

- `node v6/tests/target-history-diagnostics-readout-model-step290-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/shell/target-history-diagnostics-readout-model.js`.
- Pane status readouts now render compact leftward extension diagnostics from
  `chartHistory:leftExtensionLoaded` events.
- The readout exposes path, duration, target/source request counts, fallback
  reason, and prepended bar count.
- Shell readout code does not call target APIs or bar-data commands.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 289 - Target-History Optimization Decision

Completed in this target-history optimization decision commit series.

Verification:

- `node v6/tests/target-history-optimization-decision-step289-smoke.js`
- `node v6/tests/target-history-observability-closeout-step288-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/chart-history/target-history-optimization-decision.js`.
- The helper selects among diagnostics readout, activation policy tuning, and
  fallback hardening based on measured diagnostics.
- Current representative diagnostics select `add-diagnostic-readout`.
- Step 290 should add a small chart-history diagnostics readout.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 288 - Activated Target-History Performance Observability

Completed in this target-history observability commit series.

Verification:

- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Leftward-history loaded extensions now expose diagnostics with duration,
  path, target/source request counts, target/source load timings, fallback
  reason, target bar count, and prepended bar count.
- Target-history success, target-history fallback, and default source-window
  paths are all covered.
- The activated target-history browser smoke now asserts diagnostics on the
  real browser integration path.
- No UI surface was added.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 287 - Activated Target-History Browser Integration

Completed in this activated target-history browser commit series.

Verification:

- `node v6/tests/activated-target-history-browser-step287-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-input-target-activation-step286-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/tests/activated-target-history-browser-step287-smoke.js`.
- The smoke runs the real V6 browser page and mocks only `/v4/bars` and
  `/v4/target_bars` fetch responses.
- The smoke proves high-TF display application can trigger the real
  chart-history input bridge and target-history path.
- The loaded extension reports `runtime.bar-data` and target timeframe `8h`.
- Switching back to `1m` preserves source bar counts.
- Existing low-TF browser auto-chain remains source-window projection.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 286 - High-Timeframe Target-History Activation Policy

Completed in this target-history activation commit series.

Verification:

- `node v6/tests/leftward-target-history-activation-step286-smoke.js`
- `node v6/tests/leftward-history-input-target-activation-step286-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added high-timeframe activation policy for chart-history leftward requests.
- `1h` and above fixed timeframes activate target history; `1D`/`1W`/`1M`
  activate as session-aware target timeframes.
- Low TF and disabled activation remain source-window projection.
- Bridge activation reads pane display timeframe via `PANE_COMMANDS.GET_BY_ID`
  and emits only `CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION` payloads.
- Runtime fallback diagnostics now expose target-history failure reason on
  source fallback states.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 285 - Chart-History Target-Timeframe Leftward Opt-In

Completed in this chart-history target leftward commit series.

Verification:

- `node v6/tests/leftward-history-target-opt-in-step285-smoke.js`
- `node v6/tests/leftward-history-target-fallback-step285-smoke.js`
- `node v6/tests/leftward-history-target-default-step285-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- `CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION` now accepts optional
  `targetHistory.enabled`.
- Explicit target-history opt-in loads target bars through
  `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`.
- Successful target-history prepends use `preserveSource: true`, so target bars
  do not pollute source bars.
- Default chart-history leftward extension still uses source-window projection.
- Target-history failures fall back to source-window projection.
- Source fallback projection now uses the resolved display timeframe even when
  no pane runtime is registered.
- Replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 284 - Controlled Display-Timeframe Target-History Opt-In

Completed in this display target-history runtime commit series.

Verification:

- `node v6/tests/display-target-history-opt-in-step284-smoke.js`
- `node v6/tests/display-target-history-fallback-step284-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/display-target-history-plan-step283-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- `DISPLAY_TIMEFRAME_COMMANDS.APPLY` now accepts an optional `targetHistory`
  payload.
- Explicit opt-in loads target bars through `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW`.
- Display-timeframe runtime still does not import target adapters, call target
  APIs, call `fetch`, or mutate chart series.
- Default display-timeframe switching still uses source projection.
- Target-history disabled, empty, or failed loads fall back to projection.
- Source bars remain preserved for high-TF-to-`1m` round trips.
- Replay cursor movement, no-bar gap skipping, chart-history leftward
  extension, chart viewport intent, chart-engine behavior, journal,
  order-ticket, prop-firm, indicator, and seconds behavior remain unchanged.

### Step 283 - Display-Timeframe Historical Path Preparation

Completed in this display target-history preparation commit series.

Verification:

- `node v6/tests/display-target-history-plan-step283-smoke.js`
- `node v6/tests/display-target-history-boundary-step283-static-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/display-timeframe/display-timeframe-target-history-plan.js`.
- Added a disabled-by-default target-history opt-in planner.
- The planner emits `BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW` payloads only when
  explicitly enabled.
- Added static coverage proving display-timeframe and chart-history runtimes do
  not directly call the target bars API and do not use target bar-data commands
  by default.
- Existing display-timeframe runtime source projection, source-bar
  preservation, high-TF-to-`1m` round trips, chart-history leftward extension,
  replay cursor movement, no-bar gap skipping, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, and
  seconds behavior remain unchanged.

### Step 282 - Bar-Data Runtime Target-Timeframe Support

Completed in this target bar-data runtime commit series.

Verification:

- `node v6/tests/target-bar-window-cache-step282-smoke.js`
- `node v6/tests/bar-data-target-runtime-step282-smoke.js`
- `node v6/tests/v4-target-bars-adapter-step281-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/bar-data/target-bar-window.js`.
- Added `v6/src/bar-data/target-bar-window-cache.js`.
- Added explicit bar-data target commands/events for planning, loading,
  getting, releasing, and summarizing target-TF windows.
- Wired `createBarDataRuntime` to use the Step 281 target bars adapter only for
  explicit target-window commands.
- Existing source `LOAD_WINDOW` behavior, source cache behavior,
  chart-history, display-timeframe, replay cursor movement, no-bar gap
  skipping, chart viewport intent, chart-engine behavior, journal,
  order-ticket, prop-firm, indicator, and seconds behavior remain unchanged.

### Step 281 - Target-Timeframe Server Aggregation Boundary

Completed in this backend aggregation boundary commit series.

Verification:

- `python3 v4/tests/target-bars-service-step281-smoke.py`
- `python3 v4/tests/target-bars-api-boundary-step281-smoke.py`
- `node v6/tests/v4-target-bars-adapter-step281-smoke.js`
- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `python3 v4/tests/bars-service-boundary-smoke.py`
- `python3 v4/tests/backend-handler-boundary-smoke.py`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v4/server/target_bars_service.py`.
- Added backend-only `GET /v4/target_bars`.
- Added on-demand target-TF aggregation and in-process cache.
- Added `8h` and `1D` smoke coverage proving the endpoint returns target bars,
  not the underlying source `1m` bars.
- Added `v6/src/bar-data/v4-target-bars-adapter.js` as a future adapter
  contract.
- Existing `GET /v4/bars`, V6 bar-data runtime, display-timeframe,
  chart-history, replay cursor movement, no-bar gap skipping, chart viewport
  intent, chart-engine behavior, journal, order-ticket, prop-firm, indicator,
  and seconds behavior remain unchanged.

### Step 280 - Target-Timeframe Data Contract And Schema Discovery

Completed in this target-timeframe contract and schema-discovery commit series.

Verification:

- `node v6/tests/target-timeframe-domain-step280-smoke.js`
- `node v6/tests/target-timeframe-schema-discovery-step280-static-smoke.js`
- `node v6/tests/session-aware-display-timeframe-domain-step271-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/src/time-domain/target-timeframe-domain.js`.
- Added canonical target timeframe ids for
  `1/2/3/4/5/10/15/30m`, `1/2/4/8/12h`, `1D`, `1W`, and `1M`.
- Target timeframe ids distinguish lowercase `m` minutes from uppercase `M`
  month.
- Added fixed-duration versus session-aware classification.
- Added `v6/docs/V6_TARGET_TIMEFRAME_SCHEMA_DISCOVERY_STEP280.md`.
- Discovery confirmed current V4 `/v4/bars` accepts integer-minute `tf`, reads
  DuckDB `futures_1m`, has existing fixed-minute aggregation, and has a special
  `tf == 1440` futures daily path.
- Selected one future `target_bars` table keyed by
  `(instrument, timeframe, ts)` as the initial storage direction unless later
  implementation evidence requires per-timeframe tables.
- Did not change runtime behavior, database schema, API behavior,
  display-timeframe projection, replay cursor movement, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, or
  seconds behavior.

### Step 279 - Chart Foundation Next Slice Selection

Completed in this selection commit series.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step279-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP279.md`.
- Selected Step 280 as Target-Timeframe Data Contract And Schema Discovery.
- The selected slice follows Phase A from
  `v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md`.
- Runtime, API, database, display-timeframe projection, replay cursor movement,
  chart viewport intent, chart-engine behavior, chart-data behavior, journal,
  order-ticket, prop-firm, indicator, and seconds behavior remain unchanged.

### Step 278 - Target Timeframe Data Phase Plan

Completed in this architecture planning commit series.

Verification:

- `node v6/tests/target-timeframe-data-phase-plan-step278-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md`.
- Added a phase-level plan for target timeframe data infrastructure.
- The target architecture separates high-timeframe display/history data from
  source `1m` replay precision data.
- The plan breaks work into data contract/schema discovery, data-layer
  aggregation, bar-data target-TF support, display-timeframe historical routing,
  replay coordination, and optional materialization/maintenance.
- Updated `v6/docs/V6_EXECUTION_ROADMAP.md` with Phase 6 - Target Timeframe
  Data Infrastructure and moved Settings/Polish to Phase 7.
- Did not change runtime behavior, database schema, API behavior,
  display-timeframe projection, replay cursor movement, chart viewport intent,
  chart-engine behavior, journal, order-ticket, prop-firm, indicator, or
  seconds behavior.

### Step 277 - HTF Leftward Source Window Policy

Completed in this high-timeframe leftward-history source-window commit series.

Verification:

- `node v6/tests/leftward-source-window-policy-step277-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/session-aware-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_HTF_LEFTWARD_SOURCE_WINDOW_POLICY_STEP277.md`.
- Added a chart-history-owned source-window policy for leftward extension.
- Kept low-minute timeframes lightweight while scaling `1h` through `12h`
  source windows by target display candles.
- Expanded session-aware `1D` leftward requests to fetch roughly 12 daily
  display candles worth of source bars, with hard caps preserved for weekly and
  monthly requests.
- Raised the app bar-data runtime cap to the policy hard limit so chart-history
  plans are not rejected at the bar-data boundary.
- Did not change replay cursor movement, no-bar gap skipping, auto-play
  scheduling, chart viewport intent, chart-engine behavior, journal, order
  ticket, prop-firm, indicator, or seconds behavior.

### Step 276 - Timeframe/Replay Foundation Regression Runner

Completed in this browser regression-pack commit series.

Verification:

- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-static-smoke.js`
- `node v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_TIMEFRAME_REPLAY_FOUNDATION_REGRESSION_PACK_STEP276.md`.
- Added `v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js`
  as a compact browser pack for display timeframe switching, menu parity,
  display-timeframe leftward history, daily/weekly/monthly projection, and
  replay-gap coverage.
- Added static coverage that guards runner membership and requires the Step 274
  replay-gap browser pack to remain a single reused member rather than copied
  into Step 276.
- Did not change display-timeframe, chart-data projection, chart-history,
  replay, bar-data, chart-engine, viewport, pane, journal, order-ticket,
  prop-firm, indicator, or seconds behavior.

### Step 275 - Chart Foundation Next Slice Selection

Completed in this selection commit series.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step275-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP275.md`.
- Selected Step 276 as Timeframe/Replay Foundation Regression Runner.
- The selected runner should include existing browser gates for display
  timeframe switching, interval-menu parity, display-timeframe leftward history,
  daily/weekly/monthly projection, and the Step 274 replay-gap browser pack.
- Explicitly avoided adding more replay-gap variants, new timeframes, seconds,
  indicators, trading, prop-firm, journal, chart-engine, viewport, or runtime
  behavior in Step 275.

### Step 274 - Replay Gap Browser Regression Runner

Completed in this browser regression-runner commit series.

Verification:

- `node v6/tests/replay-gap-browser-regression-pack-step274-static-smoke.js`
- `node v6/tests/replay-gap-browser-regression-pack-step274-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_REPLAY_GAP_BROWSER_REGRESSION_RUNNER_STEP274.md`.
- Added `v6/tests/replay-gap-browser-regression-pack-step274-smoke.js` as the
  single browser command for replay no-bar gap coverage.
- The runner executes:
  `manual-next-session-gap-browser-step258-smoke.js`,
  `auto-play-session-gap-browser-step263-smoke.js`,
  `htf-manual-next-replay-gap-browser-step273-smoke.js`, and
  `htf-auto-play-replay-gap-browser-step273-smoke.js`.
- The runner prints start/pass/fail lines, stops at the first failure, and exits
  with the failing child process code.
- Did not change replay, chart-data projection, chart-engine, viewport, pane,
  journal, order-ticket, prop-firm, indicator, or seconds behavior.

### Step 273 - HTF Browser Replay Gap Pack

Completed in this browser regression-pack commit series.

Verification:

- `node v6/tests/htf-browser-replay-gap-pack-step273-static-smoke.js`
- `node v6/tests/htf-manual-next-replay-gap-browser-step273-smoke.js`
- `node v6/tests/htf-auto-play-replay-gap-browser-step273-smoke.js`
- `node v6/tests/htf-replay-gap-regression-pack-step272-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_HTF_BROWSER_REPLAY_GAP_PACK_STEP273.md`.
- Added a shared HTF browser replay-gap fixture for `1D`, `1W`, and `1M`.
- Added manual-next browser coverage proving the cursor/readout continues from
  `18:00` to `18:01` after the `16:59 -> 18:00` no-bar gap.
- Added auto-play browser coverage proving the same gap behavior for HTF
  display projection.
- Asserted HTF projection bucket metadata includes the final post-gap source
  bar.
- Did not change replay, chart-data projection, chart-engine, viewport,
  journal, order-ticket, prop-firm, indicator, or seconds behavior.

### Step 272 - HTF Replay Gap Regression Pack

Completed in this regression-pack commit series.

Verification:

- `node v6/tests/htf-replay-gap-regression-pack-step272-static-smoke.js`
- `node v6/tests/htf-replay-gap-regression-pack-step272-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/auto-play-session-gap-step263-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/daily-projection-domain-step268-smoke.js`
- `node v6/tests/weekly-projection-domain-step269-smoke.js`
- `node v6/tests/monthly-projection-domain-step270-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/session-aware-htf-consolidation-step271-static-smoke.js`
- `node v6/tests/session-aware-display-timeframe-domain-step271-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_HTF_REPLAY_GAP_REGRESSION_PACK_STEP272.md`.
- Added a runtime regression pack covering `1D`, `1W`, and `1M` manual-next and
  auto-play advancement across `16:59 -> 18:00`.
- Fixed chart-entry manual-next to accept session-aware HTF display values,
  pass pane instrument context into chart-data projection, and keep source-bar
  replay cursor advancement intact.
- Kept seconds hidden and did not change journal, order-ticket, prop-firm,
  indicator, chart-engine, viewport, or projection ownership.

### Step 271 - Session-Aware HTF Projection Consolidation

Completed in this consolidation commit series.

Verification:

- `node v6/tests/session-aware-htf-consolidation-step271-static-smoke.js`
- `node v6/tests/session-aware-display-timeframe-domain-step271-smoke.js`
- `node v6/tests/daily-projection-browser-step268-smoke.js`
- `node v6/tests/weekly-projection-browser-step269-smoke.js`
- `node v6/tests/monthly-projection-browser-step270-smoke.js`
- `node v6/tests/daily-projection-domain-step268-smoke.js`
- `node v6/tests/weekly-projection-domain-step269-smoke.js`
- `node v6/tests/monthly-projection-domain-step270-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/session-calendar-owner-step267-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added pure `time-domain` helper coverage for session-aware display timeframe
  values.
- Replaced scattered `1D`/`1W`/`1M` normalization in shell, pane, and
  pane-intent reload code with the shared helper.
- Replaced separate chart-data projection target branches with one
  session-aware target-to-bucket resolver mapping.
- Consolidated daily, weekly, and monthly browser projection smoke behavior into
  one shared fixture.
- Did not change seconds, replay ownership, journal, order-ticket, prop-firm,
  indicator, chart-engine, or viewport behavior.

### Step 270 - Monthly Projection Integration

Completed in this monthly projection commit series.

Verification:

- `node v6/tests/monthly-projection-integration-step270-static-smoke.js`
- `node v6/tests/monthly-projection-domain-step270-smoke.js`
- `node v6/tests/monthly-projection-browser-step270-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/daily-projection-integration-step268-static-smoke.js`
- `node v6/tests/daily-projection-domain-step268-smoke.js`
- `node v6/tests/weekly-projection-integration-step269-static-smoke.js`
- `node v6/tests/weekly-projection-domain-step269-smoke.js`
- `node v6/tests/minute-hour-timeframe-projection-step265-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/session-aware-htf-readiness-step266-smoke.js`
- `node v6/tests/session-calendar-owner-step267-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_MONTHLY_PROJECTION_INTEGRATION_STEP270.md`.
- Added monthly projection support to `chart-data-projection` via
  `session-calendar` trading month buckets.
- Enabled `1M` in the display-timeframe capability/menu model.
- Kept seconds hidden.
- Allowed pane/display-timeframe intent plumbing to carry `1M` without treating
  it as a fixed-minute timeframe.
- Did not change seconds, journal, order-ticket, prop-firm, or indicator
  behavior.

### Step 269 - Weekly Projection Integration

Completed in this weekly projection commit series.

Verification:

- `node v6/tests/weekly-projection-integration-step269-static-smoke.js`
- `node v6/tests/weekly-projection-domain-step269-smoke.js`
- `node v6/tests/weekly-projection-browser-step269-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/daily-projection-integration-step268-static-smoke.js`
- `node v6/tests/daily-projection-domain-step268-smoke.js`
- `node v6/tests/minute-hour-timeframe-projection-step265-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/session-aware-htf-readiness-step266-smoke.js`
- `node v6/tests/session-calendar-owner-step267-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_WEEKLY_PROJECTION_INTEGRATION_STEP269.md`.
- Added weekly projection support to `chart-data-projection` via
  `session-calendar` trading week buckets.
- Enabled `1W` in the display-timeframe capability/menu model.
- Kept `1M` planned/disabled and kept seconds hidden.
- Allowed pane/display-timeframe intent plumbing to carry `1W` without treating
  it as `10080m`.
- Did not change monthly projection, seconds, journal, order-ticket, prop-firm,
  or indicator behavior.

### Step 268 - Daily Projection Integration

Completed in this daily projection commit series.

Verification:

- `node v6/tests/daily-projection-integration-step268-static-smoke.js`
- `node v6/tests/daily-projection-domain-step268-smoke.js`
- `node v6/tests/daily-projection-browser-step268-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/minute-hour-timeframe-projection-step265-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_DAILY_PROJECTION_INTEGRATION_STEP268.md`.
- Added daily projection support to `chart-data-projection` via
  `session-calendar` trading day buckets.
- Enabled `1D` in the display-timeframe capability/menu model.
- Kept `1W` and `1M` planned/disabled and kept seconds hidden.
- Allowed pane/display-timeframe intent plumbing to carry `1D` without treating
  it as `1440m`.
- Did not change weekly/monthly projection, seconds, journal, order-ticket,
  prop-firm, or indicator behavior.

### Step 267 - Session Calendar Boundary

Completed in this boundary commit series.

Verification:

- `node v6/tests/session-calendar-boundary-step267-static-smoke.js`
- `node v6/tests/session-calendar-domain-step267-smoke.js`
- `node v6/tests/session-calendar-owner-step267-smoke.js`
- `node v6/tests/session-aware-htf-selection-step266-static-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_SESSION_CALENDAR_BOUNDARY_STEP267.md`.
- Added `v6/src/session-calendar/session-calendar-domain.js`.
- Added pure helpers for trading day keys and day/week/month buckets.
- NQ/ES now share chart-axis UTC `18:00` session roll semantics in the domain
  helper.
- Covered Monday prior Globex open, `17:59 -> 18:00` trading day rollover,
  week/month bucket boundaries, and explicit unsupported-instrument rejection.
- Did not connect session-calendar to chart-data projection or display-timeframe
  runtime.
- Kept `1D`, `1W`, and `1M` planned/disabled.

### Step 266 - Session-Aware Higher Timeframe Selection

Completed in this selection/readiness commit series.

Verification:

- `node v6/tests/session-aware-htf-selection-step266-static-smoke.js`
- `node v6/tests/session-aware-htf-readiness-step266-smoke.js`
- `node v6/tests/minute-hour-timeframe-unlock-step265-static-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_SESSION_AWARE_HTF_SELECTION_STEP266.md`.
- Selected a future `session-calendar` boundary as owner for trading day,
  trading week, and trading month bucket semantics.
- Kept `display-timeframe` as capability/menu owner and `chart-data-projection`
  as OHLC aggregation owner.
- Kept replay source-bar driven.
- Kept `1D`, `1W`, and `1M` planned/disabled and kept seconds hidden.
- Did not change runtime projection behavior, menu enabled status, replay,
  bar-data, journal, order-ticket, prop-firm, or indicator behavior.

### Step 265 - Minute/Hour Timeframe Unlock

Completed in this unlock commit series.

Verification:

- `node v6/tests/minute-hour-timeframe-unlock-step265-static-smoke.js`
- `node v6/tests/minute-hour-timeframe-projection-step265-smoke.js`
- `node v6/tests/minute-hour-timeframe-browser-step265-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/display-timeframe-capability-registry-step264-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_MINUTE_HOUR_TIMEFRAME_UNLOCK_STEP265.md`.
- Added `v6/tests/minute-hour-timeframe-projection-step265-smoke.js`.
- Added `v6/tests/minute-hour-timeframe-browser-step265-smoke.js`.
- Enabled visible minute/hour capability targets that project from 1m source
  data: `2m`, `3m`, `4m`, `10m`, `30m`, `1h`, `2h`, `4h`, `8h`, `12h`.
- Kept seconds hidden and kept `1D`, `1W`, `1M` planned/disabled.
- Did not change replay, bar-data, chart-data ownership, journal,
  order-ticket, prop-firm, indicator, or daily/weekly/monthly behavior.

### Step 264 - Display Timeframe Capability Registry

Completed in this registry commit series.

Verification:

- `node v6/tests/display-timeframe-capability-registry-step264-static-smoke.js`
- `node v6/tests/display-timeframe-capabilities-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_DISPLAY_TIMEFRAME_CAPABILITY_REGISTRY_STEP264.md`.
- Added `v6/src/display-timeframe/display-timeframe-capabilities.js`.
- The visible product interval set is minutes `1m`, `2m`, `3m`, `4m`, `5m`,
  `10m`, `15m`, `30m`; hours `1h`, `2h`, `4h`, `8h`, `12h`; daily `1D`;
  weekly `1W`; and monthly `1M`.
- Seconds remain hidden by default rather than visible disabled.
- Only `1m`, `5m`, and `15m` remain enabled in Step 264.
- Did not change replay, chart-data, bar-data, pane, journal, order-ticket,
  prop-firm, indicator, or projection runtime behavior.

### Step 263 - Auto-Play Session Gap Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/auto-play-session-gap-regression-pack-step263-static-smoke.js`
- `node v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-ownership-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-step263-smoke.js`
- `node v6/tests/auto-play-session-gap-browser-step263-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_AUTO_PLAY_SESSION_GAP_REGRESSION_PACK_STEP263.md`.
- Added `v6/tests/auto-play-session-gap-ownership-step263-smoke.js`.
- Added `v6/tests/auto-play-session-gap-step263-smoke.js`.
- Added `v6/tests/auto-play-session-gap-browser-step263-smoke.js`.
- Added `v6/tests/auto-play-session-gap-regression-pack-step263-smoke.js`.
- Added `v6/tests/auto-play-session-gap-regression-pack-step263-static-smoke.js`.
- The pack preserves auto-play continuation from `16:59 -> 18:00 -> 18:01`
  through manual-next delegation and proves auto-play does not own bar-data,
  chart-data, projection, viewport, or chart-engine commands.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 262 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step262-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP262.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step262-smoke.js`.
- Selected Step 263 as Auto-Play Session Gap Regression Pack.
- The next pack should prove auto-play remains a scheduler over manual-next
  while inheriting session-gap continuation across source and display-timeframe
  paths.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 261 - Playback Period Session Gap Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/playback-period-session-gap-regression-pack-step261-static-smoke.js`
- `node v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`
- `node v6/tests/playback-period-session-gap-step261-smoke.js`
- `node v6/tests/playback-period-session-gap-browser-step261-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_PLAYBACK_PERIOD_SESSION_GAP_REGRESSION_PACK_STEP261.md`.
- Added `v6/tests/playback-period-session-gap-step261-smoke.js`.
- Added `v6/tests/playback-period-session-gap-browser-step261-smoke.js`.
- Added `v6/tests/playback-period-session-gap-regression-pack-step261-smoke.js`.
- Added
  `v6/tests/playback-period-session-gap-regression-pack-step261-static-smoke.js`.
- The pack preserves 5m playback-period continuation from `16:59 -> 18:00 ->
  18:01` and 15m continuation through `18:05`.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 260 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step260-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP260.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step260-smoke.js`.
- Selected Step 261 as Playback Period Session Gap Regression Pack.
- The next pack should preserve multi-step manual `Next` continuation across
  no-bar session breaks for playback periods such as 5m and 15m.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 259 - Manual Next Session Gap Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/manual-next-session-gap-regression-pack-step259-static-smoke.js`
- `node v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_MANUAL_NEXT_SESSION_GAP_REGRESSION_PACK_STEP259.md`.
- Added `v6/tests/manual-next-session-gap-regression-pack-step259-smoke.js`.
- Added
  `v6/tests/manual-next-session-gap-regression-pack-step259-static-smoke.js`.
- The pack preserves manual `Next` skipping from `16:59` to `18:00`, then
  continuing to `18:01`, across 1m source replay and 5m/15m display projection
  paths.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Inserted Replay Gap Continuation Fix - Cursor Index Alignment After Gap Skip

Completed as a bugfix before Step 259.

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Replay domain cursor-time alignment now updates `cursorIndex`,
  `previousAvailable`, and `revealedCount` together with `cursorTime`.
- Manual-next session-gap browser coverage now proves that after skipping to
  `2026-06-01T18:00:00.000Z`, the next manual `Next` advances to
  `2026-06-01T18:01:00.000Z`.
- Did not change bar-data ownership, chart-data ownership, viewport intent,
  display-timeframe projection ownership, indicators, trading simulation,
  order tickets, prop firm rule engines, or journal workflows.

### Step 258 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP258.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step258-smoke.js`.
- Selected Step 259 as Manual Next Session Gap Regression Pack.
- The next pack should preserve manual `Next` skipping no-bar session breaks to
  the next available source K-line across 1m, 5m, and 15m display paths.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Inserted Replay Gap Fix - Manual Next Session Break Advance

Completed as a bugfix before Step 258 selection.

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/manual-next-session-gap-step258-smoke.js`
- `node v6/tests/manual-next-session-gap-browser-step258-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`

Notes:

- Replay runtime now exposes a bounded cursor-time setter so chart-entry logic
  can align replay state to the next real source bar without owning replay
  internals.
- Manual next probes the requested cursor first, then scans forward in bounded
  chunks only when the requested cursor falls inside a no-bar session gap.
- HTF display charts keep their existing session-origin bucket alignment while
  the projected bucket must include the next available source bar after the gap.

### Inserted Stability Fix - Wheel-Zoom Leftward Prepend Range Stability

Completed as a bugfix before Step 258 selection.

Verification:

- `node v6/tests/chart-surface-wheel-prepend-range-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`

Notes:

- Preserves the existing immediate prepend compensation for drag/manual
  leftward history.
- Adds a wheel-only delayed measured-range check so wheel zoom plus older-bar
  prepend does not leave visible K-lines jumping after the chart library settles.

### Inserted Session Setup Fix - Datetime-Local Chart Axis Semantics

Completed as a bugfix before Step 258 selection.

Verification:

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-setup-datetime-local-browser-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`

Notes:

- Quick session form inputs such as `2026-05-04T09:30` now become
  `2026-05-04T09:30:00.000Z` at the session boundary.
- The lower-level session domain still accepts explicit ISO offsets and
  normalizes them through its existing API.

### Step 257 - Visible K-Line Latency Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/visible-kline-latency-regression-pack-step257-static-smoke.js`
- `node v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_VISIBLE_KLINE_LATENCY_REGRESSION_PACK_STEP257.md`.
- Added `v6/tests/visible-kline-latency-regression-pack-step257-smoke.js`.
- Added `v6/tests/visible-kline-latency-regression-pack-step257-static-smoke.js`.
- The pack is a focused browser/runtime regression entry for visible K-line
  latency across cache-hit replay, mixed timeframe panes, manual-next HTF,
  auto-play HTF, replay-safe leftward history, and the shared latency domain
  trace.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 256 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step256-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP256.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step256-smoke.js`.
- Selected Step 257 as Visible K-Line Latency Regression Pack.
- Chose this pack because V6 has focused packs for replay/transport,
  multi-pane, and date-range chains, while visible K-line delay remains the
  other roadmap-level V5 failure class requiring a focused regression entry.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 255 - Date Range / Loaded Boundary / Replay Entry Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/date-range-boundary-entry-regression-pack-step255-static-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_DATE_RANGE_BOUNDARY_ENTRY_REGRESSION_PACK_STEP255.md`.
- Added `v6/tests/date-range-boundary-entry-regression-pack-step255-smoke.js`.
- Added `v6/tests/date-range-boundary-entry-regression-pack-step255-static-smoke.js`.
- The pack is a focused browser/runtime regression entry for date-range entry
  viewport alignment, real-date boundary metadata, chart-entry initial
  visibility, playback-period boundary behavior, real-date leftward gaps, and
  bar/chart boundary runtime metadata.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 254 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step254-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-regression-pack-step253-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP254.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step254-smoke.js`.
- Selected Step 255 as Date Range / Loaded Boundary / Replay Entry Regression
  Pack.
- Chose this pack because date-range entry, loaded boundary metadata,
  chart-entry viewport alignment, replay bootstrap, playback-period boundary,
  and real-date leftward extension remain the next foundation chain needing a
  focused regression entry.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 253 - Multi-Pane Chart Foundation Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/multi-pane-chart-foundation-regression-pack-step253-static-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_REGRESSION_PACK_STEP253.md`.
- Added `v6/tests/multi-pane-chart-foundation-regression-pack-step253-smoke.js`.
- Added `v6/tests/multi-pane-chart-foundation-regression-pack-step253-static-smoke.js`.
- The pack is a focused browser regression entry for pane data bootstrap,
  replay append, replay viewport projection, leftward history, pane-local reset,
  maximize/restore, display-timeframe active-pane targeting, and active
  focus/readout coverage.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 252 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step252-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step250-smoke.js`
- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP252.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step252-smoke.js`.
- Selected Step 253 as Multi-Pane Chart Foundation Regression Pack.
- Chose a compact multi-pane pack because the full chart browser pack is broad,
  while pane/layout/replay/chart-data/viewport/display-timeframe/reset/maximize
  work needs a focused regression entry.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 251 - Multi-Pane Active Focus Chain Gate

Completed in this browser gate commit.

Verification:

- `node v6/tests/multi-pane-active-focus-chain-step251-smoke.js`
- `node v6/tests/pane-active-visual-outline-browser-smoke.js`
- `node v6/tests/pane-active-surface-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/top-symbol-active-pane-browser-step212-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_MULTI_PANE_ACTIVE_FOCUS_CHAIN_STEP251.md`.
- Added `v6/tests/multi-pane-active-focus-chain-step251-smoke.js`.
- The gate verifies visible active-pane outline/state, pane runtime active id,
  top toolbar symbol/timeframe presentation, pane-local OHLC headers, and
  display-timeframe command targeting in one triple-pane browser flow.
- Confirmed a toolbar timeframe change targets the active secondary pane only
  and leaves main/tertiary chart-data records unchanged.
- Added the Step 251 chain gate to the chart browser regression pack.
- No runtime fix was needed.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 250 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step250-smoke.js`
- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP250.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step250-smoke.js`.
- Selected Step 251 as Multi-Pane Active Focus Chain Gate.
- Chose active pane focus/readout consistency because Step 249 closed
  drag/scroll stability while the roadmap still calls out primary/non-primary
  multi-pane confusion as a foundation stop condition.
- Step 251 should consolidate visible active-pane outline, pane runtime active
  id, top toolbar symbol/timeframe presentation, pane-local OHLC headers, and
  display-timeframe command target selection before feature work expands.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 249 - Drag/Scroll Display Stability Reaudit/Gate

Completed in this audit/gate commit.

Verification:

- `node v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`
- `node v6/tests/chart-drag-release-lifecycle-browser-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_DRAG_SCROLL_DISPLAY_STABILITY_REAUDIT_STEP249.md`.
- Added `v6/tests/drag-scroll-display-stability-reaudit-step249-smoke.js`.
- Confirmed existing browser-visible coverage is sufficient for sticky
  hover-drag after release, fast right-drag jump-back, delayed leftward history
  extension, replay responsiveness during pending history, visible-range
  compensation after prepends, and manual projection suppression.
- Confirmed the intended drag/scroll path stays unified across timeframes:
  native chart interaction owns immediate movement, while chart surface,
  leftward-history input, chart-history, bar-data, chart-data, chart viewport,
  and replay keep their current owner boundaries.
- No runtime fix was needed.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 248 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step248-smoke.js`
- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP248.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step248-smoke.js`.
- Selected Step 249 as Drag/Scroll Display Stability Reaudit/Gate.
- Chose drag/scroll display stability because Steps 245-247 already cover
  replay/transport, Manual Previous, leftward history, multi-pane bootstrap,
  reset view, display-timeframe switching, and date-range entry alignment, while
  sticky/jumpy chart interaction remains the highest-value user-experience old
  debt inside chart foundation.
- Step 249 should audit the existing post-Step-186, Step 149, Step 187, and
  chart-pack drag/history gates before adding any runtime behavior.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 247 - Date-Range Entry Viewport Alignment Audit/Gate

Completed in this browser gate commit.

Verification:

- `node v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_DATE_RANGE_ENTRY_VIEWPORT_ALIGNMENT_STEP247.md`.
- Added `v6/tests/date-range-entry-viewport-alignment-step247-smoke.js`.
- The browser gate creates a non-default date-range session through the real
  session setup form, waits for chart-entry projection apply, and verifies
  chart-data, replay cursor, chart viewport, chart surface visible range, and
  dashboard boundary wording.
- Confirmed the initial visible logical range includes the latest loaded K-line
  without requiring user drag, click, or wheel input.
- Confirmed chart-entry context remains bounded and does not load the full
  selected date range.
- No runtime fix was needed.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 246 - Chart Foundation Next Slice Selection

Completed in this selection commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`
- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP246.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step246-smoke.js`.
- Selected Step 247 as Date-Range Entry Viewport Alignment Audit/Gate.
- Chose date-range entry because Step 245 already covers replay/transport,
  Manual Previous, leftward history, multi-pane bootstrap, reset view, and
  display-timeframe switching, while date ranges remain a foundation priority.
- Step 247 should focus on session date range -> actual loaded boundary ->
  chart-entry initial window -> viewport projection, and should not add date UI
  or broader feature behavior.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 245 - Replay/Transport Chain Regression Pack

Completed in this regression-pack commit.

Verification:

- `node v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a compact pack runner in
  `v6/tests/replay-transport-chain-regression-pack-step245-smoke.js`.
- The pack gates replay runtime, replay transport visual state, Manual Previous
  closure/readiness/button/multi-pane behavior, unified leftward extension,
  replay-safe leftward latency, newly visible pane bootstrap, pane-local reset
  view, HTF reset view, and pane-targeted display timeframe switching.
- Documented pack purpose, coverage, and flake policy in
  `v6/docs/V6_REPLAY_TRANSPORT_CHAIN_REGRESSION_PACK_STEP245.md`.
- Selected Step 246 as a chart foundation next-slice selection step before
  adding more feature behavior.
- Did not change runtime feature behavior, indicators, trading simulation,
  order tickets, prop firm rule engines, or journal workflows.

### Step 244 - Manual Previous Chain Closure Audit

Completed in this audit and stale-smoke cleanup commit.

Verification:

- `node v6/tests/manual-previous-chain-closure-step244-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step234-smoke.js`
- `node v6/tests/replay-step-back-owner-readiness-step235-smoke.js`
- `node v6/tests/replay-previous-domain-command-step236-smoke.js`
- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/manual-previous-transport-multi-pane-step243-smoke.js`
- `node v6/tests/manual-previous-transport-button-step242-smoke.js`
- `node v6/tests/manual-previous-transport-readiness-step241-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Documented the final Manual Previous owner map in
  `v6/docs/V6_MANUAL_PREVIOUS_CHAIN_CLOSURE_AUDIT_STEP244.md`.
- Confirmed replay owns previous cursor state and `previousAvailable`;
  chart-entry owns pane-local chart-data replacement; chart-data owns
  `REPLACE_BARS`; chart viewport owns cursor/projection preservation; shell
  transport owns button state and command dispatch only.
- Fixed stale Step 234-237 static smoke assertions that still rejected current
  Step 242 transport Previous action wiring.
- Confirmed no chart-data rollback/remove command path was added.
- Deferred keyboard Previous shortcuts to a separate UI behavior step.
- Selected Step 245 as a compact replay/transport regression pack before
  opening another feature area.
- Did not change runtime feature behavior, indicators, trading simulation,
  order tickets, prop firm rule engines, or journal workflows.

### Step 243 - Manual Previous Transport Multi-Pane Regression

Completed in this browser regression coverage commit.

Verification:

- `node v6/tests/manual-previous-transport-multi-pane-step243-smoke.js`
- `node v6/tests/manual-previous-transport-button-step242-smoke.js`
- `node v6/tests/manual-previous-transport-readiness-step241-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added a browser smoke that creates a replay session, switches to two-pane
  layout, waits for secondary pane bootstrap, advances replay, and clicks the
  real Previous transport button.
- Proved shell Previous dispatch rewinds both visible `main` and `secondary`
  pane chart-data to the rewound replay cursor.
- Proved each visible pane keeps pane-local manual viewport intent and cursor
  timestamp after the button rewind.
- Proved both pane status readouts remain visible with the expected NQ/1m
  surface.
- Did not change product runtime code, keyboard shortcuts, indicators, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

### Step 242 - Manual Previous Transport Button Wiring

Completed in this transport button wiring and browser coverage commit.

Verification:

- `node v6/tests/manual-previous-transport-button-step242-smoke.js`
- `node v6/tests/manual-previous-transport-readiness-step241-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/manual-previous-viewport-preservation-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `previous` action resolution in replay transport.
- Previous transport dispatches `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS`
  through the existing shell action path.
- Button is enabled and gets `data-v6-transport-action="previous"` only when
  replay state reports `previousAvailable`.
- Button is disabled and actionless at replay start and after rewinding to
  cursor 0.
- Previous dispatch receives visible pane payload enrichment, matching manual
  Next.
- Browser coverage proves button click rewinds replay, replaces chart-data,
  preserves manual viewport intent, and updates button disabled/action state.
- Did not add keyboard shortcuts or change viewport reset, indicators, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

### Step 241 - Manual Previous Transport Enablement Readiness

Completed in this transport readiness state and browser coverage commit.

Verification:

- `node v6/tests/manual-previous-transport-readiness-step241-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/manual-previous-viewport-preservation-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added replay-owned `previousAvailable` state derived from replay cursor
  state: `cursorIndex > 0` or fallback `revealedCount > 1`.
- Shell transport reads the replay-owned boolean instead of interpreting replay
  cursor fields directly.
- Transport now subscribes to `REPLAY_EVENTS.REWOUND` so future button enabled
  state follows manual Previous events.
- Exposed readiness on the transport root and Previous button datasets while
  keeping `data-v6-transport-step-back` disabled and without a transport action.
- Documented that future wiring should dispatch
  `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS` directly through shell
  transport.
- Added browser coverage for at-start unavailable, after-next available,
  rewind-to-start unavailable, and rewind-to-cursor-1 still available.
- Did not change viewport reset, indicator, trading simulation, order tickets,
  prop firm rule engines, or journal workflows.

### Step 240 - Manual Previous Viewport Preservation Reaudit

Completed in this viewport owner fix and browser coverage commit.

Verification:

- `node v6/tests/manual-previous-viewport-preservation-step240-smoke.js`
- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Reaudited manual Previous viewport preservation before enabling shell
  transport.
- Documented that chart-data revision projection is sufficient for
  projection/latest-logical-index updates after Previous chart-data replacement.
- Identified and fixed the missing owner event: chart viewport runtime now
  subscribes to `REPLAY_EVENTS.REWOUND` and updates viewport
  `intent.cursorTimestamp` through its own cursor update path.
- Added browser coverage proving direct chart-entry manual Previous preserves
  default/manual viewport origin/span/latest offset and updates cursor
  timestamp to the rewound replay cursor.
- Kept `data-v6-transport-step-back` disabled and unwired.
- Did not change viewport reset, indicator, trading simulation, order tickets,
  prop firm rule engines, or journal workflows.

### Step 239 - Manual Previous Browser Wiring Guard

Completed in this browser smoke commit.

Verification:

- `node v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`
- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/tests/manual-previous-browser-wiring-guard-step239-smoke.js`.
- Proved `runtime.chartEntryManualPrevious` starts in the browser app
  lifecycle.
- Proved page commands include `chartEntryManualPrevious.getState` and
  `chartEntryManualPrevious.previous`.
- Proved the reserved `data-v6-transport-step-back` remains disabled and has no
  transport action.
- Proved disabled Previous click/keyboard attempts do not move replay or
  chart-data.
- Proved direct chart-entry manual Previous command dispatch rewinds replay,
  replaces pane-local chart-data, and preserves viewport intent origin/span.
- Did not enable shell transport, reset viewport, or change indicators, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.

### Step 238 - Chart Entry Manual Previous Runtime Skeleton

Completed in this implementation commit.

Verification:

- `node v6/tests/chart-entry-manual-previous-runtime-step238-smoke.js`
- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/replay-previous-domain-command-step236-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

Notes:

- Added `CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS` and
  `CHART_ENTRY_MANUAL_PREVIOUS_EVENTS`.
- Added `v6/src/chart-entry/chart-entry-manual-previous-runtime.js`.
- Registered the runtime in `v6/src/app.js`.
- Manual Previous dispatches `REPLAY_COMMANDS.PREVIOUS`, resolves target panes,
  filters current chart-data at or before the new replay cursor, falls back to a
  bounded bar-data window only when needed, and replaces pane-local chart-data
  through `CHART_DATA_COMMANDS.REPLACE_BARS`.
- Kept `data-v6-transport-step-back` disabled and shell transport unwired.
- Did not reset viewport, mutate chart adapter series directly, or change
  indicators, trading simulation, order tickets, prop firm rule engines, or
  journal workflows.

### Step 237 - Chart Entry Manual Previous Replacement Contract

Completed in this documentation commit.

Verification:

- `node v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`
- `node v6/tests/replay-previous-domain-command-step236-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_ENTRY_MANUAL_PREVIOUS_REPLACEMENT_CONTRACT_STEP237.md`.
- Added `v6/tests/chart-entry-manual-previous-contract-step237-smoke.js`.
- Chose chart-entry owned pane-local replacement for future manual Previous
  chart updates.
- Selected a combined replacement strategy: prefer current chart-data filtering,
  fall back to bounded bar-data loading only when filtering cannot prove
  no-future visibility, and project only when display timeframe requires it.
- Kept `data-v6-transport-step-back` disabled.
- Did not implement chart-entry manual previous behavior, add chart-data
  rollback/remove commands, reset viewport, or change bar-data, pane,
  indicator, trading, or journal behavior.

### Step 236 - Replay Previous Domain Command

Completed in this implementation commit.

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/replay-previous-domain-command-step236-smoke.js`
- `node v6/tests/replay-step-back-owner-readiness-step235-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `REPLAY_COMMANDS.PREVIOUS` and `REPLAY_EVENTS.REWOUND`.
- Added `previousReplayState` in replay domain.
- Registered replay runtime previous handling.
- Previous cursor movement decrements one replay step, clamps at cursor index
  `0`, and returns `ready` state.
- Runtime previous stops internal playback before rewinding and emits
  `replay:rewound`; leaving `playing` or `ended` also emits
  `replay:playbackChanged`.
- Kept `data-v6-transport-step-back` disabled.
- Did not add chart-entry manual previous orchestration or mutate chart-data,
  viewport, bar-data, pane, indicator, trading, or journal behavior.

### Step 235 - Replay Step Back Owner Readiness Audit

Completed in this documentation commit.

Verification:

- `node v6/tests/replay-step-back-owner-readiness-step235-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_REPLAY_STEP_BACK_OWNER_READINESS_AUDIT_STEP235.md`.
- Added `v6/tests/replay-step-back-owner-readiness-step235-smoke.js`.
- Rejected direct latest-visible-bar removal as the first Step Back
  implementation because visible bars are not always one-to-one with replay
  cursor movement across multi-pane and higher timeframe views.
- Deferred cursor snapshots until persistence/snapshot ownership becomes a real
  feature need.
- Selected replay-domain/runtime previous cursor ownership as Step 236, with
  chart-entry/chart-data replacement left for a later bounded slice.
- Kept `data-v6-transport-step-back` disabled.
- Did not change runtime behavior, data loading, replay cursor movement,
  chart-data records, viewport intent, bar-data requests, pane state, TFs,
  indicators, SMC/ICT overlays, trading simulation, order tickets, prop firm
  rule engines, or journal workflows.

### Step 234 - Chart Foundation Next Slice Selection

Completed in this documentation commit.

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step234-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP234.md`.
- Added `v6/tests/chart-foundation-next-slice-selection-step234-smoke.js`.
- Selected Step 235 as Replay Step Back Owner Readiness Audit.
- Confirmed the transport reserves `data-v6-transport-step-back` as disabled,
  while replay runtime/domain currently expose only forward/reset/play/pause
  cursor movement.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 233 - Dashboard Chart Boundary Label Product Wording

Completed in commits:

- `1603f810 fix(v6): use product chart boundary labels`

Verification:

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-boundary-bridge-browser-step191-smoke.js`
- `node v6/tests/chart-foundation-post-time-helper-slice-selection-step232-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Replaced `Chart data from loaded boundary: ...` with
  `Chart starts at: ...`.
- Replaced the fallback prior Globex-open label with
  `Chart starts at prior Globex open: ...`.
- Preserved selected trading date labels, `hasActualChartDataBoundary`, and
  `hasPriorGlobexOpen` semantics.
- Updated dashboard model/browser smokes and the Step 232 selection guard.
- Did not change bar-data requests, chart entry windows, replay, chart-data,
  viewport, pane state, chart adapter behavior, TFs, indicators, SMC/ICT
  overlays, trading simulation, order tickets, prop firm rule engines, or
  journal workflows.

### Step 232 - Chart Foundation Post Time-Helper Slice Selection

Completed in this documentation commit.

Verification:

- `node v6/tests/chart-foundation-post-time-helper-slice-selection-step232-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_FOUNDATION_POST_TIME_HELPER_SLICE_SELECTION_STEP232.md`.
- Added `v6/tests/chart-foundation-post-time-helper-slice-selection-step232-smoke.js`.
- Selected Step 233 as Dashboard Chart Boundary Label Product Wording.
- Kept the next slice inside chart-foundation date-range/chart-boundary clarity.
- Did not change runtime behavior, data loading, replay, chart-data, viewport,
  pane state, TFs, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows.

### Step 231 - Chart Time Helper Closure Review

Completed in this documentation commit.

Verification:

- `node v6/tests/chart-time-helper-closure-review-step231-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_TIME_HELPER_CLOSURE_REVIEW_STEP231.md`.
- Added `v6/tests/chart-time-helper-closure-review-step231-smoke.js`.
- Confirmed the chart-foundation time/TF helper migration line is closed for
  now after Steps 215-230.
- Classified remaining local time/TF logic as current-time metadata,
  helper-normalized ISO formatting, already-normalized bar comparisons, cache
  filtering, playback-period DSL parsing, adapter mapping, or non-chart
  UI/persistence metadata.
- Deferred further helper work unless a concrete chart-foundation bug shows two
  owners interpreting the same cursor, timeframe, projection bucket, or replay
  timestamp differently.
- Did not change runtime behavior, add TFs, indicators, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows.

### Step 230 - Chart Entry Context Time Helper Closure

Completed in commits:

- `dcf29729 refactor(v6): share chart entry context time parsing`
- `efd009cf refactor(v6): share chart entry default wall time parsing`
- `76a40667 refactor(v6): share chart entry playback timeframe parsing`

Verification:

- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `chart-entry-context-plan.js` timeframe parsing through
  `normalizeMinuteTimeframe` and ISO time parsing through
  `normalizeUnixMilliseconds` behind the existing local wrappers.
- Routed `chart-entry-default-wall-plan.js` ISO time parsing through
  `normalizeUnixMilliseconds` behind the existing local wrapper.
- Updated default-wall plan smokes to provide explicit replay
  `startTime`, matching the production bootstrap requirement instead of adding
  a production fallback.
- Routed `chart-entry-playback-period-policy.js` source timeframe parsing
  through `normalizeMinuteTimeframe`.
- Kept playback period parsing local because `30s`, `1m`, and `1h` are playback
  period DSL values, not chart source timeframe values.
- Preserved chart-entry plan payloads, default-wall plan state, playback period
  results, error text, and chart browser behavior.
- Did not migrate shell, session, journal, TF menu, indicators, SMC/ICT
  overlays, trading, or journal workflows.

### Step 229 - Chart Data Bars Cursor Time Helper Migration

Completed in commits:

- `2960ee1a refactor(v6): share chart data cursor time validation`

Verification:

- `node v6/tests/chart-data-domain-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `chart-data/chart-bars.js` cursor timestamp validation through
  `normalizeUnixSeconds` behind the existing local `normalizeCursorTimestamp`
  wrapper.
- Preserved strict chart-data cursor payload behavior by accepting finite
  numeric values and numeric strings, but continuing to reject date/time text.
- Added `chart-data-domain-smoke.js` coverage for numeric string cursor input
  and date/time text rejection.
- Preserved no-future filtering, merge ordering, dedupe, OHLC normalization,
  revision validation, paneId validation, and chart replacement/append behavior.
- Did not migrate chart-entry context, shell, session, journal, TF menu,
  indicators, SMC/ICT overlays, trading, or journal workflows.
- Step 230 should close or explicitly classify the remaining chart-entry
  context/default-wall-plan time helper sites.

### Step 228 - Default Wall Runtime Time Helper Migration

Completed in commits:

- `eaf0b836 refactor(v6): share default wall bar time parsing`
- `3f3898af refactor(v6): share default wall timeframe parsing`

Verification:

- `node v6/tests/default-wall-replay-domain-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `default-wall-replay.js` bar timestamp parsing through
  `normalizeUnixSeconds` behind the existing `normalizeBar` wrapper.
- Extended `default-wall-replay-domain-smoke.js` to cover text `time` parsing
  for replay bars.
- Routed `default-wall-runtime.js` displayTimeframe parsing through
  `normalizeMinuteTimeframe` behind the existing `normalizeDisplayTimeframe`
  wrapper.
- Extended `default-wall-mixed-timeframe-runtime-smoke.js` to cover explicit
  string displayTimeframe input.
- Preserved default-wall replay state shape, pane ordering, latest-bar cursor
  semantics, chart replace/append payloads, viewport intent payloads, and error
  text.
- Did not migrate chart-data bars, chart-entry context, shell, session, journal,
  TF menu, indicators, SMC/ICT overlays, trading, or journal workflows.
- Step 229 should migrate `chart-data/chart-bars.js` cursor timestamp handling
  only.

### Step 227 - Display Timeframe Runtime Time Helper Migration

Completed in commits:

- `297d6fcf refactor(v6): share display timeframe latest time parsing`
- `6249a911 refactor(v6): share display timeframe projection summary`

Verification:

- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `display-timeframe-runtime.js` latest source bar timestamp parsing
  through `normalizeUnixSeconds` behind the existing `latestTimestamp` wrapper.
- Extended `display-timeframe-runtime-smoke.js` to cover text `time` parsing for
  the latest source bar.
- Routed display-timeframe projection-source summary through
  `summarizeProjectionSource`.
- Preserved target pane selection, projection dispatch payloads, pane
  display-timeframe updates, chart replacement payloads, emitted event shape,
  and error text.
- Did not migrate default-wall, chart-data bars, chart-entry context, shell,
  session, journal, TF menu, indicators, SMC/ICT overlays, trading, or journal
  workflows.
- Step 228 should migrate default-wall runtime/domain time helper usage only.

### Step 226 - Remaining Chart Time Helper Closure Audit

Completed in commits:

- `e7d4ad05 docs(v6): audit remaining chart time helpers`

Verification:

- `node v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_REMAINING_CHART_TIME_HELPER_AUDIT_STEP226.md`.
- Added `v6/tests/remaining-chart-time-helper-audit-step226-smoke.js`.
- Classified remaining chart-foundation time/TF parsing sites by owner.
- Confirmed chart viewport, projection, leftward history, bar-data planning,
  pane model, replay, chart-entry/reload/layout high-risk paths already route
  through shared helpers.
- Marked shell/session UI, session persistence, journal metadata, and chart
  engine adapter time handling as local for now because those are not chart
  cursor/projection ownership paths.
- Selected Step 227 as a bounded migration for
  `display-timeframe-runtime.js` latest timestamp parsing and
  projection-source summary.
- No runtime, TF, indicator, SMC/ICT overlay, trading, or journal behavior
  changed in Step 226.

### Step 225 - Layout Pane Bootstrap Time Helper Migration

Completed in commits:

- `d88772d7 refactor(v6): share layout bootstrap replay time parsing`
- `3b2d7043 refactor(v6): share layout bootstrap source bar time parsing`

Verification:

- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `layout-pane-bootstrap-runtime.js` replay-state timestamp parsing
  through `normalizeUnixSeconds` behind the existing
  `timestampFromReplayState` wrapper.
- Added `timestampFromSourceBar` so source-bar fallback timestamp parsing also
  uses `normalizeUnixSeconds`.
- Added runtime smoke coverage for text replay cursor parsing and source-bar
  fallback parsing when replay cursor state is unavailable.
- Preserved pane bootstrap payloads, pane ordering, replay cursor semantics,
  fallback behavior, and error text.
- `layout-pane-bootstrap-runtime.js` had no actual minute timeframe parser to
  migrate, so Step 225 did not add one.
- Step 226 should audit the remaining chart-foundation time/TF parsing sites
  before selecting another implementation step.

### Step 224 - Pane Intent Reload Chart-Data Time Helper Migration

Completed in commits:

- `06e38825 refactor(v6): share pane reload time parsing`
- `c244699c refactor(v6): share pane reload projection summary`

Verification:

- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-reload-htf-projection-browser-step196-smoke.js`
- `node v6/tests/reset-view-htf-browser-step200-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `pane-intent-reload-chart-data-runtime.js` window cursor parsing
  through `normalizeUnixSeconds` behind the existing local wrapper.
- Routed integer timeframe parsing through `normalizeMinuteTimeframe` behind
  the existing local wrapper.
- Routed optional session timestamp parsing through `normalizeOptionalUnixSeconds`
  behind the existing local wrapper.
- Routed projection-source summary through `summarizeProjectionSource`.
- Preserved loaded-window cursor selection, projection dispatch payloads,
  replacement payloads, replacement ordering, and error text.
- Did not migrate layout bootstrap.
- Step 225 should migrate `layout-pane-bootstrap-runtime.js` only.

### Step 223 - Chart Entry Manual-Next Time Helper Migration

Completed in commits:

- `47306e4e refactor(v6): share manual next time parsing`
- `fa9cc76b refactor(v6): share manual next projection summary`

Verification:

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `chart-entry-manual-next-runtime.js` TF parsing through
  `normalizeMinuteTimeframe` behind the existing local wrapper.
- Routed replay cursor/start timestamp parsing and cursor-bar picking through
  `normalizeUnixSeconds` behind local wrappers.
- Routed projection-source summary through `summarizeProjectionSource`.
- Preserved manual-next append payloads, projection dispatch payloads, cursor
  bar picking, playback-period stepping, and error text.
- Did not migrate pane-intent-reload or layout bootstrap.
- Step 224 should migrate `pane-intent-reload-chart-data-runtime.js` only.

### Step 222 - Chart Entry Projection Preparation Time Helper Migration

Completed in commits:

- `3e0ca34f refactor(v6): share projection preparation cursor parsing`
- `a63f9295 refactor(v6): share projection preparation runtime time parsing`

Verification:

- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/initial-htf-chart-entry-browser-step195-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `chart-entry-projection-preparation.js` cursor timestamp parsing
  through `normalizeUnixSeconds` behind the existing local wrapper.
- Routed `chart-entry-projection-preparation-runtime.js` cursor and optional
  session timestamp parsing through `normalizeUnixSeconds` and
  `normalizeOptionalUnixSeconds` behind existing local wrappers.
- Preserved prepared payloads, projection dispatch payloads, cursor lookup, and
  error text.
- Did not migrate manual-next, pane-intent-reload, or layout bootstrap.
- Step 223 should migrate `chart-entry-manual-next-runtime.js` only.

### Step 221 - Chart Entry / Reload Time Helper Readiness Audit

Completed in commits:

- `bdd06726 docs(v6): audit chart entry reload time helpers`

Verification:

- `node v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Added `v6/docs/V6_CHART_ENTRY_RELOAD_TIME_HELPER_AUDIT_STEP221.md`.
- Added `v6/tests/chart-entry-reload-time-helper-audit-step221-smoke.js`.
- Classified timestamp conversions in chart-entry projection preparation,
  chart-entry manual-next, pane-intent reload chart-data replacement, and layout
  pane bootstrap.
- Selected Step 222 as the first bounded migration:
  `chart-entry-projection-preparation.js` and
  `chart-entry-projection-preparation-runtime.js` only.
- No chart-entry, reload, layout, TF, indicator, SMC/ICT overlay, or trading
  behavior changed in Step 221.

### Step 220 - Bar-Data Runtime / Cache Epoch Serialization Integration

Completed in commits:

- `5c25a080 refactor(v6): share runtime window epoch conversion`
- `c2b8ec59 refactor(v6): share cache epoch serialization`

Verification:

- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed bar-data runtime window filtering boundaries through
  `unixMillisecondsToSeconds`.
- Routed bar-window-cache slice filtering boundaries through
  `unixMillisecondsToSeconds`.
- Routed cache boundary metadata serialization for earliest/latest/exhausted
  timestamps through `unixMillisecondsToSeconds`.
- Preserved cache filtering, requested range timestamps, boundary metadata
  values, request windows, and chart browser behavior.
- Remaining obvious timestamp conversion sites are now outside bar-data,
  primarily chart-entry, pane-intent-reload, and layout bootstrap; Step 221
  should audit those before implementation.

### Step 219 - Bar-Data Adapter / Normalizer Time Helper Integration

Completed in commits:

- `ab9de1e3 refactor(v6): reuse time helper in database bars adapter`
- `fbfae5b4 refactor(v6): share millisecond timestamp conversion`

Verification:

- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/time-domain-helper-step215-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Added `unixMillisecondsToSeconds` to `time-domain` for already-normalized
  millisecond values.
- Routed database adapter requested range and history timestamps through the
  shared millisecond-to-second helper.
- Routed bar normalizer output timestamps through the shared helper while
  preserving OHLC validation, volume normalization, dedupe, sorting, and ISO
  `time` output.
- Added helper coverage for small millisecond values so test fixtures such as
  `100_999ms -> 100s` remain correct.
- Step 220 should finish bar-data runtime/cache epoch serialization cleanup
  without changing cache filtering or boundary metadata output.

### Step 218 - Bar-Data Window Time Helper Integration

Completed in commits:

- `9a99d0a9 refactor(v6): route bar window through time domain`
- `a24dc5c4 refactor(v6): reuse bar time helpers in cache`

Verification:

- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed `bar-window` timeframe normalization through `normalizeMinuteTimeframe`
  while preserving the existing public `normalizeTimeframe` API and error
  behavior.
- Routed `bar-window` timestamp parsing and API minute formatting through
  `normalizeUnixMilliseconds` and `toApiMinuteTime`.
- Replaced local minute-millisecond constants with `TIME_DOMAIN_CONSTANTS`.
- Routed `bar-window-cache` timestamp conversion and inferred fallback step size
  through bar-window/time-domain helpers.
- Updated the Step 214 static audit so `bar-window.js` must consume
  `time-domain` and must not carry a local timeframe normalizer.
- Step 219 should finish the bar-data timestamp cleanup in adapter/normalizer
  boundaries without changing database query shape or chart bar output.

### Step 217 - Wrap Remaining TF / Timestamp Consumers

Completed in commits:

- `b9775988 refactor(v6): wrap replay pane viewport time helpers`
- `6d87ffae refactor(v6): wrap chart history time helpers`

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/leftward-extension-planner-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/leftward-history-gap-scan-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Routed replay cursor/start timestamp math through `time-domain`.
- Routed pane display-timeframe normalization through `time-domain`.
- Routed chart-viewport cursor timestamp normalization through `time-domain`.
- Routed chart-history source/display timeframe normalization, timestamp
  parsing, projection-source summaries, and minute-second constants through
  `time-domain`.
- Preserved chart-history ownership of leftward extension orchestration and
  bar-data ownership of request-window planning.
- Normalized left-boundary planning so same-TF drag extension preserves the
  canvas-left request cap while higher-TF display extension requests complete
  source buckets.
- Step 218 should consolidate `bar-data/bar-window.js` with `time-domain`
  without changing request windows, caps, or replay latency behavior.

### Step 216 - Retire Independent Display-Timeframe Projection Path

Completed in commits:

- `78237969 refactor(v6): retire display timeframe projection path`

Verification:

- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step200-smoke.js`
- `node v6/tests/next-foundation-slice-selection-step213-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/display-timeframe-leftward-auto-chain-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Deleted `v6/src/display-timeframe/display-timeframe-projection.js`.
- `display-timeframe-runtime` now dispatches
  `CHART_DATA_PROJECTION_COMMANDS.PROJECT` and applies the owner-produced bars.
- `default-wall-pane-projection` now uses `projectSourceBarsToChartData`
  directly for pure payload construction instead of the retired display
  projection helper.
- Static guards now ensure the retired helper stays gone and that no
  independent `projectBarsToDisplayTimeframe` path remains in `v6/src`.
- Step 217 should migrate remaining local TF/timestamp normalization in
  chart-history, replay, panes, and chart-viewport toward `time-domain`.

### Step 215 - Shared TF / Time Domain Helper

Completed in commits:

- `82098198 feat(v6): add shared TF time domain helper`
- `6e34ef05 refactor(v6): route projection through time domain helper`

Verification:

- `node v6/tests/time-domain-helper-step215-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Added `v6/src/time-domain/time-domain.js` as a small shared domain helper for
  minute timeframe normalization, Unix seconds/milliseconds normalization, API
  minute formatting, display/source multiple validation, display bucket start,
  and projection-source summary.
- Routed `chart-data-projection-domain.js` through the shared helper while
  preserving Step 193 projection output and the 27-test chart browser regression
  pack.
- Updated the Step 214 static guard so `chart-data-projection-domain.js` must
  consume the shared helper while remaining duplicate local normalizers stay
  audit-covered.
- Step 216 should retire the independent `display-timeframe` projection path by
  routing display-timeframe/default-wall consumers through the projection owner.

### Step 214 - TF / Projection / Time Domain Unification Readiness Audit

Completed in commits:

- `581aa997 docs(v6): audit TF projection time domain boundaries`

Verification:

- `node v6/tests/tf-projection-time-domain-audit-step214-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Accepted `chart-data-projection` as the projection owner and documented
  `bar-data`, `chart-history`, `replay`, `chart-viewport`, `panes`, and shell
  boundaries.
- Documented duplicate TF/time/projection evidence in
  `chart-data-projection`, `display-timeframe`, `default-wall`,
  `chart-history`, `bar-data`, `replay`, and `panes`.
- Step 215 should create a small shared TF/time domain helper and route the pure
  projection domain through it first.
- Non-goals remain explicit: no projection rewrite in Step 214, no new TFs,
  indicators, Pine Script, SMC/ICT overlays, trading/order tickets, prop firm
  rule engines, or pseudo-live simulation behavior.

### Step 213 - Next Foundation Slice Selection

Completed in commits:

- `de9963fa docs(v6): select step 214 foundation slice`

Verification:

- `node v6/tests/next-foundation-slice-selection-step213-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Selected TF / Projection / Time Domain Unification Readiness Audit for Step
  214.
- The selection follows the SMC/ICT backtesting/journal product direction by
  prioritizing chart foundation reliability before indicator, overlay, or
  strategy-specific UI work.
- Step 214 should audit duplicate timeframe parsing, timestamp parsing,
  projection, and projection-source summary logic before implementation.
- Non-goals remain explicit: no new supported TFs, indicators, Pine Script,
  SMC/ICT overlays, trading/order tickets, prop firm rule engines, or
  pseudo-live simulation behavior.

### Step 212 - Top-Toolbar Active-Pane Symbol Presentation Sync

Completed in commits:

- `f82ffcda feat(v6): add top symbol active pane bridge`
- `f7932934 test(v6): cover top symbol active pane sync`

Verification:

- `node v6/tests/top-symbol-active-pane-bridge-step212-smoke.js`
- `node v6/tests/top-symbol-active-pane-browser-step212-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Added a shell-owned read-only bridge for `data-v6-top-symbol`.
- The toolbar symbol initializes from `PANE_COMMANDS.GET_ACTIVE`.
- `PANE_EVENTS.ACTIVE_CHANGED` updates the toolbar symbol to the new active
  pane instrument.
- `PANE_EVENTS.SYMBOL_INTENT_CHANGED` updates the toolbar only when the event
  belongs to the current active pane.
- No symbol picker UI, comparison symbols, interval sync, indicators, Pine
  Script, chart-data requests, replay mutation, or trading/order behavior were
  added.

### Step 211 - Next Chart Slice Selection

Completed in commits:

- `46b05629 docs(v6): select step 212 chart slice`

Verification:

- `node v6/tests/next-chart-slice-selection-step211-smoke.js`
- `node v6/tests/pane-local-header-state-sync-step210-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Selected Top-Toolbar Active-Pane Symbol Presentation Sync for Step 212.
- Step 212 should keep top-toolbar symbol updates read-only and shell-owned.
- Symbol picker UI, comparison symbols, custom intervals, interval sync,
  indicators, Pine Script, and trading/order behavior remain out of scope.

### Step 210 - Pane-Local Symbol/TF/OHLC Header State Sync

Completed in commits:

- `a8a9eb1e feat(v6): track active pane header state`
- `b3717f79 test(v6): cover pane-local header isolation`

Verification:

- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/next-chart-slice-selection-step209-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/pane-local-header-state-browser-step210-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- `pane-status-readout` now tracks pane active state as shell-owned
  presentation data.
- Active-pane changes do not clear or overwrite pane-local symbol, timeframe,
  or OHLC header state.
- The chart browser regression pack now includes 24 tests.
- Step 211 should select the next bounded chart-facing slice before more UI
  expansion.

### Step 209 - Next Chart Slice Selection

Completed in commits:

- `90968948 docs(v6): select step 210 chart slice`

Verification:

- `node v6/tests/next-chart-slice-selection-step209-smoke.js`
- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Selected Pane-Local Symbol/TF/OHLC Header State Sync for Step 210.
- Step 210 should strengthen the existing pane-status readout boundary and add
  browser coverage for real multi-pane header isolation.
- Custom intervals, interval sync, symbol picker UI, indicators, Pine Script,
  and trading/order behavior remain out of scope.

### Step 208 - Display-Timeframe Active Pane UI State Sync

Completed in commits:

- `3fbfce50 feat(v6): sync display timeframe UI from active pane`
- `47d0fcba test(v6): cover active pane timeframe UI state`
- `50d17dd7 test(v6): add active pane timeframe UI to chart pack`

Verification:

- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-pane-target-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-active-pane-ui-state-browser-step208-smoke.js`
- `node v6/tests/display-timeframe-active-pane-browser-step207-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- The shell display-timeframe control now has `setDisplayTimeframe(value)` for
  UI-only state sync.
- Active pane changes now sync both target pane id and visible timeframe text.
- Pane switches alone do not project or replace chart data.
- Step 209 should select the next bounded chart-facing slice before more UI
  expansion.

### Step 207 - Display-Timeframe Target Source Integration

Completed in commits:

- `485551f1 feat(v6): bridge chart pane activation`
- `d00d2cec feat(v6): target display timeframe from active pane`
- `dda22aa2 test(v6): add active pane display timeframe regression`

Verification:

- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/pane-active-surface-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-pane-target-bridge-step207-smoke.js`
- `node v6/tests/display-timeframe-active-pane-browser-step207-smoke.js`
- `node v6/tests/display-timeframe-target-pane-browser-step206-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Chart surface now publishes pane activation from host user interaction.
- `pane-active-surface-bridge` writes the active pane into pane runtime.
- `display-timeframe-pane-target-bridge` mirrors active pane changes into the
  display-timeframe control target.
- The visible top-toolbar `5m` selection now updates the clicked secondary pane
  without updating `main`.
- Step 208 should sync the visible TF label/readout to active pane state without
  adding custom intervals, interval sync, indicators, Pine Script, or
  trading/order behavior.

### Step 206 - Pane-Local Display-Timeframe UI Readiness

Completed in commits:

- `6eeea7e8 feat(v6): target display timeframe pane`
- `c7ff5084 test(v6): cover targeted display timeframe pane`
- `e5a05754 test(v6): add display timeframe target to chart pack`

Verification:

- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/display-timeframe-target-pane-browser-step206-smoke.js`
- `node v6/tests/next-chart-slice-selection-step205-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- The existing shell display-timeframe control now resolves and stores an
  explicit target pane id.
- `DISPLAY_TIMEFRAME_COMMANDS.APPLY` dispatches include `paneId`.
- The mounted control exposes `getTargetPaneId()` and
  `setTargetPaneId(paneId)` for owner wiring and browser tests.
- Step 207 should connect the target source to real active/selected pane state
  without expanding into custom TF UI, interval sync, indicators, Pine Script,
  or trading/order behavior.

### Step 205 - Next Chart Slice Selection

Completed in commits:

- `682c2662 docs(v6): select next chart slice`

Verification:

- `node v6/tests/next-chart-slice-selection-step205-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Selected Pane-Local Display-Timeframe UI Readiness for Step 206.
- Step 206 should only prepare explicit pane targeting for the existing
  display-timeframe UI path.
- Custom intervals, interval sync, indicators, Pine Script, and trading/order
  behavior remain out of scope.

### Step 204 - Active-Pane Fallback Narrowing

Completed in commits:

- `faeada14 docs(v6): audit active pane fallback`
- `9090ed79 fix(v6): narrow active pane fallback`

Verification:

- `node v6/tests/active-pane-fallback-audit-step204-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/initial-htf-chart-entry-projection-step195-smoke.js`
- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/pane-identity-bootstrap-browser-step203-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- Manual-next, initial projection preparation, and leftward-history no longer
  borrow active-pane intent when exact pane lookup misses.
- Display-timeframe and playback-period still use `GET_ACTIVE` intentionally
  for current-pane operations.

### Step 203 - Pane Identity Bootstrap Normalization

Completed in commits:

- `96c2de70 feat(v6): normalize pane bootstrap ids`
- `2b988b8d test(v6): guard normalized pane identity`
- `b6eac09a test(v6): add pane bootstrap to chart pack`

Verification:

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/layout-model-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/pane-identity-bootstrap-browser-step203-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Pane runtime now defaults to `main`.
- Default pane runtime bootstrap now creates `main`, `secondary`, and
  `tertiary`.
- Primary chart 5m display timeframe is set directly on `main` in browser
  coverage.
- Step 204 should audit and narrow remaining active-pane fallback call sites
  before TF UI or indicator work.

### Step 202 - Pane Identity / Display Timeframe Consistency Review

Completed in commits:

- `3cd75588 docs(v6): audit pane identity display timeframe`
- `1b807e4f test(v6): guard pane identity display timeframe`
- `46fe67cb test(v6): add pane identity to chart pack`

Verification:

- `node v6/tests/pane-identity-display-timeframe-review-step202-smoke.js`
- `node v6/tests/pane-identity-display-timeframe-browser-step202-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- At the time of Step 202, pane runtime still defaulted to `pane-default`.
- Chart-surface hosts used `main`, `secondary`, and `tertiary`.
- The active-pane fallback is now documented and guarded as temporary singleton
  compatibility, not a completed multi-pane model.
- Step 203 should normalize pane identity at bootstrap or introduce an explicit
  mapping before further TF UI or indicator work.

### Step 201 - HTF Projection Integration Review

Completed in commits:

- `79f800d1 docs(v6): review HTF projection integration`
- `395beb12 docs(v6): index HTF projection review`

Verification:

- `node v6/tests/htf-projection-integration-review-step201-smoke.js`
- `node v6/tests/htf-projection-doc-index-step201-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Notes:

- All HTF browser gates from Step 195 through Step 200 are now included in the
  chart browser regression pack.
- Projection routing scope remains explicit: initial preparation, pane reload,
  manual-next, and leftward history can dispatch projection; auto-play and
  reset view remain projection-free.
- The next foundation risk is pane identity consistency, especially the
  `main` / `pane-default` fallback pattern.

### Step 200 - Reset View HTF Projection Gate

Completed in commits:

- `95533332 docs(v6): audit reset view HTF boundary`
- `7ed50cbb test(v6): cover reset view HTF display range`
- `7db017c6 test(v6): add reset view HTF regression guard`

Verification:

- `node v6/tests/reset-view-htf-projection-audit-step200-smoke.js`
- `node v6/tests/reset-view-htf-browser-step200-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step200-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Reset view remains projection-owner agnostic.
- Reset view reads applied display chart-data revision and pane snapshot data
  length from chart surface state.
- HTF reset does not mutate replay state, chart-data bars, bar-data cache, or
  chart-data projection state.

### Step 199 - Auto-Play HTF Projection Path

Completed in commits:

- `a6151f79 docs(v6): audit auto-play HTF projection path`
- `b5d06177 fix(v6): update HTF candle append merges`
- `85da4685 test(v6): cover auto-play HTF visible latency`
- `b6d2408e test(v6): add auto-play HTF to regression pack`

Verification:

- `node v6/tests/auto-play-htf-projection-audit-step199-smoke.js`
- `node v6/tests/auto-play-htf-projection-step199-smoke.js`
- `node v6/tests/auto-play-htf-visible-latency-browser-step199-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step199-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `git diff --check`

Notes:

- Auto-play remains projection-free and delegates every tick to manual-next.
- HTF auto-play now has runtime and browser coverage.
- Chart-data append/prepend duplicate timestamp merging now updates
  in-progress HTF candles while preserving historical prepend order.

### Step 198 - Leftward History HTF Stability

Completed in commits:

- `d7fe88d9 feat(v6): route leftward HTF history through projection`
- `802afa4e test(v6): guard leftward HTF projection routing`
- `a06f7b2d test(v6): cover leftward HTF browser stability`

Verification:

- `node v6/tests/leftward-history-htf-projection-step198-smoke.js`
- `node v6/tests/leftward-history-htf-stability-browser-step198-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step198-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `git diff --check`

Notes:

- HTF leftward-history prepends now use the chart-data projection owner when
  target display timeframe is higher than the source timeframe.
- The browser smoke guards real-page visible range stability after HTF prepend.
- The pane lookup now falls back to the active pane when chart pane ids and
  pane runtime ids differ.
- Auto-play and reset view still do not route projection.

### Step 197.5 - UI Extraction Workflow Audit

Completed in commits:

- `1dcb67e2 docs(v6): audit UI extraction workflow`
- `0db98fd7 test(v6): guard UI extraction workflow audit`

Verification:

- `node v6/tests/ui-extraction-workflow-audit-step197_5-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

Decision:

- Use the reviewed website-cloner project as a process reference for future UI
  audits.
- Do not import its Next.js, React, shadcn/ui, Tailwind, Radix, or build-chain
  assumptions into V6.
- Resume roadmap selection after Step 198 completes.

### Step 197 - Manual Next HTF Visible Latency

Completed in commits:

- `253f9e3a feat(v6): route manual next HTF projection`
- `3019a121 test(v6): cover manual next HTF projection`
- `075e3bd2 test(v6): guard manual next projection scope`
- `360a3d75 test(v6): cover manual next HTF visible latency`

Verification:

- `node v6/tests/manual-next-htf-projection-step197-smoke.js`
- `node v6/tests/manual-next-htf-visible-latency-browser-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step197-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 196 - Pane Reload HTF Projection

Completed in commits:

- `a08dee66 feat(v6): route pane reload HTF projection`
- `1466f087 test(v6): guard pane reload projection scope`
- `914b4a71 test(v6): cover pane reload HTF projection browser flow`

Verification:

- `node v6/tests/pane-reload-htf-projection-step196-smoke.js`
- `node v6/tests/pane-reload-htf-projection-browser-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step196-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/pane-reload-pipeline-step179-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 195 - Initial HTF Chart Entry Projection

Completed in commits:

- `bf4e4053 feat(v6): route initial HTF chart entry projection`
- `5ceda6b3 test(v6): guard initial projection routing scope`
- `5f55e964 test(v6): cover initial HTF chart entry browser flow`

Verification:

- `node v6/tests/initial-htf-chart-entry-projection-step195-smoke.js`
- `node v6/tests/initial-htf-chart-entry-browser-step195-smoke.js`
- `node v6/tests/chart-data-projection-routing-scope-step195-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 194 - Chart Data Projection Owner Runtime

Completed in commits:

- `6ffad2df feat(v6): define chart data projection contract`
- `57aedc9d feat(v6): add chart data projection owner runtime`
- `b3d8fe25 test(v6): guard chart data projection routing`

Verification:

- `node v6/tests/chart-data-projection-contract-step194-smoke.js`
- `node v6/tests/chart-data-projection-owner-step194-smoke.js`
- `node v6/tests/chart-data-projection-no-routing-step194-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 193 - Chart Data Projection Domain

Completed in commits:

- `4aa9145c feat(v6): add chart data projection domain`
- `465554d7 test(v6): guard chart data projection boundary`

Verification:

- `node v6/tests/display-timeframe-projection-domain-step193-smoke.js`
- `node v6/tests/display-timeframe-no-wiring-step193-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 192 - Display Timeframe Readiness Audit

Completed in commits:

- `ef729816 docs(v6): define display timeframe readiness audit`
- `a062020b test(v6): guard display timeframe audit scope`

Verification:

- `node v6/tests/display-timeframe-readiness-audit-step192-smoke.js`
- `node v6/tests/display-timeframe-no-feature-step192-smoke.js`
- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 191 - Chart Boundary Metadata Bridge

Completed in commits:

- `d68e832f feat(v6): add chart boundary metadata bridge runtime`
- `9411d61a feat(v6): bridge chart boundary metadata to dashboard`

Verification:

- `node v6/tests/chart-boundary-metadata-runtime-step191-smoke.js`
- `node v6/tests/session-dashboard-boundary-bridge-browser-step191-smoke.js`
- `node v6/tests/bar-data-boundary-metadata-step190-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 190 - Bar-Data Owned Chart Boundary Metadata

Completed in commits:

- `e9c8491e feat(v6): expose bar data boundary metadata`
- `1d62f10b test(v6): cover real-date chart boundary metadata`
- `e873b447 feat(v6): let dashboard model consume chart boundary metadata`

Verification:

- `node v6/tests/bar-data-boundary-metadata-step190-smoke.js`
- `node v6/tests/real-date-boundary-metadata-browser-step190-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 189 - Real-Date Sunday Gap Leftward Extension Stability

Completed in commits:

- `19923603 fix(v6): stabilize real-date leftward gap extension`
- `753f9f6a feat(v6): expose leftward history request diagnostics`

Verification:

- `node v6/tests/real-date-leftward-gap-browser-step189-smoke.js`
- `node v6/tests/bar-data-fetch-retry-step189-smoke.js`
- `node v6/tests/leftward-history-debug-state-step189-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/leftward-history-gap-scan-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 188 - Globex Session Boundary / Chart Data Range Clarity

Completed in commits:

- `bbabd94c docs(v6): define step 188 globex boundary`
- `ff6bda24 feat(v6): clarify session globex boundary label`

Verification:

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 187 - Replay-Safe Leftward History Latency Gate

Completed in commits:

- `e392659e docs(v6): define step 187 latency gate`
- `39241564 test(v6): gate replay-safe history latency`

Verification:

- `node v6/tests/replay-safe-leftward-history-latency-browser-step187-smoke.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Post-Step 186 - Chart Drag / Leftward-History Stability Hotfix

Completed in commits:

- `c75dfe99 fix(v6): stop drag range input after release`
- `f630e51f fix(v6): avoid native drag projection feedback`
- `e49cfe2e fix(v6): stabilize drag during history loads`

Verification:

- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/fast-right-drag-stability-browser-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-viewport-prepend-manual-stability-smoke.js`
- `node v6/tests/chart-surface-prepend-visible-range-stability-smoke.js`
- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 186 - Pane Maximize / Restore Action Rail Bridge

Completed in commits:

- `7032a7d6 feat(v6): wire pane maximize restore controls`
- `eca9b1b9 test(v6): cover pane maximize restore controls`

Verification:

- `node v6/tests/maximize-restore-control-bridge-step186-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/maximize-restore-control-browser-step186-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 185 - Pane Maximize / Restore State Model

Completed in commits:

- `1d4bdd5e feat(v6): add pane maximize restore state`
- `a51bdf90 test(v6): cover pane maximize restore in browser`

Verification:

- `node v6/tests/pane-maximize-state-step185-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-maximize-state-browser-step185-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 184 - Pane Action Rail

Completed in commit:

- `7cdfaffa feat(v6): move pane reset into action rail`

Verification:

- `node v6/tests/pane-action-rail-browser-step184-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 183 - Pane-Local Status Readout

Completed in commits:

- `fd4e3443 feat(v6): render pane-local status readouts`
- `a18866fd test(v6): cover pane-local status readouts in browser`

Verification:

- `node v6/tests/pane-status-readout-step183-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/pane-status-readout-browser-step183-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 182 - Crosshair OHLC Completion

Completed in commits:

- `f7f920d7 test(v6): cover OHLC direction readout states`
- `38a848e8 test(v6): assert multi-pane OHLC readout colors`

Verification:

- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 181 - Chart Browser Regression Pack

Completed in commit:

- `455b57a5 test(v6): add chart browser regression pack`

Verification:

- `node v6/tests/chart-browser-regression-pack.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 180 - Browser Smoke Harness Reliability

Completed in commits:

- `225411dd test(v6): isolate browser smoke debug ports`
- `f86e01a9 test(v6): cover parallel browser harness cleanup`

Verification:

- `node v6/tests/browser-harness-parallel-step180-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 179 - Pane Reload Pipeline End-to-End Coverage

Completed in commits:

- `e4a5d6f8 test(v6): cover pane reload pipeline end to end`
- `c1c59251 test(v6): cover pane reload pipeline browser flow`

Verification:

- `node v6/tests/pane-reload-pipeline-step179-smoke.js`
- `node v6/tests/pane-reload-pipeline-browser-step179-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-intent-reload-viewport-runtime-step178-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 178 - Reload Replacement Viewport Projection Boundary

Completed in commit:

- `7fb9f76d feat(v6): project viewport after reload replacement`

Verification:

- `node v6/tests/pane-intent-reload-viewport-runtime-step178-smoke.js`
- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 177 - Reloaded Data Chart-Data Replacement Boundary

Completed in commit:

- `dee4e696 feat(v6): replace chart data from reload windows`

Verification:

- `node v6/tests/pane-intent-reload-chart-data-runtime-step177-smoke.js`
- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 176 - Planned Reload Bar-Data Handoff Boundary

Completed in commit:

- `3a11b252 feat(v6): load planned reload windows via bar data`

Verification:

- `node v6/tests/pane-intent-reload-data-runtime-step176-smoke.js`
- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 175 - Reload Window Planning Runtime Handoff

Completed in commit:

- `b1d5ff6b feat(v6): add reload window planning runtime`

Verification:

- `node v6/tests/pane-intent-reload-window-runtime-step175-smoke.js`
- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 174 - Replay-Safe Reload Window Planning

Completed in commit:

- `cc7877d5 feat(v6): add replay safe reload window planning`

Verification:

- `node v6/tests/pane-intent-reload-window-plan-step174-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 173 - Pane Intent Reload Runtime Skeleton

Completed in commits:

- `8f6cb482 feat(v6): add pane intent reload runtime`
- `cb6840cc feat(v6): register pane intent reload runtime`

Verification:

- `node v6/tests/pane-intent-reload-runtime-step173-smoke.js`
- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 172 - Synced Intent Reload Boundary

Completed in commits:

- `2384b258 docs(v6): define synced intent reload boundary`
- `4d853f90 feat(v6): add pane intent reload model`

Verification:

- `node v6/tests/pane-intent-reload-model-step172-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 171 - Symbol/Interval Intent Fan-Out

Completed in commit:

- `f8ca7f2b feat(v6): fan out pane intent sync`

Verification:

- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-sync-model-step170-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 170 - Symbol/Interval Sync Runtime Skeleton

Completed in commits:

- `a1fda08d feat(v6): add pane intent sync model`
- `9bebd625 feat(v6): add pane intent sync runtime`
- `8c2f12c6 test(v6): guard pane intent sync boundary`

Verification:

- `node v6/tests/pane-intent-sync-model-step170-smoke.js`
- `node v6/tests/pane-intent-sync-runtime-step170-smoke.js`
- `node v6/tests/pane-intent-sync-boundary-step170-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 169 - Pane Symbol/Interval Intent Model

Completed in commits:

- `85ba111b feat(v6): add pane intent store setters`
- `d7bd83fc feat(v6): expose pane intent commands`
- `b699c6f8 test(v6): guard pane intent boundary`

Verification:

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/pane-intent-boundary-step169-smoke.js`
- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 168 - Symbol/Interval Sync Boundary Decision

Completed in commits:

- `0df39952 docs(v6): define symbol interval sync boundary`
- `377d7466 test(v6): guard symbol interval sync boundary`

Verification:

- `node v6/tests/symbol-interval-sync-boundary-step168-smoke.js`
- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 167 - Crosshair Sync Effect Boundary

Completed in commits:

- `79dc5080 feat(v6): add crosshair projection api`
- `986a540f feat(v6): sync layout crosshair effect`

Verification:

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/layout-sync-crosshair-bridge-step167-smoke.js`
- `node v6/tests/layout-sync-crosshair-browser-step167-smoke.js`
- `node v6/tests/layout-sync-visible-range-browser-step166-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 166 - Layout Sync Effects Boundary

Completed in commits:

- `2b86013c feat(v6): add layout sync effect model`
- `16fddba3 feat(v6): sync layout visible ranges`

Verification:

- `node v6/tests/layout-sync-effects-model-step166-smoke.js`
- `node v6/tests/layout-sync-surface-bridge-step166-smoke.js`
- `node v6/tests/layout-sync-visible-range-browser-step166-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-resize-drag-browser-step165-smoke.js`
- `git diff --check`

### Step 165 - Pane Resize Drag Boundary

Completed in commits:

- `4e5137eb feat(v6): add pane resize ratio model`
- `03852f85 feat(v6): add chart pane resize handles`

Verification:

- `node v6/tests/pane-resize-model-step165-smoke.js`
- `node v6/tests/pane-resize-chart-surface-step165-smoke.js`
- `node v6/tests/pane-resize-drag-browser-step165-smoke.js`
- `node v6/tests/layout-variant-geometry-browser-step164-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 164 - Layout Variant Geometry Boundary

Completed in commits:

- `846344d4 feat(v6): persist layout variants`
- `104c5cd3 feat(v6): apply layout variant geometry`

Verification:

- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/layout-menu-control-smoke.js`
- `node v6/tests/layout-surface-bridge-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-variant-geometry-browser-step164-smoke.js`
- `node v6/tests/layout-menu-owner-binding-browser-step160-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `git diff --check`

### Step 163 - Pane-Local Reset View Controls

Completed in commits:

- `1ab1ddb5 feat(v6): add pane-local reset controls`
- `a11890e6 test(v6): cover pane-local reset browser flow`

Verification:

- `node v6/tests/pane-local-reset-controls-step163-smoke.js`
- `node v6/tests/pane-local-reset-controls-browser-step163-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 162 - Layout Pane Data Bootstrap Boundary

Completed in commits:

- `f82e647a feat(v6): add layout pane bootstrap runtime`
- `b29ca065 feat(v6): bootstrap data for visible layout panes`

Verification:

- `node v6/tests/layout-pane-bootstrap-runtime-smoke.js`
- `node v6/tests/layout-pane-data-bootstrap-browser-step162-smoke.js`
- `node v6/tests/layout-surface-bridge-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/layout-menu-owner-binding-browser-step160-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 161 - Layout Pane Surface Reflow Boundary

Completed in commits:

- `a8e67627 feat(v6): add layout pane surface reflow`
- `17143f45 feat(v6): connect layout runtime to chart surface`

Verification:

- `node v6/tests/layout-pane-surface-reflow-step161-smoke.js`
- `node v6/tests/layout-surface-bridge-smoke.js`
- `node v6/tests/layout-pane-surface-reflow-browser-step161-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/layout-menu-control-smoke.js`
- `node v6/tests/layout-menu-owner-binding-browser-step160-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 160 - Layout Menu Owner Binding

Completed in commits:

- `673fc737 feat(v6): bind layout menu to layout runtime`
- `7c6697fe test(v6): cover layout menu owner binding browser flow`

Verification:

- `node v6/tests/layout-menu-control-smoke.js`
- `node v6/tests/layout-menu-owner-binding-browser-step160-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/chart-foundation-next-slice-selection-step159-smoke.js`
- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 159 - Chart Foundation Next Slice Selection

Completed in commit:

- `5ed2e6d1 docs(v6): select layout menu binding slice`

Verification:

- `node v6/tests/chart-foundation-next-slice-selection-step159-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 158 - Chart Foundation Integration Re-Audit

Completed in commit:

- `2dea5bac test(v6): audit chart foundation integration`

Verification:

- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/reset-view-kxg-flow-step146-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-history-step157-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 157 - Multi-Pane Replay Viewport Projection Isolation

Completed in commits:

- `f5640ec1 test(v6): cover multi-pane replay viewport projection`
- `7fe3cf74 test(v6): cover multi-pane replay viewport browser flow`
- `bde3de52 test(v6): cover replay viewport after history extension`

Verification:

- `node v6/tests/multi-pane-replay-viewport-projection-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-projection-browser-step157-smoke.js`
- `node v6/tests/multi-pane-replay-viewport-history-step157-smoke.js`
- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 156 - Multi-Pane Replay Append / Auto-Play Isolation

Completed in commits:

- `cb5939de feat(v6): isolate multi-pane replay appends`
- `4e401c46 test(v6): cover multi-pane replay append browser flow`

Verification:

- `node v6/tests/multi-pane-replay-append-step156-smoke.js`
- `node v6/tests/multi-pane-replay-append-browser-step156-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 155 - Multi-Pane Leftward History Extension Isolation

Completed in commits:

- `cf7b70ce test(v6): cover multi-pane leftward history isolation`
- `9ad85ee7 test(v6): cover multi-pane leftward history browser flow`

Verification:

- `node v6/tests/multi-pane-leftward-history-step155-smoke.js`
- `node v6/tests/multi-pane-leftward-history-browser-step155-smoke.js`
- `node v6/tests/continuous-leftward-history-pane-isolation-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 154 - Multi-Pane Crosshair Readout Isolation

Completed in commits:

- `7b33d594 feat(v6): isolate multi-pane crosshair readout`
- `927f782f test(v6): cover multi-pane crosshair browser readout`

Verification:

- `node v6/tests/multi-pane-crosshair-readout-step154-smoke.js`
- `node v6/tests/multi-pane-crosshair-readout-browser-step154-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/status-readout-model-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 153 - Crosshair OHLC Readout Boundary

Completed in commits:

- `3e11cc66 feat(v6): gate crosshair ohlc readout boundary`
- `345fee43 test(v6): cover crosshair ohlc browser readout`

Verification:

- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/status-readout-chart-data-browser-smoke.js`
- `node v6/tests/crosshair-ohlc-readout-browser-step153-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 152 - Auto-Play Speed Under Continuous History

Completed in commits:

- `c4f53c78 test(v6): cover auto play after continuous history`
- `2b19832c test(v6): cover auto play browser after continuous history`

Verification:

- `node v6/tests/auto-play-continuous-history-step152-smoke.js`
- `node v6/tests/auto-play-continuous-history-browser-step152-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `git diff --check`

### Step 151 - Continuous Leftward Extension Until Exhausted

Completed in commits:

- `1635af5a feat(v6): stop continuous history at exhaustion`
- `47eaeeeb test(v6): cover continuous leftward history in browser`
- `1fa65bac test(v6): preserve pane-local history exhaustion`

Verification:

- `node v6/tests/continuous-leftward-history-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-browser-step151-smoke.js`
- `node v6/tests/continuous-leftward-history-pane-isolation-step151-smoke.js`
- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 150 - Replay Speed Under History Extension

Completed in commits:

- `a61053ee fix(v6): preserve replay append during history loads`
- `268bed4b test(v6): cover replay speed after history extension`

Verification:

- `node v6/tests/replay-speed-history-inflight-step150-smoke.js`
- `node v6/tests/replay-speed-history-extension-browser-step150-smoke.js`
- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 149 - Drag-Triggered History Extension Hardening

Completed in commits:

- `fcfb65bb feat(v6): suppress duplicate history extension requests`
- `1edd0358 test(v6): cover drag-triggered history extension`

Verification:

- `node v6/tests/leftward-history-hardening-step149-smoke.js`
- `node v6/tests/drag-triggered-history-extension-browser-step149-smoke.js`
- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 148 - Leftward Historical K-Line Extension

Completed in commits:

- `9299ea9b feat(v6): add chart data prepend bars command`
- `796a4e8c feat(v6): add leftward history extension flow`
- `51c85a57 test(v6): cover leftward history browser flow`

Verification:

- `node v6/tests/leftward-history-extension-step148-smoke.js`
- `node v6/tests/leftward-history-input-bridge-step148-smoke.js`
- `node v6/tests/leftward-history-extension-browser-step148-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 147 - Multi-Pane Chart Foundation

Completed in commits:

- `b370ce80 feat(v6): support multi-pane chart surface hosts`
- `97cd3df7 test(v6): gate multi-pane chart foundation`

Verification:

- `node v6/tests/workstation-chart-surface-multi-pane-step147-smoke.js`
- `node v6/tests/multi-pane-chart-foundation-step147-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 146 - Reset View / KXG Reset Flow

Completed in commits:

- `5acd9219 test(v6): verify reset view kxg runtime flow`
- `bdfec3db test(v6): cover reset view kxg browser flow`

Verification:

- `node v6/tests/reset-view-kxg-flow-step146-smoke.js`
- `node v6/tests/reset-view-kxg-flow-browser-step146-smoke.js`
- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 145 - Replay K-Line Chart Flow

Completed in commits:

- `8e3ebd86 feat(v6): gate replay k-line chart flow`
- `3417f9dc test(v6): verify replay k-line chart visibility`

Verification:

- `node v6/tests/replay-kline-chart-flow-step145-smoke.js`
- `node v6/tests/replay-kline-chart-flow-browser-step145-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 144 - Database K-Line Import Boundary

Completed in commits:

- `b74fd09e feat(v6): add database bars adapter boundary`
- `3be1804e test(v6): cover database k-line import boundary`

Verification:

- `node v6/tests/database-bars-adapter-smoke.js`
- `node v6/tests/database-kline-import-boundary-step144-smoke.js`
- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 143 - Chart Foundation Re-prioritization

Completed in commit:

- `5ca385bb docs(v6): reprioritize chart foundation`

Verification:

- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 142 - Workstation Chart Slice Selection

Completed in commit:

- `63f62181 docs(v6): select comparison symbol contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step142-smoke.js`
- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `git diff --check`

### Step 141 - Account/Trading Owner Contract

Completed in commit:

- `28e78e55 feat(v6): add account trading owner contract`

Verification:

- `node v6/tests/account-trading-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `git diff --check`

### Step 140 - Workstation Chart Slice Selection

Completed in commit:

- `8f958eba docs(v6): select account trading contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step140-smoke.js`
- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 139 - Drawing/Action-History Owner Contract

Completed in commit:

- `4c2c992d feat(v6): add drawing action history owner contract`

Verification:

- `node v6/tests/drawing-action-history-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `git diff --check`

### Step 138 - Workstation Chart Slice Selection

Completed in commit:

- `68e8ec7d docs(v6): select drawing action history contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step138-smoke.js`
- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 137 - Indicators Owner Contract

Completed in commit:

- `de6e1b54 feat(v6): add indicators owner contract`

Verification:

- `node v6/tests/indicators-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 136 - Workstation Chart Slice Selection

Completed in commit:

- `5d2ca49f docs(v6): select indicators contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step136-smoke.js`
- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 135 - Screenshot/Export Owner Contract

Completed in commit:

- `f2be95c9 feat(v6): add screenshot export owner contract`

Verification:

- `node v6/tests/screenshot-export-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 134 - Workstation Chart Slice Selection

Completed in commit:

- `85b02e26 docs(v6): select screenshot export contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step134-smoke.js`
- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 133 - Session Settings Owner Contract

Completed in commit:

- `3509a8cc feat(v6): add session settings owner contract`

Verification:

- `node v6/tests/session-settings-contract-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 132 - Workstation Chart Slice Selection

Completed in commit:

- `54ee5f10 docs(v6): select session settings contract slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step132-smoke.js`
- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 131 - Diagnostics Visibility Cleanup

Completed in commit:

- `a6db00d5 feat(v6): clean up readiness diagnostics visibility`

Verification:

- `node v6/tests/diagnostics-visibility-cleanup-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 130 - Workstation Chart Slice Selection

Completed in commit:

- `ff8323f7 docs(v6): select diagnostics visibility cleanup slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step130-smoke.js`
- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 129 - Workstation UI Parity Gap Re-audit

Completed in commit:

- `290169b5 docs(v6): re-audit workstation ui parity gaps`

Verification:

- `node v6/tests/workstation-ui-parity-gap-reaudit-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 128 - Workstation Chart Slice Selection

Completed in commit:

- `4af426eb docs(v6): select workstation parity re-audit slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step128-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 127 - Right Rail Session Settings Panel Regression Audit

Completed in commit:

- `813f550b test(v6): audit session settings panel regression`

Verification:

- `node v6/tests/right-rail-session-settings-panel-regression-audit-smoke.js`
- `node v6/tests/right-rail-session-settings-panel-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 126 - Right Rail Session Settings Panel Reservation

Completed in commit:

- `0a4bb82c feat(v6): reserve session settings panel`

Verification:

- `node v6/tests/right-rail-session-settings-panel-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 125 - Workstation Chart Slice Selection

Completed in commit:

- `90eaabc1 docs(v6): select session settings panel slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step125-smoke.js`
- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 124 - Bottom Chrome Regression Audit

Completed in commit:

- `763fff26 test(v6): audit bottom chrome regression`

Verification:

- `node v6/tests/bottom-chrome-regression-audit-browser-smoke.js`
- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 123 - Bottom Account/Trading Chrome Reservation

Completed in commit:

- `3ef40a84 feat(v6): reserve bottom account chrome`

Verification:

- `node v6/tests/bottom-account-chrome-browser-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 122 - Workstation Chart Slice Selection

Completed in commit:

- `ba95a9a5 docs(v6): select bottom account chrome slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-step122-smoke.js`
- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 121 - Workstation Rail Regression Audit

Completed in commit:

- `8cd045ed test(v6): audit workstation rail regression`

Verification:

- `node v6/tests/workstation-rail-regression-audit-browser-smoke.js`
- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 120 - Left Drawing Rail Reservation

Completed in commit:

- `4452f65a feat(v6): reserve left drawing rail`

Verification:

- `node v6/tests/left-drawing-rail-browser-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 119 - Workstation Chart Implementation Slice Selection

Completed in commit:

- `ff2cad47 docs(v6): select left drawing rail slice`

Verification:

- `node v6/tests/workstation-chart-slice-selection-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 118 - Workstation Chart Presentation Re-audit

Completed in commit:

- `8cb8480c docs(v6): audit workstation chart presentation`

Verification:

- `node v6/tests/workstation-chart-presentation-reaudit-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 117 - Dashboard Journal Row Action Regression Pack Audit

Completed in commit:

- `2a3e5eb5 docs(v6): audit journal row action regression pack`

Verification:

- `node v6/tests/dashboard-journal-row-action-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 116 - Journal Row Action Visibility Wiring

Completed in commit:

- `0b1eebea feat(v6): expose journal row action`

Verification:

- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/session-journal-row-action-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 115 - Journal Row Action Exposure Gate Audit

Completed in commit:

- `a56a711c docs(v6): audit journal row action exposure gate`

Verification:

- `node v6/tests/journal-row-action-exposure-gate-audit-smoke.js`
- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `git diff --check`

### Step 114 - Journal Surface Ready Flag Audit

Completed in commit:

- `8520c294 feat(v6): mark journal owner surface ready`

Verification:

- `node v6/tests/journal-surface-ready-flag-audit-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `git diff --check`

### Step 113 - Hidden Journal Row Action Browser Harness

Completed in commit:

- `16c05bcc test(v6): add hidden journal row action browser harness`

Verification:

- `node v6/tests/hidden-journal-row-action-browser-smoke.js`
- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `git diff --check`

### Step 112 - Hidden Journal Row Action Harness

Completed in commit:

- `65d8b027 feat(v6): add hidden journal row action harness`

Verification:

- `node v6/tests/hidden-journal-row-action-harness-smoke.js`
- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `git diff --check`

### Step 111 - Journal Row Action Session Context Contract

Completed in commit:

- `ff634845 feat(v6): add journal row action session context contract`

Verification:

- `node v6/tests/journal-row-action-session-context-contract-smoke.js`
- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `git diff --check`

### Step 110 - Journal Row Action Owner Surface Readiness Audit

Completed in commits:

- `93bec759 docs(v6): audit journal row action surface readiness`
- `131320ca test(v6): open workstation before workflow panel browser check`

Verification:

- `node v6/tests/journal-row-action-owner-surface-readiness-audit-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `git diff --check`

### Step 109 - Next Dashboard Row Action Exposure Readiness Audit

Completed in commit:

- `6a521368 docs(v6): audit next row action exposure readiness`

Verification:

- `node v6/tests/next-dashboard-row-action-exposure-readiness-audit-smoke.js`
- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `git diff --check`

### Step 108 - Dashboard Session Browser Regression Pack Audit

Completed in commit:

- `bfdbead5 docs(v6): audit dashboard session browser pack`

Verification:

- `node v6/tests/dashboard-session-browser-regression-pack-audit-smoke.js`
- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 107 - Dashboard Summary/Stats/Copy Browser Coverage Audit

Completed in commit:

- `8ecacd2e docs(v6): audit visible row action browser coverage`

Verification:

- `node v6/tests/dashboard-visible-row-action-browser-coverage-audit-smoke.js`
- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `git diff --check`

### Step 106 - Dashboard Row Action Isolation Re-audit

Completed in commit:

- `342176cc docs(v6): audit dashboard row action isolation`

Verification:

- `node v6/tests/dashboard-row-action-isolation-reaudit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `git diff --check`

### Step 105 - Workstation Chart Control Browser Regression Audit

Completed in commits:

- `6c726815 docs(v6): audit chart control bridge browser regression`
- `e9fd784c test(v6): align native manual wall browser regression`

Verification:

- `node v6/tests/chart-control-bridge-browser-regression-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 104 - Chart Control Bridge Integration Audit

Completed in commits:

- `b2610b67 docs(v6): audit chart control bridge integration`
- `e2529fe8 test(v6): guard chart control bridge integration`

Verification:

- `node v6/tests/chart-control-bridge-integration-audit-smoke.js`
- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 103 - Chart Control Bridge Owner Contract

Completed in commits:

- `3c6839c1 feat(v6): add chart control bridge contract`
- `87e10e9e test(v6): guard chart control bridge boundaries`

Verification:

- `node v6/tests/chart-control-bridge-contract-smoke.js`
- `node v6/tests/manual-wall-input-bridge-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 102 - Chart Surface Boundary Smoke Expansion

Completed in commit:

- `b0e72b67 test(v6): expand chart surface boundary smoke`

Verification:

- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 101 - Workstation Chart Surface Contract Integration Audit

Completed in commit:

- `a95d20df docs(v6): audit chart surface contract integration`

Verification:

- `node v6/tests/chart-surface-contract-integration-audit-smoke.js`
- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 100 - Workstation Chart Surface Owner Contract

Completed in commits:

- `bc995ea9 feat(v6): add chart surface owner contract`
- `dcc8252c test(v6): guard chart surface reentry contract`

Verification:

- `node v6/tests/chart-surface-contract-smoke.js`
- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 99 - Workstation Replay/Chart Re-entry Audit

Completed in commits:

- `b2cbcb1f docs(v6): audit workstation replay chart reentry`
- `c34ace79 test(v6): align workstation browser smokes with main pane`

Verification:

- `node v6/tests/workstation-replay-chart-reentry-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `git diff --check`

### Step 98 - Session Dashboard Readiness Re-audit

Completed in commit:

- `8eb24471 docs(v6): audit session dashboard readiness`

Verification:

- `node v6/tests/session-dashboard-readiness-audit-smoke.js`
- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `git diff --check`

### Step 97 - Recent Sessions Row Action Contract Audit

Completed in commits:

- `3a66c0b0 docs(v6): audit recent session row actions`

Verification:

- `node v6/tests/recent-sessions-row-action-contract-audit-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 96 - Calendar Owner Contract

Completed in commits:

- `ff91676b feat(v6): add calendar owner contract`
- `ad13a835 test(v6): guard calendar owner boundaries`

Verification:

- `node v6/tests/calendar-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 95 - Journal Owner Contract

Completed in commits:

- `6ac21fc0 feat(v6): add journal owner contract`
- `2f28f9a7 test(v6): guard journal owner boundaries`

Verification:

- `node v6/tests/journal-contract-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 94 - Orders Owner Contract

Completed in commits:

- `8b61e350 feat(v6): add orders owner contract`
- `826a5e74 test(v6): guard orders owner boundaries`

Verification:

- `node v6/tests/orders-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 93 - Session Copy Metadata Action

Completed in commits:

- `eb6c3f2d feat(v6): copy session metadata in repository`
- `64582c7b feat(v6): expose session copy command`
- `50b54920 feat(v6): enable session copy action`

Verification:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-copy-action-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 92 - Session Copy Owner Contract

Completed in commits:

- `bc7b48f0 feat(v6): add session copy contract`
- `820be36b test(v6): guard session copy boundaries`

Verification:

- `node v6/tests/session-copy-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 91 - Session Analytics Read-only Surface

Completed in commits:

- `bc49e851 feat(v6): add session analytics surface model`
- `7b9f8846 feat(v6): open read-only session stats surface`
- `f4f00ed6 test(v6): verify read-only session stats surface`

Verification:

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-analytics-surface-model-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-analytics-surface-browser-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `git diff --check`

### Step 90 - Session Analytics Owner Contract

Completed in commits:

- `18b71f81 feat(v6): add session analytics contract`
- `c2a32db6 test(v6): guard session analytics boundaries`

Verification:

- `node v6/tests/session-analytics-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 89 - Session Summary Surface Polish

Completed in commits:

- `fab143df docs(v6): scope session summary polish`
- `3ea0d684 feat(v6): polish session summary surface`

Verification:

- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-summary-surface-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 88 - Session Summary Read-only Surface

Completed in commits:

- `23b3dea6 docs(v6): scope session summary surface`
- `f17e6321 feat(v6): add session summary surface model`
- `7b74c34f feat(v6): open read-only session summary`

Verification:

- `node v6/tests/session-summary-surface-model-smoke.js`
- `node v6/tests/session-summary-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 87 - Session Summary Owner Contract

Completed in commits:

- `c0ebcf09 docs(v6): scope session summary contract`
- `c0926349 feat(v6): define session summary contract`
- `7becd460 test(v6): guard session summary ownership`
- `67ee8860 feat(v6): mark summary action contract ready`

Verification:

- `node v6/tests/session-summary-contract-smoke.js`
- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `git diff --check`

### Step 86 - Recent Sessions Row Action Boundaries

Completed in commits:

- `dbf6e104 docs(v6): scope recent row action boundaries`
- `50c7c75a feat(v6): define recent row action boundaries`
- `09183e3c test(v6): guard recent row action placeholders`

Verification:

- `node v6/tests/session-row-action-boundaries-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 85 - Quick Session Modal Polish

Completed in commits:

- `e13b27af docs(v6): scope quick session modal polish`
- `89eeb699 feat(v6): polish quick session modal`

Verification:

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 84 - Recent Sessions Controls

Completed in commits:

- `f88e3fe2 docs(v6): scope recent sessions controls`
- `ce2ad615 feat(v6): model recent sessions controls`
- `bd8bdb9b feat(v6): wire recent sessions controls`

Verification:

- `node v6/tests/session-dashboard-model-smoke.js`
- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/recent-sessions-controls-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 83 - Quick Session Creation Flow

Completed in commits:

- `c7e13d04 docs(v6): scope quick session flow`
- `1b2d2ccd feat(v6): extend quick session metadata`
- `54f143ef feat(v6): add quick session modal`

Verification:

- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/quick-session-flow-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `git diff --check`

### Step 82 - Session Metadata Delete Action

Completed in commits:

- `052fbfc4 docs(v6): scope step eighty two session delete`
- `6979bfca feat(v6): delete session metadata`
- `474b0e3d test(v6): verify session metadata delete`

Verification:

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-delete-browser-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

### Step 1 - Skeleton And Contracts

Completed in commits:

- `8e44281 feat(v6): scaffold workstation shell`
- `5ca0d75 feat(v6): add runtime core`
- `98847cb test(v6): add step one smoke gates`

Verification:

- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 2 - Product Baseline Shell

Completed in commits:

- `6c2611a feat(v6): expand workstation shell markup`
- `e9649f1 feat(v6): style product baseline shell`
- `0c708d2 test(v6): gate product baseline shell`

Verification:

- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 3 - Session Model

Completed in commits:

- `dfd4ed5 feat(v6): add session domain repository`
- `9f6cd8a feat(v6): register session runtime`
- `8b80d4e test(v6): gate session runtime boundary`

Verification:

- `node v6/tests/session-domain-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 4 - Bar Data Runtime

Completed in commits:

- `a790062 feat(v6): add bar data window cache`
- `7693073 feat(v6): add v4 bars adapter`
- `dc7f958 feat(v6): register bar data runtime`
- `a853113 test(v6): gate bar data runtime`

Verification:

- `node v6/tests/bar-data-domain-smoke.js`
- `node v6/tests/bar-data-adapter-smoke.js`
- `node v6/tests/bar-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 5 - Replay Runtime

Completed in commits:

- `0b246d8 feat(v6): add replay state domain`
- `602d6b7 feat(v6): register replay runtime`
- `7150114 test(v6): gate replay runtime`

Verification:

- `node v6/tests/replay-domain-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 6 - Unified Pane Model

Completed in commits:

- `72c2e71 feat(v6): add unified pane model`
- `9259e68 feat(v6): register pane runtime`
- `228aadb test(v6): gate unified pane model`

Verification:

- `node v6/tests/pane-model-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 7 - Viewport Intent Domain

Completed in commits:

- `993697d feat(v6): add viewport intent domain`
- `db46ab5 feat(v6): add viewport projection domain`
- `1c2e05b test(v6): gate viewport intent invariants`

Verification:

- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 8 - Chart Data Runtime

Completed in commits:

- `1fd4c2f feat(v6): add pane chart data store`
- `799f205 feat(v6): register chart data runtime`
- `a3bd5ee test(v6): gate chart data runtime`
- `5ac957c test(v6): enforce chart data boundaries`

Verification:

- `node v6/tests/chart-data-domain-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 9 - Chart Viewport Runtime

Completed in commits:

- `61f9659 feat(v6): add chart viewport store`
- `6daf30a feat(v6): register chart viewport runtime`
- `03cb36a test(v6): gate chart viewport runtime`
- `1e23714 test(v6): enforce chart viewport boundaries`

Verification:

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 10 - Chart Engine Adapter

Completed in commits:

- `0837d5d feat(v6): add lightweight chart adapter`
- `60519b1 test(v6): verify chart engine browser adapter`
- `bf132cc test(v6): enforce chart engine adapter boundaries`

Verification:

- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `git diff --check`

### Step 11 - Visible Latency Harness

Completed in commits:

- `3a64a56 feat(v6): add visible latency timeline`
- `8ef6cf8 test(v6): add cache-hit visible latency browser smoke`
- `df59b93 test(v6): enforce visible latency boundary`

Verification:

- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 12 - Single-Pane Default Wall Replay

Completed in commits:

- `2d67dfe feat(v6): add default wall replay domain`
- `dd79182 feat(v6): add default wall replay runtime`
- `3387e05 feat(v6): register default wall runtime`
- `9f22053 test(v6): gate default wall replay visibility`
- `91a89ba test(v6): enforce default wall boundaries`

Verification:

- `node v6/tests/default-wall-replay-domain-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 13 - Manual Wall Replay

Completed in commits:

- `0b3ee42 feat(v6): preserve manual wall projection in replay`
- `fc6a3ad test(v6): keep manual wall through display windows`
- `10718ab test(v6): gate manual wall replay visibility`
- `83daf7e test(v6): cover manual wall range measurement`

Verification:

- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/manual-wall-display-window-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/viewport-projection-smoke.js`
- `node v6/tests/viewport-intent-domain-smoke.js`
- `node v6/tests/viewport-intent-invariant-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 14 - Replay Transport Controls

Completed in commits:

- `acdb530 feat(v6): add replay transport controller`
- `d2da1a1 feat(v6): mount replay transport controls`
- `37a7865 test(v6): verify replay transport dispatch`
- `2a112ac test(v6): enforce replay transport boundaries`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 15 - Chart Status And OHLC

Completed in commits:

- `8b7e65f feat(v6): add status readout model`
- `7844ce9 feat(v6): mount read-only status readouts`
- `29c4d69 test(v6): verify read-only status updates`
- `a0f80c8 test(v6): enforce status readout boundaries`

Verification:

- `node v6/tests/status-readout-model-smoke.js`
- `node v6/tests/status-readout-controller-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 16 - Display Timeframe Single-Pane

Completed in commits:

- `45175eb feat(v6): add display timeframe projection`
- `d4c2b5b feat(v6): add pane display timeframe command`
- `47a8f1f feat(v6): add display timeframe runtime`
- `af5d9de feat(v6): mount display timeframe control`
- `76b840a test(v6): verify display timeframe selection`
- `93565b2 test(v6): enforce display timeframe boundaries`

Verification:

- `node v6/tests/display-timeframe-projection-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/display-timeframe-control-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/pane-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 17 - Layout Runtime Skeleton

Completed in commits:

- `30f73f8 feat(v6): add layout model store`
- `ab02217 feat(v6): add layout runtime`
- `80087de feat(v6): register layout runtime`
- `862219b test(v6): enforce layout boundaries`

Verification:

- `node v6/tests/layout-model-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 18 - Multi-Pane Chart Hosts

Completed in commits:

- `375a810 feat(v6): add chart host manager`
- `ec0c89d feat(v6): fan out default wall panes`
- `48830d1 test(v6): verify multi pane chart hosts`
- `7334195 fix(v6): preserve default wall append alias`

Verification:

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 19 - Mixed Timeframe Panes

Completed in commits:

- `114baec feat(v6): project default wall pane timeframes`
- `6ac7883 feat(v6): support mixed timeframe wall fanout`
- `644da85 test(v6): measure mixed timeframe visible latency`
- `b65aaf3 test(v6): guard pane timeframe isolation`

Verification:

- `node v6/tests/default-wall-pane-projection-smoke.js`
- `node v6/tests/default-wall-mixed-timeframe-runtime-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/display-timeframe-pane-isolation-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/display-timeframe-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 20 - Pane-Local Manual Walls

Completed in commits:

- `ef540a6 test(v6): guard pane manual viewport intent`
- `699eac4 test(v6): verify multi pane manual wall replay`

Verification:

- `node v6/tests/chart-viewport-pane-manual-isolation-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 21 - Settings Baseline

Completed in commits:

- `61453e7 feat(v6): add settings runtime`
- `82f3b49 feat(v6): register settings runtime`
- `28ebfda feat(v6): mount settings panel`
- `3090181 test(v6): enforce settings boundaries`
- `a195d7c test(v6): verify settings panel browser flow`

Verification:

- `node v6/tests/settings-runtime-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 22 - Transport Polish Baseline

Completed in commits:

- `7d50951 feat(v6): sync replay transport playback state`
- `fc93c10 test(v6): verify transport external playback sync`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 23 - Persistence Baseline

Completed in commits:

- `7046048 feat(v6): add persistence repository`
- `3b8dcbf feat(v6): add persistence runtime`
- `6cde633 feat(v6): register persistence runtime`
- `7c6ef9c test(v6): enforce persistence boundaries`

Verification:

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 24 - Journal Analytics Boundary Baseline

Completed in commits:

- `eedd897 feat(v6): add journal analytics domain`
- `f304aed feat(v6): add journal runtime contract`
- `cb51216 feat(v6): register journal runtime`
- `6513de5 test(v6): enforce journal boundaries`

Verification:

- `node v6/tests/journal-domain-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 25 - Journal Persistence Command Bridge

Completed in commits:

- `6d79441 feat(v6): allow journal snapshot persistence`
- `104a8e0 feat(v6): add journal persistence bridge`
- `aeb6055 feat(v6): register journal persistence bridge`
- `8797c2a test(v6): enforce journal persistence bridge boundaries`

Verification:

- `node v6/tests/persistence-repository-smoke.js`
- `node v6/tests/persistence-runtime-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 26 - V6 Readiness Audit

Completed in commits:

- `7384f2f test(v6): add readiness audit smoke`
- `e0253dd docs(v6): add readiness audit`

Verification:

- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `git diff --check`

### Step 27 - UI Workflow Readiness Surface

Completed in commits:

- `10f4b05 feat(v6): add readiness surface controller`
- `87dbdce feat(v6): mount readiness surface`
- `663bcea test(v6): enforce readiness surface boundaries`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 28 - Session Workflow Entry Surface

Completed in commits:

- `3f5299b feat(v6): add sessions surface controller`
- `4cf30b0 feat(v6): mount sessions workflow surface`
- `f43d8e6 test(v6): enforce sessions surface boundaries`

Verification:

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 29 - Replay Workflow Entry Surface

Completed in commits:

- `019f20b feat(v6): add replay workflow surface controller`
- `4654b91 feat(v6): mount replay workflow surface`
- `2a7b98c test(v6): enforce replay workflow boundaries`

Verification:

- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 30 - Journal Workflow Entry Surface

Completed in commits:

- `7f54849 feat(v6): add journal workflow surface controller`
- `7bce5c9 feat(v6): mount journal workflow surface`
- `e46714b test(v6): enforce journal surface boundaries`

Verification:

- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/journal-runtime-smoke.js`
- `node v6/tests/journal-persistence-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `git diff --check`

### Step 31 - Workflow Surfaces Readiness Audit

Completed in commits:

- `675e69c feat(v6): hide engineering gates from readiness surface`
- `8f9d078 docs(v6): audit workflow surfaces`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 32 - Product Top Chrome Consolidation

Completed in commits:

- `3d3a6f7 feat(v6): consolidate product top chrome`
- `cd73cea docs(v6): document product top chrome`

Verification:

- `node v6/tests/readiness-surface-controller-smoke.js`
- `node v6/tests/readiness-audit-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 33 - Workflow Panel Product Copy And Layout

Completed in commits:

- `546a9f9 feat(v6): refine workflow panel product copy`
- `3fe49ed test(v6): protect workflow panel layout`

Verification:

- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/settings-panel-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 34 - Workflow Action Active States

Completed in commits:

- `1b2f788 feat(v6): add workflow action active states`
- `661ce3a test(v6): cover workflow action state helper`

Verification:

- `node v6/tests/workflow-action-state-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 35 - Workflow Panel Close Behavior

Completed in commits:

- `9f4ede5 feat(v6): add workflow panel close behavior`
- `5d72c99 test(v6): cover workflow panel close helper`

Verification:

- `node v6/tests/workflow-panel-close-smoke.js`
- `node v6/tests/workflow-action-state-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 36 - Workflow Panel Mutual Exclusivity

Completed in commits:

- `618f2b6 feat(v6): coordinate workflow panel exclusivity`
- `d7a99dd test(v6): cover workflow panel coordinator`

Verification:

- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panel-close-smoke.js`
- `node v6/tests/sessions-surface-controller-smoke.js`
- `node v6/tests/replay-workflow-surface-controller-smoke.js`
- `node v6/tests/journal-surface-controller-smoke.js`
- `node v6/tests/settings-panel-controller-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 37 - Workflow Shell Audit

Completed in commits:

- `28a6666 docs(v6): audit workflow shell behavior`
- `ff2a499 test(v6): protect workflow shell audit`

Verification:

- `node v6/tests/workflow-shell-audit-smoke.js`
- `node v6/tests/workflow-panel-coordinator-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 38 - Replay Chart Readiness Re-Audit

Completed in commits:

- `3122ff9 docs(v6): audit replay chart readiness`
- `9ff7f11 test(v6): protect replay chart readiness audit`

Verification:

- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/manual-wall-replay-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/mixed-timeframe-visible-latency-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 39 - Chart Presentation Surface Audit

Completed in commits:

- `87ac595 docs(v6): audit chart presentation surface`
- `4aeffe1 test(v6): protect chart presentation audit`

Verification:

- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/multi-pane-chart-host-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 40 - Workstation Chart Host Surface

Completed in commits:

- `b33c25d feat(v6): reserve workstation chart host`
- `cf0ed6d docs(v6): update chart presentation audit`

Verification:

- `node v6/tests/workstation-chart-host-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-domain-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 41 - Mount Workstation Chart Adapter

Completed in commits:

- `90e747d1 feat(v6): add workstation chart surface mount`
- `56586e14 feat(v6): mount workstation chart adapter`

Verification:

- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 42 - Connect Chart Data Snapshot To Mounted Adapter

Completed in commits:

- `1a3d854e feat(v6): apply chart data records to workstation chart`
- `ee7bb97a feat(v6): bridge chart data to workstation chart`

Verification:

- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-data-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 43 - Connect Viewport Projection To Mounted Adapter

Completed in commits:

- `1675b8ec feat(v6): apply viewport projection to workstation chart`
- `1fba4157 feat(v6): bridge viewport projection to workstation chart`

Verification:

- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-adapter-browser-smoke.js`
- `node v6/tests/chart-engine-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/default-wall-replay-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 44 - Gate Workstation Default Wall Flow

Completed in commits:

- `3c40b396 test(v6): gate workstation default wall flow`

Verification:

- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-data-surface-bridge-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 45 - Gate Workstation Manual Wall Flow

Completed in commits:

- `49d8e7c1 test(v6): gate workstation manual wall flow`

Verification:

- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/default-wall-runtime-smoke.js`
- `node v6/tests/chart-viewport-surface-bridge-smoke.js`
- `node v6/tests/workstation-chart-data-bridge-browser-smoke.js`
- `node v6/tests/workstation-chart-viewport-bridge-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/multi-pane-manual-wall-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 46 - FXReplay UI Reference Guardrails

Completed in commits:

- `5e9573d0 docs(v6): capture fxreplay ui guardrails`

Verification:

- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 47 - FXReplay UI Parity Gap Audit

Completed in commits:

- `c411c76b docs(v6): audit fxreplay ui parity gaps`

Verification:

- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 48 - Top Toolbar Shell Parity Slice

Completed in commits:

- `da3ec583 feat(v6): add top toolbar parity shell`

Verification:

- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 49 - Timeframe Menu Shell Parity Slice

Completed in commits:

- `846ce242 feat(v6): add timeframe menu parity shell`

Verification:

- `node v6/tests/timeframe-menu-parity-browser-smoke.js`
- `node v6/tests/display-timeframe-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/status-readout-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 50 - Right Utility Rail Shell Reservation

Completed in commits:

- `e4ccf7f5 feat(v6): reserve right utility rail shell`

Verification:

- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 51 - Real Chart Manual Wall Input Bridge

Completed in commits:

- `40e8e6a9 docs(v6): retarget step fifty one to chart input bridge`
- `65221c65 feat(v6): expose chart visible range subscriptions`
- `83798dde feat(v6): bridge chart range input to manual walls`
- `6d74660c test(v6): gate native chart input manual walls`

Verification:

- `node v6/tests/manual-wall-input-bridge-smoke.js`
- `node v6/tests/chart-engine-adapter-smoke.js`
- `node v6/tests/chart-host-manager-smoke.js`
- `node v6/tests/workstation-chart-surface-smoke.js`
- `node v6/tests/workstation-native-manual-wall-input-browser-smoke.js`
- `node v6/tests/workstation-default-wall-flow-browser-smoke.js`
- `node v6/tests/workstation-manual-wall-flow-browser-smoke.js`
- `node v6/tests/visible-latency-cache-hit-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 52 - Chart Toolbar Chrome Cleanup

Completed in commits:

- `b3624e4f fix(v6): clean duplicate chart toolbar chrome`
- `e121d712 docs(v6): guard chart chrome cleanup`

Verification:

- `node v6/tests/chart-toolbar-cleanup-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/right-utility-rail-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 53 - Session Dashboard Shell Direction

Completed in commits:

- `e1592af5 docs(v6): clarify step fifty three dashboard scope`
- `b15c51ed feat(v6): add session dashboard shell`
- `544179d9 docs(v6): guard session dashboard shell`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/workflow-panels-browser-smoke.js`
- `node v6/tests/top-toolbar-parity-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 54 - Simplify Session Dashboard Tabs

Completed in commits:

- `ccfdf2a1 docs(v6): retarget step fifty four dashboard simplification`
- `a6735ff8 fix(v6): simplify session dashboard entries`
- `ebe5cca2 docs(v6): guard simplified session dashboard`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 55 - Session Dashboard Open Session Contract

Completed in commits:

- `50ebe9d4 docs(v6): scope step fifty five session open contract`
- `be79ea77 feat(v6): add session open command`
- `9cb1f049 fix(v6): open dashboard sessions through runtime`
- `8191b57c fix(v6): remove duplicate session dashboard tabs`

Verification:

- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 56 - Standalone Session Surface

Completed in commits:

- `3d4e901e docs(v6): scope step fifty six session surface`
- `ac345684 feat(v6): make session surface standalone`

Verification:

- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/fxreplay-ui-parity-gap-audit-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 57 - Backtesting Session Setup Form

Completed in commits:

- `e3de8392 docs(v6): scope step fifty seven session setup`
- `0e5fd68f feat(v6): add session setup form model`
- `e6cc06bd feat(v6): add backtesting session setup form`
- `de92a0f0 fix(v6): hide workstation on session surface`

Verification:

- `node v6/tests/session-setup-model-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 58 - Chart Entry Activation Owner

Completed in commits:

- `2677b42e docs(v6): scope step fifty eight activation owner`
- `21a1b47d feat(v6): add chart entry activation runtime`
- `0b9633b4 feat(v6): register chart entry activation runtime`

Verification:

- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 59 - Chart Entry Initialization Plan

Completed in commits:

- `cbcacf07 docs(v6): scope step fifty nine init plan`
- `73aaeb18 feat(v6): define chart entry initialization plan`
- `abc9b19d feat(v6): attach initialization plan to chart entry`

Verification:

- `node v6/tests/chart-entry-plan-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 60 - Chart Entry Context Initialization Owner

Completed in commits:

- `43caa27f docs(v6): scope step sixty context initialization`
- `53c05106 feat(v6): define chart entry context plan`
- `91f38936 feat(v6): add chart entry initialization runtime`
- `f2b607de feat(v6): register chart entry initialization runtime`

Verification:

- `node v6/tests/chart-entry-context-plan-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/chart-entry-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 61 - Chart Entry Bounded Context Load Owner

Completed in commits:

- `32e26c87 docs(v6): scope step sixty one context load`
- `b1501ccc feat(v6): add chart entry context load runtime`
- `4551847d feat(v6): register chart entry context load runtime`

Verification:

- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/chart-entry-initialization-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 62 - Chart Entry Replay Bootstrap Owner

Completed in commits:

- `c868f975 docs(v6): scope step sixty two replay bootstrap`
- `7ae20b36 feat(v6): add chart entry replay bootstrap runtime`
- `3b4adbe0 feat(v6): register chart entry replay bootstrap runtime`

Verification:

- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/chart-entry-context-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 63 - Chart Entry Default Wall Plan Owner

Completed in commits:

- `2000f87e docs(v6): scope step sixty three wall plan`
- `6f11cc51 feat(v6): define chart entry wall plan`
- `9d261a9e feat(v6): add chart entry wall plan runtime`
- `82aa9359 feat(v6): register chart entry wall plan runtime`

Verification:

- `node v6/tests/chart-entry-default-wall-plan-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/chart-entry-replay-bootstrap-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 64 - Chart Entry Projection Preparation Owner

Completed in commits:

- `2741c2cd docs(v6): scope step sixty four projection prep`
- `d7b50ae7 feat(v6): define chart entry projection preparation`
- `ceade2a4 feat(v6): add chart entry projection preparation runtime`
- `282c287f feat(v6): register chart entry projection preparation runtime`

Verification:

- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-default-wall-plan-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 65 - Chart Entry Projection Apply Owner

Completed in commits:

- `80e83b4c docs(v6): scope step sixty five projection apply`
- `4b586035 feat(v6): add chart entry projection apply runtime`
- `1f522cad feat(v6): register chart entry projection apply runtime`

Verification:

- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 66 - Chart Entry Initial Visibility Browser Gate

Completed in commits:

- `e0259d49 docs(v6): scope step sixty six visibility gate`
- `9e46453f fix(v6): align workstation chart pane id`
- `af66f7f3 test(v6): add chart entry visibility smoke`
- `2033c03d docs(v6): align chart presentation pane id`

Verification:

- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/chart-entry-projection-apply-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-presentation-audit-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 67 - Chart Entry Manual Next Owner

Completed in commits:

- `ad398407 docs(v6): scope step sixty seven manual next`
- `5f558c9d feat(v6): add chart entry manual next runtime`
- `7200225a feat(v6): route transport next through chart entry`
- `22e4104a fix(v6): align chart entry cursor projection`
- `9ab77168 test(v6): add chart entry manual next browser smoke`

Verification:

- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-smoke.js`
- `node v6/tests/chart-entry-projection-preparation-runtime-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 68 - Chart Entry Auto Playback Tick Owner

Completed in commits:

- `85554e7a docs(v6): scope step sixty eight autoplay`
- `d4bc7062 feat(v6): add chart entry autoplay owner`
- `3b02c2fb test(v6): verify chart entry autoplay browser flow`

Verification:

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 69 - Chart Entry Playback End-State And Speed Policy

Completed in commits:

- `93f799f7 docs(v6): scope step sixty nine playback policy`
- `9df04628 feat(v6): route active playback speed through owner`
- `330cb94e test(v6): verify playback policy browser flow`

Verification:

- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-policy-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-runtime-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 70 - Chart View Reset Intent Owner

Completed in commits:

- `fe38552c docs(v6): scope step seventy reset view`
- `440c8138 feat(v6): add chart viewport reset owner`
- `ed415bd8 feat(v6): wire reset view control`
- `3dbd3025 fix(v6): reset view to pane default wall`
- `edf197d0 test(v6): verify chart reset view browser flow`
- `5f47a775 test(v6): include reset view in runtime inventory`

Verification:

- `node v6/tests/chart-viewport-store-smoke.js`
- `node v6/tests/chart-viewport-runtime-smoke.js`
- `node v6/tests/reset-view-control-bridge-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 71 - Chart Entry Playback Period Sync Policy

Completed in commits:

- `de86fb32 docs(v6): scope step seventy one playback period`
- `280c4f8d feat(v6): add playback period runtime`
- `263de362 feat(v6): wire playback period controls`
- `84af0053 test(v6): cover playback period sync`

Verification:

- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

### Step 72 - Chart Entry Playback Period Execution Integration

Completed in commits:

- `6241ffab docs(v6): scope step seventy two playback execution`
- `b112ba2a feat(v6): apply playback period to manual next`
- `d20f9cbc test(v6): verify playback period execution`

Verification:

- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 73 - Playback Period Boundary Gates

Completed in commits:

- `d7180ed7 docs(v6): scope step seventy three boundaries`
- `fc745805 fix(v6): guard playback period replay end`
- `33e681eb test(v6): gate playback period browser boundaries`

Verification:

- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-playback-period-policy-smoke.js`
- `node v6/tests/chart-entry-manual-next-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/playback-period-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-manual-next-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 74 - Playback Period UI Feedback

Completed in commits:

- `4109e1b9 docs(v6): scope step seventy four transport feedback`
- `e5ea90cb feat(v6): show ended replay transport state`
- `e228955e test(v6): verify ended transport feedback`
- `4d52b47e fix(v6): keep transport playing during replay advance`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-runtime-smoke.js`
- `node v6/tests/chart-entry-auto-play-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 75 - Replay End Restart Entry Policy

Completed in commits:

- `fac490d4 docs(v6): scope step seventy five restart entry`
- `5e99061b feat(v6): add chart entry restart owner`
- `996fb2a1 feat(v6): wire explicit replay restart control`
- `14cdef1f test(v6): verify replay restart browser flow`

Verification:

- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 76 - Restart UX Polish And Semantics

Completed in commits:

- `d6bb0e28 docs(v6): scope step seventy six restart polish`
- `03bd3070 feat(v6): clarify restart transport semantics`
- `363e749b fix(v6): refresh transport after replay restart`
- `5d4cc823 fix(v6): stabilize transport after restart`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/chart-entry-restart-runtime-smoke.js`
- `node v6/tests/replay-chart-readiness-audit-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/playback-period-browser-smoke.js`
- `node v6/tests/chart-reset-view-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 77 - Transport Control Visual State Audit

Completed in commits:

- `e299cfff docs(v6): scope step seventy seven transport audit`
- `270259e2 feat(v6): harden transport control states`
- `6e6cb3c2 test(v6): audit transport visual states`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 78 - Transport Focus And Keyboard Polish

Completed in commits:

- `6e3f37ef docs(v6): scope step seventy eight transport focus`
- `5e4a3b81 feat(v6): polish transport focus keyboard`
- `72f2bf24 test(v6): verify transport focus keyboard`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 79 - Transport Drag Position Persistence

Completed in commits:

- `b07f23bf docs(v6): scope step seventy nine transport persistence`
- `d6a6aad0 feat(v6): persist transport drag position`
- `32e1df68 test(v6): verify transport position persistence`

Verification:

- `node v6/tests/replay-transport-controller-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/replay-transport-position-persistence-browser-smoke.js`
- `node v6/tests/replay-transport-browser-smoke.js`
- `node v6/tests/replay-transport-focus-keyboard-browser-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/chart-entry-restart-browser-smoke.js`
- `node v6/tests/chart-entry-playback-period-boundary-browser-smoke.js`
- `node v6/tests/chart-entry-auto-play-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `git diff --check`

### Step 80 - Session Dashboard Persistence Boundary

Completed in commits:

- `5285817e docs(v6): scope step eighty session boundary`
- `9a9025ba docs(v6): define session dashboard persistence boundary`
- `b3ff08f3 test(v6): gate session dashboard persistence boundary`

Verification:

- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/fxreplay-ui-guardrails-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

### Step 81 - Session Metadata Persistence Adapter

Completed in commits:

- `8f1cd83d docs(v6): scope step eighty one session metadata`
- `172bb8ea feat(v6): persist session metadata`
- `4eb472e6 test(v6): verify durable session metadata`

Verification:

- `node v6/tests/session-metadata-storage-smoke.js`
- `node v6/tests/session-dashboard-persistence-boundary-smoke.js`
- `node v6/tests/runtime-core-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `node v6/tests/session-metadata-persistence-browser-smoke.js`
- `node v6/tests/session-dashboard-browser-smoke.js`
- `node v6/tests/app-shell-browser-smoke.js`
- `node v6/tests/product-baseline-screenshot-smoke.js`
- `node v6/tests/chart-entry-initial-visibility-browser-smoke.js`
- `git diff --check`

## Deferred Until Later Gates

- visual polish.

## V5 Reference Policy

Allowed from V5:

- product wording and workflow lessons;
- stable V4 API usage;
- test fixture data generation;
- selected UI layout ideas after Step 6 passes.
- FXReplay-like interaction targets from specs, not V5 implementation paths.

Forbidden from V5:

- chart runtime viewport/follow/manual internals;
- replay display-window viewport restoration model;
- viewport-demand bridge ownership;
- manual anchor patches based on time range plus logical reconstruction;
- route-level orchestration that couples cursor, data loading, and chart range
  writes.
- primary/non-primary split mechanisms.
- any replay path that updates runtime cursor quickly but delays visible candle
  appearance without failing a browser latency gate.
