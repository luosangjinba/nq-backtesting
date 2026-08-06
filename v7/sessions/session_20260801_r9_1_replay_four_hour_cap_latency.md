# Session — R9.1 Replay Four-Hour Cap And Latency

Date: 2026-08-01
Status: implemented; human acceptance pending

## Request

Match the observed FXReplay product boundary: Replay choices stop at `4h`;
display timeframes may remain higher, but Sync timeframe caps Replay at `4h`.
Tune `4h` Replay so rapid Next input no longer suffers the recurring delay seen
above `1h`.

## Baseline

The new real-Chrome harness ran 100 `4h` Next actions on an NQ `1m` Pane ending
at 22,160 displayed bars. It recorded full replacement on every action, 51
provider requests, warm-cache p95 about `331ms`, and cache-miss p95 about
`898ms`.

A tested attempt to call Lightweight Charts `series.update()` once for each of
the 240 admitted `1m` bars regressed adapter p95 to about `195ms`; it was
discarded before closure. The final path uses one ordered `setData()` append
replacement and the same two-frame series-change proof used by safe latest-bar
updates.

## Delivered Boundaries

- Replay capability registration ends at `4h`; display registration remains
  unchanged through `12h` plus calendar timeframes.
- Sync timeframe selects the exact registered step or the maximum registered
  step as a generic fallback.
- Bar Data forward walls stay at 500 source minutes through `1h`; larger Replay
  steps use 64 duration-derived steps, bounded by the existing request ceiling.
- Exact accepted raw-window identity reuses its already-validated immutable
  batch; contained coverage still reconstructs and validates.
- Projection-issued snapshots carry an unforgeable in-process identity so Chart
  application does not normalize their complete historical prefix twice.
- Chart data conversion reuses the identical immutable prefix, and multi-bar
  forward reveal performs one append replacement.
- The separate 128-sample four-hour bulk-reveal contract and H080 were added.

## Evidence

The final 128-sample Chrome run ended at 28,100 bars with 125 cache hits and
three provider requests. Warm-cache p50 was `125.8ms`, p95 `210.8ms`, p99
`261.6ms`, and maximum `270.3ms`. Chart apply p95 was `84.5ms`, p99 `94.9ms`,
and maximum `102.9ms`. Every action used `append-replace`; no browser errors
occurred.

Focused Bar Data, Raw Coverage Lease, Projection, Chart Snapshot, Replay step,
Lightweight Chart, Replay Workspace, and Pane Workspace gates pass. The latter
now exercises a `12h` active Pane with Sync timeframe and observes Replay `4h`
without a cursor or enable-time Workspace transaction.

Production architecture remains clean at 49 modules, 125 dependency edges,
115 construction sites, and nine writer sites. Current source evidence is 314
files, 24,107 effective lines, 2,572 functions, and 310 public exports, with no
source-quality finding.

## Human Gate

Hard reload, select Replay `4h` on a `1m` Pane, and rapidly click Next for a
sustained sequence. Verify the old recurring pause is gone, the selector stops
at `4h`, and enabling Sync timeframe on a Pane above `4h` keeps Replay at `4h`
without moving the cursor.
