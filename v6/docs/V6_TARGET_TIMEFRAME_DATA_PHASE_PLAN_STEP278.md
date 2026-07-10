# V6 Step 278 - Target Timeframe Data Phase Plan

Date: 2026-07-10

## Decision

Step 278 accepts a phase-level plan to move high-timeframe chart history from
frontend `1m` source aggregation to target-timeframe data supplied by the data
layer.

The current frontend projection path is still correct for replay semantics, but
it is the wrong default for high-timeframe historical browsing. `4h`, `8h`,
`12h`, `1D`, `1W`, and `1M` leftward extension should not require fetching
large `1m` windows, normalizing them, projecting them on the main thread, and
then replacing the full chart series.

Lightweight Charts supports infinite history by loading more data when the
visible logical range approaches the left edge. Its API also documents that
`setData()` replaces the full series data. That means V6 should reduce the
number of bars passed into the chart for high-timeframe browsing instead of
only increasing source-window size.

## Target Architecture

High-timeframe display and replay precision should use different data paths:

- display/history path: request target timeframe bars for the pane's active
  display timeframe;
- replay precision path: keep `1m` source bars for cursor movement, no-future
  reveal, session gaps, and replay correctness;
- fallback path: keep frontend projection available when target timeframe data
  is missing or explicitly under test.

The long-term shape is:

```text
Database/import
  -> source 1m bars
  -> target timeframe bar materialization/cache
  -> bar-data API can serve 1m or target-TF bars
  -> chart-history/display-timeframe request target-TF bars for display history
  -> replay runtime still advances on source 1m bars
```

## Phase Breakdown

### Phase A - Data Contract And Schema Discovery

Define the target-timeframe bar contract before changing runtime behavior.

- Decide the supported target timeframes:
  `1/2/3/4/5/10/15/30m`, `1/2/4/8/12h`, `1D`, `1W`, `1M`.
- Define a canonical timeframe id used by API, cache, chart-data, and tests.
- Define session-aware bucket semantics for futures daily/weekly/monthly bars.
- Audit the existing V4/DuckDB source schema and the V6 bars API adapter.
- Decide whether target-TF bars are stored in one table with `timeframe` or in
  per-timeframe tables.

Gate:

- pure contract tests prove supported TF ids normalize consistently;
- source `1m` replay bars remain the canonical replay cursor source;
- no frontend owner starts requesting target-TF bars yet.

### Phase B - Server/Data-Layer Aggregation

Add an owner boundary that can return target timeframe bars.

- Implement target-TF aggregation from source bars at the API/data boundary.
- Start with on-demand aggregation plus cache for fast iteration.
- Keep persisted/materialized bars as a later optimization behind the same
  contract.
- Include session calendar context for `1D`, `1W`, and `1M`.
- Return target bars in the same OHLC shape currently accepted by bar-data.

Gate:

- API/runtime smoke proves `8h` and `1D` requests return target bars without
  sending thousands of `1m` bars to the frontend;
- repeated requests hit cache/materialized results;
- source `1m` API behavior is unchanged.

### Phase C - Bar-Data Runtime Target-TF Support

Extend bar-data ownership without leaking display behavior into chart-history.

- Let bar-data plan, load, cache, and release bounded windows for target TFs.
- Keep cache keys explicit on instrument, timeframe, start, and end.
- Preserve current source-window behavior for replay.
- Add diagnostics that separate source-bar loads from target-display loads.

Gate:

- bar-data tests cover cache hit/miss for target TFs;
- request caps are based on target bars, not equivalent `1m` source bars;
- bar-data still does not write chart series or mutate replay.

### Phase D - Display-Timeframe Historical Path

Route high-timeframe display history through target-TF bars.

- Display-timeframe runtime can ask for target-TF replacement bars when a pane
  switches to a supported high TF.
- Chart-history leftward extension requests target-TF bars for browsing when
  target data is available.
- Chart-data stores display bars separately from source bars as it already does.
- Frontend projection remains fallback for missing target data and selected
  regression tests.

Gate:

- `8h` and `1D` leftward extension fetch target bars and stay responsive;
- switching from high TF back to `1m` still uses preserved source bars;
- session-aware daily/weekly/monthly bars match existing projection semantics.

### Phase E - Replay Coordination

Keep replay precise while display bars come from target TFs.

- Manual Next and auto-play continue advancing on source `1m` availability.
- Display chart updates use target bars when possible and source projection
  only when necessary.
- No-bar gap behavior remains source-driven.
- No-future filtering uses replay cursor against the target bar's bucket
  boundary rules.

Gate:

- replay gap browser pack remains green for `1D`, `1W`, and `1M`;
- visible candle latency improves or remains bounded for high TFs;
- target-TF history loading does not move replay cursor or viewport intent.

### Phase F - Materialization And Maintenance

Optimize after the target-TF path is behaviorally correct.

- Add persisted/materialized target bars for common TFs if on-demand cache is
  still not fast enough.
- Rebuild materialized bars after source data import/update.
- Add freshness metadata so stale target bars are detectable.
- Keep on-demand aggregation as a fallback for cache misses and future custom
  intervals.

Gate:

- materialized target bars match on-demand aggregation;
- stale or missing materialized data falls back safely;
- import/update workflows do not corrupt source `1m` replay data.

## Non-Goals

- Do not remove frontend projection until the target path has equivalent
  session-aware coverage.
- Do not change replay cursor ownership, no-bar gap skipping, chart viewport
  intent, chart-engine ownership, or chart surface rendering ownership.
- Do not add seconds, custom interval UI, indicators, order tickets, prop-firm
  workflows, journal workflows, or SMC/ICT overlays.

## Recommended Immediate Next Step

Step 279 should select **Phase A - Data Contract And Schema Discovery** as the
next executable slice, unless manual testing exposes a higher-priority
foundation regression.

Suggested verification for Step 279:

- target timeframe id/domain smoke;
- bar-data adapter static audit;
- session-aware bucket contract smoke;
- `node v6/tests/boundary-smoke.js`;
- `git diff --check`.
