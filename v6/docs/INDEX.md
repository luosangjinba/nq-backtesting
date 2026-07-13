# V6 Documentation Index

Read this index before working on V6.

## Required First Reads

- `v6/README.md`: V6 purpose, hard rules, and V5 usage boundary.
- `v6/docs/V6_PRODUCT_DIRECTION.md`: current product direction, target users,
  foundation priorities, and modular/plugin-oriented extension rule.
- `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`: binding decision that
  validation is the outcome, replay remains the shared experiment/practice
  environment, and future evidence/statistics must be auditable.
- `v6/docs/V6_ARCHITECTURE.md`: runtime boundaries and non-porting rules.
- `v6/docs/V6_EXECUTION_ROADMAP.md`: detailed execution order based on the
  useful V5 formation sequence, with V6 gates inserted earlier.
- `v6/docs/V6_PRODUCTION_COMPLEXITY_REDUCTION_STEP393.md`: Step 393 extraction
  results, production/test boundary cleanup, V6-owned browser asset, and the
  Step 394 static-test consolidation recommendation.
- `v6/docs/V6_HISTORICAL_STATIC_TEST_AUDIT_STEP394.md`: Step 394 baseline,
  consolidation rules, final `127/127` static suite, and Step 395 recommendation.
- `v6/docs/V6_REPLAY_TRANSPORT_POSITION_MODULARIZATION_STEP395.md`: extracted
  Replay Transport position domain/controller, regression evidence, and the
  Step 396 period-menu controller recommendation.
- `v6/docs/V6_REPLAY_TRANSPORT_PERIOD_MENU_MODULARIZATION_STEP396.md`: extracted
  period navigation/domain controller boundaries, regression evidence, and the
  Step 397 presentation-renderer recommendation.
- `v6/docs/V6_REPLAY_TRANSPORT_PRESENTATION_MODULARIZATION_STEP397.md`: extracted
  command-free DOM presentation, Replay Transport modularization stop condition,
  and the Step 398 product/foundation gap re-selection recommendation.
- `v6/docs/V6_PRODUCT_FOUNDATION_GAP_REAUDIT_STEP398.md`: five-journey evidence,
  official Lightweight Charts/awesome-tradingview capability check, regression
  results, and the selected Date Range gap.
- `v6/docs/V6_ACTIVE_PANE_DATE_LOCATOR_SELECTION_STEP398.md`: Step 399 loaded-
  window Go-to-time selection retained as a rejected interpretation; do not
  implement it.
- `v6/docs/V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md`: corrected Go-to semantics,
  New York-time session anchors, ownership, shared materialization requirement,
  Step 403-407 execution plan, and stop conditions.
- `v6/docs/V6_VIEWPORT_FILLED_HTF_HISTORY_STEP399.md`: production diagnosis of
  stale target-history API deployment, viewport-sized target windows,
  prefetch-threshold behavior, and Step 400 real-service acceptance gate.
- `v6/docs/V6_UNIFIED_TARGET_HISTORY_FULL_TIMEFRAME_STEP400.md`: shared target-
  history pipeline for `30m` through `1M`, fixed/session-calendar bucket
  boundaries, real-service/browser matrix evidence, and Step 401 visual gate.
- `v6/docs/V6_PRODUCT_RESEARCH.md`: non-normative research input retained for
  provenance; its competitor matrix and recommendations are not implementation
  authority.
- `v6/docs/V6_PRODUCT_TOP_CHROME.md`: top chrome product-surface rules,
  diagnostics visibility limits, and UI reference handling.
- `v6/docs/V6_WORKFLOW_SHELL_AUDIT.md`: audit of workflow shell chrome,
  panels, active state, close behavior, mutual exclusivity, and ownership.
- `v6/docs/V6_REPLAY_CHART_READINESS_AUDIT.md`: replay/chart gate results after
  workflow shell work and the next chart-facing direction.
- `v6/docs/V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md`: replay/chart
  re-entry audit after dashboard closeout and the next chart-surface owner
  contract direction.
- `v6/docs/V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`: chart surface
  owner contract integration audit and next boundary-smoke expansion direction.
- `v6/docs/V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md`: chart control bridge
  owner contract wiring audit and next boundary-smoke expansion direction.
- `v6/docs/V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md`: chart control
  bridge browser regression audit for native manual wall and reset-view paths.
- `v6/docs/V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md`: dashboard row-action
  isolation re-audit after chart control bridge browser regression.
- `v6/docs/V6_DASHBOARD_VISIBLE_ROW_ACTION_BROWSER_COVERAGE_AUDIT.md`: browser
  coverage audit for visible Summary, Stats, and Copy row actions.
- `v6/docs/V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`: dashboard
  and session browser regression pack audit before exposing more row actions.
- `v6/docs/V6_NEXT_DASHBOARD_ROW_ACTION_EXPOSURE_READINESS_AUDIT.md`: readiness
  audit for choosing the next hidden dashboard row action exposure target.
- `v6/docs/V6_JOURNAL_ROW_ACTION_OWNER_SURFACE_READINESS_AUDIT.md`: Journal
  owner surface readiness audit before dashboard row-action exposure.
- `v6/docs/V6_JOURNAL_ROW_ACTION_SESSION_CONTEXT_CONTRACT.md`: Journal-owned
  session context contract for a future dashboard row action.
- `v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_HARNESS.md`: hidden Journal row-action
  harness for owner-side testing before dashboard exposure.
- `v6/docs/V6_HIDDEN_JOURNAL_ROW_ACTION_BROWSER_HARNESS.md`: browser coverage
  for the hidden Journal row-action harness before dashboard exposure.
- `v6/docs/V6_JOURNAL_SURFACE_READY_FLAG_AUDIT.md`: Journal surface-ready flag
  audit after hidden harness and browser coverage.
- `v6/docs/V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md`: final Journal
  row-action exposure gate audit before visible dashboard wiring.
- `v6/docs/V6_JOURNAL_ROW_ACTION_VISIBILITY_WIRING.md`: visible Journal
  row-action wiring and browser coverage.
- `v6/docs/V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`: dashboard
  and session regression pack audit after Journal became visible.
- `v6/docs/V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`: workstation chart
  presentation boundary re-audit after dashboard row-action work.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION.md`: selected next bounded
  workstation/chart implementation slice.
- `v6/docs/V6_LEFT_DRAWING_RAIL_RESERVATION.md`: accepted inert shell-owned
  left drawing/tool rail reservation for the workstation chart surface.
- `v6/docs/V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`: accepted workstation
  rail/chrome regression audit after adding the left drawing rail.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`: selected next
  bounded workstation/chart slice after rail regression.
- `v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`: accepted inert
  bottom account/trading chrome reservation.
- `v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`: accepted lower workstation
  chrome regression audit after adding bottom account/trading chrome.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`: selected next
  bounded workstation/chart slice after lower chrome stabilization.
- `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`: accepted
  inert right-rail Session settings panel reservation.
- `v6/docs/V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`:
  accepted right-rail Session settings panel regression audit.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`: selected next
  bounded workstation/chart slice after Session settings panel stabilization.
- `v6/docs/V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`: accepted workstation UI
  parity gap re-audit after Session settings panel stabilization.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`: selected next
  bounded workstation/chart slice after workstation UI parity gap re-audit.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`: selected next
  bounded workstation/chart slice after diagnostics visibility cleanup.
