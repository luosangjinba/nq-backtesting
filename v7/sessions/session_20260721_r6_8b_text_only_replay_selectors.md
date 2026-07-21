# Session — R6.8b Text-Only Replay Selectors

Date: 2026-07-21
Status: human accepted

## Decision Input

The user requested that Replay playback speed and step match the TradingView
reference: plain text values without right-side dropdown arrows. The reference
also places speed before step.

## Delivered

- removed native dropdown chrome and reserved arrow space from both selectors;
- ordered the visible values as Autoplay speed then Replay step;
- preserved native select semantics, click behavior, and keyboard access;
- removed the visible `Sync timeframe` caption while preserving its accessible
  name, tooltip, and switch behavior;
- updated the single/multi-Pane visual fixtures and added computed-style and
  DOM-order browser assertions.

## Evidence

- the real-Chrome Workspace Harness observes `appearance: none` and selector
  order `speed, step`;
- the updated `1440×900` fixture visibly shows compact `1× 1m` text with no
  dropdown arrows;
- existing Replay selection behavior remains covered by the focused browser
  Harnesses;
- all 38 non-browser and five serial real-Chrome Harnesses pass;
- the retained performance gate records Next p95 `61.2ms`, p99 `66.5ms`, and
  max `71.6ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `74ms`, `141ms`, and `1207ms`; rapid history records zero observed long task;
- `git diff --check` passes.

## Next Review Boundary

The user accepted R6.8/R6.8a–b on 2026-07-21 and explicitly confirmed that
ETH/RTH must remain Session-wide across all Panes, including mixed instruments,
because every Pane shares one time clock. R6.9 is now the exact next step.
