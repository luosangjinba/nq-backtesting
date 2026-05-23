# V4 User Guide

V4 is a chart-based review tool for marking PDAs, drawing 1H price legs, linking PDA responses, and grouping multiple legs into higher-timeframe Composite Moves.

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

Use this time format when possible:

```text
YYYY-MM-DD HH:mm
```

## Manual PDA Marking

Right-click a candle to create PDA objects.

Common actions:

- `Mark BSL`
- `Mark SSL`
- `Start EQH Set`
- `Start EQL Set`
- `Mark FVG`
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

It does not include candle data.

## Suggested Review Workflow

1. Load the target range and timeframe.
2. Mark key PDAs.
3. Draw continuous 1H segments.
4. Link relevant PDAs to segments.
5. Review `Review Metrics` and `Terminal PDA Candidates`.
6. Create Composite Moves for multi-leg structures.
7. Use isolate mode to inspect local context.
8. Export Review JSON for archiving.

## Notes And Common Pitfalls

- Segments should be endpoint-continuous whenever possible.
- Segment endpoints should consistently use candle high/low.
- `draft child` means a temporary staged segment before Composite Move creation.
- `child segment` means a formal child after Composite Move creation.
- `target segment` is usually the prior leg being broken or referenced, and it does not have to be a child.
- Wick CE is a PDA. It can be linked to a segment and can appear in terminal reaction review.
