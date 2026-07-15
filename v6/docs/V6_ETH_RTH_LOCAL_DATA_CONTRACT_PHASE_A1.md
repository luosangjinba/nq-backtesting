# V6 ETH/RTH Phase A1 — Local Data And API Time Contract

Status: accepted (2026-07-15)

## Scope

This step verifies the local NQ/ES `1m` source and V4 bars API representation
before defining ETH/RTH eligibility. It does not define RTH hours or change
runtime behavior.

## Storage Contract

The active source is `v4/data/trading_data.duckdb`, table `futures_1m`:

- `instrument`: `VARCHAR`;
- `ts`: naive DuckDB `TIMESTAMP`;
- OHLC: `DOUBLE`;
- volume: nullable `BIGINT`.

At audit time the stored ranges were:

| Instrument | First timestamp | Last timestamp | Rows |
| --- | --- | --- | ---: |
| ES | `2008-01-02 06:01` | `2026-06-23 02:18` | 6,460,984 |
| NQ | `2008-01-02 06:01` | `2026-06-23 02:19` | 6,127,515 |

The database timestamp is a New York/exchange wall-clock label stored without
timezone metadata. It is not a UTC instant.

## V4 API Contract

`v4/server/price_lookup.py` reads the naive database timestamp and constructs
`timestamp` with:

`int(row.ts.replace(tzinfo=timezone.utc).timestamp())`

This intentionally encodes the exchange wall-clock fields as epoch seconds so
Lightweight Charts renders the expected chart-axis label. For example:

- database/API text: `2026-06-01 09:30`;
- API timestamp: `1780306200`;
- the timestamp represents chart wall-clock `09:30`, not the actual UTC instant
  corresponding to New York `09:30`.

V6 normalizes that value to integer Unix seconds without applying an exchange
timezone conversion. Session Hours eligibility must therefore evaluate the
chart timestamp's UTC date/hour/minute fields as exchange wall-clock fields.
Applying `America/New_York` conversion again would shift the boundary by four
or five hours and is forbidden.

## Observed Source Session Shape

For both NQ and ES over `2026-06-01` through `2026-06-07`:

- a complete Monday-Thursday calendar date contains 1,380 bars;
- hours `00` through `16` and `18` through `23` contain data;
- `17:00` through `17:59` contains no bars;
- Friday data ends at `16:59`;
- Saturday has no bars;
- Sunday data begins at `18:00`.

The source therefore already represents the ordinary CME electronic-session
maintenance break. ETH eligibility should primarily validate source bars and
calendar exceptions; it should not synthesize missing maintenance bars.

## Existing Aggregation Caveat

The V4 bars service currently aggregates:

- fixed minute/hour timeframes on a wall-clock epoch grid;
- `4h` with a fixed `02:00` grid offset;
- daily bars with an `18:00` wall-clock anchor and an explicit hour-17
  exclusion.

Those pre-aggregated ETH rules cannot produce RTH candles. RTH higher
timeframes must be aggregated from RTH-eligible source bars, or requested from
a future target-data contract whose cache identity includes Session Hours
mode.

## Accepted Invariants

1. NQ/ES source timestamps are exchange wall-clock labels encoded as UTC-like
   epoch seconds for charting.
2. Session Hours code consumes this chart-axis convention directly.
3. No second timezone conversion is applied to source bar eligibility.
4. The ordinary ETH maintenance gap is `17:00–17:59` in the stored wall clock.
5. RTH projection cannot reuse current ETH fixed/daily aggregate results.
6. Bar Data remains the source requester/cache owner; this step adds no
   filtering behavior.

## Verification Evidence

- direct read-only DuckDB schema/range/hour/day queries;
- direct `query_v4_bars` sample for NQ `2026-06-01 09:29–09:31`;
- source inspection of V4 bars handler/service and V6 time/bar normalization.

## Next Step

ETH/RTH Phase A2 — establish the official NQ/ES exchange-session calendar,
RTH boundary, holiday/early-close, maintenance-break, and DST rules against
authoritative sources.
