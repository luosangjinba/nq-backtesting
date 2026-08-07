# V7 Cache, Latency, And Atomic Refresh Contract

Status: binding foundation interaction standard (2026-07-19)

## Measurement Classes

Latency is measured from accepted foreground-browser input to browser-visible
completion. Production builds use `performance.now()` and report at least 100
representative samples with p95, p99, and maximum. Machine, browser, pane count,
loaded-bar count, cache class, and provider delay are recorded with results.

Provider/network time is not hidden inside local-runtime latency. A cache miss
is measured as:

```text
feedback latency + observed provider latency + post-response visible latency
```

Provider requests also have a declared failure deadline (3,000 ms in the
foundation reference contract). The deadline ends an unavailable request; it
is not an artificial delay and does not define acceptable normal performance.

No production path introduces a synthetic delay. Simulated delay exists only
in deterministic reordering/cancellation harnesses.

The machine-readable thresholds are in `v7-cache-latency-contract.json`.
Thresholds are regression gates, not permission to intentionally wait until the
limit.

## Manual Next And Auto Replay

Warm-cache Manual Next targets imperceptible visible completion: p95 at 100 ms,
p99 at 150 ms, and no accepted foreground sample above 250 ms on the declared
reference workload. Cursor, bars, wall movement, and control completion are one
visible transaction.

A `4h` Replay step on a `1m` Pane is a separate bulk-reveal workload: one input
admits up to 240 intermediate candles rather than one latest candle. It retains
the original Chart-commit budget, but binds end-to-end warm-cache p95 at 250 ms,
p99 at 350 ms, and maximum at 500 ms over at least 128 samples. Provider time is
still reported separately. See `V7_REPLAY_FOUR_HOUR_CAP_AND_LATENCY_R9_1.md`.

Auto Replay uses exactly the same advancement transaction. It never overlaps
advances, samples one bar per step interval, skips intermediate bars, or races
to catch up. If data is unavailable, playback waits behind a bounded refresh
gate; it does not move the cursor invisibly. Active-tab scheduler drift is
measured separately from projection/application work.

R12.5 additionally binds the cloud hot path. The standalone production DuckDB
is immutable for one active market-data service/runtime lifetime. Its
authoritative revision is discovered once per provider/instrument/source scope
and remains in the Provider Execution revision cache until disposal or an
HTTP 409 invalidates it. Replacing the external database requires a service
restart/redeployment; warm Replay never polls health to discover an
out-of-contract replacement.

After revision discovery and acquisition of the accepted forward coverage, a
warm Manual Next or Autoplay advance performs zero market-data network
requests. Crossing a coverage wall remains a separately measured cache miss.
Dataset revision remains part of every raw and projected cache identity, so a
detected mismatch cannot reuse evidence from another database.

Autoplay uses start-to-start cadence without overlap. It subtracts the
completed transaction duration from the selected cadence and schedules one
successor with the non-negative remainder. It accumulates no missed deadlines,
skips no bars, and creates no catch-up burst. See
`V7_CLOUD_REPLAY_HOT_PATH_R12_5.md`.

## TF And ETH/RTH Refresh

On a TF or ETH/RTH intent:

1. retain the last accepted candles and viewport;
2. enter the dimmed/stale refresh state within the feedback budget;
3. acquire raw bars only when cache coverage is insufficient;
4. project the complete target snapshot;
5. atomically replace the pane/workspace once;
6. remove the refresh state only after browser-visible completion.

The replacement request anchors its left-context plan to the Session entry,
not to a moving Replay cursor. If that entry context is wholly outside RTH, the
same request crosses the close/weekend and includes prior eligible minutes;
the forward buffer may still contain later bars, but no-future Projection keeps
them hidden. The stable entry anchor also preserves one exact request identity
for Manual Next while the cursor remains inside the accepted 500-minute
forward window.

A projection replacement must also plan against the retained semantic
Viewport before acquisition. For a manual wall, the target is the display-bar
count required to cover its `spanBars`, latest-bar offset, 24-bar left buffer,
and eight-bar safety allowance. The programmatic replacement must not commit a
small series and wait for a later native mouse/wheel event to discover the
negative logical gap.

Sub-hour replacements acquire one raw window sized for that target. When a
`1h`–`12h` or calendar target exceeds the bounded raw entry window, Bar Data concurrently
acquires compact projected context before the authoritative raw tail;
Projection/Pane composition merges them into one separately provenanced
snapshot and Chart Runtime still performs one visible replacement. Raw entry
planning uses the sparser RTH calendar for both ETH and RTH so their raw request
identity remains shared; Session Hours Projection alone decides visibility.

The chart never clears to an empty series and never exposes a partially rebuilt
target. A cache hit has an end-to-end budget. A cache miss has an immediate
feedback budget and a separate post-provider-response budget.

A complete-Pane transaction may issue a smaller ordinary navigation request
for an unchanged non-target Pane, including while another Pane receives
explicit time-location history. If that request is already fully covered by
the Pane's ordered accepted raw batches under the exact same raw source scope,
Pane composition retains the wider accepted source wall. The narrower acquired
batch must not discard valid visible history or collapse a dense manual
Viewport. This is accepted projection-input retention only: Bar Data keeps its
exact-window request/cache identity, and target history still uses the normal
bounded acquisition path.

The accepted toolbar subtree and its visual opacity remain stable across that
refresh boundary. Transaction-conflicting inputs may be functionally locked,
but the lock must not produce a toolbar flash; intrinsically unavailable
controls retain their disabled presentation.

