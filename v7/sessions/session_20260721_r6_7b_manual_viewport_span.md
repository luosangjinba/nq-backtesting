# Session — R6.7b Manual Viewport Span Preservation

Date: 2026-07-21
Status: human-accepted after R6.7c–d follow-up corrections

## Review Input

The user found that rapid RTH history dragging made candles abnormally wide and
blocked further dragging. Mouse-wheel zoom temporarily restored movement, while
switching to one Pane left a large blank region until additional irregular
movement triggered history.

## Delivered

- reproduced the failure with the manual span collapsed from about 80 bars to
  `7.39` bars in both Panes;
- changed only the Lightweight Charts transient logical-range planner so a
  left-clamped manual range translates without shrinking;
- preserved intentional native zoom and left the default-wall fallback
  unchanged;
- extended the exact RTH browser gate through rapid alternating input,
  two-to-one Pane replacement, and first-drag history continuation.

## Evidence

- all 37 non-browser and five browser Harnesses pass serially;
- the exact RTH regression records the pre-fix collapse at `7.39` bars, then
  proves rapid two-Pane input, a usable post-fix span, two-to-one preservation,
  first-drag history extension, and ETH recovery;
- the single-Pane gate records 100 Next samples at p95 `62.4ms`, p99 `75.5ms`,
  and max `99.2ms`; ETH→RTH, `5m`, and `12h` RTH replacements measure about
  `66ms`, `153ms`, and `922ms`;
- rapid history takes about `1828ms` with no observed long task;
- visual fixtures, architecture boundaries, source quality, and
  `git diff --check` pass.

## Next Review Boundary

Repeat rapid RTH dragging without wheel repair, switch directly to one Pane,
and drag once toward history. Candle width should remain usable and history
must extend immediately. The review retained the stable span but found that a
240-wall-minute request at `09:30` could cross only part of the RTH closure.
R6.7c owns that separate request-planning correction; R6.8 remains blocked
until the combined gate is accepted.
