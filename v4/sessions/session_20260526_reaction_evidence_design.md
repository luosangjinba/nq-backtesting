# V4 Reaction Evidence Design

## Branch
- `main`

## Status
- Design only.
- The previous `feature/v4-range-reaction-review` branch was deleted because the workflow was too complex.
- This document records the replacement design before implementation.

## Core Decision
- Do not ask the system to decide whether a PDA was respected or swept.
- The user manually confirms that a reaction event exists.
- The user manually identifies:
  - the PDA being reacted to,
  - the continuous actor candle group,
  - the first bar,
  - the last bar,
  - the terminal bar.
- The system only computes objective metrics from that confirmed event.

## Data Location
- Store evidence under the linked segment PDA response:

```js
segment.pdaResponses[].reactionEvidence[]
```

- One PDA response can have multiple evidence records.
- Evidence belongs to review/segment workflow, not to the PDA annotation itself.

## Shared Actor Model

```js
actor: {
  timeframe: '1H',
  firstBarTimestamp: 123,
  lastBarTimestamp: 456,
  terminalBarTimestamp: 456
}
```

- The actor candle group is continuous.
- First implementation can use plain Inspector time inputs.
- Later implementation can add chart pick actions for first/last/terminal.

## FVG Respect Evidence

### User Provides
- Evidence type: `fvg-respect`
- FVG/range PDA id.
- Actor candle group.
- Entry side:
  - `from-above`
  - `from-below`

### System Computes
- FVG range:

```text
fvgRangePoints = abs(fvgTop - fvgBottom)
```

- Wick/body extremes are computed from the whole actor group, not only terminal bar.
- For `from-above`:
  - wick extreme = group lowest low
  - body extreme = group lowest body low
- For `from-below`:
  - wick extreme = group highest high
  - body extreme = group highest body high

### Percent Metrics
- FVG start = `0%`
- CE = `50%`
- FVG far edge = `100%`
- Metrics:

```js
metrics: {
  fvgRangePoints,
  wickEntryPercentOfFvg,
  bodyEntryPercentOfFvg,
  bodyExceededFvg
}
```

### Important Rules
- Percent values are true calculated values.
- Wick percent can exceed `100%`.
- Body percent is not clamped.
- If body percent exceeds `100%`, save the true value and mark:

```js
bodyExceededFvg: true
```

- UI should display body percent above `100%` in red.
- Point values are not primary research metrics because NQ nominal level changes too much over 20 years.
- `fvgRangePoints` is kept only for audit/filtering, not cross-era comparison.

## Liquidity Sweep Evidence

### User Provides
- Evidence type: `liquidity-sweep`
- Liquidity PDA id:
  - BSL
  - SSL
  - EQH
  - EQL
- Actor candle group.

### System Computes
- Liquidity side:
  - BSL/EQH = `high`
  - SSL/EQL = `low`
- Actor group move range:

```text
moveRangePoints = groupHighestWick - groupLowestWick
```

### High-Side Sweep
- wick extreme = group highest high
- body extreme = group highest body high
- wick sweep distance = wick extreme - liquidity price
- body sweep distance = body extreme - liquidity price

### Low-Side Sweep
- wick extreme = group lowest low
- body extreme = group lowest body low
- wick sweep distance = liquidity price - wick extreme
- body sweep distance = liquidity price - body extreme

### Percent Metrics
- Main metrics use the actor move as denominator:

```js
metrics: {
  liquiditySide,
  moveRangePoints,
  wickSwept,
  bodySwept,
  wickSweepPercentOfMove,
  bodySweepPercentOfMove
}
```

- Do not use raw point sweep distance as a primary comparison metric.
- Raw point values can be displayed for audit/debug, but not used as cross-era research metrics.

## Draft Schema

```js
{
  id,
  type: 'fvg-respect' | 'liquidity-sweep',
  pdaId,
  actor: {
    timeframe,
    firstBarTimestamp,
    lastBarTimestamp,
    terminalBarTimestamp
  },
  params: {
    entrySide // only for fvg-respect
  },
  metrics,
  note,
  createdAt,
  updatedAt
}
```

