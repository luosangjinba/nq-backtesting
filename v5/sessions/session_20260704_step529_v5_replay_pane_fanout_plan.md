# Session 2026-07-04 - Step 529 Replay Pane Fan-Out Plan

## Goal

Plan the next multi-pane / replay bugfix direction: replace the current
primary-first plus `REPLAY_EVENTS.NEXT` catch-up projection for same-timeframe
panes with a coordinated replay pane fan-out path.

## Trigger

Manual testing found remaining multi-pane display bugs around:

- changing a pane's display timeframe;
- moving/panning a pane's candles;
- display state becoming missing or disordered after those interactions.

The exact trigger sequence is not fully isolated. The agreed direction is to
remove a likely structural race first: same-timeframe replay panes should be
updated from one shared replay reveal batch instead of relying on a
primary-first path followed by secondary event projection. If bugs remain after
that, continue diagnosis in pane-local viewport, display-window loading, and
layout sync.

## Reference Check

- Lightweight Charts `ITimeScaleApi` documentation checked on 2026-07-04:
  `https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi`.
  Relevant APIs remain chart-runtime/adapter concerns; this step does not
  require a new chart plugin.
- awesome-tradingview checked on 2026-07-04:
  `https://github.com/tradingview/awesome-tradingview`.
  No external replay-aware multi-pane distribution helper is being introduced.

## Current Path

Current same-timeframe replay advancement is effectively:

`replay runtime -> primary append -> REPLAY_EVENTS.NEXT -> route projection -> secondary append`

This is not literally primary pane owning the data, because secondary receives
the same `payload.revealedBars` from replay state. But it is still a
primary-first / event-catch-up control flow, which can race with pane-local TF
changes and manual viewport state.

## Target Path

Step 529 should move to:

`replay runtime -> coordinated pane fan-out -> chart runtime writes target panes -> REPLAY_EVENTS.NEXT`

Same-timeframe panes should append the same `revealedBars` batch and follow the
same cursor through chart runtime commands before `NEXT` is used as a
notification event.

Different-timeframe panes should continue to load/project their own display
window anchored to the same cursor. They must not receive raw replay-timeframe
bars.

## Detailed Plan

1. Step 529.1 - Plan and current-path audit.
   - Add `v5/docs/specs/replay-pane-fanout-plan.md`.
   - Update `v5/TODO.md`, `v5/sessions/README.md`, and spec indexes.
   - Confirm the current code path through `replay-navigation-controller`,
     `replay-chart-sync`, and `chart-replay-pane-projection`.
   - Commit planning docs.

2. Step 529.2 - Add ordering/contract coverage.
   - Add a browser smoke that proves same-timeframe panes are not dependent on
     post-`NEXT` secondary projection for visible candles.
   - Assert pane cursor metadata, full-bar deltas, rendered bars, no forward
     fetch during append, and trace ordering.
   - Commit the harness.

3. Step 529.3 - Introduce pane-aware fan-out API.
   - Extend replay/chart sync with a bounded API that receives a layout pane
     snapshot plus `revealedBars`, cursor timestamp, and replay timeframe.
   - Same-timeframe panes dispatch `chart.appendBars` with the same reveal
     batch and cursor follow payload.
   - The API does not read layout runtime internals or own chart state.
   - Commit the boundary.

4. Step 529.4 - Move replay `Next` writes to fan-out.
   - Call the fan-out path before `REPLAY_EVENTS.NEXT` emission.
   - Keep cursor persistence after visible update.
   - Keep chart runtime as the only chart writer.
   - Commit the behavior change.

5. Step 529.5 - Shrink old projection responsibilities.
   - Remove normal same-timeframe `APPEND_BARS` from
     `chart-replay-pane-projection`.
   - Keep different-timeframe display-window projection and any explicitly
     named defensive fallback needed during hardening.
   - Commit cleanup.

6. Step 529.6 - Regression, manual retest, and closeout.
   - Run right-edge, multi-pane rapid-next, cadence, active-pane, and
     viewport-demand browser smokes plus `git diff --check`.
   - Manually retest pane TF changes and pane-local chart movement.
   - Record whether the reported display bugs disappeared or need a second
     root-cause pass.
   - Commit closeout docs.

## Boundary Rules

- Replay runtime owns cursor/reveal semantics.
- Chart runtime owns chart writes and pane-local chart state.
- Bar-data runtime owns bar requests/cache.
- Layout runtime owns pane list, active pane id, pane TF, sync flags, and split
  ratios.
- Route/pane orchestrator may provide pane snapshots and dispatch commands, but
  must not become a bars or chart-series owner.
- Manual pane visible ranges must not be overwritten unless chart runtime says
  the pane is in follow mode.

## Status

- Step 529.1: completed for planning scope. The spec, TODO, session handoff,
  and related index documents now point to the replay pane fan-out direction.
- Step 529.2: completed. Added
  `v5/tests/replay-pane-fanout-ordering-browser-smoke.js`, which captures the
  current same-timeframe multi-pane ordering baseline: primary append occurs
  before `REPLAY_EVENTS.NEXT`, while secondary append currently occurs after
  `NEXT` through the event catch-up projection.
- Step 529.3: completed. Added `appendRevealedBarsToPanes` to
  `replay-chart-sync` and `v5/tests/replay-chart-sync-fanout-smoke.js`.
  The boundary appends same-timeframe panes from one reveal batch and returns
  different-timeframe panes for display-window projection instead of appending
  raw replay-timeframe bars.
- Step 529.4-529.6: pending implementation.

## Next

Implement Step 529.4 next: route replay `Next` same-timeframe chart writes
through `appendRevealedBarsToPanes`, then flip the ordering smoke toward the
target fan-out contract.
