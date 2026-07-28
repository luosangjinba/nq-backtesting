# Session 2026-07-28 — Projected Dense History Fill

Status: automated correction complete; awaiting human interaction review

## Human Evidence And Root Cause

The user supplied a `4h`/ETH screenshot with a large blank region to the left
of roughly eight months of visible candles. Mouse activity appeared to do
nothing; much later one unexplained extension arrived, but it filled only part
of the blank region.

The previous single-pass plan correctly made one chart commit, but it still
requested raw `1m` source and capped the logical window at 210 days. This Canvas
gap needed substantially more history. The provider spent time on many raw
transfers, then either hit its deadline or returned only the bounded prefix.
Because automatic continuation was intentionally forbidden, the remaining
blank region stayed visible.

## Correction

- Pointer release now publishes the final native wall immediately. A held drag
  or wheel burst is coalesced after 500 ms of stability. One gesture is captured
  once, and duplicate boundary callbacks during an active transaction are
  dropped rather than replayed later without a clear user cause.
- Gap sizing retains the 240-bar minimum, the logical-index-24 target, and an
  eight-bar boundary allowance.
- Sub-hour history retains the authoritative raw `1m` acquisition path.
- `1h`–`12h` left context uses a new read-only V4 projected-history endpoint.
  DuckDB filters the same immutable `1m` table under the exact ETH/RTH weekly
  schedule, converts New York source fields to real instants, and aggregates on
  V7's fixed UTC grid before sending compact display bars.
- Projected history has an explicit request/batch contract, a Bar Data-owned
  bounded cache/runtime, and separate Pane provenance. It is excluded from raw
  Replay source traversal, so fast chart context cannot masquerade as replayable
  minute evidence.
- The projected-history ledger survives same-selection navigation, clears on a
  timeframe/instrument/session change, and merges with raw context by exact
  bucket start. Chart Runtime still receives one complete snapshot and remains
  the only series writer.

## Evidence

- A direct real-API parity gate compared service-projected `4h` ETH and RTH bars
  against V7 client aggregation of raw `1m` bars across the November DST
  transition; OHLCV and timestamps matched exactly.
- The focused contract/runtime/ledger/provider gates prove exact cache identity,
  in-flight coalescing, bounded ownership, selection isolation, and wire
  provenance validation.
- The real Chrome gate creates a screenshot-scale `4h` wall with roughly 1,910
  visible logical bars, then performs one full left-history drag. The result
  contains 2,427 candles, reaches logical `from=12.62` (no left whitespace),
  commits exactly one Workspace revision, and completes in `496.3ms` on the
  final cold-window regression run.
- The same gesture keeps Canvas opacity at `1`, never enters stale state,
  observes a `53ms` maximum long task and `71.3ms` maximum sampling interval,
  and preserves the pre-existing candle anchor by the exact prepend count.

## Human Gate

Reload the running workspace so it receives the new client modules. On the
reported `4h` Session, create a similarly large blank area with one drag and
release. Confirm that the request begins predictably on release, all missing
candles appear together within the acceptable delay, the left edge has no
blank region, and no rebound or Canvas flash occurs.