- `v6/docs/V6_SESSION_SETTINGS_OWNER_CONTRACT.md`: accepted session-settings
  owner contract, read-only draft, validation helpers, and boundary coverage.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`: selected next
  bounded workstation/chart slice after the session-settings owner contract.
- `v6/docs/V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`: accepted screenshot/export
  owner contract, read-only export intent, validation helpers, and boundary
  coverage.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`: selected next
  bounded workstation/chart slice after the screenshot/export owner contract.
- `v6/docs/V6_INDICATORS_OWNER_CONTRACT.md`: accepted indicators owner
  contract, built-in indicator id whitelist, read-only intent, validation
  helpers, and boundary coverage.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`: selected next
  bounded workstation/chart slice after the indicators owner contract.
- `v6/docs/V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`: accepted
  drawing/action-history owner contract, built-in drawing tool whitelist,
  read-only intent, validation helpers, and boundary coverage.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`: selected next
  bounded workstation/chart slice after the drawing/action-history owner
  contract.
- `v6/docs/V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`: accepted account/trading
  owner contract, account readout fields, trade draft fields, read-only intent,
  validation helpers, and boundary coverage.
- `v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md`: selected next
  bounded workstation/chart slice after the account/trading owner contract.
- `v6/docs/V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`: accepted
  reprioritization from additional workstation chrome owner contracts back to
  database K-line import, replay K-line flow, reset view, and multi-pane chart
  foundations.
- `v6/docs/V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`: accepted database
  K-line import boundary, V4 DuckDB schema discovery, canvas-left request caps,
  exhausted-history metadata, and replay-visible latency requirements.
- `v6/docs/V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`: accepted replay K-line chart
  flow gate using bounded bar-data windows, browser-visible latest-candle
  checks, and chart-viewport wall span ownership.
- `v6/docs/V6_RESET_VIEW_KXG_FLOW_STEP146.md`: accepted reset view / KXG reset
  flow gate after initial replay K-line load and after replay `Next`, preserving
  bar-data, replay, chart-data, chart-engine, and chart-viewport ownership.
- `v6/docs/V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`: accepted multi-pane
  chart foundation using multi-host chart surface mounting and pane-local
  chart-data / chart-viewport bridge fan-out.
- `v6/docs/V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`: accepted bounded
  leftward historical K-line extension through chart-history coordination,
  bar-data requests, and chart-data prepend/merge ownership.
- `v6/docs/V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`: accepted
  drag/wheel-triggered historical extension hardening with in-flight and
  exhausted older-window suppression.
- `v6/docs/V6_REPLAY_SPEED_UNDER_HISTORY_EXTENSION_STEP150.md`: accepted replay
  speed under history extension, including pending older-window requests,
  immediate post-extension `Next`, and stale-cursor prepend protection.
- `v6/docs/V6_CONTINUOUS_LEFTWARD_HISTORY_STEP151.md`: accepted continuous
  leftward historical extension until exhausted, pane-local exhaustion memory,
  browser repeated-extension coverage, and replay isolation.
- `v6/docs/V6_AUTO_PLAY_CONTINUOUS_HISTORY_STEP152.md`: accepted auto-play
  speed under continuous leftward historical extension, including browser-visible
  latest-candle updates after repeated older-window loads.
- `v6/docs/V6_CROSSHAIR_OHLC_READOUT_STEP153.md`: accepted crosshair-selected
  OHLC readout ownership through Lightweight Charts crosshair events, chart
  surface pane-local state, and shell readout rendering.
- `v6/docs/V6_MULTI_PANE_CROSSHAIR_READOUT_STEP154.md`: accepted multi-pane
  crosshair OHLC readout isolation using hovered-pane readout selection and
  non-current pane null suppression.
- `v6/docs/V6_MULTI_PANE_LEFTWARD_HISTORY_STEP155.md`: accepted multi-pane
  leftward historical extension isolation using pane-local chart-history
  requests, exhausted-history memory, and chart-data prepends.
- `v6/docs/V6_MULTI_PANE_REPLAY_APPEND_STEP156.md`: accepted multi-pane replay
  append and auto-play isolation using pane-aware manual next dispatch,
  pane-aware auto-play state, and pane-local chart-data appends.
- `v6/docs/V6_MULTI_PANE_REPLAY_VIEWPORT_PROJECTION_STEP157.md`: accepted
  multi-pane replay viewport projection isolation for manual next, auto-play,
  and replay append after pane-local historical extension.
- `v6/docs/V6_CHART_FOUNDATION_INTEGRATION_REAUDIT_STEP158.md`: accepted chart
  foundation integration re-audit across database import, replay, reset view,
  multi-pane, history, crosshair, append, viewport, and owner-boundary wiring.
- `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP159.md`: selected Layout
  Menu Owner Binding as the next bounded chart-facing implementation slice.
- `v6/docs/V6_LAYOUT_MENU_OWNER_BINDING_STEP160.md`: accepted Page layout menu
  owner binding through shell UI controller and layout-runtime commands.
- `v6/docs/V6_LAYOUT_PANE_SURFACE_REFLOW_STEP161.md`: accepted layout runtime
  mode changes flowing into chart-surface-owned one/two/three pane host
  presentation.
- `v6/docs/V6_LAYOUT_PANE_DATA_BOOTSTRAP_STEP162.md`: accepted newly visible
  layout pane data and viewport bootstrap through existing owner commands.
- `v6/docs/V6_PANE_LOCAL_RESET_VIEW_CONTROLS_STEP163.md`: accepted pane-local
  reset view / KXG reset controls that target only the clicked pane viewport.
- `v6/docs/V6_LAYOUT_VARIANT_GEOMETRY_STEP164.md`: accepted Page layout variant
  state and chart-surface-owned geometry for two-pane and three-pane variants.
- `v6/docs/V6_PANE_RESIZE_DRAG_STEP165.md`: accepted chart-surface-owned pane
  resize handles and local per-variant resize ratios.
- `v6/docs/V6_REPLAY_SAFE_RELOAD_WINDOW_PLAN_STEP174.md`: accepted pure
  replay-safe reload window planning from pane reload-intent records, capped at
  the replay cursor and not yet issuing bar-data requests.
- `v6/docs/V6_RELOAD_WINDOW_PLANNING_RUNTIME_STEP175.md`: accepted runtime
  handoff from pane reload-intent events to replay-safe planned reload windows,
  still without issuing bar-data requests.
- `v6/docs/V6_PLANNED_RELOAD_BAR_DATA_HANDOFF_STEP176.md`: accepted planned
  reload window consumption through the bar-data owner, still without
  chart-data replacement or viewport projection.
- `v6/docs/V6_RELOADED_DATA_CHART_DATA_REPLACEMENT_STEP177.md`: accepted loaded
  reload data replacement into pane-local chart-data with no-future filtering,
  still without viewport projection.
- `v6/docs/V6_RELOAD_REPLACEMENT_VIEWPORT_PROJECTION_STEP178.md`: accepted
  reload chart-data replacement viewport projection through the chart-viewport
  owner without direct chart-engine writes.
- `v6/docs/V6_PANE_RELOAD_PIPELINE_E2E_STEP179.md`: accepted end-to-end
  runtime and browser coverage for pane Symbol/Interval reload from pane intent
  through replay-safe planning, bar-data load, chart-data replacement, and
  viewport projection.
- `v6/docs/V6_BROWSER_SMOKE_HARNESS_RELIABILITY_STEP180.md`: accepted browser
  smoke harness reliability hardening with per-run Chrome debug ports,
  parallel browser coverage, and cleanup verification.
