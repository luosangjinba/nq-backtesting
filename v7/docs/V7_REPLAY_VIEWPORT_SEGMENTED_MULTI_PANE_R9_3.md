# V7 Viewport-Segmented Multi-Pane Replay — R9.3

Date: 2026-08-01
Status: implemented and executable; human acceptance pending

## Corrected Diagnosis

R9.2 removed repeated Pane projection, OHLC conversion, and interaction-index
construction, but human review still found visible delay. A Chrome sampling
profile exposed three remaining V7 multipliers before drawing: every child
Adapter rescanned roughly 7,200 candles to infer the same mutation, Prepared
Commit repeatedly traversed shared immutable subtrees, and every axis tick
constructed a new `Intl.DateTimeFormat`. More importantly, every `4h` Replay
advance still called Lightweight Charts `setData()` with the complete candle
history in every independent Pane.

FXReplay publicly says its charts use TradingView technology. TradingView's
Advanced Charts datafeed contract streams current/new bars through
`subscribeBars`; FXReplay's private implementation is not public, so use of
that exact internal path is an inference, not a fact. Lightweight Charts has a
different public contract: `setData()` replaces all series data and its docs
recommend `update()` for single-bar changes. A `4h` Replay step on a `1m` Pane
reveals about 240 bars, while 240 individual `update()` calls were measured and
rejected as substantially slower.

References:

- <https://www.fxreplay.com/?via=jtrades>
- <https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/datafeed-subscriptions/>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>

## Replacement Mechanism

The Chart Adapter now retains its accepted base CandlestickSeries and writes a
multi-bar Replay tail into immutable segments capped at 512 bars. A normal
`append-replace` updates the accepted boundary/latest candle and replaces only
the current bounded segment; jumps larger than the cap split into multiple
segments. Full history, timeframe, Session Hours, empty, and rollback paths
still perform their explicit complete replacement and remove orphaned segments
only after finalization.

Default follow mode makes only segments intersecting the current logical
viewport visible. Native drag, horizontal wheel, and explicit Pane time
location reveal every segment before historical interaction; Reset returns to
viewport-bounded rendering. Hidden segments retain their immutable data and
time points, so this is render virtualization rather than history deletion.
Crosshair accepts data from the primary or any segment, and Settings are
applied to all series through the sole Chart writer.

Exact same-transaction Panes also reuse one mutation proof and one future-axis
data value. Shared frozen subtrees retain a WeakSet proof after their first
complete immutability traversal, and one Time Presentation policy retains its
`Intl.DateTimeFormat`. The CPU profile reduced `sameBar`, time-part formatting,
and deep-freeze self time from about `326.8ms`, `259.6ms`, and `243.6ms` to
outside the top list, `32.7ms`, and `34.8ms` respectively across 32 profiled
four-Pane actions. Lightweight Charts and Canvas work now dominate the profile.

Native Lightweight Charts panes were not adopted: they share one horizontal
time scale and stack vertically, which cannot preserve V7's arbitrary grid,
independent timeframe, and independent Viewport semantics.

## Binding Evidence

The latency Harness now records mutation-to-DOM visibility inside the browser;
the former 25ms polling remains only outside the timed interval. Sixty-four
`4h` actions per layout ended at 14,180 bars per Pane with 62 warm-cache actions,
two bounded provider misses, only `append-replace` mutations, and no browser
error:

| Panes | warm p50 | warm p95 | active Pane p50 | Chart apply p50/p95 |
|---:|---:|---:|---:|---:|
| 1 | `44.9ms` | `64.8ms` | `41.0ms` | `24.3/35.4ms` |
| 2 | `53.9ms` | `81.1ms` | `49.3ms` | `31.7/49.9ms` |
| 4 | `78.1ms` | `126.5ms` | `71.9ms` | `53.0/91.5ms` |

H082 fails closed above a four-Pane warm p50 of `100ms`, p95 of `175ms`, an
active-Pane p50 of `95ms`, a Chart-apply p50 of `70ms`, or excessive Pane-count
growth. The focused segment Harness binds 512-bar caps, oversized-step splits,
viewport visibility, manual reveal, rollback, full replacement, cleanup, and
data-change observation. Existing real-Chrome Adapter evidence binds atomic
rollback, future whitespace, Crosshair, Settings, and native interaction.

R9.2 numbers included external polling delay, so this page-timed series is the
new binding baseline rather than a mathematically direct comparison.

All 81 repository Harnesses were covered on the final production tree. The
loaded aggregate sweep recorded one screenshot-range sample at logical
`from=15.217`; an immediate isolated rerun passed at `from=13.389`, with
normal-action p95/max `63.9/75.3ms`, rapid-history latency `418.1ms`, and no
semantic failure. An earlier pre-final sweep also recorded one `415.2ms`
timeframe-switch sample whose isolated rerun passed. Both are retained as
environment-load outlier disclosures rather than silently discarded.

## Human Gate

After a hard reload, rapidly click `4h` Next in one, two, and four Panes. Verify
that the active and secondary candles follow the click comfortably, no Pane
appears late or diverges, dragging into older replayed candles shows complete
history, and Reset returns immediately to the latest wall. Automated evidence
does not grant this acceptance.
