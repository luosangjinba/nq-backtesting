# 2026-06-03 - Real Review Trial Baseline

## Context

Phase 16 P1 code-quality cleanup is complete and merged into `main`.
The old Step 46 Segment Review Metrics sample validation is also closed: the
system has already been used beyond that checkpoint, Segment Review Metrics are
working well in practice, and later Order Setup / Calendar / Phase 16 validation
covered a larger real workflow.

Current baseline commit for the trial period:

- `770e8a4 docs(v4): close segment metrics sample validation`

Current branch:

- `main`

Runtime note:

- V4 API was restarted on port 8766 with `/home/leo/miniconda3/bin/python3 v4_api.py`.
- `/v4/health` returned `{"status": "ok", "version": "4.0"}` after restart.

## Decision

Do not start another speculative refactor immediately.

Use the current system for actual review work for a while, then let real
friction, missing research fields, and repeated workflow problems drive the next
development phase.

## Trial Logging Categories

Record issues as they happen, preferably with date, instrument, timeframe,
object type, reproduction steps, expected behavior, and actual behavior.

- Bug: incorrect behavior, state corruption, data loss risk, broken locate/open,
  rendering failure, import/export issue.
- Friction: workflow works but requires too many steps, repeated manual effort,
  hard-to-find action, poor default state, awkward navigation.
- Research Gap: the review needs a field/object/relationship the current model
  cannot represent cleanly.
- Noise: metrics or UI information appears but does not help, is misleading, or
  should be hidden until needed.

## Suggested Next Phase

After enough real sessions are accumulated, open a new Phase 17 branch and turn
the highest-frequency findings into a small prioritized plan.

Recommended first planning pass:

1. Group the trial notes by Bug / Friction / Research Gap / Noise.
2. Fix high-confidence bugs first.
3. Only add schema or Review JSON fields when at least several real examples
   require the same concept.
4. Keep persistence-manager unification and broad file splitting deferred unless
   the trial exposes a concrete maintenance or data-loss risk.

## Current Open Backlog

These remain optional backlog items, not immediate next steps:

- Viewport maximize / restore.
- More complete keyboard shortcut mapping.
- Persistence manager for localStorage reads/writes.
- Deeper `order-review-store.js` / `setup-set.js` boundary cleanup.
- Further large-file evaluation for `time-reaction-actions.js`,
  `segment-panel.js`, and `order-setup-chart-actions.js`.

## 2026-06-04 - Step 258.1 Secondary Chart Performance Baseline

User-observed friction:

- Split Screen secondary chart feels choppy while moving / hovering candles.
- The issue is most visible in real review mode where Split is on and large
  1M ranges or replay-related secondary updates may be active.

Static baseline from current code:

- Secondary chart mouse movement enters `secondary-chart-manager.js`
  `notifySecondaryCrosshairMove()`.
- That path updates the secondary OHLC legend on every crosshair event.
- It then calls `secondary-chart-controller.js` `syncPrimaryHoverCursor()`.
- `syncPrimaryHoverCursor()` currently resolves the secondary hover timestamp
  via `findDisplayBarByTime(secondaryStore.getSecondaryDisplayBars(), ...)`,
  then resolves the primary target bar with another `findDisplayBarByTime(...)`.
- Both lookups are linear scans and run at mousemove frequency.
- The same cost pattern exists in the primary-to-secondary direction through
  `syncSecondaryHoverCursor()`.
- Each resolved sync cursor update also calls a VerticalLine primitive update,
  causing chart redraw work on the opposite chart.

Optimization hypothesis:

1. Replace high-frequency linear scans with display-bar lookup caches.
2. Throttle cross-chart sync to one requestAnimationFrame callback per chart
   direction.
3. Avoid repeated legend `innerHTML` writes when the hovered OHLC did not change.
4. Verify pick preview / replay cursor precedence after throttling.

Manual DevTools performance profiling should be repeated after the code changes
using a large Split Screen range, with Sub 1M and Replay On/Off both covered.

## 2026-06-04 - Step 258 Secondary Chart Performance Completed

Implemented:

- Added `chart/display-bar-lookup.js` to cache high-frequency display-bar
  lookups by timeframe, bar count, first timestamp, and last timestamp.
- Replaced primary/secondary crosshair sync linear scans with cached lookups.
- Throttled primary-to-secondary and secondary-to-primary sync cursor work with
  `requestAnimationFrame`, keeping only the latest hover time per frame.
- Added legend update caching so unchanged OHLC hover data does not rewrite
  `innerHTML`.
- Preserved cursor priority: pick preview, replay cursor, and manual secondary
  hover cursor clear or block ordinary split sync cursor lines.

Verification:

- Targeted Step 258 smoke passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

Manual follow-up:

- User should re-test the original slow scenario in browser, especially Split
  on, Sub 1M large range, Replay On/Off, and ES/NQ switch. DevTools profiling
  should show less time spent in hover bar lookup and fewer duplicate legend DOM
  writes.

## 2026-06-04 - Step 259.1 Primary Chart Performance Baseline

User-observed friction:

- After secondary chart smoothness improved, the primary chart still feels
  choppy in some real review states.

Static baseline from current code:

- Primary chart crosshair currently has several subscribers:
  primary OHLC legend, Split Screen sync, Replay Pick hover, Order Exit Pick
  hover, Segment Actor Pick hover, and SMT Pick hover.
- The primary legend already caches unchanged OHLC values after Step 258.
- Split Screen primary-to-secondary sync is cached and RAF-throttled after
  Step 258.
- Remaining likely hot paths are mode-specific pick handlers:
  - Replay Pick uses `chartData.findIndex(...)`.
  - SMT Pick uses `findDisplayBarByTime(store.getDisplayBars(), ...)`.
  - Order Exit Pick and Segment Actor Pick still resolve bars through their
    local find helpers.
- Replay crosshair handler also calls `chart.hidePickPreviewCursor()` on every
  crosshair move while replay is enabled but not picking; this is usually an
  early return, but it is still a high-frequency no-op.
- Primary chart also carries more primitives than the secondary chart: PDA,
  Segment, Composite, SMT, Order Setup, Time Overlay, replay cursor, pick
  preview, and sync cursor can all coexist.

Optimization hypothesis:

1. Reuse `display-bar-lookup.js` in primary high-frequency pick lookup paths.
2. RAF-throttle primary pick preview updates so mousemove cannot drive repeated
   primitive updates faster than the screen refresh rate.
3. Avoid repeated no-op `hidePickPreviewCursor()` calls when no preview is
   currently visible.
4. If pan remains slow after handler cleanup, measure primitive counts and split
   visible-range clipping into a later, narrower step.

Manual DevTools profiling should be repeated after the code changes in the
original slow primary-chart scenario, with object-heavy and Replay On states
covered.

## 2026-06-04 - Step 259.5 Primary Primitive Pressure Assessment

Static renderer assessment:

- Primary PDA, Segment, Order Setup, and Time Overlay renderers attach
  LightweightCharts primitives from their current store/display-mode state.
- Time Overlay is already grouped into a small number of marker/band primitives,
  but PDA/Segment/Order Setup counts scale with visible enabled objects.
- The renderers do not currently subscribe to visible-range changes to clip
  primitives before attach; adding clipping would change which off-screen or
  extended objects exist in the chart primitive layer during pan/locate/hit
  interactions.
- Because Step 259.2-259.4 addressed the clear high-frequency hover/pick
  costs without changing display semantics, primitive clipping should remain a
  separate follow-up only if primary pan is still slow in an object-heavy
  profile.

