# V7 Stable Toolbar During Candle Refresh — R6.7d

Status: human-accepted (2026-07-21)

## Reproduction

Advance or otherwise refresh candles while the chart is ready. The chart
operation succeeds, but the complete top toolbar briefly dims and restores,
appearing to flash.

## Cause

The toolbar was not remounted. At transaction start, the UI correctly disabled
conflicting inputs; existing `:disabled` rules changed every control's opacity
from `1` to `0.58`. The atomic transaction then restored the controls, so even
a fast cache-hit refresh produced a visible opacity pulse.

## Correction

The Workspace UI now labels only controls disabled by a transient transaction
lock. Those controls remain disabled and cannot queue conflicting work, but a
toolbar-scoped rule preserves their accepted visual opacity. Intrinsic disabled
states—unavailable capability, Session completion, playback state, or a fixed
single instrument—remain distinct and retain disabled presentation.

No Replay, Pane, transaction, Chart, or Bar Data owner changed. Delayed stale
feedback can still dim accepted candles when appropriate; it no longer changes
toolbar opacity.

## Gate

A real-Chrome mutation probe keeps the original toolbar node, observes the
actual disabled-attribute changes during Next, and compares eight representative
control opacity samples against their pre-refresh values at every mutation.
Every sample must remain identical while the transaction still completes and
the established latency/performance gates remain green.

All 37 non-browser and five serial real-Chrome Harnesses pass. The retained
performance gate records Next p95 `54.1ms`, p99 `73.1ms`, max `87.2ms`,
ETH→RTH `57ms`, `5m` `137ms`, `12h` RTH `1264ms`, and zero observed long task
during rapid history loading.
