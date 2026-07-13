# V6 Unified Target History Full-Timeframe Step 400

## Outcome

Step 400 closes the implementation gap behind the reported “toothpaste” history
loading. The target-history path is one feature boundary across the supported
matrix rather than separate implementations for hourly, daily, weekly, and
monthly charts.

The shared flow is:

1. the chart input bridge requests a left extension;
2. the chart-history runtime selects the target-history path;
3. the bar-data owner requests already-aggregated target bars;
4. the chart runtime applies them and preserves source-window fallback only for
   genuine target failures.

Fixed periods `30m`, `1h`, `2h`, `4h`, `8h`, and `12h` share fixed-duration
bucketing. `1D`, `1W`, and `1M` share session-calendar bucketing aligned to the
Globex 18:00 boundary. This is a strategy difference inside one backend service,
not a second frontend loading feature.

Periods below `30m` remain on the source-window projection chain. Extending the
target policy to `15m` caused the existing low-period automatic chain invariant
to fail, so the activation boundary is explicit and covered by regression tests.

## Backend changes

`v4/server/target_bars_service.py` now serves `1W` and `1M` through the same
session-aware aggregation boundary as `1D`. The calendar mapping first shifts
source timestamps by six hours, truncates to day/week/month, and shifts back to
the 18:00 session boundary. Weekly bars therefore begin Sunday at 18:00 and
monthly bars begin at 18:00 on the prior calendar day.

The service contract and health capability now cover:

`30m`, `1h`, `2h`, `4h`, `8h`, `12h`, `1D`, `1W`, `1M`.

## Verification

The real temporary-DuckDB service matrix passed with non-empty, ordered OHLC
results for all nine periods. The live API verifier also passed all nine periods
against the running service.

The real API browser smoke switched through `30m`, `1h`, `2h`, `1W`, and `1M`.
Every case reported:

- diagnostics path `target-history`;
- target status `applied`;
- exactly one target request;
- zero source fallback requests;
- more than one rendered bar.

Additional regression results:

- target-history diagnostics pack: `8/8`;
- low-period leftward automatic-chain browser smoke: passed;
- complete chart browser regression pack: `28/28`.

## Acceptance boundary and next step

Automated evidence proves the ownership path and returned data. It does not
replace human visual acceptance of density, viewport fill, and drag behavior.

Step 401 should refresh the live page and check representative fixed periods
`30m`, `1h`, and `2h`, then the repaired `1W` and `1M` periods. Switching should
fill the visible history immediately, the readout should remain on
`History target`, and left dragging should reveal more bars without repeated
small batches. After that visual gate passes, resume the deferred Active-Pane
Loaded-Window Date Locator.