Decision:

- No display-semantic change in Step 259.5.
- If the real review page still feels slow after the handler cleanup, create a
  focused follow-up to measure attached primitive counts by renderer and then
  prototype visible-range clipping for PDA/Segment/Order Setup independently.

## 2026-06-04 - Step 259.6 Primary Chart Performance Closeout

Completed changes:

- Replay Pick, SMT Pick, Order Exit Pick, and Segment Actor Pick now resolve
  primary bars through the cached display-bar lookup path.
- Primary pick hover preview updates are RAF-throttled across Replay, SMT,
  Order Exit, and Segment Actor pick workflows.
- Replay no longer calls `hidePickPreviewCursor()` on every crosshair event
  when no pick preview exists.
- Primitive pressure was assessed but not clipped in this step, to avoid
  changing object display semantics without a dedicated object-heavy profile.

Verification:

- Targeted primary-performance module smoke passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

Manual follow-up:

- Re-test the slow primary-chart review state in browser, especially Replay
  On/Off, Split on/off, object-heavy Display Mode, and active pick workflows.
  If pan remains slow after hover cleanup, start a follow-up specifically for
  attached primitive count measurement and visible-range clipping.

## 2026-06-04 - Step 260 Daily Regime Plan

Context:

- User completed roughly one week of real review work and exported
  `tmp/v4-review-NQ-1M-2026-06-04_15-07-27.json`.
- Regime should be treated as an automatic daily background layer, not as a
  manually entered field on every PDA, Segment, or Order Setup.
- Local VIX daily data is available at `v4/data/vix-daily.csv` with
  `DATE,OPEN,HIGH,LOW,CLOSE`, covering 1990-01-02 through 2026-06-02.
- `cfevoloi.csv` and `VX_Series_09112019.csv` were checked and are not suitable
  VIX close sources: they contain CFE volume/open-interest or option-series
  contribution data rather than daily VIX OHLC.

Implementation direction:

1. Start with a `daily-regime` module that returns one record per
   `date + instrument`.
2. MVP only implements VIX volatility regime:
   - `vix_extreme_low`: VIX close < 13
   - `vix_low`: 13 <= close < 17
   - `vix_medium`: 17 <= close < 22
   - `vix_high`: 22 <= close < 30
   - `vix_extreme_high`: close >= 30
3. Show the selected date's VIX regime in Inspector Calendar / Day Details, so
   review notes can reference market background without manual lookup.
4. Add `dailyRegimes` to Review JSON export/import for archival completeness.
5. Then extend the same daily record with trend, range, and event regimes:
   - `trendRegime`: `bull_trend / bear_trend / range / unknown`, initially
     based on close vs 20EMA and 20EMA vs 50EMA.
   - `rangeRegime`: `small_range / normal_range / large_range / unknown`,
     based on day range vs ATR20 ratio.
   - `eventTags`: `FOMC / CPI / NFP / PPI / major_earnings / none`, initially
     from a local curated date table.

Boundaries:

- Do not implement confidence scoring yet. Confidence rubric should wait until
  there are at least 20-30 reviewed trading days and real examples can drive
  the scoring dimensions.
- Do not build a complex composite-regime statistics page in the first pass.
  Single-dimension grouping is enough until sample size grows.
- Do not let missing VIX/event data block existing Review JSON import/export or
  daily review workflows; missing fields should normalize to `unknown` or `n/a`.

Expected use in review:

- Calendar selected day can show a compact line such as
  `VIX: low 13.20 | Trend: bull_trend | Range: large 1.59 ATR | Events: none`.
- Exported review files carry the same daily background so future analysis can
  answer questions like whether `950 Macro Immediately` performs differently in
  low-volatility bull-trend days versus high-volatility bear-trend days.

## 2026-06-04 - Step 260.1 Daily Regime Boundary Completed

Implemented:

- Added `v4/src/daily-regime/daily-regime-types.js` as the data-boundary module
  for daily background records.
- A daily regime record is keyed by `date + instrument` and remains separate
  from PDA, Segment, SMT, and Order Setup object bodies.
- Normalized fields now include `volatilityRegime`, `vixClose`, `vixBucket`,
  `trendRegime`, `rangeRegime`, `rangeAtrRatio`, and `eventTags`.
- VIX bucket naming is frozen for the MVP:
  `vix_extreme_low / vix_low / vix_medium / vix_high / vix_extreme_high`;
  missing VIX data normalizes to `vixBucket: n/a` and
  `volatilityRegime: unknown`.
- Reserved trend/range/event fields normalize to explicit unknown values until
  later steps provide real calculations or curated event data.

Verification:

- `node tmp/daily_regime_boundary_smoke.mjs` passed.
- `node --check v4/src/daily-regime/daily-regime-types.js` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

Next:

- Step 260.2 should read `v4/data/vix-daily.csv` and use the Step 260.1
  boundary helpers to generate daily VIX regime records by date.

## 2026-06-04 - Step 260.2 VIX Regime Loader Completed

Implemented:

- Added `daily-regime-store.js` as the in-memory daily regime store with
  `daily-regime:changed` events and date/instrument lookup.
- Added `daily-regime-vix-loader.js` to parse `data/vix-daily.csv`, listen for
  loaded chart ranges, and populate daily VIX regime records.
- Added the local `v4/data/vix-daily.csv` data source to the Step 260.2 change.
- Wired the loader into `app.js`; failed or missing VIX data clears the regime
  layer and emits a status message without blocking review workflows.

Verification:

- `node tmp/daily_regime_vix_smoke.mjs` passed.
- Daily regime module `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.3 Calendar VIX Display Completed

Implemented:

- Inspector Calendar selected-day details now show a compact VIX regime line,
  e.g. `VIX: Low 15.77`.
- Missing VIX data displays `VIX: n/a` and does not block Calendar rendering.
- Inspector refreshes when `daily-regime:changed` fires after chart range loads.
- The display intentionally shows only VIX in this step; trend, range, and
  events remain hidden until their calculation steps are implemented.

Verification:

- Calendar/Inspector modules `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.4 Review JSON Daily Regimes Completed

Implemented:

- Review JSON export now includes a top-level `dailyRegimes` array.
- Review JSON import validates, normalizes, and de-duplicates `dailyRegimes`
  by `date + instrument`.
- Existing local daily regime records take priority during import; imported
  archival records fill only missing identities.
- Export/import status messages include Daily Regime counts.

Verification:

- `review-archive.js` `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.5 Trend Regime Completed

Implemented:

- Added `daily-regime-trend.js` to derive one daily close per trading day from
  loaded bars.
- Calculated 20EMA and 50EMA over the available daily closes.
- Daily regimes now include `trendRegime`, plus diagnostic
  `trendClose/trendEma20/trendEma50` values when enough history exists.
- Rule: `close > 20EMA > 50EMA` is `bull_trend`,
  `close < 20EMA < 50EMA` is `bear_trend`, otherwise `range`;
  missing 50-day history remains `unknown`.
- Calendar summary now uses the shared daily regime summary line.

Verification:

- `node tmp/daily_regime_trend_smoke.mjs` passed.
- Daily regime modules `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.6 Range Regime Completed

Implemented:

- Added `daily-regime-range.js` to derive daily high/low/close from loaded
  bars and calculate ATR20.
- Daily regimes now include `rangeRegime`, `rangeAtrRatio`, and diagnostic
  `dayRange/atr20` values when enough history exists.
