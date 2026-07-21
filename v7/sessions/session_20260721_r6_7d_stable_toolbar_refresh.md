# Session — R6.7d Stable Toolbar During Candle Refresh

Date: 2026-07-21
Status: human-accepted

## Review Input

After accepting the RTH history correction, the user reported a minor visual
issue: the top toolbar flashed whenever candles refreshed, although foundation
operations remained usable.

## Delivered

- proved the toolbar was retained rather than remounted;
- separated transient transaction locks from intrinsic disabled states inside
  the Workspace UI boundary;
- preserved the ready-state appearance of only transiently locked controls
  while keeping their native disabled behavior;
- retained visible disabled treatment for genuinely unavailable controls;
- added a real-Chrome node-identity and mutation-time opacity regression.

## Evidence

- all 37 non-browser and five serial real-Chrome Harnesses pass;
- the Chrome mutation probe observes the real pending disabled-attribute
  changes while the toolbar node and eight representative opacity samples stay
  identical to their accepted ready-state values;
- the single-Pane gate records 100 Next samples at p95 `54.1ms`, p99 `73.1ms`,
  and max `87.2ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `57ms`, `137ms`, and `1264ms`;
- rapid history completes in about `1803ms`, with zero observed long task;
- architecture, source-quality, visual fixtures, and `git diff --check` pass.

## Next Review Boundary

Use Next, Play, TF switching, ETH/RTH switching, and history extension while
watching the top toolbar. It must remain visually steady while still rejecting
overlapping inputs during each atomic candle transaction.

The user explicitly reported acceptance on 2026-07-21 and approved proceeding
to R6.8 with a fixed bottom rail and centered capsule instead of an overlay.
