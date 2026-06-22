# V4 User Guide

V4 is a chart-based review tool for replaying NQ/ES candles, marking PDAs, drawing price legs, writing Chart Notes, building Order Setups, reviewing days through Calendar/Inspector, and manually marking SMT evidence with an ES Comparison Window.

The current version is centered on manual review. It is not an automatic trading-signal system and does not decide whether a setup is valid. Most chart-review workflows are usable. The remaining "precision review" work is actor-timeframe auto-fetching, canvas selection of actor candle groups, final verdict workflow, and statistics pages.

## Start The App

Recommended start command:

```bash
cd v4
bash start.sh start
```

Open:

```text
http://127.0.0.1:8001/index.html
```

The V4 API is usually available at:

```text
http://127.0.0.1:8766/v4/health
```

Common service commands:

```bash
bash start.sh status
bash start.sh restart
bash start.sh stop
```

If you see `Failed to fetch`, Replay History restore failures, or Calendar/price lookup failures, first check whether the API is running on `8766`.

When copying `v4/` as a standalone folder, prepare `data/trading_data.duckdb` first or set `V4_TRADING_DB`. See [Standalone Run Guide](STANDALONE_RUN.md).

## Load A Chart

The top toolbar provides:

- `Date`: current loaded range. Click it to open the Date Range Calendar for start/end selection and manual precise time input.
- `Main`: primary chart instrument. Regular review workflows currently support `NQ` and `ES`; the default remains `NQ`.
- `Main TF`: primary chart timeframe, such as `1M`, `30M`, `1H`, `4H`, or `D`.
- `加载`: load candles.
- `Archive`: open import/export actions.
- `Compare`: show or hide the sliding Comparison Window.

Use this time format when possible:

```text
YYYY-MM-DD HH:mm
```

Large 1M ranges use windowed loading. The chart shows the current window instead of loading the full long 1M range into the browser at once.

## Main Instrument

`Main` is workspace-level state. After switching between `NQ` and `ES`, primary chart loading, Replay History, PDA, Segments, Chart Notes, Time Reaction, Order Setup, Time Lines, Economic Event notes, and display mode all use the current Main instrument as context.

Compatibility and isolation rules:

- The default Main is `NQ`, and existing NQ review data continues to load under the NQ workspace.
- New objects are written to the current Main's local partition, so NQ objects and ES objects do not mix.
- Calendar, Archive, and Replay History show/import/export data for the current Main instrument. Archive imports for a different instrument are rejected instead of silently merged.
- Daily Regime `VIX` is shared market context; `Trend` / `Range` follow the current Main instrument. NQ reads `data/daily-regime-nq.csv`, and ES reads `data/daily-regime-es.csv`.
- Other instruments only have extension hooks. Full support requires database coverage, tick configuration, roll rules, and workflow-specific rules.

## Replay Bar

Replay Bar is used to step through historical candles.

Bottom controls include:

- `Replay Bar On/Off`: enable or disable replay.
- `First`: jump to the first loaded candle.
- `Last Pos`: return to the previous replay position.
- `Pick`: click a candle that has already been revealed and truncate replay to that position.
- `Next`: jump to the next fixed time.
- `<` / play / `>`: step backward, auto-play, step forward.
- `History`: restore recent replay workspaces.

Replay Pick rules:

- It only hits candles already visible in the replay slice.
- It does not expand the full date range.
- It does not load future candles.
- It is intended for backing up a small amount after the market has moved too far.

Replay History stores workspace state such as the primary window, cursor, and Comparison Window settings. It does not store candle data. Restore failures usually mean the API is not running.

## Calendar / Daily Regime / Economic Events

The Calendar in the right Inspector is the daily review hub.

Each day can aggregate:

- Order Setups
- Time Reaction Observation
- Chart Notes
- Economic Events
- SMT
- PDA
- Segments
- Composite
- Killzones / Time Lines

Click a day to open its details. `Show Day Objects` / `Hide Day Objects` show or hide that day's visible chart objects, including PDA, Segments, Composite, SMT, Time Lines, Killzones, and Chart Note boxes.

