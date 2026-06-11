# Segment Review Notes Design Draft

## Goal

Segment review should explain why a 1H market segment ended or reversed at its terminal point.

The start of one segment is usually the end of the previous segment, so the first review model should avoid separately explaining the start. The useful question is: what happened at the end of this segment that made price stop, reverse, or fail to continue?

This should not be a pure manual text box. The useful version needs a mix of:

- selected reasons from controlled vocabularies
- links to concrete chart objects
- automatically computed context
- optional short notes only where structure is not enough

## Current State

Current segment objects already support:

- manual 1H start and end points
- direction
- linked PDA responses
- PDA response relation:
  - `respected`
  - `swept`
  - `approached`
  - `rejected`
  - `delivered-through`
- per-response note
- display and isolate controls
- Review JSON export/import of complete segment objects

Current Inspector still has old `Narrative` and `Tags` fields. They are simple free-form fields and should not be treated as the final review model.

## Design Principle

The review model should record decisions, not prose.

Free text is acceptable as an escape hatch, but the core review should be structured enough to:

- compare many examples
- filter by terminal PDA and terminal reaction type
- count PDA response patterns
- reconstruct the chart reasoning later
- avoid retyping context the system can calculate

## Proposed Schema Direction

```js
segment.review = {
  version: 1,
  terminal: {
    pdaId,
    pdaType,
    reaction,
    reactionDetail,
    penetration: {
      wick,
      body
    },
    equality: {},
    computedContext: {}
  },
  relativeToPrevious: {
    previousSegmentId,
    extensionRatio,
    retracementRatio,
    brokePreviousExtreme,
    breakoutDistance,
    stoppedAtPreviousRangePosition
  },
  fluency: {
    score,
    components: {}
  },
  note: ''
}
```

This is a draft shape, not an implementation contract.

## Controlled Choices To Explore

### Terminal PDA

The user should choose which PDA is most responsible for the terminal reaction.

The candidate list should come from PDA already linked to the segment. The system can rank likely candidates by proximity to the segment end price and whether the terminal bar intersects the PDA.

Potential PDA types:

- BSL / SSL
- FVG
- OB
- Breaker
- Fib
- EQH / EQL
- NWOG / NDOG

### Terminal Reaction

The reaction vocabulary depends on PDA type.

For range PDA such as FVG / OB / Breaker / NWOG / NDOG:

- CE respected by body
- CE respected by wick
- upper edge respected by body
- upper edge respected by wick
- lower edge respected by body
- lower edge respected by wick
- range swept then reversed
- range delivered through
- range approached but not touched

For liquidity PDA such as BSL / SSL / EQH / EQL:

- swept then reversed
- approached but not swept
- exact equality
- swept and delivered through

For Fib:

- level respected by body
- level respected by wick
- level swept then reversed
- level delivered through

## Penetration Metrics

For range PDA, compute how deeply the terminal bar entered the range.

The goal is to distinguish cases such as:

- 1H candle body respected FVG CE
- 1H wick respected FVG upper edge
- wick entered deep into FVG but body held above CE

Suggested metrics:

```js
penetration = {
  wick: {
    touched: true,
    entryPoints,
    entryPercentOfRange,
    deepestPrice,
    deepestPercentOfRange,
    respectedBoundary
  },
  body: {
    touched: true,
    entryPoints,
    entryPercentOfRange,
    deepestPrice,
    deepestPercentOfRange,
    respectedBoundary
  }
}
```

For a bearish reaction into an FVG below price, wick/body depth is measured from the top edge toward the bottom edge. For a bullish reaction into a range above price, depth is measured from the bottom edge toward the top edge. The exact direction rule needs to be derived from segment direction and PDA location.

For liquidity PDA, compute distance/equality:

```js
liquidityReaction = {
  swept,
  exactEquality,
  approachDistancePoints,
  sweepDistancePoints,
  terminalCloseBackThroughLevel
}
```

This supports the three first-class SSL/BSL cases:

- sweep then reverse
- approached but did not sweep
- exact equality

### Path / Delivery Model

Potential selected values:

