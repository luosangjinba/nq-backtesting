# V7 R0.4 Cache, Latency, And Atomic Refresh — 2026-07-19

## Trigger

R0.3 human review clarified that phase two is not planned and requested hard
standards for Manual Next, Auto Replay, painless history extension, dimmed
TF/ETH/RTH refresh, and TradingView/FXReplay-style caching behavior.

## Decision

Outside-foundation examples are unplanned candidates only. Foundation latency
uses cache-aware visible budgets: provider time is observed separately from
bounded local feedback and post-response work. No artificial production delay
is allowed.

TF/session-hours switches retain and dim the last accepted snapshot, then
replace the complete target atomically. Earlier history is prepended in bounded
automatic chunks; bar-by-bar or repeated-input repair is forbidden.

Only Bar Data Runtime owns raw caching. Cache identity is provider, instrument,
source resolution, bounded window, and dataset revision; active Session is not
part of cache identity. Projection remains responsible for no-future display.

## External Capability Review

Official Lightweight Charts documentation confirms visible logical-range
subscriptions, `barsInLogicalRange`, complete ordered `setData` replacement,
and current-tail `update`. V7 uses those adapter capabilities without granting
the chart callback ownership of history requests or transaction completion.

## Scope

R0.4 adds contracts, validators, and intentional failures only. It adds no
production runtime, actual cache, data requests, chart mutation, or browser UI.

## Manual Review

Review latency thresholds, measurement separation, snapshot dim/replace
behavior, history chunk policy, cache identity, prefetch watermarks, and the
unplanned-candidate terminology. Automated evidence cannot accept this step.
