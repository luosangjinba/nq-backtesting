# Step 303: Contract-first Execution Orders

Date: 2026-06-20

## Problem

`Execution Orders` currently shows summaries such as:

```text
Open      1 filled
Stop Loss 1 set · 0 hit · 1 canceled
Exit      Manual/Market 1
```

Those numbers are order counts, but they can be misread as contract counts. Futures review needs contract quantity first.

## Goal

Make summary text contract-first while preserving order-count detail:

```text
Open      5 contracts · 1 filled order
Stop Loss 5 contracts · 1 set order · 0 hit · 1 canceled
Target    5 contracts · 1 set order · 0 hit · 1 canceled
Exit      5 contracts · Manual/Market · 1 order
```

Each order row should also show explicit `qty N`.

## Plan

1. Persist order quantities from Tradovate Orders CSV:
   - `quantity`
   - `filledQuantity`
2. Preserve those fields in Live Record normalization.
3. Extend execution-order grouping with contract quantity totals:
   - opened quantity;
   - stop set / hit / canceled quantity;
   - target set / hit / canceled quantity;
   - manual exit quantity.
4. Render contract-first summary strings.
5. Cover full-size and partial scenarios with smoke tests.

## Non-Goals

- Do not change stored Live Record schema beyond adding fields to order objects.
- Do not hide order counts; just make their unit explicit.
- Do not infer risk sizing beyond raw contracts/order quantities.

## Completed

- Tradovate `buildExecutionOrder()` now stores:
  - `quantity`;
  - `filledQuantity`.
- Live Record normalization preserves order `quantity` / `filledQuantity`.
- Execution Orders summary is contract-first:
  - Open: `N contracts · N filled order(s)`;
  - Stop Loss: `N contracts set · N order(s) · N contracts hit · N contracts canceled`;
  - Target: same contract-first structure;
  - Exit: `N contracts · Manual/Market · N order(s)` or stop/target hit.
- Stop/Target order rows now get `qty N` from order quantity, not only from fills.
- Partial scenario is covered: target hit contracts and remaining manual-exit contracts are counted separately.

## Verification

- `node --check v4/src/live-record/live-record-execution-flow.js`
- `node --check v4/src/live-record/tradovate-performance-importer.js`
- `node v4/tests/live-record-smoke.js`
- `node v4/tests/tradovate-performance-importer-smoke.js`
- `node v4/tests/live-record-browser-smoke.js`
- `node v4/tests/entry-context-catalog-integration-smoke.js`
- `git diff --check`