- `v6/docs/V6_CHART_BROWSER_REGRESSION_PACK_STEP181.md`: accepted selected
  chart browser regression pack for reload, pane bootstrap, multi-pane replay
  append, viewport projection, and pane-local reset gates.
- `v6/docs/V6_REPLAY_SAFE_LEFTWARD_HISTORY_LATENCY_STEP187.md`: accepted
  replay-safe leftward history latency gate for delayed/coalesced/chunked older
  history while replay and manual drag remain visually responsive.
- `v6/docs/V6_GLOBEX_SESSION_BOUNDARY_CLARITY_STEP188.md`: accepted distinction
  between dashboard trading-date labels and futures chart data boundaries such
  as the prior Sunday Globex open.
- `v6/docs/V6_MANUAL_NEXT_HTF_VISIBLE_LATENCY_STEP197.md`: accepted manual-next
  routing through chart-data projection owner for higher display timeframes
  with rendered-candle latency coverage.
- `v6/docs/V6_UI_EXTRACTION_WORKFLOW_AUDIT_STEP197_5.md`: accepted
  browser/computed-style/spec-first UI audit workflow as a process reference
  while rejecting Next/React/shadcn/Tailwind adoption for V6.
- `v6/docs/V6_AUTO_PLAY_HTF_PROJECTION_AUDIT_STEP199.md`: accepted auto-play
  as a projection-free scheduler over manual-next while preserving 5m visible
  latency coverage.
- `v6/docs/V6_RESET_VIEW_HTF_PROJECTION_AUDIT_STEP200.md`: accepted reset view
  as a viewport operation over applied display chart-data state, not a
  projection-owner or chart-engine aggregation path.
- `v6/docs/V6_HTF_PROJECTION_INTEGRATION_REVIEW_STEP201.md`: integration
  review for the Step 193-200 HTF projection chain and next pane identity /
  display-timeframe consistency review target.
- `v6/docs/V6_PANE_IDENTITY_DISPLAY_TIMEFRAME_REVIEW_STEP202.md`: accepted
  pane runtime id versus chart-surface pane id review and interim active-pane
  fallback contract before future TF UI or indicator work.
- `v6/docs/V6_PANE_IDENTITY_BOOTSTRAP_NORMALIZATION_STEP203.md`: accepted pane
  runtime bootstrap normalization to `main`, `secondary`, and `tertiary`, plus
  the next fallback removal/narrowing recommendation.
- `v6/docs/V6_WEEKLY_PROJECTION_INTEGRATION_STEP269.md`: accepted weekly
  projection integration through chart-data projection and session-calendar
  trading week buckets.
- `v6/docs/V6_MONTHLY_PROJECTION_INTEGRATION_STEP270.md`: accepted monthly
  projection integration through chart-data projection and session-calendar
  trading month buckets.
- `v6/docs/V6_SESSION_AWARE_HTF_PROJECTION_CONSOLIDATION_STEP271.md`: accepted
  consolidation of `1D`/`1W`/`1M` normalization, reload source-count planning,
  and browser projection fixtures.
- `v6/docs/V6_HTF_REPLAY_GAP_REGRESSION_PACK_STEP272.md`: accepted regression
  pack for `1D`/`1W`/`1M` manual-next and auto-play source-bar advancement
  across replay no-bar gaps.
- `v6/docs/V6_HTF_BROWSER_REPLAY_GAP_PACK_STEP273.md`: accepted
  browser-visible replay gap pack for `1D`/`1W`/`1M` manual-next and auto-play
  across `16:59 -> 18:00`.
- `v6/docs/V6_REPLAY_GAP_BROWSER_REGRESSION_RUNNER_STEP274.md`: accepted
  compact browser runner for the replay no-bar gap coverage introduced by
  Steps 258, 263, and 273.
- `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP275.md`: selected a
  Timeframe/Replay Foundation Regression Runner as the next bounded
  chart-foundation slice after replay-gap hardening.
- `v6/docs/V6_TIMEFRAME_REPLAY_FOUNDATION_REGRESSION_PACK_STEP276.md`:
  accepted compact browser pack for timeframe switching, projection, leftward
  history, session-aware HTF projection, and replay-gap coverage.
- `v6/docs/V6_HTF_LEFTWARD_SOURCE_WINDOW_POLICY_STEP277.md`: accepted adaptive
  source-window sizing for high-timeframe leftward history extension.
- `v6/docs/V6_TARGET_TIMEFRAME_DATA_PHASE_PLAN_STEP278.md`: accepted
  phase-level plan for target-timeframe data infrastructure so high-timeframe
  chart history can load target bars instead of large frontend `1m`
  aggregation windows.
- `v6/docs/V6_CHART_FOUNDATION_NEXT_SLICE_SELECTION_STEP279.md`: selected
  Target-Timeframe Data Contract And Schema Discovery as the next bounded
  implementation slice.
- `v6/docs/V6_TARGET_TIMEFRAME_SCHEMA_DISCOVERY_STEP280.md`: accepted the
  current V4/DuckDB source-bars schema discovery and initial target-bars
  storage direction for the target-timeframe data phase.
- `v6/docs/V6_TARGET_TIMEFRAME_SERVER_AGGREGATION_STEP281.md`: accepted the
  first backend-only target-timeframe aggregation boundary and V6 adapter
  contract without routing chart runtimes to target bars yet.
- `v6/docs/V6_BAR_DATA_TARGET_TIMEFRAME_SUPPORT_STEP282.md`: accepted explicit
  bar-data runtime target-timeframe planning, loading, caching, release, and
  diagnostics commands while preserving existing source-bar behavior.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_PREPARATION_STEP283.md`:
  accepted the display/history target-bars opt-in planning boundary without
  routing display-timeframe or chart-history runtime behavior to target bars yet.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_HISTORY_OPT_IN_STEP284.md`: accepted
  the first controlled display-timeframe target-history opt-in runtime path via
  bar-data target commands while preserving default source projection.