Daily Regime appears in the day detail:

- `VIX`: daily VIX bucket from shared `data/vix-daily.csv` for both NQ and ES.
- `Trend`: static daily trend regime for the current Main instrument.
- `Range`: static daily range regime and ATR multiple for the current Main instrument.
- `Events`: important event tags. `none` means no important event tag for the day; `unknown` means event data was unavailable.

The current ES Daily Regime file covers `2008-01-02` through `2026-06-11`. After refreshing candle data with Databento or another flow, regenerate the relevant instrument's `daily-regime-*.csv`; otherwise Calendar Trend/Range remains based on the older CSV.

Economic Events are loaded from the local USD events CSV. High/Medium are visible by default, Low is hidden by default, and Holiday is visible by default. Economic events do not draw permanent chart lines; `Locate` moves the chart and flashes the event time.

## Comparison Window

Comparison Window is the supported sliding comparison view. It is not a resize patch on the old Split Screen. The comparison chart sits on the left and the main chart remains visible on the right. Dragging the comparison right boundary changes the visible clipped area; candles, drawings, and overlays inside the comparison chart do not rescale just because the boundary moved. Legacy saved floating workspaces can still be normalized for compatibility, but new/reset windows use sliding mode. The old Split user entry points have been removed after the focused real-use audit passed.

Currently supported:

- Primary NQ with Comparison ES cross-instrument review.
- Primary 1M with Comparison 1H/4H and other cross-timeframe review, including same-instrument different-timeframe comparison.
- Right-click in the Comparison Window to create BSL/SSL, FVG/IFVG, Segment, and add the comparison candle as active Order Setup evidence.
- PDA, Segment, Chart Notes, Order Setup, Live Record, and Time Overlays are filtered by source instrument/timeframe before rendering in the Comparison Window, avoiding wrong price-axis projection.
- SMT prefers `Main=NQ + Comparison=ES + same timeframe`; comparison-side SMT rendering, selection, Inspector, and Locate are supported.
- During Replay On, higher-timeframe comparison candles use 1M source data for progressive HTF rendering, so future complete HTF candles are not shown early.
- Local workspace state saves the window enabled state, sliding boundary, instrument/timeframe, and sync mode. Replay History also restores the needed comparison state.

Implementation note:

- The old Split Screen user entry points and legacy secondary runtime modules have been removed. Comparison Window is the supported comparison surface.

## Manual PDA Marking

Right-click a candle to create PDA objects.

Common actions:

- `Mark BSL`
- `Mark SSL`
- `Start EQH Set`
- `Start EQL Set`
- `Mark FVG`
- `Mark IFVG`
- `Mark Bullish OB`
- `Mark Bearish OB`
- `Mark Bullish Breaker`
- `Mark Bearish Breaker`
- `Start Fib`
- `Mark Upper Wick CE`
- `Mark Lower Wick CE`
- `PDA -> OB Last Bar`

### EQH / EQL

1. Right-click the first candle and select `Start EQH Set` or `Start EQL Set`.
2. Right-click later candles and select `Add EQH Point` or `Add EQL Point`.
3. Finish the set with `Finish EQH` or `Finish EQL`.

After selecting an existing EQH/EQL set, you can right-click another candle and use `Add to Selected EQH/EQL`.

### Wick CE

`Wick CE` is an independent PDA that marks the midpoint of a wick.

- Upper Wick CE: midpoint of the upper wick.
- Lower Wick CE: midpoint of the lower wick.

Formula:

```text
bodyHigh = max(open, close)
bodyLow  = min(open, close)

Upper Wick CE = (high + bodyHigh) / 2
Lower Wick CE = (low + bodyLow) / 2
```

The label includes the current chart timeframe:

```text
1H Upper Wick CE
4H Lower Wick CE
```

### OB Last Bar

`OB Last Bar` is a simplified PDA type.

How to use it:

1. Right-click the target candle.
2. Choose `PDA -> OB Last Bar`.
3. V4 draws a gray horizontal segment from that candle price to the right.

The label shows the name, instrument, and timeframe. It shares the common PDA display / visibility / Review JSON behavior.

## Draw Segments

A segment represents one continuous price leg.

The context menu provides explicit endpoint choices:

- `Start Segment from Low`
- `Start Segment from High`
- `End Segment at Low`
- `End Segment at High`

Use candle high/low for segment endpoints. Do not use close when the goal is to represent swing extremes.

New segment labels are hidden by default. Select a segment and enable `Show segment label` in the Inspector if needed.

Segments can be drawn on 1H or lower timeframes. Each segment records its source timeframe. A 1H chart cannot place two 1H endpoints inside the same 1H candle; switch to 30M/15M/5M/1M when finer endpoints are needed.

When switching timeframes, endpoints with recorded occurrence timestamps are mapped as closely as possible to their actual source time. Older segments created before that fix may need to be deleted and redrawn.

## Chart Notes

Chart Notes are lightweight text notes bound to one candle.

Core rules:

- A note is bound to `instrument + timeframe + timestamp`.
- It renders only on the same timeframe. A `1M` note renders only on `1M`; a `30M` note renders only on `30M`.
- With Replay On, only notes already inside the revealed replay slice render.
- A Chart Note is not part of PDA/Segment/Order Setup, but it can be selected as an Order Setup reason object.

### Add / Edit / Delete

1. Right-click the target candle.
2. Open `Chart Note`.
3. Choose `Add Note Here`.
4. Type in the in-chart textarea. `Save` saves, `Cancel` or `Esc` cancels.

Right-click the original owner candle of an existing note to use:

- `Edit Note`
- `Delete Note`

### Chart Display

Chart Note boxes are pinned to the top of the primary chart canvas. They use pale yellow boxes and faint dashed leader lines pointing to their owner candles.

Layout rules:

- Each note owns one row.
- Non-overlapping boxes reuse the highest available row.
- Boxes move downward only when the top row is occupied.
- Long text stays truncated by default and can expand/collapse through mouse interaction.

### Inspector / Calendar

Chart Notes have a dedicated `Chart Notes` module under `Time Reaction Observation`.

The three-dot menu supports:

- `Locate`
- `Edit`
- `Delete`
- `Select Object`, for choosing the note as an Order Setup reason object.

Calendar `Show Day Objects` / `Hide Day Objects` includes Chart Note boxes and leader lines.

Replay-specific behavior:

- If replay has advanced to a later day, selecting an earlier day from Calendar focuses that earlier day's Chart Notes using the current replay visible bars.
- Normal replay day changes do not keep stacking previous-day note boxes.

## Link PDA Responses

First select a segment. Then right-click a PDA object.

The menu offers:

- `Respected`
- `Swept`
- `Approached`
- `Rejected`
- `Delivered Through`

The selected relation is stored in the segment's `PDA Responses`.

In the Segment Inspector, you can edit:

- relation
- display mode
- response note
- remove

## Reaction Evidence

Reaction Evidence is manually confirmed evidence under a PDA Response. The system does not decide whether a respect or sweep happened. You confirm the event, and V4 calculates objective metrics.

Current evidence types:

- `FVG Respect Evidence`: for range PDAs; computes wick/body entry as a percent of FVG height.
- `Liquidity Sweep Evidence`: for high/low liquidity PDAs; computes wick/body sweep as a percent of the liquidity price.

Each evidence item can edit:

- `Actor TF`: timeframe of the actor candle group.
- `Actor First`: first actor candle.
- `Actor Last`: last actor candle.
- `Actor Terminal`: terminal reaction candle.
- FVG `entrySide`.
- note.

Use `Pick` to choose actor times from the current chart. If `Actor TF` does not match the loaded chart timeframe, the pick is rejected to avoid selecting candles from the wrong timeframe.

Metrics are calculated only when `Actor TF` matches the currently loaded chart timeframe. Actor-timeframe auto-fetching is deferred to the precision-review phase.