- First-pass thresholds are explicit: ratio `< 0.8` is `small_range`,
  ratio `> 1.2` is `large_range`, otherwise `normal_range`.
- Missing 20-day ATR history remains `unknown`.

Verification:

- `node tmp/daily_regime_range_smoke.mjs` passed.
- Daily regime modules `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.7 Event Regime Completed

Implemented:

- Added `daily-regime-events.js` with a manually maintained date table for
  event tags.
- Supported tags are `FOMC`, `CPI`, `NFP`, `PPI`, `major_earnings`, and
  fallback `none`.
- Daily regimes now receive `eventTags`; dates not present in the curated table
  normalize to `Events: none`.
- Calendar summary already displays the event tags through the shared daily
  regime summary line.

Verification:

- `node tmp/daily_regime_events_smoke.mjs` passed.
- Daily regime modules `node --check` passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-04 - Step 260.8 Daily Regime Closeout Completed

Coverage check:

- Checked `tmp/v4-review-NQ-1M-2026-06-04_15-07-27.json`.
- The old archive predates Step 260 and has no `dailyRegimes` field, so the
  validation checked whether its review dates can be generated from the new
  local regime layer.
- Effective review dates found from Order Setup timestamps and Daily Time
  Reviews: 6.
- VIX coverage from `v4/data/vix-daily.csv`: 6 / 6.
- Missing VIX dates: none.

Manual sample confirmations:

- `2012-01-10`: `VIX: Medium 20.69 | Trend: bull_trend | Range: small_range 0.78 ATR | Events: none`
- `2023-01-03`: `VIX: High 22.90 | Trend: bear_trend | Range: normal_range 1.15 ATR | Events: none`
- `2024-01-02`: `VIX: Low 13.20 | Trend: bull_trend | Range: large_range 1.97 ATR | Events: none`
- `2024-01-04`: `VIX: Low 14.13 | Trend: range | Range: small_range 0.74 ATR | Events: none`
- `2024-01-05`: `VIX: Low 13.35 | Trend: range | Range: normal_range 1.19 ATR | Events: none`

Research closeout:

- Step 260 completes the Daily Regime MVP as an automatic daily background
  layer with VIX, trend, range, curated event tags, Calendar display, and Review
  JSON archive support.
- Do not add confidence scoring yet. Wait for at least 20-30 reviewed trading
  days and repeated examples before defining scoring dimensions.
- Do not build a complex composite-regime statistics page yet. A future entry
  point can start with simple grouping by one dimension such as volatility or
  trend once enough samples exist.

Verification:

- Review JSON coverage probe passed with 6 / 6 VIX-covered review dates.
- Five manual daily regime samples were confirmed through local V4 daily bars.
- All daily regime smoke probes passed.
- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.

## 2026-06-05 - Replay Pick and Split Reload Follow-up

Context:

- During real review, Replay Pick was reported as non-responsive: hover preview
  did not appear and clicking a chart bar no longer truncated replay to that
  bar.
- A hard backup at `/mnt/data/20260527/backtesting` showed the old working
  behavior: Pick matched against the currently displayed replay `chartData`
  and subscribed directly to `chart.onCrosshairMove(handleCrosshairMove)`.
- Recent performance work had changed Replay Pick to cached display-bar lookup
  plus RAF-throttled hover. That path was reverted for Replay Pick only.

Implemented:

- Restored Replay Pick hit handling to compare chart times against current
  replay `chartData`, so Pick only acts on bars already revealed by replay.
- Restored direct crosshair hover handling for Replay Pick preview.
- Confirmed Pick does not expand the full loaded date range, does not move the
  current viewport, and does not reveal future bars.
- Fixed Split reload after stale replay state: `resetReplayState()` and the
  non-restored `syncReplayData()` path now emit `replay:changed`, allowing the
  secondary chart controller to clear old replay slicing state before rendering
  a new loaded range.

Verification:

- `node --check v4/src/ui/replay-controls.js` passed.
- `git diff --check` passed for the touched source files.
- Headless Chrome initialization of `http://127.0.0.1:8001/index.html` passed
  without module/runtime initialization errors.

Notes:

- The currently deleted `tmp/daily_regime_*_smoke.mjs` files were not part of
  these fixes and were intentionally left out of the source commits.

## 2026-06-06 - Step 262 Chart Bar Notes Plan

Goal:

- Add lightweight chart notes bound to one instrument, one timeframe, and one
  exact chart bar timestamp.
- Notes should appear only on the bound timeframe. A 1M note must not project
  onto 5M/15M/1H, and a 1H note must not appear on 1M.
- Notes must not reveal future bars during Replay. Replay On should render only
  notes whose timestamp is already inside the current replay slice.

Planned implementation:

1. Add an independent `chart-notes` store and persistence module with
   normalize/CRUD/load/get APIs and localStorage persistence.
2. Add a chart note renderer using a small label primitive on the primary
   chart. First version renders text labels only; no rich text, no drag, no
   automatic collision avoidance.
3. Add primary chart right-click actions: `Add Note Here`, `Edit Note`, and
   `Delete Note`.
4. Extend Review JSON with an optional `chartNotes` array, normalized and
   de-duplicated on import.
5. Validate syntax, diff whitespace, page boot, and the core manual workflow.

Execution rule:

- Each sub-step should be committed separately.
- Existing unrelated workspace dirt, including deleted daily-regime smoke files
  and temporary screenshots/logs, must not be included in these commits.

Result:

- Created branch `feature/v4-chart-notes`.
- Added chart note state in `2840934`: independent store, localStorage
  persistence, undo/redo snapshots, and Review JSON import/export under
  optional `chartNotes`.
- Added renderer in `4965176`: note labels render only on the primary chart for
  matching instrument/timeframe/timestamp; Replay On uses the current replay
  visible slice, so future notes do not appear.
- Added context menu actions in `49e48b6`: primary chart right-click menu has
  `Chart Note -> Add Note Here / Edit Note / Delete Note`.
- Validation: `find v4/src -name '*.js' -print0 | xargs -0 -n 1 node --check`,
  `git diff --check`, `curl -s -I http://127.0.0.1:8001/index.html`, and
  headless Chrome `--dump-dom` for `http://127.0.0.1:8001/index.html` passed.

## 2026-06-06 - Step 263 Chart Note Display Polish

Changes:

- `2f90c55` moved Chart Note labels to the top of the primary chart canvas
  area, added a leader line from each label to its owning K-line, and replaced
  browser `prompt` input with an in-chart textarea editor.
- `f0df21a` softened the leader line so it stays visible as a locator but does
  not compete with candle reading.

Usage:

- Add: right-click a bar -> `Chart Note` -> `Add Note Here`.
- Edit/delete: right-click the original bar that owns the note -> `Chart Note`
  -> `Edit Note` or `Delete Note`.
- The top label itself is currently display-only; hit actions are still bound
  to the owning bar.

## 2026-06-06 - Step 264 Chart Note Calendar / Replay Closeout

Context:

- Chart Notes were usable on the original loaded day, but after loading later
  trading days and running Replay forward, selecting an earlier date in the
  Inspector Calendar did not always show that date's note boxes on the chart.
- The failure was replay-specific: non-replay mode showed the boxes correctly
  because the chart-note date focus used full display bars. In Replay, that
  full range could have a much later final date than the currently revealed
  replay slice, causing the focused note date to be cleared immediately.
