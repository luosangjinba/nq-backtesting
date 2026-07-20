# V7 Chart Snapshot Application

Status: R4.3 headless atomic chart-application boundary (2026-07-20)

## Ownership

`core.chart-snapshot-application` is the sole chart-series writer boundary. It
accepts one immutable Projection Domain pane snapshot, stages adapter work,
allows one current transaction to cross the visible mutation boundary, and
returns a branded completion for that exact identity and snapshot.

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
7. publish accepted application metadata and return exact visible completion.

Failed, stale, duplicate, foreign, forged, or disposed applications publish no
completion. Cleanup cannot replace the original failure. Adapter failure before
the visible mutation preserves the prior accepted chart state.

## Library Research Decision

Current official Lightweight Charts documentation was checked before this
boundary was implemented. `ISeriesApi.setData()` replaces a complete ordered
series and `update()` changes the tail, while `subscribeDataChanged()` reports
calls to those data APIs; it is not a paint/visible-completion guarantee. The
official infinite-history example uses visible logical-range notification and
`setData()` to extend history, but does not provide workspace transaction
ownership. The awesome-tradingview catalogue supplies useful official plugin
and example references, but no atomic multi-owner application contract.

Therefore R4.3 keeps library calls behind a future adapter and requires its own
visible receipt. The first browser adapter must prove a paint-level visual gate;
it must not reinterpret `subscribeDataChanged()` as visible completion.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/tutorials/demos/infinite-history>
- <https://github.com/tradingview/awesome-tradingview>

## Gate

`tests/chart-snapshot-application-harness.js` proves normal exact application,
stage and apply races, failure preservation, duplicate/scope/disposal rejection,
immutable projection provenance, forged-receipt rejection, and sole-writer
inventory with 14 deterministic negative/race controls.