## Segment Inspector

Click a segment to open the Inspector.

Main sections:

- `Market Segment`
- `Start / End`
- `PDA Responses`
- `Composite Move Builder`
- `Composite Moves`
- `Review Metrics`
- `Terminal PDA Candidates`
- `Fluency Components`
- `Review Notes`
- `Display`

### Review Metrics

Core fields:

- `Extension Ratio`: current segment range / previous segment range.
- `Extension State`: `no take`, `marginal sweep`, `meaningful break`, or `strong expansion`.
- `Took Extreme`: whether the segment took the previous opposing extreme.
- `Prev Extreme`: the previous extreme being challenged.

These metrics work best when segments are endpoint-continuous and endpoints consistently use high/low.

### Terminal PDA Candidates

This section shows how linked PDAs reacted on the terminal bar of the segment.

Range PDAs show:

- Wick Range / Body Range
- Wick CE / Body CE
- Wick Depth / Body Depth
- Swept/Reversed
- Delivered Through

Liquidity PDAs show:

- Touched
- Body Touch
- Swept
- Exact Equality
- Approach / Sweep points
- Swept/Reversed
- Delivered Through

Fib PDAs show:

- Nearest Level
- Wick Touch
- Body Touch
- Swept
- Delivered Through

## Isolate Segment

Select a segment and use the `Display` section:

- `Isolate segment`
- `Prev segments`
- `Include previous PDA responses`

Use this to:

- focus on the current segment only
- temporarily show the previous N segments as context
- optionally show PDA responses from those previous segments

## Structure Sets

The empty Inspector state shows `Structure Sets`.

It lists:

- segment drawing sets
- Composite Move drawing sets

Clicking a row locates the related time range and toggles temporary focus:

- focused sets highlight on the chart
- related objects hidden by Display Mode can be shown temporarily
- clicking the same row again clears that focus

This is a temporary frontend view state. It is not saved to localStorage or Review JSON.

## Composite Move

A Composite Move records a higher-timeframe move made from multiple atomic segments.

Example:

```text
segment0: previous down leg
segment1: first up attempt
segment2: pullback
segment3: second up leg that breaks target
```

In this case:

- `segment1 + segment2 + segment3` are child segments.
- `segment0` is the target segment.

### Create With Right-Click

1. Right-click the first child segment and select `Add Segment To Draft`.
2. Right-click later child segments and repeat `Add Segment To Draft`.
3. Right-click the target segment and select `Set Segment As Target`.
4. Once at least two child draft segments are staged, right-click any segment and select `Create Composite Move`.

Temporary colors before creation:

- child draft: amber
- target draft: purple

### Create From Inspector

1. Click a segment.
2. In `Composite Move Builder`, click `Add Current To Draft`.
3. Select later segments and add them to the draft.
4. Choose `Target Segment`, `Objective`, and `Outcome`.
5. Click `Create Composite Move`.

### Composite Move Selection

After creation, a light parent line appears on the chart.

Click the parent line:

- parent line highlights white
- child segments render amber
- target segment renders purple
- if a segment is both child and target, purple wins

### Composite Move Inspector

Selecting a Composite Move opens its own Inspector.

It shows:

- child segment list
- target segment
- objective
- outcome
- notes
- net range
- total path
- efficiency
- max pullback
- pullback ratio
- took target extreme

## SMT Evidence

SMT is manual-only in the current version. The first version supports `NQ follows ES`: NQ is the primary trading chart, and ES is the comparison chart. ES follows NQ is intentionally out of scope. Even though the primary Main chart now supports regular ES review, SMT is enabled for `Main=NQ`, `Comparison=ES`, and matching primary/comparison timeframes.

Requirements:

- Set `Main` to `NQ`.
- Enable `Compare` and set Comparison to `ES`.
- Primary timeframe and Comparison timeframe must match.
- Both NQ and ES candles must be loaded.

### Liquidity SMT

Liquidity SMT records:

