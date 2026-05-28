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

## 2026-05-28 Update - Order Review Store Foundation

Completed `Phase 8B / Step 56` in `v4/TODO.md`.

Added `v4/src/order/order-review-store.js` as the in-memory Order Review store foundation:

- configurable definitions for order event types, ref types, ref roles, directions, entry models, timeframes, target types, stop reasons, target reached states, result states, exit reasons, and confidence values
- normalize helpers for strings, enums, numbers, timestamps, notes, arrays, and linked object refs
- `normalizeSetupThesis()`
- `normalizeEntryPlan()`
- `normalizeResultReview()`
- `normalizeOrderReview()`
- `getOrderReviewIdentity()`
- store API:
  - `addOrderReview()`
  - `updateOrderReview()`
  - `deleteOrderReview()`
  - `loadOrderReviews()`
  - `clearOrderReviews()`
  - `getOrderReviews()`
  - `getOrderReviewById()`
- `order-review:changed` event emission for add/update/delete/load/clear

Important behavior:

- The store still allows incomplete drafts.
- All writes pass through normalization.
- `id`, `createdAt`, and `importedFromId` are preserved where appropriate.
- `updatedAt` is refreshed on normalize/update.
- Semantic identity follows:

```text
instrument:setupEventTimestamp:entryTimestamp:direction:entryModel
```

- If `entryTimestamp` is missing, identity falls back to `setupEventTimestamp`.
- If both timestamps are missing, identity returns `null`.
- Getter APIs return cloned objects so callers cannot mutate store state directly.
- Duplicate ids loaded into memory are kept with numeric suffixes such as `order_a-2`.

Verification ran:

```bash
node --check v4/src/order/order-review-store.js
git diff --check -- v4/src/order/order-review-store.js v4/TODO.md
node --input-type=module -e "..."
```

The node probe covered normalize, identity, CRUD, getter clone protection, and `order-review:changed` events.

Next step:

- `Step 57`: add `order/order-review-persistence.js` using localStorage key `v4:order-reviews:NQ`.

## 2026-05-28 Update - Order Review Persistence

Completed `Phase 8B / Step 57` in `v4/TODO.md`.

Added `v4/src/order/order-review-persistence.js`:

- localStorage key: `v4:order-reviews:NQ`
- `saveOrderReviews()`
- `restoreOrderReviews()`
- `clearSavedOrderReviews()`
- `initOrderReviewPersistence()`

Behavior:

- On init, restores saved order reviews into the in-memory store with `loadOrderReviews()`.
- Listens to `order-review:changed` and saves `getOrderReviews()` automatically.
- Filters draft orders with `source === 'draft'` or `draft === true`.
- Uses a `restoring` guard so restore-triggered store events do not immediately rewrite localStorage.
- Emits `status:update` for read/save/clear failures and successful manual clear.

App integration:

- `v4/src/app.js` imports and calls `initOrderReviewPersistence()` during startup.

Verification ran:

```bash
node --check v4/src/app.js
node --check v4/src/order/order-review-persistence.js
git diff --check -- v4/src/app.js v4/src/order/order-review-persistence.js
node --input-type=module -e "..."
```

The node probe mocked `window.localStorage` and covered save, restore, semantic identity after restore, and clear.

Next step:

- `Step 58`: add `ui/inspector/order-review-panel.js`.

## 2026-05-28 Update - Order Review MVP UI, Renderer, Archive, Docs

Completed `Phase 8B / Step 58` through `Step 62` in `v4/TODO.md`.

Implemented Inspector UI:

- Added `v4/src/ui/inspector/order-review-panel.js`.
- Empty Inspector state shows `Order Reviews` and can create a blank review.
- Selected segment view can create an Order Review with a segment linked ref.
- Selected Composite Move view can create an Order Review with a composite linked ref.
- Order Review rows show compact `Setup Thesis`, `Entry Plan`, and `Result Review`.
- Rows support `Locate`, `Delete`, result quick edit, and order-level note edit.

Implemented chart rendering:

- Added `v4/src/order/order-review-renderer.js`.
- Renders setup / entry / exit vertical markers on the primary chart.
- Renders stoploss and target helper lines.
- Supports current timeframe mapping, including daily chart date mapping.
- Listens to `order-review:changed`, `bars:loaded`, and `bars:cleared`.

Extended Review JSON:

- `review-archive.js` now exports `orderReviews`.
- Import accepts missing `orderReviews` for older Review JSON files.
- Imported Order Reviews pass through `normalizeOrderReview()`.
- Semantic identity dedupe uses:

```text
instrument:setupEventTimestamp:entryTimestamp:direction:entryModel
```

- id conflicts are renamed with `-import-{timestamp}-{index}` and preserve `importedFromId`.
- linked refs to PDA / segment / SMT are remapped when those objects were imported with new ids.
- missing linked refs are preserved and are not auto-created.

Documentation updated:

- `v4/docs/USER_GUIDE.zh-CN.md`
- `v4/docs/USER_GUIDE.en.md`
- `readme.md`

Current limitation:

- Order Review is still a manual review layer, not an order execution module.
- First version does not support order hit-test, drag editing, automatic target-hit calculation, or statistics pages.

Next step:

- `Step 63`: verify sample workflows for 09:30 reversal, 09:50 continuation/reversal, Silver Bullet, skipped/missed/invalidated, and win/loss/breakeven.

## Local Files Not To Commit
- `trading_data.duckdb`
- `__pycache__/`
- `tmp/`
- `v3/plans/`
