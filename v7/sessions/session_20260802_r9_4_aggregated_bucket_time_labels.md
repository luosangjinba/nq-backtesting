# Session — R9.4 Aggregated Bucket Time Labels

Date: 2026-08-02
Status: implemented; human acceptance pending

## Request And Diagnosis

The Crosshair and time axis rendered aggregate completion coordinates as if
they were bucket identities. This made a `23:00`–`23:59` one-hour candle show
`23:59`. Calendar aggregates also needed an explicit trading-date label because
an ETH trading day/week starts on the prior civil evening.

## Delivered

- preserved completion-slot Chart placement and all Replay/no-future behavior;
- mapped every fixed aggregate label to `startEpochMs` through the adapter's
  shared read-only index;
- added validated calendar `labelDate` provenance from pure aggregation through
  the real projected-history API;
- formatted `1D`/`1W`/`1M` as date-only through official Lightweight Charts
  Crosshair and time-axis ports;
- retained normal instant labels for future-axis whitespace.

## Evidence And Human Gate

Settings, projection, fixed/calendar aggregation, provider, native Chart,
real-DuckDB/DST, Calendar, full Replay Workspace, and sustained 1/2/4 Pane 4h
latency evidence pass. All 81 V7 Harnesses are covered on the final tree; the
4h Crosshair visual fixture now shows bucket start `08:00` instead of completion
`11:59`. Hard reload and hover `1h`, `4h`, `1D`, `1W`, and `1M` in representative
ETH/RTH views; visible acceptance remains pending.
