# Session — R6.9c Pane Control Dock

Date: 2026-07-21
Status: human accepted after the hover-dismissal correction

## Delivered

- separated the upper-left Canvas readout from the Pane-local control dock;
- moved Maximize/Restore and Reset View to the Canvas lower-right;
- stacked Maximize/Restore above Reset View;
- reserved a `76px` right inset and `32px` bottom inset so the controls do not
  cover the Lightweight Charts price or time scales;
- preserved pointer-hover/keyboard-visible-focus reveal, real pointer
  activation, Pane-local Reset, transient maximize, mounted chart hosts, and
  exact layout restoration.

## Review Correction

The focused review found that clicking a Pane left its chart host focused, so
the broad `:focus-within` visibility rule kept that active Pane's controls
visible after pointer exit. Visibility now uses actual Pane hover or
keyboard-visible focus. A pointer-selected Pane remains active when the pointer
leaves, but every control dock hides until hovered again; clicking elsewhere in
the application retains the same correct behavior.

## Evidence

- the Replay Layout browser Harness measures vertical stacking, scale-safe
  insets, actual mouse clicks, exact restore geometry, and zero Replay/Workspace
  revisions;
- a real pointer sequence proves hover-visible, click-to-activate,
  pointer-exit-hidden, and unchanged active-Pane state;
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
