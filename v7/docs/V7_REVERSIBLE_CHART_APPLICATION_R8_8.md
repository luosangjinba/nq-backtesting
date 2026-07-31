# V7 Reversible Chart Application — R8.8

Status: completed recovery activation (2026-07-30)

## Outcome

R8.8 makes the sole Chart Snapshot Application a real R8.7 prepared
participant. Chart now stages without visible mutation, applies one exact
painted candidate reversibly, restores the complete previous Pane set on
rollback, and releases prior state only on exact finalize.

The normal accepted visual and interaction path is unchanged. This step adds
failure atomicity; it changes no labels, controls, styling, gestures, chart
semantics, or successful-workflow timing contract.

## Public Lifecycle

`chartApplication.prepare()` validates complete transaction identity and the
exact immutable projected Pane snapshot/Pane-set, stages the adapter, and
returns a branded prepared Chart handle. Its lifecycle is:

```text
prepare -> apply (painted candidate, accepted Chart revision unchanged)
              |-> rollback (exact prior visible state and revision)
              `-> finalize (publish exact target Chart revision)
```

The handle delegates identity, candidate, base/target revision, phase, branded
receipt, and disposal enforcement to `core.prepared-commit-contract`. Adapter
visible receipts must now equal the exact prepared target revision rather than
merely be greater than the last accepted revision. Structural lookalikes,
foreign receipts, stale preparations, duplicate phases, and applied disposal
fail before accepted Chart state can advance.

R8.9 subsequently removes the legacy `present()` migration bridge. Production
now reaches visible Chart mutation only through the four-participant Workspace
Transaction coordinator's prepare/apply/rollback/finalize lifecycle.

## Exact Adapter Restoration

Each real Lightweight Charts child retains its prior:

- candlestick and future-axis series data;
- projected OHLC/crosshair source bars;
- logical time range and vertical price range/autoscale state;
- instrument/price presentation and timeframe duration;
- visible revision and chart-host metadata.

The complete Pane-set adapter additionally retains the prior member order,
active/ready/empty presentation, accepted adapter revision, hidden prior child
adapters, and Pane-surface/maximize state. Candidate-only hosts stay bounded by
the fixed P1–P4 identity set. Rollback restores the prior surface and every
child; finalize then disposes and releases children absent from the accepted
candidate.

No child, prior Pane, or DOM surface is irreversibly released during prepare or
apply.

## Later-Boundary Failure Matrix

The Pane-set materialization Harness establishes a one-Pane accepted surface,
applies a visible two-Pane candidate, and injects failures independently at:

- Replay commit;
- Workspace State commit;
- publication/durable handoff.

Every case restores the exact prior one-Pane surface, child data, accepted
Chart snapshot object, and revision. A separate finalize case proves the
candidate becomes accepted only once. The real-Chrome adapter Harness proves
the same prepared apply/rollback restores real canvas data, OHLC provenance,
logical range, and adapter revision after paint.

## Library And Ecosystem Decision

Lightweight Charts 5.2 provides full `series.data()` readback and full
replacement through `setData()`. `update()` and `pop()` are immediate series
mutations, while `removeSeries()` and `chart.remove()` are explicitly
irreversible. The official Pane API and awesome-tradingview ecosystem do not
provide a cross-owner prepare/rollback/finalize transaction.

V7 therefore continues using adapter-owned accepted snapshots and `setData()`
restoration. It delays destructive Pane/Chart cleanup until finalize instead
of attempting to reconstruct removed native series.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes>
- <https://github.com/tradingview/awesome-tradingview>

## Recovery Result

At the R8.8 checkpoint, H056 returned from `regressed` to `accepted` and H076
remained `executable`: only Chart was a real prepared participant; Replay,
Workspace State, publication, persistence, and the global finalize decision
were assigned to R8.9.

The exact production baseline contains 45 modules, 115 dependency edges, 113
construction sites, nine critical writer sites, and the same three later-step
blocking findings. No production writer or composition finding is hidden or
cleared by this step.

No manual UI review is required because the accepted UI and interaction path
does not materially change.

R8.9 subsequently activates the remaining participants and the sole global
decision owner. Its real-owner failure matrix advances H076 to `accepted`.