- Bearish: NQ's right high does not sweep the left high, while ES's right high sweeps the left high at the same timestamps. NQ follows ES into a downside reversal.
- Bullish: NQ's right low does not sweep the left low, while ES's right low sweeps the left low at the same timestamps. NQ follows ES into an upside reversal.

How to mark:

1. Right-click the left candle on the NQ primary chart.
2. Open the `SMT` group.
3. Choose `Start Bearish Liquidity SMT` or `Start Bullish Liquidity SMT`.
4. Left-click the right candle on the NQ primary chart.

V4 uses the same left/right timestamps to find ES candles and validates:

- NQ no-sweep.
- ES sweep.

On success:

- NQ draws an `NQ no sweep` two-point segment.
- ES draws an `ES sweep` two-point segment.
- The record appears in `SMT Evidence` in the Inspector.

### FVG SMT

FVG SMT records:

- ES has and respects an FVG, then moves up/down.
- NQ has no recorded FVG at that time but follows the ES move.

How to mark:

1. Right-click the NQ primary chart.
2. Open the `SMT` group.
3. Choose `Mark Bearish FVG SMT` or `Mark Bullish FVG SMT`.
4. Left-click the NQ candle at the matching ES FVG time.

V4 searches the ES Comparison Window bars for a same-direction FVG around that selected time.

On success:

- ES renders the FVG range in the Comparison Window.
- NQ renders a vertical marker at the matching time.
- The record appears in `SMT Evidence`.

### SMT Inspector

The Inspector `SMT Evidence` section supports:

- `Locate`: locate the SMT time range.
- `Delete`: delete the SMT record.
- `Note`: add a note.

SMT records keep their original timeframe. The current version renders SMT only when the record timeframe matches the current primary/Comparison timeframe.

## Order Setup / Execution Lens

Order Setup splits an execution review into three layers:

- `Setup Thesis`: why this opportunity existed, with optional links to segments, Composite Moves, PDAs, SMT, or Reaction Evidence.
- `Entry Plan`: direction, entry time/price, entry model, stoploss, and targets.
- `Result Review`: exit, result, target progress, risk, points/R, holding time, and note.

The current version is manual review. It does not automatically judge whether a 09:30 reversal, 09:50 continuation/reversal, or Silver Bullet setup is valid.

### Create Order Setups

The primary entry point is the `Order Setup` group in the main chart right-click menu:

- `Create Bullish Setup Here`
- `Create Bearish Setup Here`
- `Move Active Reversal Here`
- `Set Entry Here`
- `Set MSS Here`
- `Set Stop Loss Here`
- `Targets` submenu:
  - `Set Target Internal 1 Here`
  - `Set Target Internal 2 Here`
  - `Set Target Internal 3 Here`
  - `Set Target Swing Point Here`
  - `Set Target External 1 Here`
  - `Set Target External 2 Here`
  - `Set Target External 3 Here`
- `Add Manual Explanation Event Here`

`Set Entry Here` records entry time and entry price together. After creation, the setup becomes the active setup. Later chart right-click actions write into that active setup.

Shift-right-click on a bar exposes line end controls, including `Set All End Here` and matching end actions for entry, MSS, stop loss, and each target.

Segment, Composite Move, PDA, and SMT objects are linked refs, not order parents. For example, a 1H FVG touch and bounce can be recorded directly as a setup event without forcing a 1H segment.

Use `Add Manual Explanation Event Here` when the reason is not an existing Segment, PDA, SMT, or Composite Move. For example, a 1H candle respecting a previous 1H FVG, a 30M body touch of FVG CE, or a 1M EQL sweep can be recorded as a manual explanation event.

The Inspector defaults to the current `Active Order Setup`. It shows a compact summary, a small action set, and a folded `Advanced Edit` section. Browse older setups from the Calendar object list and use `Open`.

### Order Setup Actions

Each Order Setup currently supports:

- `Set Active Setup`: make this review the target for chart actions.
- `Locate`: locate the setup / entry / exit time range.
- `Hide` / `Show`: hide or restore the whole setup annotation group without deleting it.
- `Delete`: delete the review.
- `Result`: quickly update result state.
- `Note`: edit the order-level note.

