# Session — R6.8 Fixed Bottom Replay Transport

Date: 2026-07-21
Status: implementation complete; awaiting human interaction and visual review

## Decision Input

The user approved the recommendation to use a fixed bottom rail with a centered
visual capsule rather than a free or overlaying floating control. The choice
protects multi-Pane geometry and hit testing while retaining a lightweight
FXReplay-like visual treatment.

## Delivered

- removed Replay navigation/step/playback controls from the top toolbar;
- added one `38px` Workspace rail outside the Pane grid with a centered
  `32px` capsule and retained left/right footer context;
- combined Play and Pause into one honest stateful control;
- added `0.5×/1×/2×/5×` completion-driven speed selection, defaulting to `1×`;
- changed scheduled speed without overlapping or moving the current atomic
  Pane transaction;
- kept Reset View, Restart, Go to, and Local in the top toolbar;
- updated single- and mixed-multi-Pane fixed visual fixtures.

## Evidence

- all 37 non-browser and five serial real-Chrome Harnesses pass;
- deterministic cadence evidence covers all four speeds, live rescheduling,
  in-flight selection, Pause, completion, and invalid values;
- Chrome proves the footer begins after the Pane grid, the capsule is centered,
  no Replay transport control remains in the top toolbar, and the single-Pane
  Chart host remains `800px` high at `1440×900`;
- mixed NQ/ES and `1m/4h` Panes execute at least three `5×` steps atomically;
- exact Session-end navigation keeps Previous and Replay-step recovery enabled
  while forward, playback, and speed controls honestly disable;
- Next p95 is `58.1ms`, p99 `70.7ms`, and max `72.3ms`; ETH→RTH, `5m`, and
  `12h` RTH replacements measure about `45ms`, `160ms`, and `1044ms`;
- rapid history completes in about `1778ms`, with zero observed long task;
- architecture, source quality, node/opacity continuity, all visual fixtures,
  and `git diff --check` pass.

## Next Review Boundary

Review the fixed bottom rail in single and two-Pane modes. Verify Previous,
Next, Replay step, all four speeds, continuous Play/Pause, TF and ETH/RTH
changes, and history extension. The rail must never cover a chart or move with
Pane focus. R6.9 remains blocked until this interaction and visual gate passes.
