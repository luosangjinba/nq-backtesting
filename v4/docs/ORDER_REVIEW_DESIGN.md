# Order Review / Execution Lens Design

## Purpose

Order Review records why a trade was considered, how it was entered, and whether the plan worked. It is not a raw entry/exit table and it is not an automatic signal engine.

The core chain is:

```text
Setup Thesis
  -> Entry Plan
  -> Result Review
```

Order reasoning must stay flexible. A valid setup may come from one clear event, or from a combination of several earlier structures and evidence objects. Do not force an order to belong to only the previous segment.

## Layering

```text
PDA / SMT / Reaction Evidence
  -> 1H Segment / Composite Move
  -> Order Review / Execution Lens
  -> Entry Plan / Result Review
```

- `1H Segment` remains the structure backbone.
- `Composite Move` represents multi-leg structure.
- `Order Review` references existing objects and records the setup thesis.
- Lower timeframes such as `30M / 15M / 5M / 1M` are execution evidence, not replacements for the structure backbone.

## First Version Scope

Included:

- manual Order Review creation
- manual setup thesis recording
- manual linked object references
- manual entry plan fields
- manual result review fields
- localStorage draft persistence
- Review JSON import/export
- lightweight chart markers for setup and entry times

Excluded:

- automatic signal detection
- automatic 09:30 reversal judgment
- automatic Silver Bullet validation
- automatic MAE/MFE
- automatic target hit calculation
- DB writes
- statistics page
- chart hit-test selection for orders

## Object Model

### OrderReview

```js
{
  id: 'order_...',
  source: 'manual',
  instrument: 'NQ',
  version: 1,
  createdAt: 1770000000000,
  updatedAt: 1770000000000,

  setupThesis: {},
  entryPlan: {},
  resultReview: {},

  note: ''
}
```

`OrderReview` is the top-level object. It owns the thesis, planned execution, and result review.

### Full Normalized Shape

The first implementation should normalize every record into this shape, even when some values are empty.

```js
{
  id: 'order_manual_2012-01-09T09:45_...',
  source: 'manual',
  version: 1,
  instrument: 'NQ',
  createdAt: 1770000000000,
  updatedAt: 1770000000000,
  setupThesis: {
    primaryEventTimestamp: 1326120300,
    primaryEventTimeframe: '15M',
    primaryEventType: 'sweep-liquidity',
    linkedObjectRefs: [
      { type: 'segment', id: 'seg_...', role: 'context' },
      { type: 'pda', id: 'manual_ssl_...', role: 'trigger' }
    ],
    higherTimeframeJustification: '',
    lowTimeframeWarning: false,
    narrative: ''
  },
  entryPlan: {
    direction: 'long',
    entryTimestamp: 1326120600,
    entryPrice: 2368.25,
    entryModel: 'fvg',
    stopLoss: 2363.75,
    targetInternal: 2374.0,
    targetSwing: 2381.5,
    targetExternal: null,
    selectedTargetType: 'swing',
    finalTarget: 2381.5,
    note: ''
  },
  resultReview: {
    expectedTargetReached: 'unknown',
    finalTargetReached: 'unknown',
    exitTimestamp: null,
    exitPrice: null,
    result: 'unknown',
    note: ''
  },
  note: ''
}
```

### Identity

Use a semantic identity for import dedupe:

```text
instrument:setupThesis.primaryEventTimestamp:entryPlan.entryTimestamp:entryPlan.direction:entryPlan.entryModel
```

If `entryTimestamp` is missing, fall back to `primaryEventTimestamp`. If both are missing, import should keep the record but cannot dedupe it semantically.

### Required Minimum

For a useful first-version record, the UI should encourage these fields:

- `setupThesis.primaryEventTimestamp`
- `setupThesis.primaryEventTimeframe`
- `setupThesis.primaryEventType`
- `entryPlan.direction`
- `entryPlan.entryTimestamp`
- `entryPlan.entryModel`
- `entryPlan.stopLoss`
- at least one target field

The store should still allow incomplete drafts, because order reviews may be created before all information is known.

### Normalization Rules

- Unknown strings normalize to the fallback enum value.
- Numeric prices and timestamps normalize to finite numbers or `null`.
- `linkedObjectRefs` removes rows without `type` or `id`.
- Duplicate linked refs are collapsed by `type:id:role`.
- `lowTimeframeWarning` is derived from `primaryEventTimeframe` when not explicitly set.
- `updatedAt` is refreshed on every update.

## Setup Thesis

`Setup Thesis` answers: why was this trade allowed to be considered?

It should support both a primary event and multiple supporting references.

```js
setupThesis: {
  primaryEventTimestamp,
  primaryEventTimeframe,
  primaryEventType,
  linkedObjectRefs: [],
  higherTimeframeJustification,
  lowTimeframeWarning,
  narrative
}
```

