# V6 Step 280 - Target-Timeframe Schema Discovery

Date: 2026-07-10

## Decision

Step 280 records the current source-bars schema and selects the initial
target-timeframe storage direction for the future target-TF data path.

This document is discovery only. It does not change the V4 API, DuckDB schema,
V6 bar-data runtime, display-timeframe runtime, chart-history runtime, or replay
behavior.

## Current Source Bars Boundary

V6 currently loads chart bars through the V4 bars API adapter:

- V6 adapter: `v6/src/bar-data/v4-bars-adapter.js`
- API endpoint: `GET /v4/bars`
- query params: `instrument`, `start`, `end`, `tf`
- current `tf` type: integer minutes
- response shape: `{ bars, requestedRange }`

The V4 API delegates to:

- `v4/server/bars_handler.py`
- `v4/server/bars_service.py`
- `v4/server/price_lookup.py`

The V4 configuration points market bars at:

- DuckDB path: `v4/data/trading_data.duckdb`
- table: `futures_1m`

The source table is treated as authoritative `1m` futures bars keyed by
instrument and timestamp. The query path reads these columns:

- `instrument`
- `ts`
- `open`
- `high`
- `low`
- `close`
- `volume`

Existing V4 planning docs describe `ts` as US/Eastern wall-clock timestamps
stored as naive DuckDB timestamps. The V4 API converts returned timestamps into
epoch seconds for browser chart use.

## Current Aggregation Boundary

`v4/server/price_lookup.py` already aggregates fixed-minute bars from
`futures_1m` when `tf > 1`:

- anchor epoch: `2000-01-01T00:00:00Z`
- special `4h` offset: `02:00/06:00/.../22:00` style alignment via a 7200
  second offset;
- output shape: `time`, `timestamp`, `open`, `high`, `low`, `close`, `volume`.

`v4/server/bars_service.py` has a special path for `tf == 1440`:

- removes the `17:00` maintenance hour;
- anchors futures daily bars at `18:00`;
- returns `tradingDay` for the next calendar day.

The current `/v4/bars` handler only parses `tf` as an integer. It does not yet
accept canonical target ids such as `8h`, `1D`, `1W`, or `1M`.

## Target-Timeframe Contract

The V6 target-timeframe contract is defined in
`v6/src/time-domain/target-timeframe-domain.js`.

Canonical ids:

- fixed-duration: `1m`, `2m`, `3m`, `4m`, `5m`, `10m`, `15m`, `30m`, `1h`,
  `2h`, `4h`, `8h`, `12h`;
- session-aware: `1D`, `1W`, `1M`.

Contract rules:

- numeric input means fixed minutes;
- lowercase `m` means minutes;
- uppercase `M` means month;
- fixed-duration ids have a deterministic minute count;
- session-aware ids require a futures session calendar;
- source `1m` remains the replay cursor, no-future reveal, and no-bar gap
  authority.

## Initial Storage Direction

Use one target-bars table keyed by instrument, canonical timeframe id, and
timestamp unless implementation discovery proves it unsafe:

```text
target_bars(
  instrument text,
  timeframe text,
  ts timestamp,
  trading_day date null,
  open double,
  high double,
  low double,
  close double,
  volume bigint,
  source_start_ts timestamp,
  source_end_ts timestamp,
  generated_at timestamp,
  primary key (instrument, timeframe, ts)
)
```

Rationale:

- one table keeps cache/materialization logic uniform across supported TFs;
- canonical timeframe ids avoid integer-minute ambiguity for `1D`, `1W`, and
  `1M`;
- `source_start_ts` and `source_end_ts` preserve traceability back to source
  `1m` bars;
- `trading_day` is optional and only meaningful for session-aware futures bars.

Per-timeframe tables remain a fallback only if query performance, retention, or
maintenance complexity requires them later.

## Step 280 Non-Behavioral Boundary

Step 280 must not:

- create `target_bars`;
- add `/v4/target_bars` or change `/v4/bars`;
- make V6 request target-TF bars;
- change replay cursor, no-bar gap, viewport, chart-engine, chart-data, or
  frontend projection behavior.

The next implementation phase should begin by adding API/data-layer aggregation
behind the contract, preferably on-demand with cache before persistent
materialization.
