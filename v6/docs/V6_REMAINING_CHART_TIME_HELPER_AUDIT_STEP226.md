# V6 Step 226 - Remaining Chart Time Helper Closure Audit

## Decision

Step 226 is an audit step, not an implementation step.

Steps 222 through 225 closed the high-risk chart-entry, pane-intent reload, and
layout-bootstrap timestamp parsing path that previously let different TF paths
drift. The remaining sites are now spread across multiple owners, so the next
work should stay bounded by owner rather than continue broad search-and-replace
migration.

The next implementation step should be Step 227:
`display-timeframe-runtime.js` time helper migration.

## Product Context

V6 is currently building the chart foundation for an SMC/ICT-focused
backtesting and journal workstation. The active foundation priority remains
reliable K-line loading, TF switching, chart drag/scroll display, date ranges,
replay, multi-pane behavior, and pane-local reset behavior before indicators,
SMC/ICT overlays, trading simulation, or journal expansion.

## Already Routed Through `time-domain`

| Owner | Files | Status |
| --- | --- | --- |
| chart viewport | `v6/src/chart-viewport/chart-viewport-runtime.js`, `v6/src/chart-viewport/chart-viewport-store.js` | replay payload and viewport cursor timestamps already use `normalizeUnixSeconds` |
| projection | `v6/src/chart-data-projection/chart-data-projection-domain.js` | bar timestamps, cursor timestamp, session start timestamp, source TF, and target TF already use shared helpers |
| leftward history | `v6/src/chart-history/leftward-extension-planner.js`, `v6/src/chart-history/leftward-history-extension-runtime.js` | source/display TFs, replay cursor, replay start, and bar timestamps already use shared helpers |
| bar-data planning | `v6/src/bar-data/bar-window.js`, `v6/src/bar-data/bar-window-cache.js`, `v6/src/bar-data/bar-normalizer.js` | bar windows and cache epoch serialization were migrated in Steps 218-220 |
| pane model and replay | `v6/src/panes/pane-model.js`, `v6/src/replay/replay-domain.js` | pane/replay minute TF validation already uses `normalizeMinuteTimeframe` |
| chart-entry/reload/layout | files migrated in Steps 222-225 | high-risk chart-entry, pane reload, and layout bootstrap timestamp paths now use shared helpers behind local wrappers |

## Remaining Implementation Candidates

| Owner | Files | Remaining local logic | Recommended action |
| --- | --- | --- | --- |
| display-timeframe runtime | `v6/src/display-timeframe/display-timeframe-runtime.js` | latest source bar timestamp uses `Number(...)`; projection-source summary is built inline | Step 227: migrate latest timestamp through `normalizeUnixSeconds` and projection summary through `summarizeProjectionSource` |
| default-wall runtime/domain | `v6/src/default-wall/default-wall-runtime.js`, `v6/src/default-wall/default-wall-replay.js` | display TF parsing and replay bar timestamp parsing are local | Later bounded step after display-timeframe; default-wall has its own replay state semantics |
| chart-data bars | `v6/src/chart-data/chart-bars.js` | cursor timestamp validation is finite-number-only | Later bounded step; input is already runtime seconds, so behavior must stay strict |
| chart-entry context and playback policy | `v6/src/chart-entry/chart-entry-context-plan.js`, `v6/src/chart-entry/chart-entry-default-wall-plan.js`, `v6/src/chart-entry/chart-entry-playback-period-policy.js` | ISO/timeframe wrappers remain local | Later audit or migration only if chart entry context becomes unstable |

## Local Logic To Keep For Now

| Owner | Files | Reason |
| --- | --- | --- |
| shell/session UI | `v6/src/shell/*` session, status, dashboard, setup models | mostly UI formatting, form validation, sorting, and display text; not chart data ownership |
| session contracts/repository | `v6/src/session/*`, `v6/src/session-settings/*`, `v6/src/session-summary/*`, `v6/src/session-analytics/*` | persistence/domain validation timestamps are not chart cursor projection paths |
| journal and journal persistence | `v6/src/journal/*`, `v6/src/journal-persistence/*` | created/updated timestamps are journal metadata, not chart foundation cursor math |
| chart engine adapter | `v6/src/chart-engine/lightweight-chart-adapter.js` | adapter maps already-normalized chart bars/events to Lightweight Charts API shape |

## Step 227 Target

`v6/src/display-timeframe/display-timeframe-runtime.js` should be next because:

- it is chart-foundation code directly tied to TF switching;
- it has a small owner boundary and no UI/persistence concerns;
- it still parses latest source bar timestamp locally;
- it duplicates projection-source summary shape already centralized in
  `summarizeProjectionSource`;
- changing it can be verified with existing display-timeframe and chart browser
  smokes.

Step 227 should preserve target pane selection, projection dispatch payloads,
pane display-timeframe updates, chart replacement payloads, emitted event shape,
and error text. It should not add TFs, indicators, SMC/ICT overlays, trading,
journal behavior, or pseudo-live simulation.

## Non-Goals

- Do not migrate default-wall, chart-data bars, chart-entry context, shell,
  session, or journal code in Step 226.
- Do not add new TFs or change TF menu behavior.
- Do not add indicators, Pine Script compatibility, SMC/ICT overlays, trading
  simulation, order tickets, prop firm rule engines, or journal workflows.
- Do not move chart series writes, bar-data requests, replay cursor ownership,
  projection ownership, viewport ownership, or pane ownership across runtime
  boundaries.

## Acceptance

- Remaining chart-foundation timestamp and timeframe parsing sites are
  classified by owner.
- The audit distinguishes shared-helper candidates from UI/persistence logic
  that should stay local for now.
- Step 227 has a bounded implementation target.
- Static smoke coverage prevents this audit from drifting before Step 227.