### Primary Event

The primary event is the main reason for the trade idea.

Required fields:

- `primaryEventTimestamp`: exact event time, 1M precision when possible
- `primaryEventTimeframe`: `1M / 5M / 15M / 30M / 1H / 4H / D`
- `primaryEventType`

Initial event types:

- `sweep-liquidity`
- `touch-fvg`
- `respect-fvg`
- `touch-nwog`
- `touch-ndog`
- `wick-ce`
- `ob`
- `breaker`
- `smt`
- `other`

### Linked Object References

An order may depend on several objects. Use `linkedObjectRefs[]` for that context.

```js
linkedObjectRefs: [
  { type: 'segment', id, role: 'context' },
  { type: 'composite', id, role: 'context' },
  { type: 'pda', id, role: 'trigger' },
  { type: 'smt', id, role: 'confirmation' },
  { type: 'reactionEvidence', id, role: 'evidence' }
]
```

Supported `type` values:

- `segment`
- `composite`
- `pda`
- `smt`
- `reactionEvidence`

Initial `role` values:

- `trigger`
- `context`
- `confirmation`
- `target`
- `invalidation`
- `evidence`

These references are optional and can include multiple objects of the same type.

### Higher-Timeframe Principle

The system should not prevent low-timeframe entries, but it should make the review honest.

If `primaryEventTimeframe` is `1M` or `5M`, the UI should show a warning field because that may conflict with the principle of only trading behind higher-timeframe events.

```js
higherTimeframeJustification: '15M FVG respected while 1M gave entry model',
lowTimeframeWarning: true
```

## Entry Plan

`Entry Plan` answers: how was the trade entered or planned?

```js
entryPlan: {
  direction,
  entryTimestamp,
  entryPrice,
  entryModel,
  stopLoss,
  targetInternal,
  targetSwing,
  targetExternal,
  selectedTargetType,
  finalTarget,
  note
}
```

Fields:

- `direction`: `long / short`
- `entryTimestamp`: 1M precision when possible
- `entryPrice`
- `entryModel`
- `stopLoss`
- `targetInternal`
- `targetSwing`
- `targetExternal`
- `selectedTargetType`: `internal / swing / external / custom`
- `finalTarget`
- `note`

Initial entry models:

- `ob`
- `fvg`
- `ote`
- `ote-ob`
- `sweep`
- `breaker`
- `manual`

## Result Review

`Result Review` answers: did the order behave as expected?

```js
resultReview: {
  expectedTargetReached,
  finalTargetReached,
  exitTimestamp,
  exitPrice,
  result,
  note
}
```

Fields:

- `expectedTargetReached`: `yes / no / partial / unknown`
- `finalTargetReached`: `yes / no / partial / unknown`
- `exitTimestamp`
- `exitPrice`
- `result`
- `note`

Initial result values:

- `win`
- `loss`
- `breakeven`
- `missed`
- `skipped`
- `invalidated`
- `managed-out`
- `unknown`

## UI Flow

### Create Order Review

First version should allow creation from:

- selected segment
- selected Composite Move
- Inspector empty state

When created from a selected object, the object is added to `setupThesis.linkedObjectRefs[]` as context. It should not become mandatory ownership.

### Edit Setup Thesis

Inspector should support:

- primary event time
- primary event timeframe
- primary event type
- linked refs list
- add/remove linked refs
- higher-timeframe justification
- narrative

First version can add linked refs from existing selection/list actions. Chart picking can be deferred.

### Edit Entry Plan

Inspector should support:

- direction
- entry time
- entry price
- entry model
- stoploss
- internal/swing/external targets
- selected target
- final target
- entry note

### Edit Result Review

Inspector should support:

- expected target reached
- final target reached
- exit time
- exit price
- result
- result note

## Chart Rendering

First version should be lightweight:

- setup primary event: vertical marker
- entry time: vertical marker
- optional stop/target short horizontal lines

Do not implement order hit-test in the first version. Locate and editing should happen through Inspector.

## Persistence

### LocalStorage

Use:

```text
v4:order-reviews:NQ
```

Store normalized `OrderReview[]`.

### Review JSON

Add:

```json
{
  "orderReviews": []
}
```

Review JSON should preserve linked object refs. Import should normalize records and avoid duplicate semantic identities where possible.

## Implementation Order

1. `order-review-store.js`
2. `order-review-persistence.js`
3. `order-review-panel.js`
4. Inspector integration
5. `order-review-renderer.js`
6. Review JSON import/export
7. User guide updates

## Open Questions

- Whether target hit and MAE/MFE should be calculated from 1M bars in the second version.
- Whether orders should later support multiple entries or scale-out exits.
- Whether setup thesis should support a formal `model` field beyond free-form narrative.
- Whether order reviews should eventually be searchable/statistical DB records.
