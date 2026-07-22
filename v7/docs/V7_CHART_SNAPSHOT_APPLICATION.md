# V7 Chart Snapshot Application

Status: R4.3 single-Pane boundary plus R6.3 complete Pane-set extension and
2026-07-22 post-mutation rollback hardening

## Ownership

`core.chart-snapshot-application` is the sole chart-series writer boundary. It
accepts one immutable Projection Domain pane snapshot, stages adapter work,
allows one current transaction to cross the visible mutation boundary, and
returns a branded completion for that exact identity and snapshot.

R6.3 adds a constructor for one immutable complete Pane-set snapshot inside the
same module. It validates all planned ready/empty Pane results and lets the
injected adapter cross one visible boundary for the entire set. This is not a
second writer or transaction path. The real R5 browser remains on the
single-Pane constructor until its bounded R6.5 multi-host migration.

It does not request bars, project bars, mutate Replay, choose viewport intent,
persist a Session, access the DOM, or depend on Lightweight Charts. The R4.3
adapter is a deterministic fake only.

## Atomic Application Contract

1. validate the complete Session/activation/transaction scope;
2. validate the frozen projected snapshot and its Replay-proposal provenance;
3. stage without changing visible series;
4. reject superseded or disposed work;
5. let the sole adapter check `isCurrent()` immediately before its atomic
   visible mutation;
6. require a branded, exact-identity, exact-snapshot, monotonically increasing
   adapter receipt;
7. restore the prior accepted data, OHLC index, scales, and visible metadata if
   apply, paint, staleness, or outer receipt validation fails after mutation;
8. publish accepted application metadata and return exact visible completion.

Failed, stale, duplicate, foreign, forged, or disposed applications publish no
completion. Cleanup cannot replace the original failure. The real adapter now
keeps a transaction-local copy of the prior accepted chart surface, so failure
both before and after visible mutation preserves that prior state. A newer
mutation token always wins and cannot be overwritten by a late older rollback.

## Library Research Decision

Current official Lightweight Charts documentation was checked before this
boundary was implemented. `ISeriesApi.setData()` replaces a complete ordered
series and `update()` changes the tail, while `subscribeDataChanged()` reports
calls to those data APIs; it is not a paint/visible-completion guarantee. The
official infinite-history example uses visible logical-range notification and
`setData()` to extend history, but does not provide workspace transaction
ownership. The awesome-tradingview catalogue supplies useful official plugin
and example references, but no atomic multi-owner application contract.

R4.3 kept library calls behind a future adapter and required its own visible
receipt. R4.5 now supplies that adapter with a two-frame, screenshot/candle-
pixel paint gate; it does not reinterpret `subscribeDataChanged()` as visible
completion. See `V7_LIGHTWEIGHT_CHART_SLICE.md`.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/tutorials/demos/infinite-history>
- <https://github.com/tradingview/awesome-tradingview>

## Gate

`tests/chart-snapshot-application-harness.js` proves normal exact single-Pane application,
stage and apply races, failure preservation, duplicate/scope/disposal rejection,
immutable projection provenance, forged-receipt rejection, and sole-writer
inventory with 15 deterministic negative/race controls.

`tests/pane-set-materialization-harness.js` additionally proves exact complete
Pane-set validation, one visible apply, ready/empty Pane handling, failure
preservation, post-mutation child rollback, and stale-result isolation with 22
negative/race controls. `tests/lightweight-chart-adapter-browser-harness.js`
proves real-canvas rollback after paint-time staleness and after outer discard.
