# V4 User Guide

V4 is a chart-based review tool for marking PDAs, drawing 1H price legs, linking PDA responses, recording reaction evidence, grouping multiple legs into higher-timeframe Composite Moves, and manually marking SMT evidence with an ES secondary chart.

The current version is centered on manual review. Most chart-review workflows are usable. The remaining "precision review" work is actor-timeframe auto-fetching, canvas selection of actor candle groups, final verdict workflow, and statistics pages.

## Start The App

Start a static file server from the project root:

```bash
cd /home/leo/myworkspace/trading/backtesting
python3 -m http.server 8001
```

Open:

```text
http://127.0.0.1:8001/v4/index.html
```

The V4 API is usually available at:

```text
http://127.0.0.1:8766/v4/health
```

## Load A Chart

The top toolbar provides:

- `开始`: range start.
- `结束`: range end.
- `周期`: chart timeframe, such as `1H`, `4H`, or `D`.
- `加载`: load candles.
- `Archive`: open import/export actions.
- `Split`: show or hide the secondary chart.
- `Sub`: secondary instrument, usually `ES`.
- `Sub TF`: secondary timeframe.
- `Layout`: stacked or side-by-side split layout.

Use this time format when possible:

```text
YYYY-MM-DD HH:mm
```

## Split Screen

Split Screen lets you compare the primary NQ chart with a secondary NQ/ES chart over the same absolute time range.

Common settings:

- Primary chart: NQ.
- `Sub`: ES.
- `Sub TF`: usually the same as the primary timeframe; SMT marking requires them to match.
- `Layout`: `Stack` for vertical split, `Side` for side-by-side split.

The secondary chart is read-only:

- It does not own the context menu.
- It does not directly edit PDA or segment objects.
- It can show synchronized hover cursor, replay cursor, and read-only PDA/segment/composite overlays.

Use `SMT -> Locate Time in Secondary` from the primary chart context menu to center the secondary chart around the clicked primary candle time.

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

## Draw 1H Segments

A segment represents one continuous price leg.

The context menu provides explicit endpoint choices:

- `Start 1H Segment from Low`
- `Start 1H Segment from High`
- `End 1H Segment at Low`
- `End 1H Segment at High`

Use candle high/low for segment endpoints. Do not use close when the goal is to represent swing extremes.

New segment labels are hidden by default. Select a segment and enable `Show segment label` in the Inspector if needed.

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

SMT is manual-only in the current version. The first version supports `NQ follows ES`: NQ is the primary trading chart, and ES is the comparison chart. ES follows NQ is intentionally out of scope.

Requirements:

- Enable `Split`.
- Set `Sub` to `ES`.
- Primary timeframe and `Sub TF` must match.
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

V4 searches the ES secondary bars for a same-direction FVG around that selected time.

On success:

- ES renders the FVG range.
- NQ renders a vertical marker at the matching time.
- The record appears in `SMT Evidence`.

### SMT Inspector

The Inspector `SMT Evidence` section supports:

- `Locate`: locate the SMT time range.
- `Delete`: delete the SMT record.
- `Note`: add a note.

SMT records keep their original timeframe. The current version renders SMT only when the record timeframe matches the current primary/secondary timeframe.

## Saving And Import/Export

V4 has two persistence layers.

### LocalStorage Draft

The browser automatically saves:

- PDA annotations
- market segments
- segment groups / Composite Moves

This is a working draft, not a formal archive.

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

It does not include candle data.

## Suggested Review Workflow

1. Load the target range and timeframe.
2. Mark key PDAs.
3. Draw continuous 1H segments.
4. Link relevant PDAs to segments.
5. Review `Review Metrics` and `Terminal PDA Candidates`.
6. Add Reaction Evidence under PDA Responses when needed.
7. Create Composite Moves for multi-leg structures.
8. Use isolate mode or Structure Sets focus to inspect local context.
9. If NQ/ES relationship evidence is needed, enable Split and manually mark SMT.
10. Export Review JSON for archiving.

## Notes And Common Pitfalls

- Segments should be endpoint-continuous whenever possible.
- Segment endpoints should consistently use candle high/low.
- `draft child` means a temporary staged segment before Composite Move creation.
- `child segment` means a formal child after Composite Move creation.
- `target segment` is usually the prior leg being broken or referenced, and it does not have to be a child.
- Wick CE is a PDA. It can be linked to a segment and can appear in terminal reaction review.
- SMT is currently manual evidence. It does not scan candidates automatically.
- Review JSON does not include candle data. Another machine still needs local DuckDB market data.
- Precision-review features such as actor-timeframe auto-fetching, canvas selection, and statistics pages are still deferred.
