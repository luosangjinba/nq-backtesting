# V6 TODO

## Current / Next

- Current status: V6 opened because V5 replay viewport/manual-anchor behavior
  proved structurally unreliable. The active decision is documented in
  `v5/docs/specs/v6-rewrite-start-decision.md`.
- Current product direction: V6 is an open-source-oriented personal
  backtesting/journal workstation for SMC/ICT-style discretionary traders,
  especially prop firm traders. FXReplay remains an interaction reference, but
  V6 is not a generic FXReplay clone and does not currently target other
  trading styles. See `v6/docs/V6_PRODUCT_DIRECTION.md`.
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
- Latest completed roadmap step: Step 233 - Dashboard Chart Boundary Label
  Product Wording. V6 replaced engineering-facing loaded-boundary dashboard
  text with compact chart-start wording while preserving selected trading date
  range labels, actual loaded-boundary semantics, prior Globex-open semantics,
  and bar-data/replay/chart-data/viewport/pane ownership.
- Latest stability work: 2026-07-09 unified leftward extension planner.
  Leftward-history requests now use one planner for all display timeframes. The
  planner separates display timeframe bucket math from source timeframe bar
  requests, so 1m, 5m, 15m, and future minute-based TFs share the same
  canvas-left extension rule instead of per-TF special cases. Programmatic
  viewport projection, pane reload projection, and display timeframe
  application still trigger delayed left-extension checks, while drag stability
  smokes guard against sticky hover-drag behavior.

## Next Executable Steps

### Step 234 - Chart Foundation Next Slice Selection

Status: planned.

Notes for execution:

- inspect current chart-foundation behavior after Step 233;
- choose the next bounded implementation slice from chart loading, TF
  switching, drag/scroll display, date range, replay, multi-pane, or pane-local
  reset foundations;
- prefer user-visible stability or workflow gaps over new feature surfaces;
- avoid indicators, SMC/ICT overlays, trading simulation, order tickets, prop
  firm rule engines, and journal workflows.

Acceptance:

- one next bounded chart-foundation slice is selected with owner boundary,
  stop conditions, and smoke coverage plan;
- selection stays inside the current foundation priority;
- no runtime behavior changes unless the selected slice explicitly requires a
  small readiness harness;
- product direction, boundary, and relevant audit smokes pass.

## Completed Steps

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
