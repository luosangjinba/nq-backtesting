# V7 R3.1 Raw Bar Data Value Contract — 2026-07-20

## Trigger

R2.3 passed human interaction and visual review. The next foundation boundary
must prevent cross-source/cross-instrument raw contamination before any network
or cache implementation exists.

## Boundary Decision

Add only pure immutable provider-neutral request, OHLCV bar, and batch values.
The request identity is provider, instrument, source resolution, half-open
window, and dataset revision. It contains no Session, pane, display timeframe,
ETH/RTH, Replay, transaction, viewport, or UI state.

Provider-specific V4 fields are future adapter input and do not enter the raw
domain. R3.1 adds no I/O, cache, coverage lookup/calendar, Replay, projection,
chart, or visible product behavior.

## Automated Gate

Passed before commit: independent contract harness with 11 negative controls,
architecture and source-quality gates, all 17 V7 harnesses, and
`git diff --check`.

## Human Review

Accepted on 2026-07-20. This headless boundary introduced no interaction or
visual delta; its scope and identity semantics were approved.
