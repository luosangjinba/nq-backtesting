# V6 Session - Step 159 Chart Foundation Next Slice Selection

Date: 2026-07-08

## Completed

Step 159 selected Layout Menu Owner Binding as the next bounded chart-facing
slice.

Commit:

- `5ed2e6d1 docs(v6): select layout menu binding slice`

## Decision

Step 160 should connect the currently inert Page layout menu to layout-runtime
state through a shell/UI controller. This addresses the user-visible disabled
layout controls while staying inside the existing layout owner boundary.

## Non-Goals For Step 160

- Do not add or remove chart panes.
- Do not implement cross-pane symbol, interval, crosshair, time, or date-range
  synchronization.
- Do not mutate chart-data, chart-viewport, chart-engine, chart-history,
  replay, or bar-data from shell code.
- Do not add simulated trading, Order, Calendar, comparison symbols, overlays,
  indicators, or unrelated workstation chrome behavior.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step159-smoke.js`
- `node v6/tests/layout-runtime-smoke.js`
- `node v6/tests/chart-foundation-integration-reaudit-step158-smoke.js`
- `node v6/tests/chart-foundation-reprioritization-step143-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 160 should implement Layout Menu Owner Binding.