- `v6/docs/V6_CHART_HISTORY_TARGET_LEFTWARD_OPT_IN_STEP285.md`: accepted the
  first controlled chart-history leftward target-bars opt-in path while keeping
  default leftward history on source-window projection.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_ACTIVATION_STEP286.md`: accepted
  the first high-timeframe chart-history activation policy that emits
  target-history payloads from the leftward input bridge.
- `v6/docs/V6_ACTIVATED_TARGET_HISTORY_BROWSER_INTEGRATION_STEP287.md`:
  accepted browser/runtime integration coverage for activated target-history
  high-timeframe leftward extension.
- `v6/docs/V6_TARGET_HISTORY_PERFORMANCE_OBSERVABILITY_STEP288.md`: accepted
  runtime/browser diagnostics for target-history versus source-window leftward
  extension latency and fallback state.
- `v6/docs/V6_TARGET_HISTORY_OPTIMIZATION_DECISION_STEP289.md`: accepted the
  next target-history optimization target as a small diagnostics readout based
  on Step 288 runtime diagnostics.
- `v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_STEP290.md`: accepted the
  shell-owned target-history diagnostics readout for pane-local leftward
  extension feedback.
- `v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_BROWSER_STEP291.md`:
  accepted real browser coverage for the target-history diagnostics readout on
  the activated high-timeframe target path.
- `v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_FALLBACK_BROWSER_STEP292.md`:
  accepted real browser coverage for the target-history diagnostics readout
  fallback path.
- `v6/docs/V6_TARGET_HISTORY_DIAGNOSTICS_READOUT_REGRESSION_PACK_STEP293.md`:
  accepted the compact target-history diagnostics readout browser regression
  pack.
- `v6/docs/V6_TARGET_HISTORY_OPTIMIZATION_RESELECTION_STEP294.md`: selected
  target-history request sizing as the next optimization slice after readout
  coverage was packaged.
- `v6/docs/V6_TARGET_HISTORY_REQUEST_SIZING_STEP295.md`: accepted the
  target-history request sizing audit and deferred runtime sizing changes until
  browser diagnostics show a concrete mismatch.
- `v6/docs/V6_TARGET_HISTORY_REQUEST_SIZING_BROWSER_DIAGNOSTICS_STEP296.md`:
  accepted browser-path assertions that `8h` target-history request sizing
  matches the policy target.
- `v6/docs/V6_TARGET_HISTORY_SESSION_AWARE_SIZING_SELECTION_STEP297.md`:
  selected `1D` as the first session-aware target-history request sizing
  browser assertion slice.
- `v6/docs/V6_DAILY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP298.md`:
  accepted browser coverage for `1D` target-history request sizing and source
  preservation.
- `v6/docs/V6_DAILY_TARGET_HISTORY_SIZING_PACK_SELECTION_STEP299.md`: added
  daily target-history request sizing coverage to the compact target-history
  browser regression pack.
- `v6/docs/V6_TARGET_HISTORY_PHASE_D_NEXT_SLICE_SELECTION_STEP300.md`:
  selected `1D` target-history fallback browser coverage as the next Phase D
  slice.
- `v6/docs/V6_DAILY_TARGET_HISTORY_FALLBACK_BROWSER_STEP301.md`: accepted
  browser coverage for `1D` target-history fallback and added it to the compact
  target-history browser regression pack.
- `v6/docs/V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP302.md`:
  selected `1W` target-history request sizing browser coverage as the next
  bounded target-history slice.
- `v6/docs/V6_WEEKLY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP303.md`:
  accepted browser coverage for `1W` target-history request sizing and added it
  to the compact target-history browser regression pack.
- `v6/docs/V6_WEEKLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP304.md`: accepted
  browser coverage for `1W` target-history fallback and added it to the compact
  target-history browser regression pack.
- `v6/docs/V6_MONTHLY_TARGET_HISTORY_REQUEST_SIZING_SELECTION_STEP305.md`:
  selected `1M` target-history request sizing browser coverage as the next
  bounded target-history slice.
- `v6/docs/V6_MONTHLY_TARGET_HISTORY_REQUEST_SIZING_BROWSER_STEP306.md`:
  accepted browser coverage for `1M` target-history request sizing and added it
  to the compact target-history browser regression pack.
- `v6/docs/V6_MONTHLY_TARGET_HISTORY_FALLBACK_BROWSER_STEP307.md`: accepted
  browser coverage for `1M` target-history fallback and added it to the compact
  target-history browser regression pack.
- `v6/docs/V6_TARGET_HISTORY_PHASE_D_REAUDIT_STEP308.md`: re-audited complete
  fixed/daily/weekly/monthly target-history browser coverage and selected
  browser pack runtime/cost control as the next bounded slice.
- `v6/docs/V6_TARGET_HISTORY_BROWSER_PACK_COST_CONTROL_STEP309.md`: accepted
  test-only target-history browser pack group/member selection while preserving
  the full eight-member pack as the default comprehensive command.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_AUDIT_STEP310.md`:
  accepted the pure high-timeframe target-history responsiveness audit and
  selected a browser-visible responsiveness harness as the next bounded slice.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BROWSER_HARNESS_STEP311.md`:
  accepted the focused browser-visible high-timeframe target-history
  responsiveness harness for `8h`, `1D`, and `1W` samples.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RESPONSIVENESS_BUDGET_DECISION_STEP312.md`:
  accepted the pure high-timeframe target-history responsiveness budget report
  and selected bounded runtime optimization as the next implementation slice.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_RUNTIME_OPTIMIZATION_PROBE_STEP313.md`:
  accepted the pure bounded runtime optimization probe and selected browser
  phase timing as the next bounded slice before runtime behavior changes.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_TIMING_STEP314.md`:
  accepted browser-observed target-history phase timing for `8h`, `1D`, and
  `1W` records before any runtime behavior changes.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_PHASE_BUDGET_SELECTION_STEP315.md`:
  accepted the pure phase-budget selector for target-history phase-timed
  records and selected browser selector integration as the next bounded slice.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_PHASE_BUDGET_SELECTION_STEP316.md`:
  accepted browser integration for the target-history phase-budget selector and
  selected a real-budget browser phase report as the next bounded slice.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_REAL_BUDGET_BROWSER_PHASE_REPORT_STEP317.md`:
  accepted the real-budget browser phase report over target-history `8h`,
  `1D`, and `1W` records before runtime behavior changes.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_SELECTED_PATH_SLICE_SELECTION_STEP318.md`:
  accepted browser-visible apply-lag optimization planning as the next bounded
  target-history implementation slice from the real-budget report.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_VISIBLE_APPLY_LAG_OPTIMIZATION_PLAN_STEP319.md`:
  accepted the shell readout observation boundary and selected a focused
  browser milestone assertion before target-history apply-lag runtime changes.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_BOUNDARY_BROWSER_ASSERTION_STEP320.md`:
  accepted the browser milestone assertion showing target-history apply lag is
  currently a measurement-boundary issue before runtime optimization.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_APPLY_LAG_MEASUREMENT_BOUNDARY_CORRECTION_STEP321.md`:
  accepted the event-driven apply-lag measurement correction and selected
  visual-latency phase attribution stabilization as the next slice.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_VISUAL_LATENCY_PHASE_ATTRIBUTION_STABILIZATION_STEP322.md`:
  accepted sub-frame noise suppression for corrected target-history visual
  latency and selected browser rendering visibility attribution next.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_BROWSER_RENDERING_VISIBILITY_ATTRIBUTION_STEP323.md`:
  accepted browser rendering/readout visibility attribution for corrected
  target-history visual latency and selected trigger coordination latency
  attribution next.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_TRIGGER_COORDINATION_ATTRIBUTION_STEP324.md`:
  accepted trigger coordination attribution for corrected target-history visual
  latency and selected leftward request scheduling planning next.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_LEFTWARD_REQUEST_SCHEDULING_PLAN_STEP325.md`:
  accepted the leftward request scheduling plan and selected the programmatic
  leftward request fast path next.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_PROGRAMMATIC_LEFTWARD_FAST_PATH_STEP326.md`:
  accepted the programmatic leftward request fast path and selected
  high-timeframe responsiveness re-measurement next.
