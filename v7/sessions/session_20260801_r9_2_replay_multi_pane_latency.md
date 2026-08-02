# Session — R9.2 Replay Multi-Pane Latency

Date: 2026-08-01
Status: implemented; human acceptance not granted, superseded by R9.3

## Request

Correct the report that Single Pane is already immediate but Replay Next gains
visible delay as soon as Multi-pane is enabled and worsens with each Pane.

## Diagnosis

A real 1/2/4 Pane Chrome profile reproduced monotonic growth. Promise-based
Pane orchestration overlapped asynchronous waits but could not parallelize
synchronous Projection, array conversion, independent Lightweight Charts
mutation, or post-paint interaction-index construction on the main thread.

## Delivered Boundaries

- exact same-transaction Pane Projection output is computed once and safely
  retargeted with a branded destination Pane snapshot;
- exact immutable bars share one Chart-data conversion per Pane-set stage;
- Crosshair and Replay truncation use one shared binary-search interaction
  index without per-commit full-history Maps;
- append-replacement display-gap evidence scans only the changed tail;
- independent child charts and the global atomic paint/finalize boundary remain
  unchanged;
- a separate 1/2/4 Pane sustained browser contract and H081 were added.

## Evidence

The final 64-action profile ended at 14,180 bars per Pane. Warm-cache p50 was
`85.6ms`, `102.0ms`, and `150.0ms` for one, two, and four Panes respectively;
p95 was `129.4ms`, `166.6ms`, and `273.1ms`. Every profile had 62 cache hits,
two provider misses, identical final Pane bar counts, only `append-replace`
mutations, and no browser error.

Focused Projection, Pane-set Materialization, Replay Navigation, Replay
Workspace Composition, Lightweight Chart browser, architecture, source
quality, and whitespace gates pass after rebaselining exact production
evidence.

## Human Gate

The subsequent hard-reload review still found perceptible Multi-pane delay.
This gate was not accepted; R9.3 supersedes the mechanism while retaining the
safe R9.2 shared Projection and interaction-index foundation.

Hard reload and rapidly advance `4h` Replay in one, two, and four Panes. Human
acceptance remains pending until the user confirms the Multi-pane
press-to-candle response is now acceptable and all Panes remain synchronized.
