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
  - define Opportunity Review / Execution Lens object boundaries
  - define Entry Review sub-object
  - design Inspector entry points
  - design localStorage and Review JSON schema
  - explicitly keep first version non-automatic

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
