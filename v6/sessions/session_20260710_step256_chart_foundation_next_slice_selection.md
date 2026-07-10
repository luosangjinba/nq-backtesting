# V6 Session - Step 256 Chart Foundation Next Slice Selection

Date: 2026-07-10

## Scope

Step 256 selected the next bounded chart-foundation slice after the Step 255
date-range/boundary/chart-entry regression pack.

This step did not change runtime behavior.

## Decision

Step 257 should implement Visible K-Line Latency Regression Pack.

## Rationale

V6 now has focused packs for replay/transport, multi-pane foundation behavior,
and date-range/boundary/chart-entry behavior. The next high-value pack is the
other V5 failure class from the roadmap: visible K-line delay.

Step 257 should collect the existing visible latency gates for cache-hit replay,
mixed timeframe replay, HTF manual next, HTF auto-play, replay-safe leftward
history latency, and the visible-latency domain contract.

## Verification

- `node v6/tests/chart-foundation-next-slice-selection-step256-smoke.js`
- `node v6/tests/date-range-boundary-entry-regression-pack-step255-static-smoke.js`
- `node v6/tests/product-direction-smoke.js`
- `node v6/tests/boundary-smoke.js`
- `git diff --check`

## Next

Step 257 should add and document the compact visible K-line latency regression
pack.
