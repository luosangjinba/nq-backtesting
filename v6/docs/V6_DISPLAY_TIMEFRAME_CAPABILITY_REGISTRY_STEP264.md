# V6 Display Timeframe Capability Registry - Step 264

## Purpose

Step 264 establishes the product and ownership plan for replacing hard-coded
interval menu markup with a display-timeframe capability registry.

The step is intentionally foundational. It must not unlock new chart
timeframes, change replay cursor ownership, or change chart projection behavior.

## Product Interval Set

The interval menu should expose the V6 target set:

- minutes: `1m`, `2m`, `3m`, `4m`, `5m`, `10m`, `15m`, `30m`;
- hours: `1h`, `2h`, `4h`, `8h`, `12h`;
- days: `1D`;
- weeks: `1W`;
- months: `1M`.

Seconds are hidden by default. They may remain represented in the capability
model as unsupported hidden entries, but the product menu should not show them
until second-level source data exists.

## Phase Plan

### Phase 1 - Capability Registry

- Add a display-timeframe capability module owned by the display-timeframe
  boundary.
- Represent each interval with stable metadata: id, label, group, unit,
  multiplier, source requirement, visibility, status, and runtime value.
- Keep currently enabled runtime behavior unchanged: only `1m`, `5m`, and `15m`
  are selectable.
- Render the interval menu from the registry.
- Keep planned intervals visible but disabled.
- Keep seconds hidden.

### Phase 2 - Minute/Hour Projection Unlock

- Unlock minute and hour intervals that can be projected from the 1m source:
  `2m`, `3m`, `4m`, `10m`, `30m`, `1h`, `2h`, `4h`, `8h`, `12h`.
- Continue source-driven replay. Display timeframe remains projection-only.
- Extend regression coverage for manual next, playback period, auto-play,
  leftward history, and pane-local active timeframe sync.

### Phase 3 - Custom Interval Validation

- Add a custom interval parser backed by the same capability validation.
- Allow only intervals that the source/projection contract can prove safe.
- Reject seconds until second-level source data exists.
- Reject daily/weekly/monthly custom variants until session-aware aggregation is
  complete.

### Phase 4 - Session-Aware Day/Week/Month

- Unlock `1D`, `1W`, and `1M` only after trading-day/session-aware aggregation
  exists.
- Daily and larger buckets must use futures trading-session semantics, not local
  browser calendar boundaries.

## Ownership

- Display-timeframe capability metadata belongs to `v6/src/display-timeframe`.
- Shell markup may render from the registry, but shell code must not decide
  whether a timeframe is supported.
- Replay remains source-bar driven.
- Chart data projection remains the only owner that aggregates bars for display.
- Bar data runtime remains the only owner of source bar loading and cache.

## Acceptance

- Runtime behavior remains unchanged in Step 264.
- The product target interval set is documented.
- Seconds are explicitly hidden by default.
- A static smoke guards the Step 264 contract.
- Later implementation steps can consume the registry without changing the
  selected phase plan.
