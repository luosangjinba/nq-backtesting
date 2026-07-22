# Session — R6.9a Pane OHLC And Crosshair Sync

Date: 2026-07-21
Status: awaiting human interaction and visual review

## Delivered

- strengthened active Pane focus with a bright `2px` blue boundary and
  Pane-local header tint;
- added compact O/H/L/C beside every Pane's symbol and timeframe;
- implemented the required selected/latest/empty OHLC rules for single and
  multi-Pane workspaces;
- added a Crosshair-only layout sync switch using official Lightweight Charts
  crosshair APIs;
- kept native hover independent from active focus while sync is off;
- prevented asynchronous programmatic crosshair callbacks from becoming new
  native sources by requiring the pointer to be physically inside the Pane;
- increased minimum Pane width to `280px` for header readability without
  changing the `120px` height floor;
- kept the entire interaction chart-presentation-only, with no Bar Data,
  Replay, Session, series-write, or Workspace transaction effects.

## Evidence

- `tests/lightweight-chart-adapter-browser-harness.js` covers current/latest
  lookup, negative missing/empty targets, native selection, blank fallback,
  and programmatic adapter APIs;
- `tests/replay-layout-workspace-browser-harness.js` covers active-border
  contrast, single-Pane OHLC, non-active native hover, sync-off isolation,
  same-TF sync, mixed-TF latest fallback, no feedback source, no Replay or
  Workspace revision, and deterministic visual fixtures;
- the official Lightweight Charts two-chart synchronization example confirmed
  the supported `subscribeCrosshairMove`, `setCrosshairPosition`, and
  `clearCrosshairPosition` path;
- all 39 non-browser and six serial real-Chrome Harnesses pass;
- the retained performance gate records Next p95 `62.1ms`, p99 `79.2ms`, and
  max `79.7ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `60ms`, `152ms`, and `1080ms`; rapid history records no observed long task;
- `git diff --check` passes.

## Review Boundary

R6.9a is an interaction and visual correction, so R6.9/R6.9a stops for explicit
human acceptance. Remaining R6.10 Symbol/Interval/Time/Date-range sync is not
part of this slice.
