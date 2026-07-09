# V6 Step 214 - TF / Projection / Time Domain Unification Readiness Audit

## Decision

Step 214 accepts a readiness audit, not an implementation rewrite.

Step 215 should introduce a small shared domain boundary for minute timeframe
normalization, timestamp normalization, and source-to-display projection inputs.
The initial implementation target should be conservative: create the public
domain API, route the highest-risk projection consumers through it, and preserve
current chart behavior.

## Why This Matters

V6 is now an SMC/ICT-focused backtesting and journal workstation. That product
direction still depends first on a reliable chart foundation:

- database/API K-line loading;
- supported timeframe switching;
- drag/scroll stability;
- leftward history extension until no data remains;
- date range clarity;
- replay;
- multi-pane chart state.

The recent 15m leftward-extension failure was caused by the same architectural
pattern this audit targets: closely related time and projection rules were
implemented in more than one place. That kind of drift is especially dangerous
before adding more TFs, indicators, SMC/ICT overlays, or journal-linked chart
evidence.

## External Capability Check

Lightweight Charts 5.2 supplies chart, series, pane, and plugin APIs, including
`setData`, `update`, custom series, and pane primitives. It does not own V6's
replay-safe source-to-display bar projection, source timeframe request windows,
or SMC/ICT product semantics. Therefore this unification belongs in V6 domain
code, not shell UI, plugins, or the chart-engine adapter.

References checked:

- https://tradingview.github.io/lightweight-charts/docs
- https://tradingview.github.io/lightweight-charts/docs/plugins/intro

## Intended Owner Boundaries

### Keep

- `bar-data` owns bounded source-window requests, API time formatting, cache
  keys, and request limits.
- `chart-data-projection` should own source-bar to display-bar projection and
  projection metadata.
- `chart-history` may own leftward-extension orchestration, but not independent
  TF parsing, timestamp parsing, or HTF bucket math.
- `replay` owns cursor and reveal state, but not display projection.
- `chart-viewport` owns viewport intent projection to logical ranges, but not
  source-bar aggregation.
- `panes` owns pane-local state and selected display timeframe, but not source
  timeframe math.
- `shell` and route modules may display TF labels and dispatch commands, but
  must not own TF math, timestamp parsing, source-window planning, replay cursor
  mutation, or chart series writes.

### Proposed Step 215 Domain API

Introduce a focused domain module, likely under `v6/src/time-domain/` or
`v6/src/chart-time-domain/`, with a minimal public API:

- `normalizeMinuteTimeframe(value, { fieldName, allowSuffix })`
- `normalizeUnixSeconds(value, { fieldName })`
- `normalizeUnixMilliseconds(value, { fieldName })`
- `toApiMinuteTime(timestampMs)`
- `assertDisplayTimeframeMultiple({ sourceTimeframe, targetTimeframe })`
- `resolveDisplayBucketStart({ timestamp, targetTimeframe, originTimestamp })`
- `summarizeProjectionSource(record)`

The exact names can change in Step 215, but the boundary should stay small and
domain-only. It must not import shell, route, chart-engine, replay runtime, or
bar-data runtime state.

## Duplicate Implementation Evidence

| Area | File | Evidence | Classification |
| --- | --- | --- | --- |
| Source-to-display projection owner | `v6/src/chart-data-projection/chart-data-projection-domain.js` | `projectSourceBarsToChartData`, bucket metadata, duplicate timestamp merging, `sessionStartTimestamp` origin | Keep as projection owner; wrap shared TF/time helpers in Step 215 |
| Independent display projection | `v6/src/display-timeframe/display-timeframe-projection.js` | `projectBarsToDisplayTimeframe`, local `bucketStart`, local `normalizeTimeframeMinutes` | Replace after shared projection API is ready |
| Default wall HTF projection | `v6/src/default-wall/default-wall-pane-projection.js` | imports `projectBarsToDisplayTimeframe` and has local `normalizeTimeframe` | Replace with chart-data-projection/domain path |
| Leftward extension planning | `v6/src/chart-history/leftward-extension-planner.js` | local `normalizeTimeframeMinutes`, canvas-left timestamp math, source/display multiple check | Wrap shared TF helper; keep planner ownership |
| Leftward extension runtime | `v6/src/chart-history/leftward-history-extension-runtime.js` | local `normalizeTimeframeMinutes`, replay timestamp parsing, projection-source summary | Wrap shared TF/time helpers and shared projection-source summary |
| Bar-data windows | `v6/src/bar-data/bar-window.js` | `normalizeTimeframe`, `parseBarTimeMs`, `formatApiTime`, window estimates | Keep request-window ownership; expose or share parsing helpers without moving cache/request ownership |
| Replay cursor stepping | `v6/src/replay/replay-domain.js` | local `parseIsoMs`, local `normalizeTimeframeMinutes`, `MINUTE_MS` cursor step | Wrap shared TF/time helpers; replay still owns cursor state |
| Pane display TF | `v6/src/panes/pane-model.js` | local `normalizePaneDisplayTimeframe` | Wrap shared TF helper; panes still own selected value |
| Chart viewport cursor parsing | `v6/src/chart-viewport/chart-viewport-runtime.js` and `v6/src/chart-viewport/chart-viewport-store.js` | local cursor timestamp coercion | Wrap shared timestamp helper; viewport still owns intent |

## Refactor Order Recommendation

1. Step 215: add the shared TF/time domain helper and route pure projection
   domain tests through it.
2. Step 216: retire `display-timeframe/display-timeframe-projection.js` as an
   independent HTF projection implementation by routing display-timeframe and
   default-wall consumers through `chart-data-projection`.
3. Step 217: wrap chart-history, replay, panes, and viewport timestamp/TF
   normalization through the shared helper without moving their ownership.
4. Step 218: add browser coverage for 1m, 5m, and 15m leftward extension after
   TF switch and wheel/drag interactions.

## Non-Goals

- Do not rewrite projection behavior in Step 214.
- Do not add new supported timeframes.
- Do not add indicators, custom indicators, main/sub-pane indicator layout, or
  Pine Script compatibility.
- Do not add SMC/ICT overlays such as liquidity, FVG, order block, market
  structure, or displacement tools.
- Do not add trading/order tickets, prop firm rule engines, or pseudo-live
  simulation behavior.
- Do not move bar-data requests, replay cursor ownership, viewport intent, or
  chart series writes into shell, route, plugin, or adapter modules.

## Acceptance

- Owner boundaries are named for TF parsing, timestamp parsing, and
  source-to-display projection.
- Duplicate implementation evidence is documented with file-level references.
- Step 215 has a bounded implementation target.
- Static smoke coverage prevents adding another independent HTF projection path
  without updating this audit.
