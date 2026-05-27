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
- `actor.timeframe` is the timeframe of the actor candle group and is strongly tied to `firstBarTimestamp`, `lastBarTimestamp`, and `terminalBarTimestamp`.
- `actor.timeframe` is independent from the PDA/FVG source timeframe.
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
- Price base:

```text
priceBase = liquidity price
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
- Main metrics use the swept liquidity price as denominator, so the percentage can be compared across years and price regimes.

```js
metrics: {
  liquiditySide,
  liquidityPrice,
  wickSwept,
  bodySwept,
  wickSweepPercentOfPrice,
  bodySweepPercentOfPrice
}
```

- Do not use raw point sweep distance or actor group move range as the primary comparison denominator.
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
4. Ensure localStorage naturally persists evidence. ✅ Verified on `feature/v4-reaction-evidence-core`.
5. Update Review JSON import normalization to preserve evidence. ✅ Done on `feature/v4-reaction-evidence-core`.
6. Add body percent red styling when `bodyExceededFvg=true`. ✅ Done on `feature/v4-reaction-evidence-core`.

## Explicit Non-Goals For First Pass
- No automatic respect detection.
- No automatic sweep detection.
- No automatic actor candle group selection.
- No canvas box select.
- No canvas note overlay.
- No statistics page.

## Undecided Items
- Final verdict field: not part of the current plan. Whether to add a later manual classification field such as `valid-respect`, `failed-respect`, `wick-only-sweep`, or `delivered-through` remains undecided.

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
  - use swept liquidity price as denominator,
  - compute `wickSwept/bodySwept` plus wick/body sweep percent of price.
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
  - price base,
  - wick/body swept flags,
  - wick/body sweep percent of price.
- `bodyEntryPercentOfFvg > 100` is displayed with `inspector-metric-alert` styling.
- First pass uses text timestamp inputs; no chart pick flow yet.

## Plan 4 Implementation Notes
- No storage schema change is required for first-pass localStorage persistence.
- `segment-persistence.js` saves full persistable segment objects into `v4:market-segments:NQ`, so `pdaResponses[].reactionEvidence[]` is included naturally.
- Restore calls `loadSegments()` with the saved segment objects, preserving evidence arrays as-is.
- `updatePdaResponse()` merges patches onto the existing response, and `linkPdaResponse()` preserves existing response fields when re-linking the same PDA, so evidence is not dropped by normal Inspector edits.
- `resetSegmentDisplay()` spreads each response before changing display fields, so display reset keeps evidence.

## Plan 5 Implementation Notes
- `review-archive.js` now imports `normalizeReactionEvidenceList()`.
- During Review JSON import, each imported `pdaResponses[]` item normalizes its `reactionEvidence[]` list instead of dropping it while rebuilding the response object.
- Imported evidence is rebound to the remapped response `pdaId`, so id collisions or duplicate PDA merges do not leave stale evidence PDA references.
- Existing Review JSON files without evidence keep the same shape; no empty `reactionEvidence` array is added.

## Plan 6 Implementation Notes
- FVG respect metrics set `bodyExceededFvg=true` when `bodyEntryPercentOfFvg` is greater than `100`.
- Segment Inspector uses `inspector-metric-alert` when `bodyExceededFvg=true`.
- Both `Body Entry` and `Body Exceeded` are highlighted, making the out-of-range body condition visible without changing the recorded percentage.

## Actor Timeframe UI Notes
- Segment Inspector now displays an editable `Actor TF` field for each reaction evidence row.
- The timestamp fields are labeled `Actor First`, `Actor Last`, and `Actor Terminal` to make clear that they belong to the actor candle group.
- Metrics are computed only when `Actor TF` matches the currently loaded chart timeframe; otherwise the Inspector shows a mismatch message instead of calculating from the wrong bars.
- Imported or older numeric actor timeframe values are normalized to display labels such as `1H`.
