# Session — R6.9l Canvas Settings

Date: 2026-07-22
Status: awaiting human interaction and visual review

## Delivered

- advanced global Workstation Settings to schema version 5 with deterministic
  version-1/2/3/4 migration;
- activated solid background, shared Grid, rich shared Crosshair, scale text,
  and top/bottom price margins through native chart options;
- retained truncation's temporary blue Crosshair and restored the committed
  user Crosshair when truncation exits;
- activated hover/always/hidden presentation for the existing Pane-control
  dock;
- routed right-margin bars through a separate Viewport Settings consumer as the
  future/new-Pane and explicit Reset View default;
- preserved existing manual walls, Replay/Workspace/Pane state, bars,
  series-data, and chart-visible receipt revisions.

## Reference Decision

Official Lightweight Charts 5.2 options already cover the bounded Canvas,
Crosshair, layout, and price-margin surface. The awesome-tradingview ecosystem
catalog showed no owner-compatible replacement needed by this slice, so R6.9l
adds no new chart plugin or dependency.

## Automated Evidence

- Settings Harness covers strict fields, prior-version migration, defaults,
  and transactional Viewport consumer rollback;
- real Lightweight Charts Harness covers native option mapping, no series-data
  write, and truncation Crosshair restoration;
- Viewport Harness covers manual-wall preservation and Reset's new default;
- Pane Workspace browser Harness covers the Canvas dialog, draft semantics,
  current/future Pane inheritance, hard reload, another Session, manual-wall
  preservation, and explicit Reset;
- source-quality, architecture, full Harness, visual-baseline, and diff checks
  pass before commit.

## Human Review Boundary

Review the Canvas background, Grid, Crosshair color/opacity/width/style, scale
text color/size, top/bottom margins, Pane-control visibility, and right-margin
Reset behavior in single and multi-Pane layouts. Confirm a Settings Save does
not move a manually positioned wall, but Reset View uses the saved right-margin
default. Stop at this visual/interaction gate before R6.9m shared time
presentation.
