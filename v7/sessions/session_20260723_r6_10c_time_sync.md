# Session — R6.10c Time Layout Sync

Date: 2026-07-23
Status: executable; human interaction review pending

## Delivered

- recorded human acceptance of R6.10b Symbol/Interval synchronization;
- added the real Time switch with the reviewed off default and durable per-
  Session restoration;
- mapped a later ordinary source-chart click to the same semantic time and
  horizontal ratio in every other visible Pane;
- retained each target's own zoom span, instrument, timeframe, and data;
- captured accepted target ranges through Viewport without moving Replay or
  committing Pane Workspace;
- bounded missing target history to a no-op and supported accepted cursor time
  inside the latest calendar-aligned aggregate;
- suppressed Time while replay truncation selection owns the click.

## Defect Closed During The Slice

The first real-browser test revealed that an ordinary click was also treated as
drag completion. Its delayed history-boundary check could replace target state
immediately after a valid Time projection. Pointer-up now captures manual
Viewport state or asks for earlier history only after real pointer
displacement; wheel behavior remains unchanged. The displacement-based gate
deliberately avoids waiting for Lightweight Charts to publish a logical-range
update before a rapid drag ends.

## Reference Decision

Official Lightweight Charts click and logical-range APIs provide the correct
native observation and application surfaces. V7 adds a small adapter-owned
semantic projection because the library's visible-time range setter clamps to
data and the audited ecosystem does not own V7 Viewport intent or Replay
isolation.

## Automated Evidence

- projection helper tests cover exact/interpolated epochs, missing past,
  calendar aggregates, and strict invalid inputs;
- chart-adapter browser tests prove retained target span/ratio and Viewport
  capture;
- Pane-set tests prove off-by-default, target-only fan-out, and truncation
  suppression;
- Replay Layout Workspace browser tests prove Time-off no-op, same/mixed-TF
  projection, unchanged Replay/Workspace revisions, durable re-entry, and
  updated visual baselines;
- full architecture/module/source-quality/Harness and `git diff --check` gates
  pass before commit.

## Next Boundary

Stop for human review. R6.10d Date-range synchronization remains absent until
this Time interaction is accepted.