## Earlier-History Extension

Visible-range proximity is only an explicit request trigger. Correctness never
depends on another wheel, mouse, resize, or retry event.

Earlier history uses one user-intent-sized logical request and one visible
commit. Pointer release publishes the final drag wall immediately. A held drag
or wheel burst publishes after the logical range has remained stable for 500
ms; this is input coalescing, not an artificial provider delay. Repeated
boundary notifications while a history transaction is active are discarded
instead of becoming a delayed continuation with an unclear trigger.

At that boundary the history owner measures the actual negative logical gap
and targets enough display bars to move the left endpoint through logical index
`24`, with an eight-bar boundary safety allowance and a 240-display-bar
minimum. The request planner counts eligible fixed-duration display buckets
under the selected ETH/RTH policy rather than treating wall-clock minutes as
candles. It therefore plans the complete Canvas fill before acquisition begins
instead of exposing a sequence of fixed-size chart updates.

One drag may produce at most one Workspace revision, one Projection result,
and one complete chart `setData()` replacement. There is no post-commit
automatic history continuation. If real source coverage is exhausted, the
accepted result stops there; the runtime does not loop, synthesize candles, or
wait for mouse movement to repair an unfinished transaction.

Acquisition has two explicit Bar Data-owned tiers:

- display timeframes below `1h` retain the exact raw-`1m` history path, including
  its 210-day safety bound and invisible seven-day transport partitioning;
- `1h` through `12h` and `1D`/`1W`/`1M` use the read-only V4 projected-history service for left
  chart context, including pre-commit projection replacements whose dense
  retained Viewport exceeds the raw entry window. The service filters the
  immutable `1m` source under the exact ETH/RTH schedule and aggregates on
  V7's real-instant fixed grid before returning one compact projected batch. A
  single request may cover up to twenty-five years, so a screenshot-scale
  high-timeframe gap does not become dozens of foreground raw transfers.

Projected context has a separate, bounded cache identity containing instrument,
timeframe, alignment kind/policy, nullable fixed duration, ETH/RTH mode,
calendar revision, aggregation revision, window, provider, and dataset revision. Its provenance is attached separately
to the Pane snapshot. It never enters Replay source traversal or impersonates
raw `1m` evidence; lower-timeframe navigation still acquires the authoritative
raw bars when needed.

A raw timeframe-aware nominal window is retained when it contains any eligible
source minute. If the whole nominal window falls inside an RTH close, the
request planner expands that same request backward until it contains up to 240
eligible source minutes or reaches the 35-day foreground cap. Overnight and
weekend closures therefore require one accepted request rather than repeated
empty requests. The provider still returns only real source bars; the planner
does not synthesize bars, start a recursive foreground chain, or move Replay.
If no earlier eligible data exists within the hard cap, the accepted Pane and
its canonical manual Viewport remain unchanged.

Bar-by-bar and block-by-block visible history repair are forbidden for one
history intent. Network transport may remain internally partitioned, but those
parts cannot become separate Workspace or chart commits.

Raw history projection cost must not grow with every already accepted raw chunk.
Projection reprocesses the new logical window plus one adjacent boundary
window and owns the aggregate-boundary/tail merge. A large logical V4 request
may use smaller contiguous seven-day transport chunks. One adapter-wide
two-transfer pool overlaps local I/O, each response is normalized
independently, and the adapter yields before returning one validated Raw Batch
under the original exact request identity. Transport chunking is responsiveness
policy, not new cache, Workspace, Chart, or Replay identity.

Both acquisition tiers retain the accepted Canvas at full opacity while the single
snapshot is prepared. It never enters the delayed dimmed/stale presentation;
TF and ETH/RTH replacements retain their separate refresh feedback.

The official Lightweight Charts infinite-history pattern confirms that visible
logical-range subscriptions and `barsInLogicalRange` can trigger proactive
history requests. `setData` supports whole ordered snapshot replacement;
`update(..., historicalUpdate)` handles one older point and is documented as
slower than latest-point update. The library exposes no bulk-prepend API. V7
therefore owns the single logical request, transaction, and visibility
semantics while the chart callback remains only an intent trigger.

## Raw Bar Cache

Only Bar Data Runtime owns raw cache entries and in-flight request coalescing.
The cache is independent of active Session state. Its complete identity contains
provider, instrument, source resolution, bounded window, and dataset revision.

Raw cache may hold bars beyond the Replay cursor for responsiveness; Projection
still enforces no-future visibility. Cache contents never advance Replay or
write Chart state. Bounded eviction affects performance only, not correctness.

The one-pane foundation quantizes ordinary foreground coverage into bounded
500-source-minute windows. Replay steps above `1h` instead derive a 64-step
forward wall from their registered duration; `4h` therefore requests at most
15,360 source minutes per quantized wall, still below the existing 35-day hard
ceiling. Chart entry acquires only the first ordinary window, not the Session
range, and changing the selector performs no prefetch. Session-aware left
context stays anchored to entry. Manual Next and projection replacements reuse
the exact Bar Data identity while the target remains covered; crossing a
boundary acquires a new bounded window. Future raw bars remain invisible until
the exclusive Replay cursor admits them.

Replay prefetch maintains contiguous raw coverage ahead of the cursor using
high/low watermarks and provider request limits. TF and ETH/RTH reuse compatible
raw coverage and re-project it; they do not require duplicate network requests
for each display mode.
