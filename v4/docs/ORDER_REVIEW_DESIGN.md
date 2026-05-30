# Order Setup / Execution Lens Design

## Purpose

Order Setup records why a trade was considered, how it was entered, and whether the plan worked. It is not a raw entry/exit table and it is not an automatic signal engine.

Historical code and persisted JSON still use the `OrderReview` / `orderReviews` names. That is a compatibility layer, not the user-facing model. Current UI, documentation, and workflow language should say `Order Setup`.

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
  -> Order Setup / Execution Lens
  -> Entry Plan / Result Review
```

- `1H Segment` remains the structure backbone.
- `Composite Move` represents multi-leg structure.
- `Order Setup` references existing objects and records the setup thesis.
- Lower timeframes such as `30M / 15M / 5M / 1M` are execution evidence, not replacements for the structure backbone.

## Current Phase 12 Boundary

The current operating model is:

- User-facing object: `Order Setup`
- Runtime tree: `Setup Set`
- Compatibility storage schema: `OrderReview` records under the `orderReviews` key
- Local draft key: `v4:order-reviews:NQ`

The compatibility names remain because localStorage, Review JSON import/export, undo/redo snapshots, and older archives already depend on them. Do not rename persisted fields until a dedicated migration exists.

Current UI rules:

- The Inspector defaults to `Active Order Setup`, not a full list of every setup.
- Calendar is the browsing/index entry for all daily Order Setups.
- `Open` from Calendar selects the target setup; `Locate` only moves/flashes the chart range.
- A setup can be hidden without deleting it via `display.hidden`.
- Linked PDA / Segment / Composite / SMT objects are evidence refs only; the setup does not own or mutate those source objects.
- Reversal is a single-bar event and renders as a small triangle marker, not a line segment.
- Entry, stop, targets, risk zone, and result render as one grouped setup annotation set.
- Manual explanation events are for reasons that are not already represented by a PDA, Segment, Composite, or SMT object.

## Reversal Anchor Ownership

The reversal marker is not a standalone global object. It is the primary anchor element of one Order Setup.

Ownership rules:

- Every Order Setup has one primary reversal anchor.
- Entry, stop loss, targets, result, linked refs, manual explanation events, and notes belong to a specific Order Setup.
- Later chart actions such as `Set Entry Here`, `Set Stop Loss Here`, `Set Target Here`, and `Add Manual Explanation Event Here` write to the current active Order Setup.
- Do not auto-assign a later element to the nearest reversal marker. Time proximity is ambiguous when several setups overlap.
- To edit another setup, the user should first make that setup active from the Inspector or Calendar `Open`.

Multiple setups may share the same reversal bar. In that case, create separate Order Setups with the same reversal timestamp/anchor, rather than storing multiple entry plans inside one setup. This keeps execution plans, risk, targets, results, notes, and visibility independent.

Example:

- Setup A: 09:35 bullish reversal, 1M FVG entry, internal target.
- Setup B: same 09:35 bullish reversal, later confirmation entry, external target.

These are two independent Order Setups that happen to share a reversal anchor.

## Review Set Boundary

From Phase 8F onward, the internal interaction model treats each Order Setup as one Review Set.

A Review Set is the chart-facing container for one planned or reviewed trade idea. It groups the setup event, entry, stop, targets, exit, notes, result state, and linked references under one selectable unit. The existing `OrderReview` record remains the canonical persisted data shape in the first pass; `Review Set` is the infrastructure and interaction abstraction layered on top of that record.

This boundary keeps the current storage compatible while fixing the mental model:

- user-facing language may continue to say `Order Setup`
- persisted Review JSON and localStorage continue to use `orderReviews`
- code that needs chart interaction, calendar grouping, locate, active selection, visibility, or focus should consume a Review Set adapter instead of reaching directly into raw order review fields
- linked `PDA / Segment / Composite / SMT` objects stay as references only; a Review Set must not copy or mutate those source objects
- one Review Set can reference several evidence objects, because an order thesis may come from a combination of earlier structures
- future visibility/focus controls should operate at Review Set level, not on isolated entry/target helper lines

The migration should be incremental. Do not rename the persisted schema until the adapter boundary is stable and import/export compatibility is explicitly handled. As of Phase 12, the schema is deliberately not migrated; only the user-facing language and runtime consumption path moved toward Order Setup / Setup Set.

## Setup Set Tree Boundary

From Phase 8G onward, the target model is a Setup Set tree.

A Setup Set is the full annotation package for one trade idea. It is not just an entry marker and it is not just a written order review. It contains the order elements that describe the trade plan and the explanation elements that describe why the trade plan existed.

```text
Setup Set
  -> orderElements
     -> reversal
     -> entry
     -> stopLoss
     -> targets[]
     -> result
  -> explanationElements
     -> refs[]
     -> manualEvents[]
     -> note
  -> metadata