- direct expansion
- retracement then expansion
- purge then reversal
- consolidation then displacement
- two-leg delivery
- failed continuation
- balanced chop

## Relative To Previous Segment

The current segment should be compared to the immediately previous segment.

Questions to answer:

- If it broke the previous segment extreme, how far did it break?
- If it failed to break, where did it stop inside the previous segment range?
- How large is this segment relative to the previous segment?

Suggested metrics:

```js
relativeToPrevious = {
  previousSegmentId,
  previousRangePoints,
  currentRangePoints,
  sizeRatio,
  brokePreviousExtreme,
  breakoutDistancePoints,
  breakoutPercentOfPreviousRange,
  stoppedAtPreviousRangePositionPercent
}
```

For an up segment after a down segment:

- breakout means taking the prior segment start high / opposing extreme, depending on finalized segment semantics
- if no breakout, terminal position is measured inside the previous segment high-low range

This needs a precise convention before implementation.

## Fluency Score Draft

The segment needs a quantifiable smoothness / fluency measure.

Possible components:

- directional efficiency: net movement divided by total traveled movement
- overlap/chop ratio: number of overlapping candles or bodies inside prior candles
- pullback count: number of counter-direction closes
- adverse excursion: deepest pullback against segment direction
- displacement strength: average body size relative to candle range
- close quality: percent of candles closing in the direction of the segment
- time efficiency: points delivered per bar
- PDA interruption count: number of linked PDA touched before terminal PDA

Draft score:

```js
fluency = {
  score: 0-100,
  directionalEfficiency,
  overlapRatio,
  counterCloseRatio,
  maxAdverseExcursionPercent,
  averageBodyPercent,
  directionalCloseRatio,
  pointsPerBar,
  pdaInterruptionCount
}
```

Initial implementation should show components first and delay one final score until enough examples are reviewed.

## Computed Context Candidates

The system can compute or derive:

- segment duration in bars and time
- price distance in points
- direction and start/end swing kind
- terminal bar wick/body extremes
- terminal PDA penetration depth
- liquidity sweep / approach / equality distance
- current segment to previous segment ratio
- previous segment breakout or failure position
- fluency components
- linked PDA count by type
- linked PDA count by relation
- whether linked PDA is inside segment price path
- whether segment start/end is near a linked PDA
- session window at start/end
- current timeframe and loaded range
- replay position if available later

These should not be manually typed.

## Inspector Interaction Direction

Prefer controls over text:

- object picker for terminal PDA
- dropdown for reaction type based on selected PDA type
- generated penetration metrics preview
- generated current-vs-previous segment metrics preview
- generated fluency component preview
- generated context preview
- optional short note field at the bottom

Avoid a large `Review Notes` textarea as the main workflow.

## Archive Direction

Review JSON should keep the complete `segment.review` object once implemented.

Import should:

- tolerate missing `review`
- validate `review.version`
- preserve unknown future fields when safe
- remap referenced PDA ids during import
- remap referenced segment ids during import when possible
- drop or mark orphan references when referenced objects are missing

## Open Questions

- Should old `narrative` and `tags` stay visible during the transition, or be hidden once `segment.review` exists?
- Should PDA response `note` remain free-form, or become relation-specific controlled choices?
- Should computed context be stored in archive or recomputed on load?
- Should the review model belong to the segment, or should there be a separate `opportunityReview` object that references segments?
- What is the exact previous-segment comparison convention for up-after-down and down-after-up cases?
- Should terminal reaction be selected from all linked PDA, or should only PDA near the terminal bar be eligible?
- Should terminal bar be the exact segment end bar, or should the reversal confirmation bar also be included?
- Should fluency be one final score or just a panel of component metrics?

## Recommended Next Step

Do not implement UI yet.

First create 3-5 real review examples manually in this document or a separate sample file, then check whether the controlled choices cover the actual reasoning.

## Implementation Plan

### Phase 1: Computed Metrics Foundation

Goal: compute facts without changing the Inspector workflow.