- `v6/docs/V6_HIGH_TIMEFRAME_TARGET_HISTORY_FAST_PATH_REMEASUREMENT_STEP327.md`:
  accepted fast-path responsiveness re-measurement and selected replay
  coordination materialization transition next.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_TRANSITION_SELECTION_STEP328.md`:
  selected replay coordination materialization owner contract as the next
  bounded slice before runtime materialization changes.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_OWNER_CONTRACT_STEP329.md`:
  accepted the replay coordination materialization owner contract and
  source-cursor target-bar no-future policy before runtime handoff changes.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_HANDOFF_SELECTION_STEP330.md`:
  selected a pure replay coordination materialization handoff plan before
  runtime materialization wiring.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_PURE_HANDOFF_PLAN_STEP331.md`:
  accepted the pure replay coordination materialization handoff plan and first
  future wiring point preconditions.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_WIRING_SELECTION_STEP332.md`:
  selected a read-only display-timeframe target materialization wiring
  readiness audit before runtime behavior wiring.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_READINESS_AUDIT_STEP333.md`:
  accepted the read-only display-timeframe target materialization readiness
  audit and selected a wiring plan next.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_WIRING_PLAN_STEP334.md`:
  accepted the read-only display-timeframe target materialization wiring plan
  and selected runtime handoff wiring next.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_RUNTIME_HANDOFF_STEP335.md`:
  accepted Display-Timeframe Runtime target materialization handoff wiring and
  selected browser verification next.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_BROWSER_VERIFICATION_STEP336.md`:
  accepted browser-visible target materialization verification for `8h`, `1D`,
  and `1W`, including source preservation, fallback, responsiveness, and shell
  boundary coverage.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_MATERIALIZATION_REPLAY_COORDINATION_STEP337.md`:
  accepted replay coordination coverage after target materialization, including
  manual next, autoplay, no-bar gap skipping, fallback, and source-cursor append
  filtering.
- `v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_NEXT_SLICE_SELECTION_STEP338.md`:
  selected target-history browser regression pack replay-coordination member
  integration as the next bounded target-timeframe materialization slice.
- `v6/docs/V6_TARGET_HISTORY_PACK_REPLAY_COORDINATION_MEMBER_STEP339.md`:
  accepted optional target-history browser pack member integration for the
  Step 337 replay coordination browser smoke while preserving the default
  eight-member pack.
- `v6/docs/V6_TARGET_TIMEFRAME_MATERIALIZATION_POST_PACK_SELECTION_STEP340.md`:
  selected target materialization replay coordination diagnostics/readout as
  the next bounded slice after pack member integration.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_CONTRACT_STEP341.md`:
  accepted the read-only diagnostics/readout owner contract for materialized
  replay coordination.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_RUNTIME_STEP342.md`:
  accepted the smallest read-only diagnostics runtime state surface with
  `getSnapshot` and `snapshotReady`, without visible UI or replay/target-loading
  behavior changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_WIRING_PLAN_STEP343.md`:
  accepted the pure diagnostics runtime wiring plan from Display-Timeframe,
  Manual Next, and Auto Play producer events into a future update-snapshot
  surface, without live wiring or UI changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_UPDATE_COMMAND_STEP344.md`:
  accepted the bounded diagnostics `updateSnapshot` command surface with
  normalization, validation, rejection safety, and no producer subscriptions or
  UI changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_PAYLOAD_MAPPERS_STEP345.md`:
  accepted pure producer payload mappers from Display-Timeframe, Manual Next,
  and Auto Play events into diagnostics update payloads, still without live
  subscriptions or UI changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_PRODUCER_EVENT_RUNTIME_STEP346.md`:
  accepted diagnostics-runtime-owned producer event subscriptions for
  Display-Timeframe, Manual Next, and Auto Play diagnostics updates, without
  producer runtime or UI changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_BROWSER_READ_STEP347.md`:
  accepted browser/runtime-read coverage proving Display-Timeframe, Manual
  Next, and Auto Play flows update diagnostics snapshots readable through
  `getSnapshot`, without visible UI changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_OWNER_PLAN_STEP348.md`:
  accepted the `shell.pane-status-readout` developer-collapsed pane-local
  diagnostics readout owner plan, first visible fields, internal-only fields,
  hide/collapse rules, and command/event-only consumption boundary without
  visible UI wiring.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_VIEW_MODEL_STEP349.md`:
  accepted the pure shell readout view model mapping diagnostics snapshots to
  hidden/collapsed states and first-visible rows while keeping internal-only
  fields hidden and visible DOM UI unwired.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_PLAN_STEP350.md`:
  accepted the plan-only pane-status DOM wiring contract, container placement,
  dataset attributes, command/event consumption sequence, rendering rules, and
  rollback criteria before visible UI wiring.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_DOM_WIRING_STEP351.md`:
  accepted controlled pane-status diagnostics readout DOM wiring, hidden
  pane-local containers, `getSnapshot`/`snapshotReady` consumption, Step 349
  view-model routing, and hidden/collapsed rendering without producer runtime
  or replay/chart behavior changes.
- `v6/docs/V6_TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_READOUT_PRODUCER_FLOW_STEP352.md`:
  accepted browser regression coverage proving real Display-Timeframe, Manual
  Next, and Auto Play producer flows update the pane-status materialization
  diagnostics readout without direct diagnostics update dispatch or producer
  runtime changes.
- `v6/docs/V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_MEMBER_STEP353.md`:
  accepted optional target-history diagnostics regression pack member
  `readout-producer-flow` for the Step 352 producer-flow readout browser smoke,
  while keeping the default eight-member pack and existing `replay-coordination`
  optional member unchanged.
- `v6/docs/V6_TARGET_HISTORY_PACK_READOUT_PRODUCER_FLOW_COMBINATION_STEP354.md`:
  accepted optional target-history diagnostics pack combination verification for
  `replay-coordination,readout-producer-flow`, confirmed Step 337 then Step 352
  execution order, and selected diagnostics/readout chain closeout and
  next-slice selection next.
- `v6/docs/V6_TARGET_MATERIALIZATION_DIAGNOSTICS_READOUT_CHAIN_SELECTION_STEP355.md`:
  accepted the target-materialization diagnostics/readout chain closeout,
  stopped further observability-only pack wiring for now, and selected
  `narrow-replay-materialization-runtime-handoff-readiness-audit` next.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_READINESS_AUDIT_STEP356.md`:
  accepted the audit-only owner/surface decision for the future narrow replay
  materialization runtime handoff, selecting new owner boundary
  `runtime.replay-coordination-materialization-handoff` and plan-only handoff
  sequencing next.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_PLAN_STEP357.md`:
  accepted the plan-only narrow replay materialization runtime handoff
  sequence, including the Manual Next advanced trigger, exact command order,
  fallback gates, and pure executor harness as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_EXECUTOR_STEP358.md`:
  accepted the pure executor harness for the future narrow replay
  materialization runtime handoff, validating injected command results,
  source-cursor no-future target filtering, fallback gates, and runtime wiring
  audit as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_WIRING_READINESS_AUDIT_STEP359.md`:
  accepted the audit-only live wiring readiness decision for the future narrow
  replay materialization runtime handoff, identifying app registration, event
  subscription, command dispatch wrapper, rollback surfaces, and runtime plan
  as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_PLAN_STEP360.md`:
  accepted the plan-only future runtime implementation shape for the narrow
  replay materialization handoff, defining lifecycle, subscription cleanup,
  dispatch wrapper order, executor invocation, rollback gates, and runtime
  contract as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_RUNTIME_CONTRACT_STEP361.md`:
  accepted the contract-only future runtime surface for the narrow replay
  materialization handoff, defining factory signature, dependency shape,
  wrapper/fallback/diagnostics result shapes, app registration preconditions,
  and unwired runtime skeleton as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_UNWIRED_RUNTIME_SKELETON_STEP362.md`:
  accepted the unwired runtime skeleton for the narrow replay materialization
  handoff, implementing the contract-shaped factory with injectable
  dependencies, start/stop cleanup, command-result wrapper helpers, and app
  registration readiness audit as the next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_READINESS_AUDIT_STEP363.md`:
  accepted the audit-only app registration readiness surface for the unwired
  narrow replay materialization handoff runtime, identifying the exact future
  `v6/src/app.js` import/register position, dependency injection source,
  rollback plan, focused browser coverage, and app registration plan as the
  next slice.
- `v6/docs/V6_NARROW_REPLAY_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_PLAN_STEP364.md`:
  accepted the plan-only app registration slice for the unwired narrow replay
  materialization handoff runtime, defining the exact minimal future
  `v6/src/app.js` diff, dependency injection plan, focused browser smoke,
  rollback gates, and live app registration as the next slice.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_APP_REGISTRATION_STEP365.md`:
  accepted the live app registration for
  `runtime.replay-coordination-materialization-handoff`, adding the minimal
  `v6/src/app.js` import/register diff, focused browser coverage, historical
  static-test alignment, and optional pack-member integration as the next
  slice.
