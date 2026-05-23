# V4 Segment Review Notes Design Session

## Branch
- `research/v4-review-notes-design`

## Goal
- Research how Segment Review Notes should work before implementation.
- Avoid pure manual text fields.
- Design review as structured choices plus automatically computed metrics.

## Key Decision
- A segment start is usually the previous segment's end.
- Therefore the first review model should focus on the current segment terminal point:
  - why price stopped
  - why price reversed
  - why continuation failed
- The terminal reason has two primary parts:
  - which PDA is involved
  - how price reacted to that PDA

## Design Direction
- Review Notes should not be a large free-form textarea.
- Terminal PDA should be selected from segment-linked PDA candidates.
- Reaction options should depend on PDA type.
- Computed metrics should be shown before any persisted review schema is implemented.

## PDA Reaction Model

Range PDA such as FVG / OB / Breaker / NWOG / NDOG should support reactions like:
- CE respected by body
- CE respected by wick
- upper/lower edge respected by body
- upper/lower edge respected by wick
- range swept then reversed
- range delivered through
- range approached but not touched

Liquidity PDA such as BSL / SSL / EQH / EQL should support:
- swept then reversed
- approached but not swept
- exact equality
- swept and delivered through

Fib should support:
- level respected by body
- level respected by wick
- level swept then reversed
- level delivered through

## Computed Metrics To Explore

Terminal PDA metrics:
- range PDA wick/body entry depth
- range entry percent
- deepest wick/body price inside range
- respected boundary
- liquidity sweep distance
- liquidity approach distance
- exact equality
- close back through liquidity level

Relative-to-previous-segment metrics:
- current range points
- previous range points
- size ratio
- whether current segment broke previous segment extreme
- breakout distance
- if no breakout, where it stopped inside previous segment range

Fluency metrics:
- directional efficiency
- overlap/chop ratio
- counter-direction close ratio
- max adverse excursion
- average body percent
- directional close ratio
- points per bar
- PDA interruption count

## Implementation Plan
1. Build read-only `segment-review-metrics.js`.
2. Compute previous-segment comparison and terminal bar facts.
3. Add PDA-specific terminal reaction metrics.
4. Add fluency component metrics.
5. Add read-only `Review Metrics` section to Segment Inspector.
6. Validate 5-10 real examples before adding persisted `segment.review`.

## Files Updated
- `v4/docs/SEGMENT_REVIEW_NOTES_DESIGN.md`
- `v4/TODO.md`

## Not Implemented Yet
- No Inspector controls for Review Notes.
- No `segment.review` persistence.
- No Review JSON schema change.
- No final fluency score.

## Implementation Follow-up
- Implemented Phase 7 Step 42 foundation.
- Added `v4/src/segment/segment-review-metrics.js`.
- Metrics are read-only and derived from the current segment, previous segment, and loaded bars.
- Previous-segment comparison now assumes the agreed semantics:
  - segment endpoints use high/low prices
  - current segment should be endpoint-continuous with previous segment
  - current segment should be opposite direction from previous segment
- Computed fields include:
  - `extensionRatio`
  - `extensionClass`
  - `tookPreviousExtreme`
  - `previousExtreme`
  - `overshootPoints`
  - `overshootRatio`
  - `stoppedAtPreviousRangePositionPercent`
  - terminal bar OHLC/body/wick facts
- Segment Inspector now shows a read-only `Review Metrics` section for this foundation.
- No `segment.review` storage or archive schema change was added.

## PDA Reaction Metrics Follow-up
- Implemented Phase 7 Step 43 read-only PDA-specific terminal reaction metrics.
- Segment-linked PDA are now listed under `Terminal PDA Candidates` in the Segment Inspector.
- Candidate inputs are limited to `segment.pdaResponses`; the system does not infer unrelated PDA yet.
- Candidate sorting prioritizes:
  - existing linked annotation
  - terminal bar touch/sweep/equality
  - body touch where applicable
  - distance to terminal bar
- Range PDA support:
  - FVG / OB / Breaker / NDOG / NWOG
  - wick/body range touch
  - wick/body CE touch
  - entry depth in points
  - entry depth percent of range
  - approached but not touched
  - swept then reversed
  - delivered through
- Liquidity PDA support:
  - BSL / SSL
  - EQH / EQL point-set reference line
  - swept
  - exact equality
  - approached but not swept
  - sweep distance
  - approach distance
  - close back through level
  - delivered through
- Fib support:
  - nearest visible level
  - wick/body touch
  - swept then reversed
  - delivered through
- No controlled review selection was added.
- No `segment.review` persistence or Review JSON schema change was added.

## Fluency Metrics Follow-up
- Implemented Phase 7 Step 44 read-only segment fluency components.
- Segment Inspector now shows `Fluency Components` below terminal PDA candidates.
- Computed fields:
  - bar count
  - segment range
  - path range
  - directional efficiency
  - overlap ratio
  - counter-direction close ratio
  - directional close ratio
  - average body percent
  - max adverse excursion percent
  - points per bar
  - PDA interruption count before the terminal bar
- The implementation intentionally does not create a final fluency score yet.
- Missing segment endpoint bars are surfaced as incomplete metrics instead of silently trusted.
- Max adverse excursion uses a conservative per-bar sequence assumption:
  - calculate adverse movement from the prior running extreme
  - then update the running extreme with the current bar
  - this avoids assuming high/low order inside a single 1H candle.
- No `segment.review` persistence or Review JSON schema change was added.

## Verification
- Ran real-data probe script against NQ 1H bars:
  - `tmp/segment_ratio_probe.py --start '2012-01-01 00:00' --end '2012-03-01 00:00' --wing 4`
  - `tmp/segment_ratio_probe.py --start '2024-10-01 00:00' --end '2024-11-15 00:00' --wing 4`
- Confirmed `extensionRatio > 1` matches taking the previous opposing extreme under endpoint-continuous high/low segment semantics.
- Confirmed marginal cases such as `ratio=1.014` are classified as `marginal sweep`.
- Ran:
  - `node --check v4/src/segment/segment-review-metrics.js`
  - `node --check v4/src/ui/inspector/segment-panel.js`
  - `git diff --check`
- Browser load check passed at `http://127.0.0.1:8001/v4/index.html`.

## Next
- Continue with Phase 7 Step 46:
  - validate 5-10 real examples
  - compare terminal PDA candidate ranking with visual judgment
  - compare fluency components with visual judgment
  - decide whether controlled review selection is ready
