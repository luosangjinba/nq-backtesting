# Step 304: Live Multi-exit Execution Orders

Date: 2026-06-20

## Problem

Live trades can have one opening order and multiple closing orders. A common case is:

```text
Open 5 contracts
Target 1 exits 1 contract
Manual exit closes 2 contracts
Target swing exits 2 contracts
```

The current `Execution Orders` view is already contract-first, but it still reads as Open / Stop Loss / Target / Exit groups. For multi-exit live trades, this can still blur the distinction between:

- protective orders that were set or canceled;
- target orders that actually closed contracts;
- manual/market exits that actually closed contracts;
- the final position state.

Backtesting trades do not need this complexity. Their current Result model is intentionally simple: one simulated entry, one simulated exit, one outcome.

## Goal

Make `Execution Orders` explain live trades as a single-entry, multi-exit position lifecycle:

```text
Position
5 opened · 5 closed · flat

Open
5 contracts · 1 filled order

Target Exits
3 contracts hit · 2 orders

Manual Exits
2 contracts · 1 order

Stop Loss
5 contracts protected · 0 hit · canceled
```

The change is live-only. Backtesting Result stays as-is.

## Plan

### Step 304.1: Freeze Scope and Data Contract

- Keep Backtesting Result unchanged.
- Keep Live Record Result as a total-level summary.
- Treat `execution.orders[]` and `fills[]` as the source of execution detail.
- Support only single initial entry with possible multiple exits.
- Do not support add-ons / scale-ins in normal flow; detect them as diagnostics or warnings.

### Step 304.2: Derive Position Lifecycle

Extend `buildLiveRecordExecutionFlow()` with a position lifecycle model:

```js
{
  position: {
    openedQty,
    closedQty,
    remainingQty,
    flat
  },
  exitBreakdown: {
    targetQty,
    manualQty,
    stopQty
  }
}
```

Classification rules:

- entry-side filled orders are opening orders;
- opposite-side filled `limit` orders are target exits;
- opposite-side filled `market` orders are manual/market exits;
- opposite-side filled `stop` orders are stop-loss exits;
- opposite-side canceled stop/limit orders remain protection/target setup history.

### Step 304.3: Reshape Execution Orders Groups

Replace the current ambiguous `Exit` group with execution-purpose groups:

- `Position`: opened / closed / remaining / flat summary;
- `Open`: initial filled entry orders;
- `Target Exits`: filled limit exits;
- `Manual Exits`: filled market exits;
- `Stop Loss`: stop-loss orders, including hit and canceled contracts;
- optional `Open Review`: same-side filled orders after the initial entry, shown as unsupported add-on diagnostics;
- optional `Diagnostics`: raw Tradovate orders, still collapsed by default.

Target setup orders that never filled should remain visible enough to explain canceled targets after exit.

### Step 304.4: UI Copy and Layout

Use contract-first language throughout:

- `5 opened · 5 closed · flat`;
- `3 contracts hit · 2 orders`;
- `2 contracts · Manual/Market · 1 order`;
- `5 contracts protected · 0 hit · 5 canceled`.

Avoid standalone `1 filled` / `1 set` wording where users can confuse order count with contract count.

### Step 304.5: Tests

Add or update smoke coverage for:

- 5 open, 1 target exit, 2 manual exits, 2 target exits -> flat;
- 5 open, 5 stop-loss hit -> flat and stopped;
- 5 open, 2 target exits, no final exit -> 3 remaining;
- canceled stop/target bracket after manual exit remains visible;
- same-side filled order after initial entry is shown as add-on diagnostic, not merged into the normal no-add-on model;
- browser smoke still renders a single readable `Execution Orders` panel.

## Non-Goals

- Do not change Backtesting Result.
- Do not add multi-entry / scale-in support.
- Do not require old data compatibility; current data is still test-stage.
- Do not write cash, balance, or reconciliation rows into the per-trade execution model.

## Acceptance Criteria

- Live Record Detail can explain a single-entry trade with multiple partial exits without relying on raw order rows.
- Backtesting Detail remains unchanged.
- Live Result remains a total result; multi-exit detail lives in `Execution Orders`.
- Add-on trades are clearly flagged instead of silently summarized as supported.
- Focused and browser smoke tests pass.