- `v6/docs/V6_REPLAY_COORDINATION_MATERIALIZATION_RUNTIME_HANDOFF_PACK_MEMBER_STEP366.md`:
  accepted optional target-history diagnostics pack member
  `handoff-registration` for the Step 365 app-registration browser smoke while
  preserving the default eight-member pack and selecting HTF leftward-extension
  performance measurement as the next slice.
- `v6/docs/V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_AFTER_HANDOFF_STEP367.md`:
  accepted measurement-only HTF leftward-extension browser coverage for `4h`,
  `8h`, `1D`, and `1W` after handoff runtime registration, separating source
  request, target request, chart-data replacement, viewport reapply, visible
  apply lag, browser paint lag, and runtime duration before selecting the next
  optimization owner.
- `v6/docs/V6_HTF_LEFTWARD_EXTENSION_BOTTLENECK_OWNER_SELECTION_STEP368.md`:
  accepted pure bottleneck owner selection for the Step 367 phase summary,
  selected `target-history-real-chart-paint-visibility-measurement` as the next
  slice because the observed largest bucket was the test-only browser paint
  observation window while runtime/request phases stayed low.
- `v6/docs/V6_HTF_LEFTWARD_EXTENSION_REAL_CHART_PAINT_VISIBILITY_STEP369.md`:
  accepted browser/harness-only real chart paint visibility measurement for
  `4h`, `8h`, `1D`, and `1W`, showing chart signatures already changed by
  `viewport-projected` while the large window came from harness canvas sampling,
  and selected drag-triggered HTF leftward-extension interaction measurement as
  the next slice.
- `v6/docs/V6_HTF_DRAG_TRIGGERED_LEFTWARD_EXTENSION_INTERACTION_STEP370.md`:
  accepted browser/harness-only real wheel-triggered HTF leftward-extension
  interaction measurement for `4h`, `8h`, `1D`, and `1W`, showing the first
  wheel attempt triggers target fetch quickly while the remaining observed
  window needs low-overhead runtime milestone attribution before optimization.
- `v6/docs/V6_HTF_DRAG_TRIGGERED_LOW_OVERHEAD_RUNTIME_MILESTONES_STEP371.md`:
  accepted low-overhead real wheel-triggered runtime milestone attribution for
  `4h`, `8h`, `1D`, and `1W`, identifying `inputToTargetFetchStartMs` around
  the existing `requestDelayMs=500` scheduling window as the dominant remaining
  delay and selecting request scheduling policy selection as the next slice.
- `v6/docs/V6_HTF_TARGET_HISTORY_REQUEST_SCHEDULING_POLICY_SELECTION_STEP372.md`:
  accepted `native-target-history-reduced-delay-with-coalescing` as the bounded
  HTF native wheel/drag target-history scheduling policy, selecting a future
  `100ms` HTF target-history native delay while preserving low-TF and
  target-history-disabled native paths on `requestDelayMs=500`.
- `v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_VISIBLE_RANGE_REDUCED_DELAY_RESOLVER_STEP373.md`:
  accepted pure resolver support for `nativeTargetHistoryDelayMs`, allowing HTF
  native target-history scheduling to resolve to `100ms` while keeping bridge
  runtime wiring unchanged until a later covered step.
- `v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRIDGE_WIRING_STEP374.md`:
  accepted bridge wiring for `nativeTargetHistoryDelayMs: 100` on native
  target-history visible-range requests, preserving low-TF/disabled/programmatic
  paths and selecting real-wheel branch attribution next after only `8h`
  measured near the reduced-delay window.
- `v6/docs/V6_HTF_TARGET_HISTORY_NATIVE_REDUCED_DELAY_BRANCH_ATTRIBUTION_STEP375.md`:
  accepted harness-only branch attribution for real HTF wheel scheduling,
  showing Step 374's native `100ms` branch is present for `4h`, `8h`, `1D`,
  and `1W`, while runtime-originated `500ms` schedules still dominate the slow
  cases and selecting a narrow runtime delayed-schedule suppression fix next.
- `v6/docs/V6_HTF_TARGET_HISTORY_RUNTIME_DELAYED_SCHEDULE_SUPPRESSION_STEP376.md`:
  accepted bridge-local suppression of HTF target-history
  `runtime-surface-check` and `runtime-left-extension-loaded` delayed `500ms`
  schedules, bringing real wheel target-fetch timing for `4h`, `8h`, `1D`,
  and `1W` into the reduced-delay window and selecting a smaller budget
  regression guard next.
- `v6/docs/V6_HTF_TARGET_HISTORY_REDUCED_DELAY_BROWSER_BUDGET_GUARD_STEP377.md`:
  accepted a focused browser pass/fail budget guard for `4h`, `8h`, `1D`, and
  `1W` reduced-delay target-history fetches, asserting native `100ms`
  scheduling, suppressed runtime delayed reasons when present, zero source
  fetches, and sub-`300ms` target-fetch starts.
- `v6/docs/V6_TARGET_HISTORY_PACK_REDUCED_DELAY_BUDGET_MEMBER_STEP378.md`:
  accepted optional target-history diagnostics pack member
  `reduced-delay-budget` for the Step 377 browser budget guard while preserving
  the default eight-member pack and existing optional members.
- `v6/docs/V6_TARGET_HISTORY_PACK_REDUCED_DELAY_OPTIONAL_COMBINATION_STEP379.md`:
  accepted combined optional pack verification for
  `replay-coordination,readout-producer-flow,handoff-registration,reduced-delay-budget`,
  proving the Step 377 budget guard still passes after the other optional
  browser members.
- `v6/docs/V6_HTF_LEFTWARD_EXTENSION_PERFORMANCE_CHAIN_REAUDIT_STEP380.md`:
  accepted closeout re-audit for the HTF leftward-extension performance chain
  from Steps 367-379, closed HTF target-history leftward-extension latency for
  now, listed the active standalone and pack-based reduced-delay guards, and
  selected chart-foundation regression refresh as the next slice.
- `v6/docs/V6_CHART_FOUNDATION_REGRESSION_REFRESH_STEP381.md`: accepted
  chart-foundation regression refresh after Step 380, recorded the passing
  Step 276 foundation pack and Step 377 reduced-delay guard, identified replay
  gap browser pack runtime cost as the weakest current signal, and selected
  Replay Gap Regression Pack Cost Audit as the next slice.
- `v6/docs/V6_REPLAY_GAP_REGRESSION_PACK_COST_AUDIT_STEP382.md`: accepted
  replay-gap browser pack cost audit, attributing Step 274 runtime cost to
  browser harness shape plus manual-step scenario size while preserving replay
  gap assertions and selecting Replay Gap Manual Path Timing Probe as the next
  measurement-only slice.
