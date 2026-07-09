# V6 Step 199 - Auto-Play HTF Projection Audit

## Purpose

Step 199 verifies the higher-timeframe auto-play path without moving projection
ownership into the auto-play runtime.

Auto-play is a scheduler. It starts replay playback, owns timer cadence, and
dispatches manual-next ticks for the active pane set. It must not request bars,
project bars, append chart-data, or mutate chart-engine state directly.

## Current Runtime Shape

- `chart-entry-auto-play-runtime` starts/stops timers and dispatches
  `CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT` on each tick.
- `chart-entry-manual-next-runtime` owns the replay advancement handoff, source
  bar-data window request, optional HTF projection, and chart-data append.
- `chart-data-projection-runtime` remains the only owner that turns source bars
  into display-timeframe bars.

## Decision

Do not import or dispatch `CHART_DATA_PROJECTION_COMMANDS` from auto-play.

Auto-play receives HTF behavior indirectly because every tick routes through
manual-next. This keeps a single append/projection path for:

- manual one-step replay;
- timed auto-play replay;
- multi-pane replay append.

## Required Guards

- Auto-play source must not reference chart-data projection contracts.
- Auto-play source must keep dispatching manual-next rather than chart-data or
  bar-data commands.
- Runtime smoke must prove 5m auto-play ticks append projected display bars and
  report `projectionSource` from manual-next.
- Browser smoke must prove 5m auto-play produces rendered HTF bars within the
  visible latency budget.

## Non-Goals

- Do not route reset view through projection in Step 199.
- Do not add new timeframe UI options.
- Do not change auto-play speed, timer cadence, or replay ownership.
- Do not make chart engine aggregate bars.
