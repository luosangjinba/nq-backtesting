# V4 Order Review / Secondary Viewport Handoff

## Branch
- `research/order-review`

## Context
- Previous SMT and documentation cleanup was committed as `5728f61 docs(v4): summarize review stage and persist SMT` and merged into `main`.
- A clean `research/order-review` branch was recreated from that updated `main`.
- This branch starts research for Order Review / Execution Lens, while also improving split-screen ergonomics for the ES secondary chart.

## Order Review Direction
- Do not build a raw order-entry table first.
- Keep the existing review layering:

```text
PDA Map
  -> 1H Segment / Composite Move
  -> Opportunity Review / Execution Lens
  -> Entry / Order Result
```

- 1H segment remains the structure backbone.
- 09:30 / 09:50 / Silver Bullet windows should be treated as event anchors and execution lenses.
- 30M / 5M / 1M evidence is lower-timeframe execution evidence, not a replacement for 1H structure.
- First version should be manual and review-oriented:
  - no automatic signal detection
  - no automatic 09:30 reversal verdict
  - no automatic Silver Bullet validity judgment
  - no DB writes

## TODO Updated
- Added `Phase 8: Order Review / Execution Lens 研究` to `v4/TODO.md`.
- Planned steps:
  - write `v4/docs/ORDER_REVIEW_DESIGN.md`
  - define Order Review as `Setup Thesis -> Entry Plan -> Result Review`
  - define Setup Thesis with flexible multi-object linked refs
  - define Entry Plan sub-object
  - define Result Review sub-object
  - design Inspector entry points
  - design localStorage and Review JSON schema
  - explicitly keep first version non-automatic

## Order Review Schema Adjustment
- Order reasoning should not be constrained to "why the previous segment ended".
- A valid order may come from a combination of multiple earlier structures or events.
- Replace the earlier narrow framing with:

```text
Order Review
  -> Setup Thesis
  -> Entry Plan
  -> Result Review
```

- `Setup Thesis` should include:
  - primary event timestamp at 1M precision
  - primary event timeframe
  - primary event type, such as sweep liquidity, touch FVG, touch NWOG/NDOG, SMT, or other
  - `linkedObjectRefs[]` for multiple supporting objects:
    - segment
    - composite
    - PDA
    - SMT
    - Reaction Evidence
  - note / narrative
  - higher-timeframe justification
  - warning when the reason is mainly 1M/5M and may violate the principle of following higher-timeframe events
- `Entry Plan` should include:
  - direction
  - entry time/price at 1M precision
  - entry model: OB, FVG, OTE, OTE+OB, sweep, manual
  - stoploss
  - target internal/swing/external
  - selected target
  - final target
- `Result Review` should include:
  - expected target reached
  - final target reached
  - exit time/price
  - result
  - note
- First implementation should not force an order to bind to a previous segment. Segment/composite links are context refs, not mandatory ownership.

## Secondary Viewport Controls
- Added a secondary chart viewport control bar inside `#secondary-chart`.
- New DOM:
  - `#secondary-viewport-controls`
- New module:
  - `v4/src/chart/secondary-viewport-controller.js`
- Extended `secondary-chart-manager.js` with:
  - `getSecondaryVisibleLogicalRange()`
  - `setSecondaryVisibleLogicalRange(from, to)`
  - `getSecondaryActiveDataCount()`
  - `resetSecondaryPriceScale()`
- Updated `viewport-controls.js` so one UI module initializes both:
  - primary `#viewport-controls`
  - secondary `#secondary-viewport-controls`
- Secondary controls support:
  - zoom out
  - zoom in
  - reset secondary chart view
  - scroll left
  - scroll right
- Secondary controls are disabled unless Split is enabled and secondary bars are loaded.
- `Alt+R` still controls only the primary chart reset.

## Verification
Ran:

```bash
node --check v4/src/chart/secondary-chart-manager.js
node --check v4/src/chart/secondary-viewport-controller.js
node --check v4/src/ui/viewport-controls.js
git diff --check
```

All passed.

## Local Files Not To Commit
- `trading_data.duckdb`
- `__pycache__/`
- `tmp/`
- `v3/plans/`