The chart renders a lightweight overlay:

- a single-bar reversal triangle marker
- entry helper line
- stoploss helper line
- target helper line
- risk zone / result helper

The Result panel derives:

- `Risk`: points from entry to stoploss.
- `Points`: outcome points from entry to exit.
- `R`: points / risk.
- `Hold`: holding time from entry to exit.
- `Target Progress`: target results follow the current ladder (`Target Internal 1/2/3`, `Target Swing Point`, `Target External 1/2/3`). When a later target is selected as the result, earlier targets are shown as reached. Each target action can be marked `None`, `Fruit`, `Neutral`, or `Best`.

Exit Time can be typed manually or selected with `Pick`. When choosing Target/Stop/BE results, V4 attempts to calculate the first touch using 1M data. If no valid touch is found, it does not write a false exit time.

The current version does not support order drag editing, automatic setup verdicts, or statistics pages.

## Live Records

Live Records are the live execution / journal companion to Order Setups. They deliberately use the same Calendar and Inspector shape as Order Setups, but they are stored as independent `liveRecords`.

Create them from the main chart `Live Records` right-click submenu:

- `Create Bullish Live Record Here`
- `Create Bearish Live Record Here`
- chart writes such as `Set Entry Here`, `Set Stop Loss Here`, targets, result/exit, and Shift end controls

Lifecycle states are manual: `draft`, `planned`, `active`, `submitted`, `filled`, `cancelled`, `closed`, and `reviewed`. `Clear Active Live Record` only clears the active selection; `Close` changes the record lifecycle state.

Use the Live Record Detail panel to write result notes, execution review notes, and mark the record reviewed. Calendar shows Live Records directly under Order Setups and summarizes `Open`, `Needs Review`, `Reviewed`, and `Cancelled` counts for the selected day.

A Live Record can stay standalone. Optionally link it to the active Order Setup to make it execution/review evidence. Linking does not mutate the Order Setup execution fields.

### Tradovate Live Record Import

The Data Maintenance page can convert Tradovate CSV files into Live Records inside a Review JSON archive. Open:

```text
http://127.0.0.1:8001/data-maintenance.html
```

You can select the CSV files one by one, or select one `CSV ZIP package` that contains the Tradovate exports. ZIP import auto-detects files by name and header, including files inside a folder such as `1/Performance.csv`. If you select both a ZIP package and an individual CSV field, the individual CSV overrides the matching file from the ZIP.

Primary sources:

- `Performance CSV`: each paired-trade row becomes one closed Live Record.
- `Orders CSV`: optional, enriches entry/stop/target order status, prices, and cancelled/filled state.
- `Fills CSV`: optional, enriches fill order id, fill price, quantity, and commission.

Reconciliation sources:

- `Position History CSV`: optional, validates Performance buy/sell fill pairs, qty, prices, and P/L.
- `Cash History CSV`: optional, validates commission and Trade Paired cash ledger totals.
- `Account Balance CSV`: optional, validates daily Total Realized PNL by trade date.

Preview shows two kinds of checks:

- `File alignment`: verifies that Performance fill IDs exist in Fills, Fills order IDs exist in Orders, Position History pairs also exist in Performance, and Cash History has contract-level rows when possible.
- `Reconciliation`: validates Position/Cash/Account Balance totals against Performance/Fills.

Warnings do not block Review JSON generation and are not written into each Live Record. They are there to catch missing export rows, mixed-instrument inputs, commission differences, daily P/L mismatches, or an incomplete ZIP package.

For local validation of a real ZIP export without committing private data, run:

```bash
TRADOVATE_ZIP_PATH=/path/to/tradovate.zip node v4/tests/tradovate-zip-import-browser-smoke.js
```

Do not commit real Tradovate ZIP/CSV exports to git; they may contain account, order, fill, cash, and balance data.

## Saving And Import/Export

V4 has two persistence layers.