- The timeframe rule remains strict: a 1M note renders only on 1M, and a 30M
  note renders only on 30M. No cross-timeframe projection is allowed.

Implemented:

- Added Chart Notes as a dedicated Inspector/Time Reaction section with
  locate/edit/delete/select-object actions through the three-dot menu.
- Added top-of-chart note-box packing so boxes use the highest available row
  when their horizontal ranges do not overlap, and push downward only when
  needed.
- Kept long note text truncated by default while allowing interaction-driven
  expansion/collapse.
- Included Chart Note boxes/leaders in Calendar day object visibility via
  Show Day Objects / Hide Day Objects.
- Added date-focused Chart Note rendering for Calendar selection, Calendar
  object locate, and Show Day Objects.
- Fixed the Replay-specific focus anchor: Calendar actions now use
  `getReplayVisibleBars()` when Replay is active and fall back to
  `store.getDisplayBars()` otherwise.

Validation:

- `node --check` passed for the touched Chart Note and Calendar action modules.
- `git diff --check` passed for the touched files.
- Manual replay scenario validated by user screenshots: non-replay display was
  already correct; the final fix targets the case where Replay has advanced to
  a later day and the Calendar is used to jump back to a prior day with 1M
  Chart Notes.

Key commits:

- `34299b4` packed Chart Note boxes by day and shared layout with hit-test.
- `ded708d` focused Chart Notes from day visibility.
- `7b59294` focused Chart Notes on Calendar locate/select.
- `a38065a` anchored Chart Note focus to replay visible bars.

## 2026-06-06 - Step 265 Secondary Chart Context Menu Plan

Context:

- The primary chart context menu has grown into the main chart-first workflow:
  PDA creation, SMT, Order Setup, Chart Notes, Time Overlays, Calendar locate,
  segments, point sets, Composite Move drafts, objective gaps, and clear
  actions.
- The secondary chart menu is intentionally smaller today. It already supports
  PDA BSL/SSL/FVG/OB Last Bar, secondary segment start/end, and navigation
  actions such as show cursor, locate time in primary, copy time, and copy
  price.
- Not every primary action should move to the secondary chart. The secondary
  chart is an HTF/ES evidence chart, not the NQ execution chart.

Boundary decisions:

- Keep off secondary:
  - Order Setup create / entry / stop / target / final target actions, because
    they would write execution prices from the secondary instrument/timeframe.
  - SMT creation actions, because current SMT semantics are NQ follows ES and
    should remain initiated from the NQ primary chart.
  - NDOG/NWOG global toggles, because they are currently primary NQ background
    overlays.
  - Clear PDA / Clear Segments / Clear Killzones global actions, because a
    secondary-context menu should not expose destructive global clears.
- Candidate actions for secondary:
  - PDA Wick CE Upper/Lower, IFVG, Bullish/Bearish OB, Bullish/Bearish Breaker.
  - Fib and range workflow after draft-state isolation is verified.
  - EQH/EQL point set workflow after selected/draft state can carry source
    chart metadata cleanly.
  - Locate Date in Calendar.
  - Link secondary PDA / Segment / FVG / Composite evidence to active Order
    Setup reason/ref.
  - Optional secondary Chart Notes only after freezing display and Calendar
    semantics.

Planned steps:

1. Step 265.1: Add the simple single-click PDA actions to the secondary menu:
   Wick CE, IFVG, OB, Breaker. Reuse chart context and source metadata.
2. Step 265.2: Add Fib/range workflows only if draft state can stay scoped to
   the secondary context and cancel cleanly.
3. Step 265.3: Add EQH/EQL point sets with source chart/timeframe metadata and
   Inspector/Review JSON validation.
4. Step 265.4: Add `Locate Date in Calendar` to the secondary Navigation
   group.
5. Step 265.5: Add active Order Setup evidence linking for secondary PDA /
   Segment / FVG / Composite hits, without adding execution setters.
6. Step 265.6: Decide whether secondary Chart Notes should exist. If yes, they
   should render only on the secondary chart for matching instrument/timeframe
   and carry explicit source chart metadata.
7. Step 265.7: Validate Split on/off, NQ/ES, 1M/30M/1H, Replay On, source
   metadata, Inspector Open/Locate, Review JSON export/import, undo/redo,
   full JS syntax, and Web/API smoke.

## 2026-06-06 - Step 265.1 Secondary PDA Simple Actions

Implemented:

- Added secondary chart context-menu entries for `Mark Upper Wick CE`,
  `Mark Lower Wick CE`, and `Mark IFVG`.
- Reused existing context-aware PDA helpers:
  - `addManualWickCe(side, bar, context)`
  - `addManualFvg(bar, context, 'ifvg')`
- Kept OB / Breaker off Step 265.1 because the existing primary semantics are
  range workflows, not one-click annotations. They remain scheduled for Step
  265.2.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js` passed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 265.5 Secondary Evidence Link To Active Setup

Implemented:

- Secondary right-click now hit-tests PDA annotations, segments, and segment
  groups using the secondary chart context.
- Added an `Order Setup Links` submenu to the secondary chart context menu.
- The submenu exposes only evidence-linking actions:
  - Link PDA To Active Setup.
  - Link Segment To Active Setup.
  - Link Composite To Active Setup.
- Reused the existing order setup chart action handler for link mutations, so
  reason/ref storage stays consistent with primary chart links.
- Kept execution-writing actions off secondary: no create setup, entry, stop,
  target, final target, or manual explanation event actions were added.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js` passed.
- `node --check v4/src/order/order-setup-chart-actions.js` passed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 265.6 Secondary Chart Notes Decision

Decision:

- Do not add Chart Notes to the secondary chart context menu in this expansion
  step.
- Reason: current Chart Notes have strong primary-chart semantics:
  - top-of-primary-canvas note boxes,
  - primary timeframe filtering,
  - Calendar / Time Reaction Observation integration,
  - Order reason selection and locate behavior tuned around primary NQ review.
- A future secondary-note implementation should be a distinct feature with:
  - explicit `sourceChartId`, `sourceInstrument`, and `sourceTimeframe`,
  - rendering only on the matching secondary chart context,
  - no insertion into the primary chart note box layer,
  - explicit rules for Calendar visibility and Order reason linking.

Validation:

- Documentation-only decision; no runtime code changed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 265.7 Secondary Menu Expansion Validation

Completed validation:

- Full JS syntax check:
  - `find v4/src -name '*.js' -exec node --check {} \;` passed.
- Whitespace / conflict marker check:
  - `git diff --check` passed.
- Web smoke:
  - `curl -s -I http://127.0.0.1:8001/index.html` returned `200 OK`.
- API smoke:
  - `curl -s http://127.0.0.1:8766/v4/health` returned
    `{"status": "ok", "version": "4.0"}`.
  - `/v4/bars` NQ 1M smoke returned bars and `requestedRange`.

Code-path review:

- Secondary-created PDA objects now carry source metadata for simple actions,
  range actions, Fib, and point sets.
- Secondary Point Set draft state is scoped separately from primary.
- Secondary Order Setup links reuse the existing active setup reason/ref path,
  while execution-writing setup actions remain unavailable on secondary.
- Review JSON and Inspector paths continue to use the shared PDA/segment/order
  stores, so export/import schema remains unchanged.

Remaining manual regression:

- Browser interaction should still be manually checked for Split on/off, NQ/ES,
  1M/30M/1H, and Replay On because these require canvas interaction and visual
  confirmation.

## 2026-06-06 - Step 265.2 Secondary Range PDA Workflows

