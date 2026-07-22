# Session — R6.9c Pane Control Dock

Date: 2026-07-21
Status: awaiting focused human visual review

## Delivered

- separated the upper-left Canvas readout from the Pane-local control dock;
- moved Maximize/Restore and Reset View to the Canvas lower-right;
- stacked Maximize/Restore above Reset View;
- reserved a `76px` right inset and `32px` bottom inset so the controls do not
  cover the Lightweight Charts price or time scales;
- preserved hover/focus reveal, real pointer activation, Pane-local Reset,
  transient maximize, mounted chart hosts, and exact layout restoration.

## Evidence

- the Replay Layout browser Harness measures vertical stacking, scale-safe
  insets, actual mouse clicks, exact restore geometry, and zero Replay/Workspace
  revisions;
- updated `1440×900` fixtures cover maximized and multi-Pane output;
- all 39 non-browser Harnesses pass;
- all 6 serial Chrome Harnesses pass, including chart adapter, layout,
  multi-Pane RTH history, Pane Workspace, Replay Workspace performance, and
  Session Browser gates;
- the Replay Workspace latency gate retained `0ms` maximum long-task evidence
  during rapid history loading in the final run.

## Review Boundary

R6.9c changes only visual placement and therefore stops for focused human
confirmation before R6.10 begins.
