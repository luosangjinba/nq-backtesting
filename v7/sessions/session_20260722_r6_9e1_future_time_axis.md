# Session — R6.9e1 Future Time-Axis Continuity

Date: 2026-07-22
Status: human accepted

## Delivered

- carried fixed timeframe duration through Projection provenance;
- added one adapter-owned, non-rendering whitespace series with 256 future
  time slots per fixed-duration Pane;
- kept the canonical candle series and Pane bar count unchanged;
- preserved the latest-real-candle Viewport index, Replay no-future cutoff,
  OHLC/Crosshair rules, truncation selection, and history ownership;
- included future time-axis points in atomic visible rollback;
- left calendar-aligned future-slot policy explicitly inactive.

## Evidence

- official Lightweight Charts whitespace data was selected instead of a custom
  axis renderer;
- Projection Domain and real Lightweight Chart Adapter Harnesses pass;
- the adapter browser Harness proves native future coordinates lie to the
  right of the latest candle and future Crosshair retains latest real OHLC;
- the complete Replay Pane Workspace browser Harness passes and its updated
  dual-Pane fixture visibly shows future `1m` and `4h` labels;
- Replay Autoplay remains within the existing three-second browser bound.

## Human Acceptance

Verify future time labels on low/high TFs and ETH/RTH, drag into the future
whitespace and back, and confirm no future candle or OHLC appears. This visible
slice was explicitly accepted by the user on 2026-07-22.
