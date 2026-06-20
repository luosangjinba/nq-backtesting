# Step 302: Unified Execution Orders Component

Date: 2026-06-20

## Problem

Step 300 and Step 301 made Tradovate order data clearer, but the UI now has three layers that repeat the same source orders:

1. `Execution Summary`
2. `Entry / Protection / Exit` flow rows
3. `Raw Tradovate Orders`

This is functionally correct, but visually noisy. Users should see one order story, grouped by order function.

## Goal

Replace the current summary + flow + raw stack with one main component:

```text
Execution Orders

Open
1 filled
509681601599 · Market Buy · 5 @ 30368.50 · 10:10

Stop Loss
1 set · 0 hit · 1 canceled
509681601607 · Sell Stop 30340.00 · Canceled · 10:10

Target
1 set · 0 hit · 1 canceled
509681601610 · Sell Limit 30463.25 · Canceled · 10:11

Exit
Manual/Market · 1
509681601619 · Market Sell · 5 @ 30356.50 · 10:11

Outcome
Manual/Market exit · Loss · -$120.00
```

Raw Tradovate order rows stay available, but as diagnostics, not the primary review surface.

## Plan

### Step 302.1: View-Model Shape

Extend `buildLiveRecordExecutionFlow()` to expose a UI-friendly grouped model:

```js
{
  groups: [
    { id: 'open', label: 'Open', summary: '1 filled', orders: [...] },
    { id: 'stopLoss', label: 'Stop Loss', summary: '1 set · 0 hit · 1 canceled', orders: [...] },
    { id: 'target', label: 'Target', summary: '1 set · 0 hit · 1 canceled', orders: [...] },
    { id: 'exit', label: 'Exit', summary: 'Manual/Market · 1', orders: [...] }
  ],
  reviewOrders: [...],
  outcome: {...},
  rawOrders: [...]
}
```

Keep existing summary data if useful for tests, but UI should consume `groups[]`.

### Step 302.2: Single Main Component

Rename UI heading from `Execution Flow` to `Execution Orders`.

Remove:

- separate `Execution Summary` card;
- standalone `Protection` title;
- duplicated flow card hierarchy.

Render each group as:

- group title;
- group summary;
- one or more order rows.

### Step 302.3: Lessons Placement

Keep lesson checkboxes inside the matched order row.

If an order has `lessonIds` but cannot be classified into Open/Stop/Target/Exit, show it in a `Review Orders` group.

### Step 302.4: Diagnostics

Move raw order rows under:

```text
Diagnostics
Raw Tradovate Orders (n)
```

Default collapsed. This preserves debugging without competing with the review workflow.

### Step 302.5: Styling

Reduce nested-card feel:

- one outer panel;
- group rows separated by subtle dividers;
- no separate card for summary;
- raw diagnostics visually weaker.

### Step 302.6: Verification

Focused smoke:

- manual market exit shows Open / Stop Loss / Target / Exit groups;
- stop-filled trade shows stop hit and target canceled;
- target-filled trade shows target hit and stop canceled;
- lesson checkboxes still update `execution.orders[].lessonIds`;
- raw orders remain available as collapsed diagnostics.

Browser smoke:

- Live Record Detail renders the unified component;
- no duplicate `Execution Summary` block;
- raw diagnostics does not dominate the first viewport.

## Non-Goals

- Do not change persisted Live Record schema.
- Do not remove raw `execution.orders[]`.
- Do not make Tradovate-specific data mandatory for manual Live Records.