### LocalStorage Draft

The browser automatically saves:

- PDA annotations
- market segments
- segment groups / Composite Moves
- Order Setups
- SMT records
- Chart Notes
- Live Records

This is a working draft, not a formal archive.

### Current Storage Strategy

At this stage, V4 should be treated as being in a stability trial phase. Use it with several real trading days, record friction around data recovery, import/export, UI flow, and startup, and prioritize only high-impact fixes such as data loss, broken import/export, obvious UI blockers, and service startup failures.

Do not move manually entered review data into DuckDB as the primary write store yet:

- DuckDB remains responsible for market data, economic calendar data, and other external/batch datasets.
- localStorage remains the browser working draft.
- Review JSON remains the formal backup, migration, and archive format.
- Manually entered review data such as PDA, Segment, SMT, Order Setup, Live Record, Entry Context catalog, Chart Notes, and Daily Time Reviews should continue to be saved through Review JSON.

After the field structure stabilizes and there is enough real Review JSON history, DuckDB can become an analytics import target for pattern, session, lesson, setup, and result analysis. Avoid making DuckDB the primary manual-entry database during the testing phase because that would introduce schema migration, conflict handling, and restore complexity too early.

### Review JSON

Click `Archive` to use:

- `Export Review JSON`
- `Import Review JSON`

Review JSON includes:

- PDA annotations
- market segments
- segmentGroups
- reactionEvidence under pdaResponses
- SMT records
- orderReviews
- liveRecords
- dailyTimeReviews
- chartNotes
- dailyRegimes

`orderReviews` is the compatibility field name for Order Setups. It is intentionally unchanged so older archives and local drafts remain readable.
`liveRecords` stores Live Record lifecycle, execution, result, review notes, reasons, evidence refs, and optional linked Order Setup id.

It does not include candle data.

## Suggested Review Workflow

1. Load the target range and timeframe.
2. Check Calendar Daily Regime and Economic Events for the day.
3. Turn on Replay Bar and step through candles.
4. Add Chart Notes while observing the replay.
5. Mark key PDAs.
6. Draw continuous segments, using lower timeframes when fine endpoints are needed.
7. Link relevant PDAs to segments.
8. Review `Review Metrics` and `Terminal PDA Candidates`.
9. Add Reaction Evidence under PDA Responses when needed.
10. Create Composite Moves for multi-leg structures.
11. Use isolate mode, Structure Sets focus, or Calendar Show/Hide Day Objects to inspect local context.
12. If NQ/ES relationship evidence is needed, enable Compare and manually mark SMT.
13. Create Order Setups for key opportunities and record setup, entry, stop, targets, and result.
14. Create Live Records for live execution/journal observations; close, review, and optionally link them to Order Setups.
14. Review the day through Calendar/Inspector and complete Chart Notes / Time Reaction Observation.
15. Export Review JSON for archiving.

## Notes And Common Pitfalls

- Segments should be endpoint-continuous whenever possible.
- Segment endpoints should consistently use candle high/low.
- `draft child` means a temporary staged segment before Composite Move creation.
- `child segment` means a formal child after Composite Move creation.
- `target segment` is usually the prior leg being broken or referenced, and it does not have to be a child.
- Wick CE is a PDA. It can be linked to a segment and can appear in terminal reaction review.
- Chart Notes only render on their creation timeframe. They do not project across timeframes.
- During Replay, selecting or locating an earlier day from Calendar focuses that day's Chart Note boxes; normal day changes do not stack previous-day boxes indefinitely.
- SMT is currently manual evidence. It does not scan candidates automatically.
- Order Setup is a review layer, not an order execution module; incomplete drafts are allowed in the first version.
- Review JSON does not include candle data. Another machine still needs local DuckDB market data.
- During the current stability trial, export Review JSON at the end of each real-use day as a hard backup. DuckDB should remain the market/economic data store and a future analytics import target.
- Precision-review features such as actor-timeframe auto-fetching, canvas selection, and statistics pages are still deferred.