1. Add a `segment-review-metrics.js` module.
2. Given a selected segment, find the immediately previous segment from the current segment store.
3. Compute current-vs-previous metrics:
   - current range points
   - previous range points
   - size ratio
   - whether current segment broke the previous segment extreme
   - breakout distance in points
   - stopped position inside previous segment range if it did not break
4. Compute terminal bar facts:
   - terminal bar timestamp
   - open / high / low / close
   - wick extremes
   - body extremes
5. Keep all output read-only and derived. Do not persist yet.

Acceptance:

- Selecting a segment can produce a deterministic metrics object in console or status/debug output.
- Missing previous segment is handled cleanly.
- No Review JSON schema change yet.

### Phase 2: PDA-Specific Terminal Reaction Metrics

Goal: calculate how the terminal bar interacted with candidate PDA.

1. Build helper functions by PDA shape:
   - liquidity line: BSL / SSL / EQH / EQL
   - range: FVG / OB / Breaker / NWOG / NDOG
   - fib level
2. For range PDA, compute wick/body penetration:
   - touched
   - entry points
   - entry percent of range
   - deepest price
   - deepest percent of range
   - nearest respected boundary
3. For liquidity PDA, compute:
   - swept
   - exact equality
   - approach distance
   - sweep distance
   - close back through level
4. For Fib, compute nearest level and wick/body reaction to that level.
5. Rank linked PDA candidates by proximity and actual intersection with terminal bar.

Acceptance:

- For a selected segment with linked PDA, the system can list candidate terminal PDA reactions.
- Candidate ranking is explainable and stable.
- No manual text field is required.

### Phase 3: Fluency Metrics

Goal: quantify how smoothly the segment delivered.

1. Collect bars inside the segment time span from currently loaded chart data.
2. Compute component metrics:
   - directional efficiency
   - overlap ratio
   - counter-direction close ratio
   - max adverse excursion percent
   - average body percent
   - directional close ratio
   - points per bar
   - PDA interruption count
3. Show components separately first. Do not collapse to one final score until reviewed on examples.

Acceptance:

- Segment fluency components are available for any selected segment whose bars are loaded.
- Missing bars or partial loaded ranges are surfaced as incomplete metrics, not silently trusted.

### Phase 4: Read-Only Inspector Preview

Goal: expose computed context without committing to storage or final controls.

1. Add a read-only `Review Metrics` section to the Segment Inspector.
2. Show:
   - previous segment comparison
   - ranked terminal PDA candidates
   - selected candidate penetration / sweep metrics
   - fluency components
3. Keep old `Narrative` / `Tags` untouched until a replacement is accepted.
4. Add no new write actions in this phase.

Acceptance:

- User can select a segment and inspect computed review context.
- UI remains read-only for the new review model.
- Existing segment editing, PDA response editing, isolate/display behavior still works.

### Phase 5: Controlled Review Selection

Goal: let the user choose the final terminal explanation from computed candidates.

1. Add `segment.review.version = 1`.
2. Store only user decisions and stable references:
   - terminal PDA id
   - reaction type
   - optional reaction detail
   - optional short note
3. Keep computed metrics either:
   - recomputed live from chart data, or
   - stored under a `computedSnapshot` only if later needed for archival reproducibility
4. Add dropdown controls:
   - terminal PDA selector
   - reaction selector filtered by PDA type
5. Preserve old archives that do not have `segment.review`.

Acceptance:

- Review JSON export/import preserves `segment.review`.
- PDA id remap during import updates terminal PDA references.
- Missing referenced PDA is marked clearly.

### Phase 6: Example Validation Before Expanding

Goal: avoid overbuilding the wrong vocabulary.

1. Review 5-10 real segments.
2. For each, record:
   - terminal PDA chosen
   - reaction type chosen
   - whether computed penetration/sweep metrics matched visual judgment
   - whether previous-segment comparison was useful
   - whether fluency components were useful
3. Only after this, decide whether to add:
   - final fluency score
   - more reaction types
   - relation-specific note fields
   - opportunity review object integration

Acceptance:

- The controlled choices cover real examples without forcing misleading labels.
- Metrics reduce manual interpretation rather than adding noise.
