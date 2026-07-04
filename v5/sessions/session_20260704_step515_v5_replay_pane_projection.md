# Session 2026-07-04 - Step 515 Replay Pane Projection

## Goal

Move replay `Next` fan-out from ad hoc primary-first pane catch-up toward a
single replay pane projection pass. The projection pass should read one replay
event payload, one layout snapshot, and then issue pane-targeted chart/replay
commands for visible non-primary panes.

## Plan

1. Document the Step 515 projection contract, command paths, and acceptance
   checks.
2. Add a replay pane projection helper with pure smoke coverage for
   same-timeframe append, independent-timeframe display-window loading, skip
   behavior, and display initialization before projection.
3. Wire `chart-replay-pane-orchestrator` through the projection helper, run the
   Step 512 rebuild contract and related replay/multi-pane smokes, then update
   handoff docs.

## Ownership Rules

- Replay runtime still owns cursor/reveal state.
- Chart runtime remains the only chart series writer.
- Bar-data runtime remains the only bar requester/cache owner.
- The route-level projection helper can dispatch pane-targeted chart and replay
  commands, but it must not call chart adapters or bar-data directly.

## Status

- Step 515.1: in progress.
- Step 515.2: pending.
- Step 515.3: pending.