```

### Order Elements

Order elements are the trade itself:

- `reversal`
  - the reversal time
  - should be precise to 1M when possible
  - does not need to be a full-height vertical line
- `entry`
  - one combined chart annotation containing time and price
  - do not split entry time and entry price into unrelated objects
- `stopLoss`
  - price is required when known
  - time is optional
- `targets[]`
  - target1 / target2 / target3 / final target
  - each target should be addressable as part of the same Setup Set
- `result`
  - expected target reached / final target reached / exit / outcome
  - first pass may continue to store this in the existing result review fields

### Explanation Elements

Explanation elements record what happened before the reversal and why the setup made sense. They must remain flexible.

Do not require every setup to contain a 1H segment, a PDA, or a previous segment stop reason. A valid explanation can be a combination of complete existing sets and smaller manual event sets, for example:

- a complete `1H Segment`
- a complete `Composite Move`
- a complete `PDA`
- a complete `SMT`
- a 30M body touch of FVG CE
- a 1M sweep of EQL
- another manually marked event set

When an explanation references an existing object, the Setup Set stores a reference only. It must not copy or mutate the source object. When the explanation is not represented by an existing object, create a manual explanation event with at least:

- timestamp
- timeframe
- type
- optional price
- optional note

Regime, bias, and higher-level discretionary context should be written into notes because they are not reliably chart-markable.

### Compatibility Rule

The first implementation should derive this tree from the current `OrderReview` schema:

- `setupThesis.primaryEventTimestamp` can initially map to `orderElements.reversal.timestamp`
- `entryPlan.entryTimestamp + entryPlan.entryPrice` maps to `orderElements.entry`
- `entryPlan.stopLoss` maps to `orderElements.stopLoss`
- `entryPlan.targetInternal / targetSwing / targetExternal / finalTarget` map to `orderElements.targets[]`
- `setupThesis.linkedObjectRefs` maps to `explanationElements.refs[]`
- order-level notes and setup/entry/result notes map into `explanationElements.note` or section notes

Do not break existing localStorage drafts or Review JSON import/export while this adapter boundary is being built.

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
  display: {
    hidden: false
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
- `display.hidden` defaults to `false` for old records and is preserved by localStorage, Review JSON, and undo/redo.

## Setup Thesis

`Setup Thesis` answers: why was this trade allowed to be considered?

It should support both a primary event and multiple supporting references.

```js
setupThesis: {
  primaryEventTimestamp,
  primaryEventTimeframe,
  primaryEventType,
  primaryEventPrice,
  linkedObjectRefs: [],
  higherTimeframeJustification,
  lowTimeframeWarning,
  narrative,
  confidence
}
```

### Setup Thesis Principles

- `primaryEvent` is the lead reason, not the only reason.
- `linkedObjectRefs[]` carries the combined context.
- A setup can reference no segment, one segment, several segments, or a Composite Move.
- A setup can reference both NQ structure and ES SMT evidence.
- A setup can be created before entry details are known.
- A setup should be honest about low-timeframe dependency.

### Primary Event

The primary event is the main reason for the trade idea.

Required fields:

- `primaryEventTimestamp`: exact event time, 1M precision when possible
- `primaryEventTimeframe`: `1M / 5M / 15M / 30M / 1H / 4H / D`
- `primaryEventType`
- `primaryEventPrice`: optional price of the event, such as swept liquidity price or touched FVG boundary

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

Event type meanings:

- `sweep-liquidity`: price swept a BSL/SSL/EQH/EQL or comparable liquidity level.
- `touch-fvg`: price touched an FVG without requiring a full respect judgment.
- `respect-fvg`: price entered or touched an FVG and produced a reaction that the reviewer considers valid.
- `touch-nwog`: price touched or reacted from NWOG.
- `touch-ndog`: price touched or reacted from NDOG.
- `wick-ce`: price reacted from a Wick CE PDA.
- `ob`: price reacted from an OB range.
- `breaker`: price reacted from a breaker range.
- `smt`: SMT evidence was the primary trigger.
- `other`: manual thesis that does not fit the initial list.

The primary event timestamp is the event time, not the entry time. If the event occurred on 15M/30M but the exact turn is visible on 1M, store the 1M timestamp and keep the higher event timeframe in `primaryEventTimeframe`.

### Linked Object References

An order may depend on several objects. Use `linkedObjectRefs[]` for that context.

```js
linkedObjectRefs: [
  { type: 'segment', id, role: 'context', note: '' },
  { type: 'composite', id, role: 'context', note: '' },
  { type: 'pda', id, role: 'trigger', note: '' },
  { type: 'smt', id, role: 'confirmation', note: '' },
  { type: 'reactionEvidence', id, role: 'evidence', note: '' }
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

Reference guidance:

- Use `trigger` for the object that directly caused the setup.
- Use `context` for prior structure or multi-leg background.
- Use `confirmation` for SMT or supporting evidence that agrees with the setup.
- Use `target` for a PDA/segment/composite used as the planned target.
- Use `invalidation` for an object that defines where the thesis fails.
- Use `evidence` for objective measured evidence, such as Reaction Evidence.

Examples:

```js
linkedObjectRefs: [
  { type: 'composite', id: 'group_...', role: 'context', note: 'prior two-leg expansion into D FVG' },
  { type: 'pda', id: 'manual_ssl_...', role: 'trigger', note: 'swept SSL and rejected' },
  { type: 'smt', id: 'smt_liquidity_...', role: 'confirmation', note: 'ES swept lower while NQ did not' }
]
```

```js
linkedObjectRefs: [
  { type: 'segment', id: 'seg_down_...', role: 'context', note: 'sell leg stopped at NWOG' },
  { type: 'pda', id: 'manual_nwog_...', role: 'trigger', note: 'NWOG touch' },
  { type: 'reactionEvidence', id: 'evidence_...', role: 'evidence', note: '15M reaction measured' }
]
```

### Narrative And Confidence

The narrative should explain the combined thesis in plain language:

```text
Price delivered into 15M bearish FVG after taking prior BSL. ES confirmed with liquidity SMT. Entry used 1M FVG retracement after displacement.
```

`confidence` is optional and manually assigned:

- `A`
- `B`
- `C`
- `review-only`

This field is not a signal score. It is a reviewer label for later filtering.

### Higher-Timeframe Principle

The system should not prevent low-timeframe entries, but it should make the review honest.

If `primaryEventTimeframe` is `1M` or `5M`, the UI should show a warning field because that may conflict with the principle of only trading behind higher-timeframe events.

```js
higherTimeframeJustification: '15M FVG respected while 1M gave entry model',
lowTimeframeWarning: true
```

Suggested derived rule:

```js
lowTimeframeWarning = ['1M', '5M'].includes(primaryEventTimeframe)
```

If `lowTimeframeWarning` is true, Inspector should show the warning but still allow saving. The reviewer may justify it with `higherTimeframeJustification`.

### Setup Thesis Validation

First-version store validation should be permissive:

- allow missing linked refs
- allow missing price
- allow missing narrative
- allow incomplete drafts

But the UI should highlight records missing:

- primary event timestamp
- primary event timeframe
- primary event type
- higher-timeframe justification when `lowTimeframeWarning=true`

## Entry Plan

`Entry Plan` answers: how was the trade entered or planned?

```js
entryPlan: {
  direction,
  entryTimestamp,
  entryPrice,
  entryModel,
  entryTimeframe,
  stopLoss,
  stopReason,
  targetInternal,
  targetSwing,
  targetExternal,
  selectedTargetType,
  finalTarget,
  riskPoints,
  note
}
```

Fields:

- `direction`: `long / short`
- `entryTimestamp`: 1M precision when possible
- `entryPrice`
- `entryModel`
- `entryTimeframe`: timeframe used for the entry model, normally `1M / 5M / 15M`
- `stopLoss`
- `stopReason`
- `targetInternal`
- `targetSwing`
- `targetExternal`
- `selectedTargetType`: `internal / swing / external / custom`
- `finalTarget`
- `riskPoints`
- `note`

Initial entry models:

- `ob`
- `fvg`
- `ote`
- `ote-ob`
- `sweep`
- `breaker`
- `manual`

### Direction

Initial values:

- `long`
- `short`
- `unknown`

`unknown` is allowed for incomplete drafts but should be highlighted in the UI.

### Entry Timestamp

`entryTimestamp` should be the precise intended or actual entry time, stored at 1M precision when possible.

Rules:

- It is separate from `setupThesis.primaryEventTimestamp`.
- It may be later than the setup event.
- It may be missing for a skipped setup.
- If the entry was hypothetical, the same field is still used; first version does not split actual/hypothetical order types.

### Entry Timeframe

`entryTimeframe` records the chart timeframe that produced the entry model.

Initial values:

- `1M`
- `5M`
- `15M`
- `30M`
- `1H`
- `manual`

If `entryTimeframe` is `1M` or `5M`, no warning is required by itself. The warning belongs to `setupThesis.primaryEventTimeframe`, because low-timeframe entry is acceptable when it follows a higher-timeframe event.

### Entry Models

Initial entry models:

- `ob`: entry from an order block
- `fvg`: entry from FVG retracement
- `ote`: entry from OTE retracement
- `ote-ob`: OTE entry aligned with OB
- `sweep`: entry after local sweep
- `breaker`: entry from breaker
- `manual`: reviewer-defined entry model

Entry model is descriptive. It does not imply the setup thesis is valid by itself.

### Stop Loss

`stopLoss` is the planned invalidation price.

`stopReason` explains why the stop belongs there:

- `beyond-swing`
- `beyond-liquidity`
- `beyond-fvg`
- `beyond-ob`
- `fixed-points`
- `manual`

The first version should store only the price and reason. It should not auto-adjust the stop.

### Targets

Target fields:

- `targetInternal`: nearest internal target
- `targetSwing`: main swing target
- `targetExternal`: external liquidity or extension target
- `selectedTargetType`: which target the trade plan uses
- `finalTarget`: explicit final target price

Initial `selectedTargetType` values:

- `internal`
- `swing`
- `external`
- `custom`
- `unknown`

Research default:

- `swing` should be the default benchmark when the model does not explicitly specify otherwise.
- The UI can preselect `swing`, but the reviewer can change it.

### Risk Points

`riskPoints` can be derived when both `entryPrice` and `stopLoss` exist:

```js
riskPoints = Math.abs(entryPrice - stopLoss)
```

The store may store the derived value for convenience, but future code should be able to recompute it. If prices are missing, normalize to `null`.

### Entry Plan Validation

First-version store validation should allow incomplete drafts.

The UI should highlight records missing:

- direction
- entry timestamp, unless result is `skipped` or `missed`
- entry model
- entry price, unless skipped
- stop loss, unless skipped
- at least one target

The UI should also highlight target inconsistency:

- `selectedTargetType=internal` but `targetInternal` is empty
- `selectedTargetType=swing` but `targetSwing` is empty
- `selectedTargetType=external` but `targetExternal` is empty
- `selectedTargetType=custom` but `finalTarget` is empty

## Result Review

`Result Review` answers: did the order behave as expected?

```js
resultReview: {
  expectedTargetReached,
  finalTargetReached,
  exitTimestamp,
  exitPrice,
  result,
  exitReason,
  outcomePoints,
  outcomeR,
  note
}
```

Fields:

- `expectedTargetReached`: `yes / no / partial / unknown`
- `finalTargetReached`: `yes / no / partial / unknown`
- `exitTimestamp`
- `exitPrice`
- `result`
- `exitReason`
- `outcomePoints`
- `outcomeR`
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

### Target Reached Fields

`expectedTargetReached` describes whether the selected planned target was reached.

`finalTargetReached` describes whether the explicit `entryPlan.finalTarget` was reached.

Initial values:

- `yes`
- `no`
- `partial`
- `unknown`

Rules:

- Use `unknown` for drafts or insufficient data.
- Use `partial` when price reached an intermediate target but not the selected/final target.
- First version is manually reviewed. Do not auto-calculate target hit from bars yet.

### Exit

`exitTimestamp` is the actual or reviewed exit time, preferably at 1M precision.

`exitPrice` is the actual or reviewed exit price.

`exitReason` explains why the trade ended:

- `target-hit`
- `stop-hit`
- `manual-close`
- `time-exit`
- `model-invalidated`
- `missed-entry`
- `skipped`
- `unknown`

`exitTimestamp` and `exitPrice` may be empty for skipped or missed trades.

### Result

Result values:

- `win`: trade reached the reviewed target or ended profitably.
- `loss`: trade hit stop or ended below acceptable loss threshold.
- `breakeven`: trade ended at or near entry.
- `missed`: setup was valid or interesting, but no entry was taken.
- `skipped`: setup was intentionally skipped.
- `invalidated`: thesis failed before or around entry.
- `managed-out`: trade was actively exited before normal target/stop result.
- `unknown`: draft or unresolved result.

Result should not be inferred automatically in the first version.

### Outcome Points And R

`outcomePoints` can be derived when `entryPrice`, `exitPrice`, and `direction` exist:

```js
outcomePoints = direction === 'long'
  ? exitPrice - entryPrice
  : entryPrice - exitPrice
```

`outcomeR` can be derived when `outcomePoints` and `entryPlan.riskPoints` exist:

```js
outcomeR = outcomePoints / entryPlan.riskPoints
```

The first version may store these fields as `null`. Later versions can compute them from reviewed prices.

### Result Review Validation

First-version store validation should allow incomplete drafts.

The UI should highlight:

- `result=unknown` on completed reviews
- `expectedTargetReached=unknown` when result is `win`, `loss`, or `managed-out`
- `finalTargetReached=unknown` when `entryPlan.finalTarget` exists
- missing exit price/time when result is `win`, `loss`, `breakeven`, or `managed-out`
- missing note when result is `skipped`, `missed`, or `invalidated`

Skipped and missed setups are valid review records. They should not be treated as invalid orders.

## UI Flow

The current direction is chart-first. Order Setup creation and the common setup/entry/result assignments should happen from the main chart right-click menu. Inspector remains a compact review and correction surface.

## Phase 8D Chart-First Boundary

Phase 8D changes the primary interaction model:

- chart right-click is the main input surface
- Inspector is a lightweight summary plus small correction surface
- full form editing is secondary and lives under `Advanced Edit`
- Order Setup is the center object
- Segment / Composite Move / PDA / SMT are linked refs, not parent objects

This is important because a valid order setup may come from a 1H/30M PDA event, such as a 1H FVG touch and bounce, without producing a drawable segment. The workflow must not force the reviewer to create a segment before recording the order setup.

Chart actions should write to the active Order Setup:

- create bullish/bearish setup at the clicked bar
- set setup event time/price
- set entry time
- set exit time
- set entry price
- set stop loss
- set final target
- link clicked PDA / segment / composite to the active setup
- link the latest SMT record when needed

The active setup is a front-end session state. It is not part of Review JSON and does not imply ownership of linked objects.

## Phase 8C Editing Entry Boundary

Phase 8C turns the existing read-mostly Order Review panel into an editable review workspace. The editing model stays Inspector-led: the right sidebar owns edit state, form controls, validation hints, and store updates. Chart interaction is only a picker helper for time/price fields.

### Primary Entry: Inspector Full Form

The first editable version should expose a complete form inside each Order Review row.

Inspector owns:

- expanding/collapsing an order row for editing
- editing Setup Thesis fields
- editing Entry Plan fields
- editing Result Review fields
- adding/removing linked refs from currently selected objects
- calling `updateOrderReview(id, patch)` for all field changes
- showing derived read-only values such as `riskPoints`, `outcomePoints`, and `outcomeR`

The form should update the existing normalized object. It should not create a separate draft schema or bypass `order-review-store.js` normalization.

### Secondary Entry: Chart Pick Helpers

Chart pick mode is a convenience layer, not an editing surface.

Allowed chart pick actions:

- pick setup event timestamp
- pick entry timestamp
- pick exit timestamp
- pick a price for entry, stop, or final target
- choose OHLC/current chart price only after the chart click identifies the bar or price context
- cancel pick mode with `Escape`

Chart pick should write back through the same Inspector/store update path. It should not create orders directly and should not own persistent edit state.

### Explicit Non-Goals For Phase 8C

Do not implement:

- drag-to-edit setup/entry/exit markers
- drag-to-edit stop/target lines
- order marker hit-test selection
- chart right-click order creation
- automatic setup detection
- automatic 09:30 / 09:50 / Silver Bullet validation
- automatic target-hit, MAE/MFE, or statistics pages
- DB persistence

### Ownership Rules

- `order-review-store.js` remains the only normalization boundary.
- `order-review-persistence.js` remains a passive localStorage subscriber.
- `order-review-renderer.js` remains visual-only and must not own edit state.
- `order-review-panel.js` may render controls and emit Inspector actions, but business normalization stays in the store.
- `inspector-sidebar.js` may route actions and access current selections for linked refs.

### Step Order Rationale

Implement the complete Inspector form before chart pick. Manual input must work end to end first; chart pick should only reduce typing after the object model and update path are stable.

### Create Order Review

Current creation paths:

- chart right-click `Order Setup` menu
- selected segment
- selected Composite Move
- Inspector empty state

When created from a selected object, the object is added to `setupThesis.linkedObjectRefs[]` as context. It should not become mandatory ownership.

Creation behavior:

- From selected segment:
  - add `{ type: 'segment', id, role: 'context' }`
  - prefill primary event timestamp from the segment end timestamp only as a convenience
  - user can override the event time
- From selected Composite Move:
  - add `{ type: 'composite', id, role: 'context' }`
  - do not infer direction automatically in first version
- From empty Inspector:
  - create blank draft with `source=manual`
  - user fills setup thesis manually
- From chart right-click:
  - create bullish or bearish Order Setup at the clicked bar
  - activate the setup immediately
  - later right-click actions write reversal, entry, stop, targets, result, and manual explanation events into the active setup

Chart-first creation is now the main workflow. Inspector creation remains a fallback, not the primary input path.

### Inspector Layout

The Inspector should expose a dedicated `Active Order Setup` section.

Suggested row summary:

```text
[Direction] [Entry Model] [Primary Event Type] [Entry Time] [Result]
```

Each order row should provide:

- `Locate`
- `Set Active Setup` / `Clear Active`
- `Hide` / `Show`
- `Delete`

When active, the row should show compact setup panels:

- `Setup Thesis`
- `Entry Plan`
- `Result Review`

Use compact controls rather than a large free-form form. The order review is a working object that should remain usable next to the chart.

### Edit Setup Thesis

Inspector should support:

- primary event time
- primary event timeframe
- primary event type
- primary event price
- linked refs list
- add/remove linked refs
- higher-timeframe justification
- confidence
- narrative

First version can add linked refs from existing selection/list actions. Chart picking can be deferred.

Linked ref actions:

- `Add selected segment`
- `Add selected composite`
- `Add selected PDA`
- `Add SMT from list`
- `Add reaction evidence from selected PDA response`
- `Remove ref`
- edit `role`
- edit ref `note`

If no matching object is selected, the action should be disabled rather than opening a separate picker in the first version.

Primary event time should support manual input in the same `YYYY-MM-DD HH:mm` style used elsewhere.

Optional future action:

- `Pick Event Time` from chart

This is deferred; the first version can rely on manual time entry.

### Edit Entry Plan

Inspector should support:

- direction
- entry time
- entry price
- entry model
- entry timeframe
- stoploss
- stop reason
- internal/swing/external targets
- selected target
- final target
- risk points display
- entry note

Entry time should support manual input. A later version may add chart pick.

Risk points should be displayed read-only when `entryPrice` and `stopLoss` are both present.

### Edit Result Review

Inspector should support:

- expected target reached
- final target reached
- exit time
- exit price
- result
- exit reason
- outcome points display
- outcome R display
- result note

Outcome points and R should be displayed read-only when enough fields exist. First version does not need to calculate from bars.

### Locate Behavior

`Locate` should center the main chart around the most useful available range:

1. setup primary event timestamp
2. entry timestamp
3. exit timestamp

If more than one timestamp exists, locate the min/max range with padding. This should reuse the existing viewport timestamp range helper.

If Split is enabled, secondary chart does not need to auto-locate in first version. Existing `Locate Time in Secondary` can still be used from the main chart context menu.

### Delete Behavior

Deleting an order review should delete only the order object.

It must not delete:

- linked PDA
- linked SMT
- linked segment
- linked Composite Move
- Reaction Evidence

Linked refs are references, not ownership.

### Empty / Invalid Draft Display

Incomplete drafts should remain visible. The UI should mark missing important fields but not block saving.

Suggested states:

- `Draft`: missing key setup or entry fields
- `Planned`: setup and entry plan exist, result unknown
- `Reviewed`: result is no longer unknown
- `Skipped`: result is skipped
- `Missed`: result is missed
- `Invalidated`: result is invalidated

## Chart Rendering

First version should be lightweight:

- setup primary event: vertical marker
- entry time: vertical marker
- optional stop/target short horizontal lines

Do not implement order hit-test in the first version. Locate and editing should happen through Inspector.

### Renderer Module

Use a dedicated renderer:

```text
v4/src/order/order-review-renderer.js
```

It should read from `order-review-store.js` and render only visual helpers. It should not own editing state.

Renderer events:

- `order-review:changed`
- `bars:loaded`
- `bars:cleared`
- `display-mode:changed` only if order visibility later joins Display Mode

### Time Mapping

Order timestamps are stored as numeric timestamps.

Rendering must map timestamps to the current chart timeframe:

- intraday: bucket with `getBucketStart(timestamp, currentTimeframe)`
- daily: chart date string, following the existing PDA/SMT daily mapping approach

This keeps setup/entry markers visible when switching from 1M to 5M/15M/1H/D, as long as the record belongs in the visible loaded range.

### Setup Marker

Render `setupThesis.primaryEventTimestamp` as a vertical marker.

Suggested visual:

- color: amber
- label: `Setup`
- line width: 2
- opacity: medium

If the record has `lowTimeframeWarning=true`, use a slightly warmer warning color or label suffix:

```text
Setup LT
```

The marker represents the thesis event, not the entry.

### Entry Marker

Render `entryPlan.entryTimestamp` as a vertical marker when present.

Suggested visual:

- long: green/teal
- short: red
- unknown direction: neutral gray
- label: `Entry`
- line width: 2

If `resultReview.result` is `missed` or `skipped`, entry marker may be omitted unless an entry timestamp exists for hypothetical review.

### Exit Marker

Render `resultReview.exitTimestamp` as a vertical marker when present.

Suggested visual:

- win: green/teal
- loss: red
- breakeven: gray
- managed-out: blue/neutral
- invalidated: orange/red
- label: `Exit`
- line width: 1

Exit marker is optional in first version but useful for reviewed trades.

### Stop And Target Lines

First version may render short horizontal helper lines from entry time to exit time, or from entry time across a small fixed number of bars if exit is missing.

Render candidates:

- `entryPlan.stopLoss`: `SL`
- `entryPlan.targetInternal`: `TI`
- `entryPlan.targetSwing`: `TS`
- `entryPlan.targetExternal`: `TE`
- `entryPlan.finalTarget`: `FT`

Suggested colors:

- stop loss: red
- selected target: brighter green/teal
- non-selected targets: muted gray/teal
- final target: amber if it differs from selected target

Do not render large profit/loss rectangles in the first version.

### Visibility

Initial version can render all order reviews in the current loaded range.

Later options:

- show only selected/focused order
- show only recent N orders
- integrate with Display Mode

Do not make order rendering dependent on linked object visibility in the first version. If an order links to a hidden PDA/segment, the order marker can still render.

### Locate From Inspector

Inspector `Locate` should compute a timestamp range from available fields:

```text
setup primary event timestamp
entry timestamp
exit timestamp
```

Use min/max of available timestamps with padding. If only one timestamp exists, center around that timestamp.

### No Hit-Test In Version 1

First version should not support:

- clicking order markers to select order
- dragging entry/stop/target lines
- dragging entry/stop/target lines

Chart context menus are supported for Order Setup creation and updates. They should stay grouped under the `Order Setup` submenu so they do not mix ownership with PDA/SMT/segment actions.

## Persistence

Persistence has two layers:

- localStorage for local working drafts
- Review JSON for archive and transfer

Do not write Order Setups to DuckDB in the first version. Do not store candle data inside Order Setups.

### LocalStorage

Use:

```text
v4:order-reviews:NQ
```

Store normalized `OrderReview[]`.

Rules:

- Save on every `order-review:changed`.
- Load once during app initialization.
- Ignore malformed records that cannot normalize.
- Keep incomplete drafts.
- Do not persist current selection, hover state, chart viewport, or expanded Inspector rows.

Suggested module:

```text
v4/src/order/order-review-persistence.js
```

Suggested event:

```text
order-review:changed
```

### Review JSON

Add:

```json
{
  "orderReviews": []
}
```

Review JSON should preserve linked object refs. Import should normalize records and avoid duplicate semantic identities where possible.

### Review JSON Shape

Order reviews should be added alongside the existing review payload:

```json
{
  "app": "trading-v4-review",
  "version": 1,
  "pdaAnnotations": [],
  "marketSegments": [],
  "segmentGroups": [],
  "smtRecords": [],
  "orderReviews": []
}
```

`orderReviews` should contain normalized `OrderReview` objects.

### Export Rules

- Export all non-draft and draft order reviews in the current store.
- Preserve `id`, `createdAt`, and `updatedAt`.
- Preserve `linkedObjectRefs` exactly.
- Do not include candle data.
- Do not include UI state.

Draft order reviews are exportable because they are research notes, not executable orders.

### Import Rules

Import should:

- accept missing `orderReviews` for backwards compatibility
- normalize every incoming order
- skip records that cannot be normalized at all
- handle duplicate ids
- handle semantic duplicates
- preserve linked refs even when the referenced object is missing

Do not reject an order just because its linked PDA/SMT/segment/composite is absent in the current workspace. Instead, keep the ref and let the UI show it as missing/stale.

### ID Conflict Handling

If imported `id` already exists but semantic identity is different:

```text
{originalId}-import-{timestamp}-{index}
```

Set:

```js
importedFromId: originalId
```

If semantic identity matches an existing record, skip the imported duplicate.

### Semantic Identity

Use the identity described in Object Model:

```text
instrument:setupEventTimestamp:entryTimestamp:direction:entryModel
```

Where:

- `setupEventTimestamp = setupThesis.primaryEventTimestamp`
- `entryTimestamp = entryPlan.entryTimestamp || setupEventTimestamp`
- `direction = entryPlan.direction`
- `entryModel = entryPlan.entryModel`

If no timestamp exists, identity is unavailable and import should rely on id conflict handling only.

### Linked Ref Integrity

Linked refs are references, not ownership.

Deleting an Order Review must not delete:

- PDA annotations
- SMT records
- market segments
- segment groups
- Reaction Evidence

Import should not auto-create missing linked objects.

UI should render missing linked refs as:

```text
Missing: type:id
```

### Archive Module Boundary

The Order Review store should own normalization and identity helpers.

Suggested exports:

```js
normalizeOrderReview(input, options)
getOrderReviewIdentity(order)
loadOrderReviews(nextOrders)
getOrderReviews()
```

`review-archive.js` should call these helpers rather than duplicating order normalization logic.

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
