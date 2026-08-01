# V7 Replay Multi-Pane Latency — R9.2

Date: 2026-08-01
Status: implemented and executable; human acceptance pending

## Reported Boundary

Single Pane had no perceptible Next-to-candle delay. Delay began only after
entering Multi-pane and increased with Pane count. This supersedes the earlier
assumption that the remaining issue was only the `4h` Replay step itself;
R9.1 remains the cap/bulk-reveal foundation, while R9.2 owns the Multi-pane
correction and its separate human gate.

## Reproduced Baseline

The same real-Chrome `4h`→`1m` workload ended at 7,220 displayed candles per
Pane. Across 32 actions, warm-cache visible p50 increased from about `70.2ms`
for one Pane to `104.6ms` for two and `181.8ms` for four. Four-Pane p95 was
about `306.7ms`. The result reproduced both parts of the report: there was no
Single-Pane regression, and Multi-pane cost grew with Pane count.

`Promise.all()` did not make this work parallel. Projection, immutable-array
construction, Chart-data conversion, Lightweight Charts mutation, and the two
interaction indexes all execute synchronously on the browser main thread.

## Correction

- One transaction-scoped memo reuses Projection output only when transaction
  identity, accepted immutable bars, capability selection, projection kind,
  and every raw request key match exactly. The result is rebranded for the
  destination Pane while retaining the same immutable bars identity.
- One Pane-set Chart stage converts a shared immutable bars array to Lightweight
  Charts OHLC data once. Independent Pane charts still perform their own
  visible `setData()` mutation and retain the global atomic paint gate.
- Crosshair presentation and Replay truncation selection now share one
  read-only sorted-bars index. Exact-time lookup is binary, so accepting a new
  Replay snapshot is O(1) rather than rebuilding two full Maps per Pane.
- Append replacement updates the maximum display-gap diagnostic from only the
  changed tail rather than rescanning all accepted Chart data.

An experimental 240-call `series.update()` path was again slower and was
discarded. R9.2 retains the official bulk `setData()` path and does not defer
secondary Pane visibility, weaken no-future filtering, or publish a partial
Pane set.

## Executable Evidence

The binding harness runs 64 actions each for one, two, and four identical
`1m` Panes under a `4h` Replay step. The final run ended at 14,180 candles per
Pane and recorded 62 warm-cache samples plus two provider misses in each
profile:

| Panes | warm p50 | warm p95 | Chart-apply p95 |
|---:|---:|---:|---:|
| 1 | `85.6ms` | `129.4ms` | `53.0ms` |
| 2 | `102.0ms` | `166.6ms` | `81.3ms` |
| 4 | `150.0ms` | `273.1ms` | `166.1ms` |

Two Panes add about `16.4ms` to the Single-Pane median. Four Panes add about
`64.4ms` despite ending with roughly twice the candles of the reproduced
baseline. All Panes ended with identical bar counts, every action remained one
`append-replace`, and no browser error occurred.

H081 fails closed on warm-sample count, identical Pane bar counts, mutation
mode, two-/four-Pane median growth, sustained four-Pane visible latency, and
four-Pane Chart-application latency. Automated evidence does not grant the
required interaction acceptance.

## Human Gate

After a hard reload, open the same Session and test rapid `4h` Next sequences
in Single Pane, two Panes, and four Panes. Confirm entering two Panes no longer
introduces the prior obvious press-to-candle delay and that four Panes is
materially improved without any Pane revealing late, skipping bars, or
diverging from the others.
