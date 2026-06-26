# Step 352 - Replay-First Long Range Plan

Status: in progress.

## Goal

Move long 1m review from range-first loading to replay-first loading.

The old model is:

```text
Date Range -> load all bars in range -> replay over loaded bars
```

The target model is:

```text
Date Range -> define outerRange -> set replay cursor -> load cursor window
```

This follows the practical shape of replay products such as FX Replay: long
history is a navigable boundary, not a single chart dataset.

## Step 352.1 Boundary

Status: complete.

Rules:

- 1m long ranges must not attempt to load the full date range.
- Backend `/v4/bars` single-request limits remain mandatory.
- Date Range defines `outerRange`.
- Replay cursor defines the current loaded window.
- Replay Bar is the primary control surface for long 1m ranges.
- Default cursor is `outerRange.start`, unless a replay history restore provides
  a better cursor.
- Bars already walked through are not guaranteed to remain in the chart.
- Future bars are loaded as cursor-adjacent chunks, not as full outer range.

## First Batch Scope

1. Freeze replay-first boundary.
2. Add explicit range model helpers/state.
3. Add replay window resolution.
4. Add chunk loader.
5. Convert long 1m Load Range into replay initialization.

## Non-Goals For First Batch

- No full overlay culling yet.
- No IndexedDB persistent cache yet.
- No removal of backend request limits.
- No attempt to render a full year of 1m candles.
