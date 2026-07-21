# Session — R5.6l Earlier-History Responsiveness

Date: 2026-07-21
Status: automated complete; fifth human review pending

## Root-Cause Measurements

A synthetic 12-chunk benchmark matching the screenshot scale projected 604,800
one-minute source bars into 961 `8h` candles in about 3.93 seconds. Phase timing
attributed approximately 452ms to repeated Raw Batch validation, 1.98s to
Session Hours conversion/filtering, and 1.40s to fixed-duration aggregation.

After the first local optimizations, the real rapid-drag browser regression
still observed a roughly 695ms event-loop gap. Projection no longer owned that
gap; one 35-day V4 JSON response was still parsed and normalized as one browser
task.

## Corrections

- Raw Bars and Raw Batches carry non-enumerable immutable validation brands;
  repeated contract crossings return the exact validated values.
- Session Hours removes per-bar result allocation; fixed aggregation skips
  redundant structural work only for branded Raw Bars.
- Modern New York exchange-wall conversion uses explicit post-2007 DST
  boundaries with spring/fall executable fixtures instead of per-bar `Intl`.
- Projection owns incremental earlier-history extension: it reprojects the new
  and oldest accepted boundary chunks, rebuilds a crossing aggregate bucket,
  verifies exact policy/source/cursor/request-key compatibility, and preserves
  the already accepted tail.
- The V4 adapter transports logical windows above seven days through contiguous
  chunks and yields the browser main thread between responses. Bar Data still
  receives one exact logical request, coverage report, and Raw Batch.

## Evidence

- the same 604,800-source-bar full Projection measures about `0.36s`; incremental
  extension at that accumulated-history scale measures about `60ms`;
- real Chrome rapid `8h` dragging coalesces eight quick gestures into two
  accepted history revisions and grows to 239 candles;
- both loads finish in about `1.68s`, with zero observed 200ms long task and a
  maximum 16ms-sampler interval of about `125ms`, versus the reproduced
  `695ms` stall;
- final uncached `12h` RTH is about `1.10s`; first `5m` about `123ms`;
  ETH→RTH about `60ms`; 100 aggregate Next actions measure p95 `52.7ms`, p99
  `59.7ms`, max `62.5ms`;
- all V7 Harnesses, including all three real-browser Harnesses, pass;
- `git diff --check`, V4 health, and V7 HTTP checks pass.

## Gate

Execute `docs/V7_R5_6_CORRECTIVE_REVIEW.md`, especially section 7. R6 remains
blocked until explicit fifth-review acceptance.
