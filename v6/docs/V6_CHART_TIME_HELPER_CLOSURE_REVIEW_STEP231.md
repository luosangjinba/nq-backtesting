# V6 Step 231 - Chart Time Helper Closure Review

## Decision

Step 231 closes the chart-foundation time and timeframe helper migration line
for now.

Steps 215 through 230 moved the chart cursor, replay, projection, bar-window,
leftward-history, display-timeframe, default-wall, chart-data, chart-entry,
pane-reload, layout-bootstrap, pane-model, and replay-domain high-risk parsing
paths onto `time-domain` helpers behind owner-local wrappers.

No additional runtime migration is recommended in Step 231. The remaining local
time and timeframe logic is either owner-local formatting, current-time
metadata, already-normalized array comparison, cache filtering, or non-chart
UI/persistence metadata. Those should not be migrated merely for uniformity.

## Product Context

V6 remains an SMC/ICT-focused personal backtesting and journal workstation. The
active foundation priority is still reliable chart data loading, timeframe
switching, chart drag/scroll display, date ranges, replay, multi-pane, and
pane-local reset behavior before indicators, SMC/ICT overlays, trading
simulation, or journal expansion.

## Chart-Foundation Helpers Now Centralized

| Owner | Current status |
| --- | --- |
| `time-domain` | Owns reusable minute timeframe, Unix seconds/milliseconds, display bucket, display multiple, and projection-source summary helpers. |
| `bar-data` | Bar window planning, cache epoch serialization, and adapter normalization route chart-relevant time values through shared helpers. |
| `chart-data` | Cursor timestamp validation routes through `normalizeUnixSeconds` while preserving strict numeric-seconds behavior. |
| `chart-data-projection` | Source/target timeframe validation, cursor/session timestamps, bucket math, and projection summaries use shared helpers. |
| `chart-history` | Leftward extension planning and runtime projection use shared source/display timeframe and timestamp helpers. |
| `display-timeframe` | Latest source bar timestamps and projection-source summaries use shared helpers. |
| `default-wall` | Display timeframe and replay bar timestamps use shared helpers. |
| `chart-entry` | Context ISO/timeframe parsing, default-wall plan ISO parsing, playback-period source timeframe, projection preparation, and manual-next cursor/timeframe paths use shared helpers. |
| `pane-intent-reload` | Reload chart-data timestamp, timeframe, and projection-summary paths use shared helpers. |
| `layout` | Layout pane bootstrap replay cursor and source-bar fallback timestamps use shared helpers. |
| `panes` and `replay` | Pane/replay minute timeframe and replay time validation use shared helpers. |
| `chart-viewport` | Replay payload and viewport cursor timestamps use shared helpers. |

## Remaining Local Logic To Keep

| Owner | Local logic | Reason |
| --- | --- | --- |
| `chart-entry-runtime` and `chart-entry-restart-runtime` | `new Date().toISOString()` metadata | Current-time event stamp, not chart cursor/projection parsing. |
| `replay-domain`, `bar-data/bar-window`, `bar-data/bar-normalizer`, `chart-entry-context-plan`, `chart-entry-default-wall-plan` | `new Date(normalizedMs).toISOString()` formatting | Converts helper-normalized milliseconds back to ISO output. |
| `chart-entry-projection-preparation` and `chart-entry-manual-next-runtime` | `Number(bar.timestamp ?? bar.time)` comparisons | Compares already-normalized bar timestamps against helper-normalized cursor/bucket values for index lookup. If this becomes unstable, introduce a small owner-local accessor in that owner rather than another broad migration line. |
| `bar-data/bar-window-cache` | Numeric cache timeframe filtering | Cache serialization/filtering, not user-facing TF parsing. |
| `chart-entry-playback-period-policy` | Playback period `30s`/`1m`/`1h` DSL parsing | Playback period is not chart source timeframe parsing. |
| shell, session, journal, settings, analytics, and persistence modules | UI form validation, sorting, created/updated timestamps, display labels | Not chart-foundation cursor, projection, replay, or bar-data ownership paths. |
| `chart-engine/lightweight-chart-adapter` | Adapter event/bar API mapping | Adapter receives already-normalized chart data and maps it to Lightweight Charts API shape. |

## Deferred Conditions

Reopen this line only if one of these conditions appears:

- a chart-foundation bug shows that two owners interpret the same chart cursor,
  source timeframe, display timeframe, projection bucket, or replay timestamp
  differently;
- a new chart-foundation feature needs source/display timeframe math and cannot
  use `time-domain` directly through its owner wrapper;
- a remaining local comparison path starts accepting untrusted raw payloads
  instead of already-normalized bars/state.

## Next Step

Step 232 should return to bounded chart-foundation slice selection. It should
choose the next user-visible foundation improvement from the current priorities
without starting indicators, SMC/ICT overlays, trading simulation, order
tickets, prop firm rule engines, or journal workflows.

## Non-Goals

- Do not migrate shell/session/journal metadata in Step 231.
- Do not change chart-entry, bar-data, chart-data, replay, viewport, or pane
  behavior in Step 231.
- Do not add new TFs, indicators, Pine Script compatibility, SMC/ICT overlays,
  trading simulation, order tickets, prop firm rule engines, or journal
  workflows.
- Do not move chart series writes, bar-data requests, replay cursor ownership,
  projection ownership, viewport ownership, or pane ownership across runtime
  boundaries.

## Acceptance

- The chart-foundation time helper line is explicitly closed for now.
- Remaining local time/TF logic is classified as keep or deferred.
- The next step returns to bounded chart-foundation slice selection.
- Static audit, product direction, boundary, and chart browser regression
  smokes pass.
