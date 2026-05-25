# V4 09:30 / 09:50 / Silver Bullet Review Direction

## Branch
- `research/v4-930-950-silver-bullet-review`

## Problem
- Current V4 segment structure intentionally uses a 1H backbone to avoid low-timeframe noise and keep general market path review stable.
- NQ 09:30 cash open is a critical execution timestamp, but it sits inside the 09:00-09:59 1H candle.
- Pure 1H segment review cannot explain the 09:30-09:50 execution behavior clearly.
- Switching the whole structure layer to 30M would create noise and make historical segment data less stable.

## Decision
- Keep 1H segment as the only structure backbone.
- Do not force 09:30 to split 1H market segments.
- Treat 09:30 as an event anchor and execution lens, not a structure boundary.
- Add a separate Opportunity Review / Execution Lens layer for 09:30-11:00 research.

## Layering
```text
PDA map
  -> 1H Structure Path / Segment / Composite Move
  -> NY Open Execution Lens
  -> Entry Review
```

## Responsibilities

### 1H Segment
- Records the market path.
- Answers where price came from and which larger 1H leg 09:30 belongs to.
- Can be linked to PDA responses.
- May later be linked by Opportunity Review objects.

### NY Open Execution Lens
- Records lower-timeframe evidence inside fixed execution windows.
- Uses 30M / 5M / 1M as evidence only, not as the structure backbone.
- Should answer whether the window produced:
  - sweep
  - displacement
  - FVG / IFVG / OB / Wick CE reaction
  - EQH/EQL interaction
  - inversion / continuation confirmation
  - valid or skipped opportunity

### Entry Review
- Records actual or hypothetical entry details.
- Should preserve clean statistical assumptions, especially swing target as the default research benchmark unless a model explicitly says otherwise.

## Suggested Windows
- `930`: `09:30-09:49`
- `950`: `09:50-10:09`
- `silver-bullet`: `10:00-10:59`

These windows can overlap. The overlap is acceptable because each model answers a different review question.

## Old-System References
- `v2/docs/archive/SPEC.md` contains the most complete old YAML schema for:
  - `open_snapshot`
  - `pre_930_expectation`
  - `opportunities`
  - `reversals`
  - `entry`
  - `daily_review`
- `architect/about pendulum/1. Some important suggestions.md` contains concrete 2012-01-09 examples with:
  - `judas_swing_immediately_930`
  - `silver_bullet_1000`
  - `tradeable`
  - `skip_reason`
  - `targets.internal/swing`
  - `swing_review_note`
- `architect/MEMO.md` says parts of the old YAML workflow had landed previously:
  - `session_bias + htf_context + alignment`
  - `reversal.tradeable + skip_reason`
  - `internal_reached / swing_reached / swing_review_note`

## Implementation Direction
- Do not migrate the old YAML one-to-one into V4.
- Create a dedicated `opportunity review` module that references existing V4 objects:
  - selected parent segment or composite move
  - linked PDA annotations
  - optional execution evidence records
  - entry/result review fields
- First implementation should be manual and review-oriented, not automatic signal detection.

## Segment Endpoint Alignment Follow-up
- 2026-05-25: Before building Opportunity Review, fixed a lower-timeframe alignment problem in existing 1H segments.
- Problem:
  - A 1H segment endpoint selected from a 1H candle high/low rendered at the 1H candle timestamp after switching to 1M/5M/30M.
  - This made segment vertices stay on whole-hour timestamps instead of the actual lower-timeframe high/low occurrence.
- Implementation:
  - Added `v4/src/segment/segment-time.js`.
  - New segment endpoints store:
    - `sourceTimeframe`
    - `occurrenceTimestamp`
    - `occurrenceTime`
    - `occurrenceSourceTimeframe`
  - Manual 1H segment creation now requests the selected 1H bar's 1M data and finds the endpoint high/low occurrence.
  - If multiple 1M bars share the same selected high/low price, the latest occurrence is used, matching the existing rightmost equal-extreme convention.
  - Renderer and hit-test now both use `getSegmentPointRenderTime()`.
  - On lower timeframes, render time prefers `occurrenceTimestamp`.
  - On 1H and higher timeframes, render time keeps the original 1H bucket timestamp.
  - Old segments without occurrence fields remain compatible and continue to render using their original timestamps.
- Inspector now shows endpoint `Occurrence` next to the original endpoint `Time`.