- `v6/docs/V6_REPLAY_GAP_MANUAL_PATH_TIMING_PROBE_STEP383.md`: accepted
  harness-only timing probe for low-TF and HTF manual replay-gap paths,
  confirming the Manual Next loop dominates cost and selecting Replay Gap
  Near-Gap Manual Fixture Plan as the next slice.
- `v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_PLAN_STEP384.md`: accepted
  standalone near-gap manual fixture plan starting close to
  `2026-06-01T16:58:00.000Z`, preserving low-TF and HTF gap assertions while
  keeping Step 274 and Step 276 membership unchanged and selecting the browser
  probe as the next slice.
- `v6/docs/V6_REPLAY_GAP_NEAR_GAP_MANUAL_FIXTURE_STEP385.md`: accepted
  standalone near-gap manual browser fixture proving the six low-TF/HTF
  replay-gap paths with `2` pre-gap Manual Next calls while keeping Step 274
  and Step 276 membership unchanged.
- `v6/docs/V6_REPLAY_GAP_FAST_PACK_INTEGRATION_SELECTION_STEP386.md`: accepted
  fast/full replay-gap pack split selection, preserving Step 274 as the full
  confirmation command and selecting a standalone fast pack implementation as
  the next slice.
- `v6/docs/V6_REPLAY_GAP_FAST_BROWSER_PACK_STEP387.md`: accepted standalone
  fast replay-gap browser pack implementation using the Step 385 near-gap
  manual fixture plus existing low-TF and HTF auto-play gap smokes.
- `v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_FAST_FULL_SELECTION_STEP388.md`:
  accepted Step 276 replay-gap fast/full mode selection with fast default and
  explicit full mode preserving the Step 274 path.
- `v6/docs/V6_FOUNDATION_PACK_REPLAY_GAP_MODE_STEP389.md`: accepted Step 276
  replay-gap fast/full mode implementation with default fast pack, explicit
  full Step 274 mode, and invalid-mode fail-fast behavior.
- `v6/docs/V6_FOUNDATION_REPLAY_GAP_MODE_CLOSEOUT_STEP390.md`: accepted
  documentation closeout for default fast foundation regression, explicit full
  replay-gap foundation mode, and direct replay-gap pack commands.
- `v6/docs/V6_CHART_FOUNDATION_RUNTIME_REFRESH_SELECTION_STEP391.md`: accepted
  runtime refresh selection after the replay-gap fast/full mode split,
  selecting no additional immediate browser refresh before the next
  chart-foundation re-audit while preserving explicit full replay-gap
  confirmation commands.
- `v6/docs/V6_ARCHITECTURE_REMEDIATION_STEP392.md`: accepted architecture
  remediation for replay materialization contracts, async stale-result safety,
  source-bar cursor advancement, active-pane ownership, target no-future
  coverage, runtime composition, and chart layout extraction.
- `v6/docs/V6_ACTIVE_PANE_FALLBACK_NARROWING_STEP204.md`: accepted audit split
  between removable exact-pane compatibility fallback and intentional
  current-pane active-pane semantics.
- `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP205.md`: selected pane-local
  display-timeframe UI readiness as the next bounded chart-facing slice after
  pane identity and active-pane fallback cleanup.
- `v6/docs/V6_PANE_LOCAL_DISPLAY_TIMEFRAME_UI_READINESS_STEP206.md`: accepted
  explicit target-pane handling for the existing shell display-timeframe control
  before richer TF UI, interval sync, or indicator work.
- `v6/docs/V6_DISPLAY_TIMEFRAME_TARGET_SOURCE_INTEGRATION_STEP207.md`: accepted
  chart-surface pane activation to pane-runtime active state wiring and
  display-timeframe control targeting from the real active pane source.
- `v6/docs/V6_DISPLAY_TIMEFRAME_ACTIVE_PANE_UI_STATE_SYNC_STEP208.md`: accepted
  active-pane display-timeframe label synchronization without projecting or
  replacing chart data on pane switch.
- `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP209.md`: selected pane-local
  symbol/timeframe/OHLC header state sync as the next bounded chart-facing
  slice after active-pane display-timeframe UI sync.
- `v6/docs/V6_PANE_LOCAL_HEADER_STATE_SYNC_STEP210.md`: accepted
  pane-local symbol/timeframe/OHLC header state sync with active-pane header
  presentation state and browser isolation coverage.
- `v6/docs/V6_NEXT_CHART_SLICE_SELECTION_STEP211.md`: selected top-toolbar
  active-pane symbol presentation sync as the next bounded chart-facing slice.
- `v6/docs/V6_CHART_PRESENTATION_SURFACE_AUDIT.md`: real chart host/engine
  presentation status, static placeholder risk, and next chart-surface target.
- `v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md`: FXReplay UI reference kernel for
  workstation chrome, menus, settings, and parity work without pixel-copying.
- `v6/docs/V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`: current V6 workstation shell
  gaps against the FXReplay UI guardrails and the next shell-only UI slice.
- `v6/docs/V6_HANDOFF.md`: latest restart handoff, current completed step,
  next step, key files, boundaries, and verification commands.
- `v6/docs/specs/replay-viewport-intent.md`: the first core V6 contract.
- `v6/docs/specs/replay-visible-latency.md`: user-visible replay candle latency
  gates that prevent V5's delayed K-line appearance problem from returning.
- `v6/docs/specs/pane-model.md`: unified pane model that forbids V5's old
  primary/non-primary split.
- `v6/docs/specs/fxreplay-baseline.md`: FXReplay-like replay workstation
  behavior and layout baseline for the first usable V6 chart route.
- `v6/TODO.md`: current execution steps and acceptance gates.
- `v5/docs/specs/v6-rewrite-start-decision.md`: why V6 exists and which V5
  failure mode it must avoid.

## Stable Specs

- `specs/replay-viewport-intent.md`: canonical viewport-intent model for
  default replay wall, manual temporary walls, native drag/zoom, display-window
  loads, and append/replace behavior.
- `specs/replay-visible-latency.md`: visible-candle latency metric, browser
  harness shape, and pre-feature performance gates.
- `specs/pane-model.md`: one pane state shape and one command/event path for
  single-pane and future multi-pane behavior.
- `specs/fxreplay-baseline.md`: first-screen product baseline for replay
  controls, chart workspace, status, default/manual walls, and no-future bars.
- `V6_PRODUCT_TOP_CHROME.md`: default top chrome rules that keep runtime/test
  diagnostics out of the user's main reading path.
- `V6_WORKFLOW_SHELL_AUDIT.md`: accepted shell-owned workflow behavior and the
  next-direction guardrail after Steps 32-36.
- `V6_REPLAY_CHART_READINESS_AUDIT.md`: passed visible-latency, wall replay,
  display timeframe, multi-pane, and chart engine readiness gates.
- `V6_WORKSTATION_REPLAY_CHART_REENTRY_AUDIT.md`: accepted workstation
  replay/chart re-entry boundary after dashboard closeout.
- `V6_CHART_SURFACE_CONTRACT_INTEGRATION_AUDIT.md`: accepted integration state
  for the chart surface owner contract and bridge boundaries.
- `V6_CHART_CONTROL_BRIDGE_INTEGRATION_AUDIT.md`: accepted integration state
  for chart control bridges that translate user chart controls into viewport
  commands.