Implemented:

- Added secondary-only draft state for range PDA and Fib workflows.
- Added secondary menu actions for:
  - Start/finish Bullish OB and Bearish OB ranges.
  - Start/finish Bullish Breaker and Bearish Breaker ranges.
  - Start/finish Fib.
  - Cancel active secondary draft.
- Added Shift + right-click finish support while a secondary draft is active.
- Esc, `secondary-bars:cleared`, and `secondary-chart:reset` now clear only
  secondary PDA draft state, leaving primary manual PDA workflow state alone.
- Added small context-menu subtitle styling for active draft display.
- Added source metadata to context-aware Wick CE, range PDA, and Fib creation
  so secondary-created objects retain chart/instrument/timeframe provenance.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js` passed.
- `node --check v4/src/pda/manual-pda-actions.js` passed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 265.3 Secondary Point Sets

Implemented:

- Added secondary context-menu `Point Sets` actions for EQH/EQL start, add,
  finish, and cancel.
- Refactored point-set draft state from one global state into scoped states:
  primary remains the default scope, secondary uses `scope: secondary`.
- Secondary point-set draft annotations use a distinct draft id so primary and
  secondary drafts do not overwrite each other.
- Final EQH/EQL annotations still use the shared PDA store, but carry
  `sourceChartId`, `sourceChartLabel`, `sourceInstrument`, `sourceTimeframe`,
  `sourceTimeframeLabel`, and `sourceContext` metadata.
- Appending to an existing point set preserves its source metadata.

Validation:

- `node --check v4/src/pda/point-set-annotation.js` passed.
- `node --check v4/src/pda/secondary-context-menu.js` passed.
- `node --check v4/src/pda/manual-annotation.js` passed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 265.4 Secondary Calendar Navigation

Implemented:

- Added `Locate Date in Calendar` to the secondary chart Navigation submenu.
- Reused the existing `inspector:open-calendar-date` event so Calendar
  selectedDate, viewDate, and Time Overlay selectedDate update through the same
  path as the primary chart.
- The date key is derived from the secondary bar `tradingDay` when present,
  falling back to UTC timestamp conversion.
- Existing `Locate Time in Primary`, copy time, and copy price actions are
  unchanged.

Validation:

- `node --check v4/src/pda/secondary-context-menu.js` passed.
- `git diff --check` passed for the touched files.

## 2026-06-06 - Step 266 Inspector Day Object Visibility Controls Plan

User need:

- Inspector day modules should expose clear per-module visibility state for
  `SMT`, `PDA`, `Segments`, `Composite`, and `Killzones / Timelines`.
- The control must be visually knowable:
  - all current-day objects visible -> checkbox checked;
  - all current-day objects hidden -> checkbox unchecked;
  - some visible and some hidden -> checkbox indeterminate / dot state.
- The control should operate at the current selected/replay day level, not as a
  global all-history toggle.

Performance decision:

- Do not listen to chart render frames, crosshair, mousemove, or pan/zoom events.
- The feature should be event-driven from object state and day context:
  `pda:changed`, `segment:changed`, segment-group/composite changed,
  `smt:changed`, time-overlay changed, Calendar selected day changes,
  Display Mode / Show Day Objects / Hide Day Objects changes, and replay day
  changes.
- Replay playback should not recompute summaries on every bar unless the
  current day key changes; if needed, debounce summary refresh to roughly
  100-200ms.
- Summary computation should scan only objects relevant to the current day and
  module, producing `total / visible / hidden / state`, rather than touching
  chart primitives or reattaching render layers directly.

Implementation plan:

1. Step 266.1: Define a day-scoped visibility summary helper.
   - Inputs: selected/replay day key, object type, current stores, display
     visibility state.
   - Output: `{ total, visible, hidden, state }`, where state is
     `checked | unchecked | mixed | disabled`.
   - Cover object types: SMT, PDA, Segments, Composite, Killzones, Timelines.

2. Step 266.2: Normalize current-day resolution.
   - Non-replay: use Inspector Calendar selected day / Time Overlay selectedDate
     when available.
   - Replay: prefer current replay visible bars / cursor day so loading future
     dates and then locating back does not make old-day objects disappear or
     count the wrong day.

3. Step 266.3: Add tri-state checkbox UI to Inspector module headers.
   - Keep existing module expand/collapse behavior.
   - Use native `input.indeterminate` or an equivalent visual state.
   - Disable the checkbox when the module has zero current-day objects.

4. Step 266.4: Add batch visibility actions.
   - checked -> hide all current-day objects of that module.
   - unchecked or mixed -> show all current-day objects of that module.
   - Wrap changes in undo/redo history.
   - Do not mutate core research fields; only update display/visibility state.

5. Step 266.5: Wire event-driven refresh.
   - Recompute summaries only on relevant store/day/display events.
   - Avoid high-frequency chart listeners.
   - Ensure Show Day Objects / Hide Day Objects updates the checkbox state
     immediately after the batch action.

6. Step 266.6: Validate and close.
   - Manual cases: all visible, all hidden, mixed per module.
   - Interaction cases: Show Day Objects, Hide Day Objects, Replay On day
     changes, Calendar locate back to older day, Split on/off.
   - Safety cases: undo/redo, refresh/localStorage, Review JSON should not gain
     unnecessary schema noise.
   - Run full JS syntax check and `git diff --check`.

## 2026-06-06 - Step 266 Inspector Day Object Visibility Controls Completed

Implemented:

- Added a day-scoped visibility summary model for Calendar chart-object groups.
- Added tri-state visibility checkboxes to Inspector Calendar group headers for
  SMT, PDA, Segments, Composite, and Killzones / Time Lines.
- The checkbox states are derived from current-day objects:
  checked = all visible, unchecked = all hidden, indeterminate = mixed.
- Clicking a group checkbox toggles only that selected/replay day's objects for
  the group:
  - checked -> hide all objects in that group for the day;
  - unchecked or mixed -> show all objects in that group for the day.
- Batch changes are wrapped in the existing undo/redo history path and update
  display/visibility state only.
- Calendar active day now resolves through replay context when Replay is on, so
  group visibility summaries follow the replay day rather than stale loaded
  future dates.
- Inspector refresh for replay uses a day-key guard: `replay:changed` only
  refreshes the panel when the replay day changes, not every bar/mouse/render
  event.

Validation:

- Full `v4/src/**/*.js` `node --check` passed.
- `git diff --check` passed.
- No chart render, crosshair, mousemove, pan, or zoom listener was added for
  this feature.

Manual follow-up:

- Browser-check the visual checkbox state on a real object-heavy day:
  all-visible, all-hidden, mixed, Show Day Objects, Hide Day Objects, Replay On
  day transitions, and undo/redo.

## 2026-06-07 - Clear Handoff Checkpoint

Current repository state:

- Branch: `main`.
- HEAD: `2893fc3 fix(v4): refresh inspector on time overlays`.
- `main` is ahead of `origin/main` by 24 commits.
- There are no tracked working-tree changes after the Step 267 rollback except
  this handoff documentation update.
- Existing untracked runtime/local files are intentionally not part of git:
  `.web_pid`, `__pycache__/`, `trading_data.duckdb`, `v3/plans/`,
  `v4/.web.log`, `v4/__pycache__/`, `v4/data/vix-monthly.csv`,
  `v4/docs/CODE_REVIEW_2026_06_02.md`, `v4/docs/P1_PLAN.md`,
  `v4/docs/improvement_plan.html`.

Recent committed work currently present on `main`:

- `21b55d2 feat(v4): toggle chart notes from calendar`
  - Chart Notes are a separate Calendar group.
  - Chart Notes support day-level checkbox visibility like PDA/Segments.
  - `v4/tests/calendar-visibility-smoke.js` covers Chart Notes visibility.
- `007a33d fix(v4): sync crosshair during replay`
  - Primary/secondary sync crosshair can coexist with replay cursor.
  - Replay-aware sync uses current replay-visible primary/secondary bars.
- `2893fc3 fix(v4): refresh inspector on time overlays`
  - Inspector listens to `time-overlays:changed`, so newly created Killzone /
    Time Line objects appear in Calendar immediately, including first creation
    during replay.

Important rollback note:

- Step 267 Calendar follow crosshair / replay day was attempted after
  `2893fc3`, but the user reported it was not actually working.
- That attempt was fully rolled back at the user's request.
- The user explicitly decided not to do Step 267 anymore. Do not resume or
  re-plan Calendar auto-follow after context clear unless the user asks for a
  new design from scratch.
- Removed files from the rollback:
  - `v4/src/ui/inspector/calendar-follow-state.js`
  - `v4/tests/calendar-follow-smoke.js`
- Restored files from the rollback:
  - `v4/TODO.md`
  - `v4/sessions/session_20260603_real_review_trial.md`
  - `v4/src/ui/inspector-sidebar.js`
- Therefore current code does not include any Step 267 crosshair-follow
  implementation.

Validation already run before this handoff:

- After `2893fc3`, the code was at a clean tracked state.
- The `time-overlays:changed` fix had passed:
  - full `v4/src/**/*.js` `node --check`;
  - `node v4/tests/calendar-visibility-smoke.js`;
  - `git diff --check`.

Recommended next step after context clear:

- If continuing normal work, start from `main` at `2893fc3`.
- Do not continue Step 267. Treat it as intentionally abandoned.

## 2026-06-08 - Step 268 Inspector Calendar Click-Date Follow Plan

Decision:

- This is Step 268.
- Do not restore the abandoned Step 267 crosshair/replay auto-follow design.
- New scope is click-driven only: Inspector Calendar may jump to the date of the
  K line under a primary or secondary chart left-click.
- The goal is almost zero extra runtime cost: no `mousemove`, no crosshair-move
  subscription, no replay-bar refresh loop, no per-frame work.

Proposed implementation:

1. Add a click-only date resolver for chart clicks.
   - Reuse existing chart click hooks if practical; otherwise add one primary and
     one secondary `click` listener.
   - Resolve click coordinate -> chart time -> display bar -> `timestamp` -> UTC
     date key using existing time projection / display-bar helpers.
   - Ignore clicks that cannot resolve to a real bar.

2. Add a small Inspector entry point such as `openCalendarDateFromChartClick()`.
   - Update `calendarSelectedDate` and `calendarViewDate` only when the resolved
     date differs from the current Calendar date.
   - Refresh Inspector once for that date.
   - Do not touch chart objects or persistence.

3. Guard user intent aggressively.
   - Only auto-jump when Inspector is on Calendar/Home or otherwise safe to
     refresh without replacing an object detail panel.
   - Do not override active object detail panels, order/segment/PDA pick states,
     range/fib/point-set drafts, or other modal selection workflows.
   - Do not use replay state as the driver; Replay on/off should only affect
     which bars are available for click resolution.

4. Keep overlay semantics conservative.
   - Decide during implementation whether a chart click should also set
     `timeOverlaySettings.selectedDate` like Calendar date click does.
   - Default recommendation: align with explicit Calendar date selection only if
     the user expects manual overlays to filter to the clicked date; otherwise
     keep it Calendar-only to avoid surprising hidden overlays.

Verification checklist:

- Primary chart left-click on two different loaded dates jumps Calendar once per
  date change.
- Secondary chart left-click works in Split mode and is ignored when Split / data
  is unavailable.
- Replay on: clicking visible replay bars resolves to the clicked bar date, not
  future loaded bars.
- Calendar object detail panel is not interrupted by chart clicks.
- Existing chart pick/draft flows are not interrupted.
- No crosshair-move or mousemove listener is added.
- Full `v4/src/**/*.js` `node --check` and `git diff --check` pass.

## 2026-06-08 - Step 268 Inspector Calendar Click-Date Follow Completed

Implemented:

- Inspector Calendar now follows primary chart left-clicks by resolving the
  clicked LightweightCharts `param.time` back to a loaded display bar date.
- Secondary chart click support uses a callback set in `secondary-chart-manager`,
  so the Inspector subscription survives secondary chart rebuilds.
- The behavior is click-only: no `mousemove`, no crosshair-follow state, and no
  per-frame replay/calendar sync was added.
- Calendar follow only runs when Inspector is already open on Calendar/Home or
  Archive; object detail panels and selected object panels are not replaced.
- Chart clicks do not update `timeOverlaySettings.selectedDate`, so manual
  overlay date filtering is not changed implicitly.
- Guarded active pick workflows:
  - Replay pick;
  - SMT pick;
  - Order exit pick;
  - Order reason ref pick;
  - Daily Time ref pick;
  - Reaction Evidence actor pick.
- Primary Replay uses current replay-visible bars for click resolution; secondary
  Replay limits click resolution to bars at or before the replay cursor.

Validation:

- Full `v4/src/**/*.js` `node --check` passed.
- `node v4/tests/calendar-visibility-smoke.js` passed.
- `git diff --check -- v4` passed.
- Headless Chrome CDP validation loaded `v4/index.html`, injected two days of
  test bars, and confirmed a real chart click on the second day updated Calendar
  from `2024-01-10` to `2024-01-11`.
- Browser diagnostics confirmed LightweightCharts emitted `subscribeClick` with
  `param.time=1704965400` for the clicked Jan 11 bar.

## 2026-06-08 - Step 269-274 V4 Performance / Duplication Follow-up Plan

Audit scope:

- Full `v4` read-only review after Step 268.
- Focus areas:
  - runtime/system load risk;
  - repeated wheels / reusable helpers;
  - preserving the local single-user research-tool simplicity boundary.

Priority order:

1. Fix high-frequency work first.
2. Fix replay/overlay churn second.
3. Consolidate time helpers because time semantics are core to this project.
4. Add request range guard to prevent accidental huge 1M loads.
5. Defer broad renderer/hit-test refactors until touching those areas again.

### Step 269 - Chart Notes mousemove hit-test load reduction

Problem:

- `chart-note-selection.js` listens to raw `mousemove`.
- Each move calls `hitTestChartNotes()`.
- `chart-note-hit-test.js` rebuilds the full hit geometry on every call:
  - gets replay/display bars;
  - builds a `Map(timestamp -> bar)`;
  - reads all chart notes;
  - filters by hidden/instrument/timeframe/date;
  - resolves chart coordinates;
  - measures/layouts note text.

Implementation steps:

1. Add RAF throttle around `handleChartMouseMove`.
   - Similar style to existing `createRafThrottle()` usage in SMT / Inspector pick hover.
   - Only the latest mouse event per animation frame should run hit-test.

2. Add a hit-test layout cache.
   - Cache key should include at least:
     - current timeframe;
     - renderable bars signature: count + first timestamp + last timestamp;
     - chart notes version/signature;
     - visible chart-note date key;
     - expanded note id;
     - chart width if it affects text layout.
   - Invalidate on:
     - `chart-notes:changed`;
     - `bars:loaded` / `bars:cleared`;
     - `replay:changed` only when replay-visible date or bar signature changes;
     - chart resize if layout width changes.

3. Keep click and hover semantics unchanged.
   - Hover expands the same note as before.
   - Click still selects the note under cursor.
   - Hidden notes remain excluded.

Verification:

- `node --check` for touched files.
- Browser smoke:
  - notes visible on chart;
  - hover expands note;
  - click selects note;
  - moving mouse rapidly does not trigger more than one hit-test per frame.
- Regression checks:
  - Replay on/off still uses visible replay bars;
  - hidden notes are not hit-testable;
  - different timeframe does not reuse stale layout.

### Step 269 Completed - Chart Notes mousemove hit-test load reduction

Implemented:

- `chart-note-selection.js` now routes `mousemove` through `createRafThrottle()`, so rapid mouse movement runs at most one hit-test per animation frame.
- `chart-note-hit-test.js` now caches computed chart-note layouts for the current chart state.
- Cache key includes:
  - timeframe;
  - visible chart-note date;
  - expanded note id;
  - chart width/height;
  - visible logical range;
  - renderable bars signature;
  - chart notes version.
- `chart-note-store.js` now exposes `getChartNotesVersion()` and increments the version on `chart-notes:changed`, so cache hits do not require scanning every note just to build a signature.

Validation:

- `node --check` passed for edited chart-note files.
- `git diff --check` passed for Step 269 files.
- Headless Chrome smoke loaded `v4/index.html`, injected test bars + one chart note, found a real hit-test point, and confirmed chart-note click emitted `chart-note:selected` for `note-step269`.

### Step 270 - Replay overlay redraw load reduction

Problem:

- Replay forward tick can run at 100ms.
- `replay:changed` currently causes full overlay redraw paths, especially:
  - PDA renderer clears all primitives and rebuilds all renderable annotations;
  - Chart Notes renderer clears and rebuilds notes;
  - Segment rendering has similar full-scan behavior on several events.
- This is simple and safe, but can become sustained primitive churn as annotations grow.

Implementation steps:

1. Measure and map actual listeners.
   - List every `bus.on('replay:changed', ...)` in `v4/src`.
   - Separate visual cursor updates from heavy primitive rebuilds.

2. Add RAF coalescing for heavy overlay redraws.
   - If multiple replay/display events happen in one frame, render once.
   - Keep immediate state changes for replay cursor itself.

3. Add replay-visible/date filtering before primitive construction.
   - Avoid building primitives that cannot be displayed at the current replay cursor.
   - Use existing `getReplayVisibleBars()` / timestamp range helpers.

4. Do not do a broad primitive diff yet.
   - Full diff/update is more complex and can wait until object counts justify it.
   - First pass should be: fewer calls + fewer candidates.

Verification:

- Replay play at fastest speed with PDAs, Segments, Chart Notes loaded.
- Visual overlays should match pre-change behavior for current replay-visible data.
- Turning Replay off restores full chart overlays.
- `node --check`, existing smoke tests, and browser replay smoke pass.

### Step 270 Completed - Replay overlay redraw load reduction

Implemented:

- PDA renderer now uses a replay-specific RAF coalesced render handler for `replay:changed`.
- Chart Notes renderer now uses a replay-specific RAF coalesced render handler for `replay:changed`.
- Removed the objective-gaps replay listener that emitted `pda:changed` on every replay tick.
  - PDA renderer already listens to `replay:changed` directly.
  - NDOG/NWOG replay-visible bounds are still computed inside PDA rendering from `getReplayVisibleBars()`.
  - Removing this path avoids duplicating primary/secondary PDA rerenders through a synthetic `pda:changed` event.

Validation:

- `node --check` passed for edited Step 270 files.
- `git diff --check` passed for Step 270 files.
- `node v4/tests/calendar-visibility-smoke.js` passed.
- Headless Chrome replay smoke loaded `v4/index.html`, injected bars + one PDA + one Chart Note, emitted 20 `replay:changed` events, waited two animation frames, and confirmed no console errors and chart/PDA/note state remained available.

### Step 271 - Unified UTC date/time helper

Problem:

- `dateKeyFromTimestamp()` and compact UTC time formatting are repeated across many modules.
- Time is the primary variable in this project, so duplicated time helpers increase drift risk.

Implementation steps:

1. Create a small shared module, e.g. `v4/src/time/date-key.js` or `v4/src/utils/time-format.js`.
   - Provide:
     - `dateKeyFromTimestamp(timestamp)`;
     - optional `compactUtcTime(timestamp)` / `formatUtcDateTime(timestamp)` if it reduces clear duplication.

2. Preserve existing semantics exactly.
   - Input is epoch seconds.
   - Output date key is UTC `YYYY-MM-DD`, matching current chart wall-clock convention.
   - Invalid / non-positive timestamp returns empty string where current callers expect empty.

3. Replace repeated implementations incrementally.
   - Start with Calendar / Inspector modules.
   - Then Daily Regime, Economic Calendar, Review Archive, Chart Notes, Secondary menu.

4. Add a small smoke test.
   - Valid epoch seconds.
   - Invalid values.
   - Date boundary case.
   - Daily/tradingDay callers should not be forced into timestamp conversion if they already have a valid `tradingDay` string.

Verification:

- `grep -R "function dateKeyFromTimestamp" v4/src` should show only the shared helper, unless a local function has intentionally different semantics and is documented in the session note.
- Existing calendar/review/daily-regime behavior unchanged.
- `node --check` and relevant smoke tests pass.

### Step 271 Completed - Unified UTC date/time helper

Implementation:

- Added shared date/time helpers in `v4/src/utils.js`:
  - `dateKeyFromTimestamp()`
  - `dateKeyFromUtcParts()`
  - `dateKeyFromTradingDay()`
  - `dateKeyFromInput()`
  - `dateKeyFromBar()`
  - `compactUtcTime()`
- Replaced repeated local date-key implementations across:
  - Calendar / Inspector modules;
  - Daily Regime trend/range/VIX loader;
  - Economic Calendar loader;
  - Review Archive;
  - Chart Notes visible-day logic;
  - Secondary context menu;
  - Replay / secondary trading-day helpers.
- Kept existing semantics:
  - epoch seconds input;
  - UTC `YYYY-MM-DD` output;
  - invalid or non-positive timestamps return empty string;
  - `tradingDay` / `trading_day` values stay preferred where callers already had trading-day strings.

Verification:

- `rg "function dateKeyFromTimestamp|const dateKeyFromTimestamp|dateKeyFromTimestamp =" v4/src` now shows only the shared helper.
- `node v4/tests/date-key-smoke.js` passed.
- `node v4/tests/calendar-visibility-smoke.js` passed.
- Full `find v4/src -name '*.js' -exec node --check {} \;` passed.
- `git diff --check` passed.

### Step 272 - `/v4/bars` large range guard

Problem:

- `/v4/bars` accepts arbitrary start/end/timeframe.
- A mistaken multi-year 1M request can stress DuckDB, JSON serialization, frontend parsing, and chart rendering.

Implementation steps:

1. Define conservative local-tool limits.
   - Example: max estimated bars per request, not just max date span.
   - 1M should be stricter than 1H / 1D.

2. Add backend guard in `v4/v4_api.py` before `query_v4_bars()`.
   - Parse start/end.
   - Estimate bar count from timeframe.
   - Return clear JSON error if over limit.

3. Add frontend Date Range guard.
   - Prevent obvious accidental requests before hitting API.
   - Keep message actionable: narrow date range or use higher timeframe.

4. Do not block normal research windows.
   - Common NY Open study ranges should remain frictionless.

Verification:

- Normal 1D/1H/1M expected ranges still load.
- Oversized 1M request returns a clear error without DuckDB query.
- UI displays the error without breaking chart state.

### Step 272 Completed - `/v4/bars` large range guard

Implementation:

- Added backend hard guard in `v4/v4_api.py` before `query_v4_bars()`.
  - Parses `start`, `end`, and `tf`.
  - Estimates returned bars by timeframe plus existing padding.
  - Returns 413 JSON error for oversized requests.
  - Returns 400 for invalid timeframe/range input.
- Extended frontend `v4/src/data/load-range-policy.js`.
  - Added estimated bars and max estimated bars helpers.
  - Kept Date Range behavior compatible with Step 162:
    - normal ranges pass;
    - long 1m ranges enter window mode;
    - invalid/oversized single windows show actionable messages.
- Adjusted secondary chart loading.
  - High-timeframe secondary chart still loads its requested timeframe normally.
  - Optional 1m replay source is fetched only when the same range passes the 1m guard.
  - If the auxiliary 1m source is too large, it is skipped instead of failing the whole secondary chart load.
- Added `v4/tests/load-range-policy-smoke.js`.

Verification:

- `node v4/tests/load-range-policy-smoke.js` passed.
- `node v4/tests/date-key-smoke.js` passed.
- Full `find v4/src -name '*.js' -exec node --check {} \;` passed.
- `python3 -m py_compile v4/v4_api.py` passed.
- Pure Python guard check confirmed:
  - normal 1m range passes;
  - oversized 1m range raises `OverflowError`.
- API restarted with `setsid`.
- HTTP checks after restart:
  - `/v4/health` returned ok.
  - Oversized 1m `/v4/bars` returned `HTTP/1.0 413 Content Too Large` with JSON error.
  - Normal short 1m `/v4/bars` still returned bars and `requestedRange`.
- `git diff --check` passed.

### Step 273 - Shared localStorage persistence helper

Problem:

- Multiple persistence modules repeat the same browser-local persistence pattern.
- Repeated restore/save/clear/restoring-guard logic makes future schema changes error-prone.

Implementation steps:

1. Extract a minimal helper only for the repeated pattern.
   - Avoid a large persistence manager.
   - Helper can cover:
     - safe JSON read;
     - save with restoring guard;
     - clear key;
     - optional status/error message emitter.

2. Migrate one module first as proof.
   - Recommended first target: Chart Notes or Daily Time Review, whichever has the smallest surface.

3. Migrate remaining modules after proof is stable.
   - PDA;
   - Segment;
   - Order Review;
   - Daily Time Review;
   - Chart Notes.

### Step 273.1 Completed - Shared local persistence base

Implementation:

- Added `v4/src/storage/local-persistence.js`.
- Exported:
  - `readLocalJson(key, fallback, options)`;
  - `writeLocalJson(key, value, options)`;
  - `removeLocalJson(key, options)`;
  - `createLocalPersistence({ key, fallback, storage, onError })`.
- The helper supports:
  - browser `window.localStorage` by default;
  - injected storage for tests;
  - JSON parse fallback;
  - action-aware error callback;
  - per-store restoring guard via `runRestoring()` / `isRestoring()`.
- Added `v4/tests/local-persistence-smoke.js`.
- No business persistence module migrated in this substep.

Verification:

- `node v4/tests/local-persistence-smoke.js` passed.
- `node --check v4/src/storage/local-persistence.js` passed.
- `git diff --check` passed.

### Step 273.2 Completed - Chart Notes persistence migration

Implementation:

- Migrated `v4/src/chart-notes/chart-note-persistence.js` to `createLocalPersistence()`.
- Preserved the existing storage contract:
  - key: `v4:chart-notes:NQ`;
  - payload: `{ version, savedAt, chartNotes }`.
- Preserved behavior:
  - `chart-notes:changed` still triggers save;
  - restore still calls `loadChartNotes(notes)`;
  - restore still reports recovered note count;
  - clear saved still emits the same success text;
  - helper restoring guard prevents restore-triggered change events from overwriting saved data.

Verification:

- `node v4/tests/local-persistence-smoke.js` passed.
- `node --check v4/src/chart-notes/chart-note-persistence.js` passed.
- Full `find v4/src -name '*.js' -exec node --check {} \;` passed.
- `git diff --check` passed.

### Step 273.3 Completed - Review persistence migration

Implementation:

- Migrated `v4/src/time-reaction/daily-time-review-persistence.js` to `createLocalPersistence()`.
  - Preserved key `v4:daily-time-reviews:NQ`.
  - Preserved payload `{ version, savedAt, dailyTimeReviews }`.
  - Preserved restore call `loadDailyTimeReviews(reviews, { preserveUpdatedAt: true })`.
- Migrated `v4/src/order/order-review-persistence.js` to `createLocalPersistence()`.
  - Preserved key `v4:order-reviews:NQ`.
  - Preserved payload `{ version, savedAt, orderReviews }`.
  - Preserved draft/source filtering.
- Restore-triggered change events are still guarded from overwriting saved local state.

Verification:

- `node v4/tests/order-review-types-smoke.js` passed.
- `node v4/tests/order-setup-smoke.js` passed.
- `node v4/tests/local-persistence-smoke.js` passed.
- `node --check v4/src/order/order-review-persistence.js` passed.
- `node --check v4/src/time-reaction/daily-time-review-persistence.js` passed.
- Full `find v4/src -name '*.js' -exec node --check {} \;` passed.
- `git diff --check` passed.
   - Daily Time Review;
   - Chart Notes.

4. Preserve storage keys and payload shape.
   - No data migration unless explicitly needed.
   - Existing localStorage should keep restoring.

Verification:

- Refresh restores data for each migrated store.
- Clear saved still clears the same key.
- Review JSON import/export unaffected.
- Undo/redo behavior unaffected because persistence mirrors store changes only.

### Step 274 - Renderer / hit-test reuse cleanup, deferred until next touch

Problem:

- Primary/secondary PDA renderers repeat projection and CE fallback logic.
- PDA / Segment / Order Setup hit-test modules repeat chart context, coordinate, tolerance, and distance sorting patterns.

Implementation steps when this area is next touched:

1. Renderer reuse:
   - Extract shared projection primitive builders where primary/secondary only differ by chart context.
   - Keep chart-specific attach/detach in the calling renderer.
   - Do not merge whole renderer modules in one pass.

2. Hit-test reuse:
   - Extract small context helpers:
     - resolve chart context;
     - time/price coordinate conversion;
     - distance sorting;
     - common tolerance checks.
   - Keep object-specific hit semantics local.

3. Validate primary/secondary parity.
   - Same PDA renders consistently on both charts.
   - Same hit-test target selects the same object type before/after refactor.

Verification:

- Manual browser checks for PDA, Segment, Composite, Order Setup hit-test.
- Split on/off checks for secondary renderer parity.
- `node --check` and `git diff --check` pass.

Non-goals for Steps 269-274:

- Do not redesign Inspector state management.
- Do not introduce a global persistence manager beyond a small helper.
- Do not replace LightweightCharts primitives wholesale.
- Do not change time semantics from current UTC wall-clock convention.
- Do not add automatic trading/order execution behavior.
