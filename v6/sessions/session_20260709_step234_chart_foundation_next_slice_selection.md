# V6 Session - Step 234 Chart Foundation Next Slice Selection

Date: 2026-07-09

## Summary

Step 234 selected the next bounded chart-foundation slice after the dashboard
chart-boundary wording cleanup.

## Decision

Step 235 should implement **Replay Step Back Owner Readiness Audit**.

The transport already reserves a disabled Previous replay bar control, but V6
does not yet have a backward replay owner contract. Step Back is not a simple
UI enablement because it touches replay cursor/reveal state, chart-entry
orchestration, chart-data rollback/replacement behavior, viewport preservation,
bar-data cache reads, and multi-pane fan-out.

## Preserved Boundaries

- Replay runtime remains the owner of cursor and reveal state.
- Chart-entry replay orchestration remains the transport-facing replay chart
  action boundary.
- Chart-data remains the owner of pane-local chart series records.
- Chart viewport remains the owner of default/manual wall intent.
- Bar-data remains the owner of requests and cache behavior.
- Shell transport remains DOM/event dispatch only.
- No TF expansion, indicators, SMC/ICT overlays, trading simulation, order
  tickets, prop firm rule engines, or journal workflows were started.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step234-smoke.js`
- `node v6/tests/replay-transport-visual-state-browser-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 235 should document and guard the backward replay owner contract while
keeping the Previous replay bar control disabled.
