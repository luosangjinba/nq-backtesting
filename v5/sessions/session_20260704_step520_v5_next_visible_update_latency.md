# Session 2026-07-04 - Step 520 Replay Next Visible Update Latency

## Goal

Continue rapid `Next` performance after Step 519 by measuring and reducing the
remaining delay between the coalesced replay command start and the expected
cursor becoming visible in chart metadata.

## Product Standard

- Product target remains about 100ms from latest `Next` intent to expected
  candle visible.
- Step 519 made latest click to `replay.next.start` about 1ms, so Step 520 must
  not reintroduce timer-backed input delay.
- Replay runtime owns cursor, reveal state, no-future invariants, and replay
  command sequencing.
- Chart runtime remains the only chart series writer.
- Bar-data runtime remains the only bars requester/cache owner.
- UI controls may dispatch and subscribe only; Step 520 must not move replay
  state into route/UI code.

## Reference Check

- Existing V5 vendor notes and the official Lightweight Charts API support the
  current Step 518 direction: `series.update()` is the right incremental path
  for appending/updating latest bars, while `setData()` replaces full series
  data.
- The awesome-tradingview list does not provide an off-the-shelf input/replay
  scheduler that would fit V5 ownership; Step 520 stays inside V5 runtime
  contracts.

## Detailed Plan

1. Step 520.1 - Plan and boundary setup.
   - Record the current state in TODO/session docs.
   - Declare non-goals: no chart engine rewrite, no UI-owned replay state, no
     bar-data ownership change, no broad refactor.
   - Commit the plan before code changes.

2. Step 520.2 - Add replay-command phase trace.
   - Extend `replay-navigation-controller.js` with marks around:
     `selectNextBars`, same-timeframe display array construction,
     `syncChartRightEdgeLimit`, `appendDisplayBars`, replay state write,
     event emit, and background cursor persistence enqueue.
   - Extend `replay-chart-sync.js` with marks around primary viewport metrics
     lookup and `CHART_COMMANDS.APPEND_BARS`.
   - Extend chart/adapter metadata trace so the smoke can compare
     `lightweight.append.metadata`, `lightweight.append.end`,
     `replay.next.state.visible`, `replay.next.end`, and actual wait detection.
   - Update the trace smoke to report these spans without changing behavior.
   - Commit trace-only changes.

3. Step 520.3 - Apply one bounded optimization from the trace.
   - If right-edge sync is a measurable pre-append cost, combine or defer it
     only through replay/chart runtime contracts.
   - If viewport metrics lookup is measurable and duplicate, avoid it in the
     append path when chart runtime already has enough viewport follow state.
   - If state cloning or event payload cloning dominates, return/emit a
     smaller command-visible result only if existing tests and contracts allow
     it.
   - If metadata is visible early but the smoke waits late, fix the smoke
     measurement instead of production code.
   - Commit the smallest justified implementation.

4. Step 520.4 - Regression and closeout.
   - Run:
     `node v5/tests/replay-latest-intent-trace-browser-smoke.js`
     `node v5/tests/replay-latest-intent-browser-smoke.js`
     `node v5/tests/multi-pane-rapid-next-performance-browser-smoke.js`
     `node v5/tests/route-teardown-browser-smoke.js`
     `node v5/tests/replay-controls-browser-smoke.js`
     `node v5/tests/chart-runtime-engine-adapter-smoke.js`
     `git diff --check`
   - Update TODO and this session with measured before/after timings.
   - Commit closeout docs.

## Non-Goals

- Do not change no-future replay semantics.
- Do not make UI write chart series or replay state.
- Do not bypass bar-data runtime to fetch or cache bars.
- Do not replace Lightweight Charts or add a new chart dependency.
- Do not broaden multi-pane behavior beyond rapid `Next` latency.

## Status

- Step 520.1: completed. Planned the visible-update latency step and recorded
  ownership boundaries.
- Step 520.2: completed. Added replay-command phase trace around next-bar
  selection, display build, right-edge sync, append display, chart append
  command, Lightweight metadata application, replay state write, event emit,
  and persistence enqueue.

## Baseline From Step 519

- final-click-to-visible: about 241ms.
- final-click-to-flush-start: about 0.1ms.
- final-click-to-command-start: about 0.2ms.
- final-click-to-replay-start: about 0.7ms.
- controls flush: about 112ms.
- replay next: about 93ms.
- chart runtime host sync: about 12ms.

Interpretation: input scheduling is no longer the bottleneck. Step 520 needs
to explain the remaining visible latency inside or immediately after the
coalesced replay command.

## Phase Trace

- `node --check v5/src/runtime/replay-navigation-controller.js` passed.
- `node --check v5/src/runtime/replay-chart-sync.js` passed.
- `node --check v5/src/runtime/chart-engine-lightweight-adapter.js` passed.
- `node --check v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- `node v5/tests/replay-latest-intent-trace-browser-smoke.js` passed.
- Trace sample:
  - final-click-to-visible: about 284ms.
  - final-click-to-replay-start: about 1ms.
  - replay next: about 101ms.
  - right-edge sync: about 84ms.
  - append display: about 14ms.
  - chart runtime append: about 13ms.
  - Lightweight append: about 3ms.
  - replay state write: about 0.3ms.
  - replay emit: about 1.2ms.
  - replay end to visible detection: about 182ms.

Interpretation: the first production optimization target is the pre-append
right-edge sync. It currently dispatches `SET_RIGHT_EDGE_LIMIT`, which performs
a chart host sync before the append path. Step 520.3 should move the right-edge
limit update into chart-runtime append state so replay can preserve the
no-future boundary without forcing a separate full host sync immediately before
the incremental append.