## Implementation Plan
1. Add `v4/src/segment/reaction-evidence.js`. ✅ Done on `feature/v4-reaction-evidence-core`.
2. Implement evidence creation, normalization, timestamp parsing, actor group lookup, and metrics calculation. ✅ Done on `feature/v4-reaction-evidence-core`.
3. Add Inspector UI under each `PDA Responses` row:
   - Add FVG Respect Evidence for range PDA.
   - Add Liquidity Sweep Evidence for high/low liquidity PDA.
   - Edit first/last/terminal/entrySide/note.
   - Show calculated metrics.
   - Delete evidence. ✅ Done on `feature/v4-reaction-evidence-core`.
4. Ensure localStorage naturally persists evidence.
5. Update Review JSON import normalization to preserve evidence.
6. Add body percent red styling when `bodyExceededFvg=true`.

## Explicit Non-Goals For First Pass
- No automatic respect detection.
- No automatic sweep detection.
- No automatic actor candle group selection.
- No canvas box select.
- No canvas note overlay.
- No final verdict field.
- No statistics page.

## Validation Samples
- FVG:
  - single terminal candle wick enters FVG,
  - multi-candle group body enters FVG,
  - wick percent exceeds 100%,
  - body percent exceeds 100% and displays red,
  - group does not touch FVG and percent is below 0.
- Liquidity:
  - wick-only sweep,
  - wick + body sweep,
  - high-side BSL/EQH,
  - low-side SSL/EQL,
- invalid or zero move range.

## Plan 1 Implementation Notes
- Branch: `feature/v4-reaction-evidence-core`
- Added `v4/src/segment/reaction-evidence.js`.
- Current module exports:
  - `EVIDENCE_TYPES`
  - `FVG_ENTRY_SIDES`
  - `LIQUIDITY_SIDES`
  - `parseEvidenceTimestamp()`
  - `getActorBars()`
  - `getActorGroupStats()`
  - `inferLiquiditySide()`
  - `createReactionEvidence()`
  - `normalizeReactionEvidence()`
  - `computeFvgRespectMetrics()`
  - `computeLiquiditySweepMetrics()`
  - `computeReactionEvidenceMetrics()`
  - `buildDefaultActorFromSegment()`
- FVG respect metrics:
  - use FVG height as denominator,
  - compute wick/body extremes from the actor group,
  - preserve true percent values without clamping,
  - set `bodyExceededFvg` when body percent exceeds `100`.
- Liquidity sweep metrics:
  - infer BSL/EQH as high-side and SSL/EQL as low-side,
  - use actor group total wick range as denominator,
  - compute `wickSwept/bodySwept` plus wick/body sweep percent of actor move.
- Verified with `node --check v4/src/segment/reaction-evidence.js` and a small module-level sample calculation.

## Plan 2 Implementation Notes
- Plan 2 was mostly covered by the first core-module commit; this pass added the missing helpers that later UI/import code will need:
  - `normalizeReactionEvidenceList(evidenceList)`
  - `computeReactionEvidenceWithMetrics(evidence, annotation, bars)`
- `normalizeReactionEvidenceList()` gives Review JSON import and segment response normalization a single path for preserving evidence arrays.
- `computeReactionEvidenceWithMetrics()` returns a normalized evidence object with freshly computed metrics attached, so Inspector rendering can remain thin.

## Plan 3 Implementation Notes
- Segment Inspector now renders a `Reaction Evidence` area under each linked PDA response.
- Range PDA responses show `Add FVG Respect Evidence`.
- High/low liquidity PDA responses show `Add Liquidity Sweep Evidence`.
- Evidence rows support:
  - delete,
  - first bar timestamp,
  - last bar timestamp,
  - terminal bar timestamp,
  - note,
  - FVG `entrySide` when evidence type is `fvg-respect`.
- Metrics are recomputed from current loaded bars during Inspector render using `computeReactionEvidenceWithMetrics()`.
- FVG metrics display:
  - actor bars,
  - FVG range,
  - wick entry percent,
  - body entry percent,
  - body exceeded flag.
- Liquidity metrics display:
  - actor bars,
  - side,
  - move range,
  - wick/body swept flags,
  - wick/body sweep percent of move.
- `bodyEntryPercentOfFvg > 100` is displayed with `inspector-metric-alert` styling.
- First pass uses text timestamp inputs; no chart pick flow yet.
