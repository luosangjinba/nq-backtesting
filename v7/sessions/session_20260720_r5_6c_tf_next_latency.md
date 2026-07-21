# Session — R5.6c TF And Aggregate Next Latency

Date: 2026-07-20
Status: completed with automated evidence; included in the combined R5.6 human gate

## Attribution

The prior foreground path changed the exact raw request end on every source
minute, so Bar Data could not hit its exact-window cache. Every transaction
also performed full `setData()` and full-canvas screenshot scanning.

After bounded raw buffering and safe `series.update()`, a first 100-sample run
showed mutation p95 `0.4ms` but paint-gate p95 `78.6ms`, making the production
full-canvas screenshot the remaining owner. The adapter now keeps screenshot
pixel proof for entry and complete replacements. A tail update is permitted
only when every earlier candle is unchanged; it requires the exact series
data-change notification and two rendering opportunities before visible
completion.

## Measured Result

Reference workload: real local NQ, one pane, `5m`, ETH, 620 buffered source
bars, Chrome `1440x900`, 100 sequential foreground Next actions.

- provider request delta: `0`;
- adapter mutation p95: `0.3ms`;
- adapter paint p95: `29.0ms`;
- visible p95: `62.2ms`;
- visible p99: `66.1ms`;
- visible maximum: `84.8ms`.

Each action advances one source minute, updates or appends one aggregate tail,
retains the complete immutable Workspace snapshot, reapplies the existing
Viewport intent, and commits Replay only after the exact visible receipt.

## Gate

- safe-tail/full-replacement planning controls;
- missing series-change negative control;
- 100-sample real-browser latency and zero-fetch cadence;
- TF/Session-Hours atomic replacement, manual wall, history, and no-future
  browser regression;
- full V7 Harness suite and `git diff --check` before commit.

R5.6d next removes cache-hit status flashing and delays subtle dim feedback to
perceptible replacement misses.
