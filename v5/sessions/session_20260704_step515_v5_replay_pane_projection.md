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

- Step 515.1: completed. The rebuild plan now defines the projection command
  boundary and acceptance checks.
- Step 515.2: completed. Added `chart-replay-pane-projection.js` and a pure
  smoke covering same-timeframe append, independent-timeframe display-window
  load, primary/no-advance skip behavior, and pane display initialization before
  projection.
- Step 515.3: completed. `chart-replay-pane-orchestrator.js` now delegates
  replay `Next` fan-out to the projection helper instead of owning a local
  per-pane catch-up function.

## Verification

- `node --check v5/src/features/chart-replay/chart-replay-pane-orchestrator.js`
- `node --check v5/src/features/chart-replay/chart-replay-pane-projection.js`
- `node v5/tests/chart-replay-pane-projection-smoke.js`
- `node v5/tests/chart-replay-pane-display-coordinator-smoke.js`
- `node v5/tests/multi-pane-rebuild-contract-browser-smoke.js`
- `node v5/tests/replay-workstation-layout-browser-smoke.js`
- `node v5/tests/multi-pane-active-pane-browser-smoke.js`
- `node v5/tests/replay-fast-next-browser-smoke.js`
- `node v5/tests/multi-pane-viewport-demand-browser-smoke.js`

All listed checks passed. Node emitted the repository's existing ES module
package warning for browser/test files.

## Next

Step 516 should turn replay responsiveness into a performance gate. The target
is measurable rapid-Next latency and protection against unnecessary multi-pane
full-data fan-out.
