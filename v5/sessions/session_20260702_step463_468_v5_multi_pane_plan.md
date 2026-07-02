# Step 463-468 - V5 Multi-Pane Implementation Plan

Status: completed planning.

Date: 2026-07-02

## Goal

Plan the next six bounded multi-pane steps after Step 462 without writing
implementation code in this planning pass.

## Plan

1. Step 463 - Layout popover command surface.
2. Step 464 - Multi-pane DOM shell.
3. Step 465 - Chart runtime multi-host mounting contract.
4. Step 466 - Pane display timeframe and Interval sync.
5. Step 467 - Time and Date range sync.
6. Step 468 - Crosshair sync and multi-pane acceptance.

## Step Details

Step 463:

- Add `layout.setMode` and `layout.setSync`.
- Enable Layout popover with Single, Twice, Triple, and five sync switches.
- Keep `symbol` visible but disabled while sessions are single-instrument.
- Do not render extra panes yet.

Step 464:

- Render one, two, or three pane containers from layout state.
- Keep one real chart host initially; secondary/tertiary panes are placeholders.
- Pane click dispatches `layout.setActivePane`.

Step 465:

- Make chart runtime host mounting pane-id aware.
- Chart runtime owns per-pane adapter lifecycle and chart writes.
- Route UI only passes pane host elements through commands.

Step 466:

- Store pane-level display timeframe in layout state.
- Active pane TF changes update that pane.
- `sync.interval` copies TF changes to all panes.

Step 467:

- `sync.time` aligns go-to / jump-time across panes.
- `sync.dateRange` mirrors visible ranges across panes.
- Chart runtime owns visible ranges; replay runtime owns cursor/reveal.

Step 468:

- `sync.crosshair` mirrors chart-owned hover timestamp across panes.
- Crosshair events must be deduped/throttled.
- Final acceptance covers Single/Twice/Triple, active pane, interval/time/date
  range/crosshair sync, and no-future replay boundaries.

## Deferred

- `symbol` sync activation waits for a multi-instrument replay/session contract.
- Arbitrary grids, drag-resizable panes, saved layout templates, and
  server-backed persistence remain out of scope.

## Verification

- `git diff --check`

## Next Step Candidate

Step 463 should implement the Layout popover command surface without rendering
extra chart panes.
