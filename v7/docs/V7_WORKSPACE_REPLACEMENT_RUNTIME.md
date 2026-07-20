# V7 Workspace Replacement Runtime

Status: R5.4 headless atomic replacement complete (2026-07-20)

## Ownership

`core.workspace-replacement-runtime` resolves a registered instrument,
timeframe, and Session Hours combination into one immutable transaction input
and routes it through `core.workspace-transaction-runtime`.

It owns no second transaction scheduler, Replay cursor, bar cache, projection
math, chart series, viewport, persistence, DOM, toolbar, or mutable selected
state. The accepted Workspace Transaction snapshot and its provenance remain
the only applied selection truth.

## Ecosystem Decision

Lightweight Charts `setData` replaces a complete series from ordered prepared
data. It has no timeframe/Session Hours transaction or stale-work owner. The
[official ISeriesApi contract](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi)
and [awesome-tradingview catalogue](https://github.com/tradingview/awesome-tradingview)
therefore reinforce the existing V7 boundary: capability selection and atomic
replacement stay outside the chart adapter and plugin layer.

## Registered Selection

The replacement catalog is keyed generically by:

```text
instrumentId + timeframeId + sessionHoursMode
```

Each entry binds normalized Instrument, TradingCalendar, TimeframeDefinition,
aggregation policy, Session Hours policy, and pane id. It rejects mismatched
calendar, policy id, mode, provider, instrument, or source-resolution
combinations before acquisition. Core code never branches on a concrete
instrument or timeframe id.

The same timeframe may register distinct aggregation-policy revisions per
Session Hours mode. This allows RTH fixed buckets to use the inherited `09:30`
anchor while ETH uses its canonical clock grid, without adding a mode branch to
Projection Domain.

## Cursor And Visible-Through

R5.4 extends Replay with a branded retention proposal:

- `proposeRetention` captures the current cursor/revision but has an empty
  reveal window and cannot move the cursor;
- Projection provenance now records explicit `sessionHoursMode` and
  `visibleThroughEpochMs`, the newest real eligible source bar below the
  exclusive cursor;
- after exact visible completion, the Replay adapter commits that
  visible-through value and advances the Replay revision while retaining the
  cursor;
- a higher-timeframe candle start is never substituted for the last eligible
  source timestamp.

The accepted fixture proves an ETH cursor at Tuesday `03:01` retains `03:01`
after switching to RTH while visible-through becomes Monday `16:14`. On RTH
`1h`, the last candle starts `15:30`, yet visible-through remains `16:14`.

## Atomic Failure And Race Semantics

Replacement follows the existing one-way path:

1. branded replacement intent;
2. registered immutable selection and raw request validation;
3. inert Replay retention proposal;
4. Bar Data acquisition through the injected owner port;
5. eligibility/no-future/aggregation through Projection Domain;
6. exact visible completion;
7. final currency check;
8. synchronous Replay and accepted-workspace publication.

Acquisition or projection/presentation failure preserves the previous accepted
workspace, visible chart snapshot, cursor, visible-through, and Replay
revision. A newer replacement aborts older work for cleanup, but complete
transaction identity—not abort success—prevents both late acquisition and late
presentation from committing.

## Gate

`tests/workspace-replacement-runtime-harness.js` proves ETH/RTH and timeframe
replacement, RTH anchored aggregation, cursor retention, source-level
visible-through, failure preservation, acquisition and presentation reorder
races, generic catalog dispatch, and 11 negative controls. Existing Replay,
Projection, Workspace Transaction, Session Hours, fixed-timeframe, and browser
Harnesses remain regression gates.