- `V6_CHART_CONTROL_BRIDGE_BROWSER_REGRESSION_AUDIT.md`: accepted browser
  regression coverage for chart control bridge user interactions.
- `V6_DASHBOARD_ROW_ACTION_ISOLATION_REAUDIT.md`: accepted isolation state for
  visible and hidden dashboard row actions.
- `V6_DASHBOARD_VISIBLE_ROW_ACTION_BROWSER_COVERAGE_AUDIT.md`: accepted browser
  coverage state for Summary, Stats, and Copy row actions.
- `V6_DASHBOARD_SESSION_BROWSER_REGRESSION_PACK_AUDIT.md`: accepted
  dashboard/session browser regression pack coverage.
- `V6_NEXT_DASHBOARD_ROW_ACTION_EXPOSURE_READINESS_AUDIT.md`: accepted next
  row-action exposure readiness state.
- `V6_JOURNAL_ROW_ACTION_OWNER_SURFACE_READINESS_AUDIT.md`: accepted Journal
  owner surface readiness state before dashboard row-action exposure.
- `V6_JOURNAL_ROW_ACTION_SESSION_CONTEXT_CONTRACT.md`: accepted Journal
  row-action session context contract while the action remains hidden.
- `V6_HIDDEN_JOURNAL_ROW_ACTION_HARNESS.md`: accepted hidden Journal row-action
  harness state before dashboard exposure.
- `V6_HIDDEN_JOURNAL_ROW_ACTION_BROWSER_HARNESS.md`: accepted hidden Journal
  row-action browser harness state before dashboard exposure.
- `V6_JOURNAL_SURFACE_READY_FLAG_AUDIT.md`: accepted Journal surface-ready flag
  state while row-action visibility remains hidden.
- `V6_JOURNAL_ROW_ACTION_EXPOSURE_GATE_AUDIT.md`: accepted Journal exposure
  gate state before visible dashboard wiring.
- `V6_JOURNAL_ROW_ACTION_VISIBILITY_WIRING.md`: accepted visible Journal
  row-action wiring state.
- `V6_DASHBOARD_JOURNAL_ROW_ACTION_REGRESSION_PACK_AUDIT.md`: accepted
  dashboard/session regression pack state after Journal became visible.
- `V6_WORKSTATION_CHART_PRESENTATION_REAUDIT.md`: accepted workstation chart
  presentation boundary after dashboard row-action work.
- `V6_WORKSTATION_CHART_SLICE_SELECTION.md`: accepted next bounded
  workstation/chart implementation slice.
- `V6_LEFT_DRAWING_RAIL_RESERVATION.md`: accepted inert left drawing/tool rail
  reservation and browser coverage.
- `V6_WORKSTATION_RAIL_REGRESSION_AUDIT.md`: accepted workstation rail/chrome
  regression state after left rail reservation.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md`: accepted next
  workstation/chart slice selection after rail regression.
- `V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md`: accepted inert bottom
  account/trading chrome reservation and browser coverage.
- `V6_BOTTOM_CHROME_REGRESSION_AUDIT.md`: accepted lower workstation chrome
  regression state after bottom account/trading chrome reservation.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP125.md`: accepted next
  workstation/chart slice selection after lower chrome stabilization.
- `V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_RESERVATION.md`: accepted inert
  right-rail Session settings panel reservation and browser coverage.
- `V6_RIGHT_RAIL_SESSION_SETTINGS_PANEL_REGRESSION_AUDIT.md`: accepted
  right-rail Session settings panel regression state.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP128.md`: accepted next
  workstation/chart slice selection after Session settings panel stabilization.
- `V6_WORKSTATION_UI_PARITY_GAP_REAUDIT.md`: accepted workstation UI parity
  gap re-audit and refreshed current shell/runtime gap classification.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP130.md`: accepted next
  workstation/chart slice selection after workstation UI parity gap re-audit.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP132.md`: accepted next
  workstation/chart slice selection after diagnostics visibility cleanup.
- `V6_SESSION_SETTINGS_OWNER_CONTRACT.md`: accepted session-settings owner
  contract while the right-rail panel remains disabled and inert.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP134.md`: accepted next
  workstation/chart slice selection after the session-settings owner contract.
- `V6_SCREENSHOT_EXPORT_OWNER_CONTRACT.md`: accepted screenshot/export owner
  contract while the top-toolbar Screenshot button remains disabled and inert.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP136.md`: accepted next
  workstation/chart slice selection after the screenshot/export owner contract.
- `V6_INDICATORS_OWNER_CONTRACT.md`: accepted indicators owner contract while
  the top-toolbar Indicators button remains disabled and inert.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP138.md`: accepted next
  workstation/chart slice selection after the indicators owner contract.
- `V6_DRAWING_ACTION_HISTORY_OWNER_CONTRACT.md`: accepted
  drawing/action-history owner contract while the left drawing rail and
  top-toolbar undo/redo controls remain disabled and inert.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP140.md`: accepted next
  workstation/chart slice selection after the drawing/action-history owner
  contract.
- `V6_ACCOUNT_TRADING_OWNER_CONTRACT.md`: accepted account/trading owner
  contract while the bottom Buy, Sell, quantity, Analytics, balance, and PnL
  surfaces remain disabled and inert.
- `V6_WORKSTATION_CHART_SLICE_SELECTION_STEP142.md`: accepted next
  workstation/chart slice selection after the account/trading owner contract.
- `V6_CHART_FOUNDATION_REPRIORITIZATION_STEP143.md`: accepted chart foundation
  priority reset after Step 142, with Step 144 directed at database K-line
  import through the bar-data boundary.
- `V6_DATABASE_KLINE_IMPORT_BOUNDARY_STEP144.md`: accepted database K-line
  import boundary, V4 DuckDB schema discovery, canvas-left request caps,
  exhausted-history metadata, and replay-visible latency requirements.
- `V6_REPLAY_KLINE_CHART_FLOW_STEP145.md`: accepted replay K-line chart flow
  gate using bounded bar-data windows, browser-visible latest-candle checks,
  and chart-viewport wall span ownership.
- `V6_RESET_VIEW_KXG_FLOW_STEP146.md`: accepted reset view / KXG reset flow
  gate after initial replay K-line load and after replay `Next`.
- `V6_MULTI_PANE_CHART_FOUNDATION_STEP147.md`: accepted multi-pane chart
  foundation using multi-host chart surface mounting and pane-local bridge
  fan-out.
- `V6_LEFTWARD_HISTORICAL_EXTENSION_STEP148.md`: accepted bounded leftward
  historical K-line extension through chart-history, bar-data, chart-data, and
  chart-viewport ownership paths.
- `V6_DRAG_TRIGGERED_HISTORY_EXTENSION_STEP149.md`: accepted drag/wheel
  triggered historical extension hardening with duplicate and exhausted request
  suppression.
- `V6_CHART_PRESENTATION_SURFACE_AUDIT.md`: accepted chart engine readiness and
  the static placeholder replacement direction.
- `V6_FXREPLAY_UI_GUARDRAILS.md`: accepted UI parity guardrails for top chrome,
  toolbars, timeframe menu, settings modal, and chart-first visual tone.
- `V6_FXREPLAY_UI_PARITY_GAP_AUDIT.md`: accepted UI parity gap classification
  and priority order before changing workstation chrome.

## Reading Rule

Do not load V5 historical sessions by default. Use V5 docs only for targeted
negative evidence or to port a test case into V6.
