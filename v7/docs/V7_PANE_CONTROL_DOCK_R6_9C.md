# V7 Pane Control Dock — R6.9c

Status: implemented; awaiting focused human visual review (2026-07-21)

## Accepted-Gate Follow-Up

The user accepted the combined R6.9/R6.9a/R6.9b Pane gate and requested one
placement correction: Maximize/Restore and Reset View must live at the lower-
right of each Pane Canvas, form a vertical stack, and avoid both chart scales.

R6.9c keeps the accepted interaction unchanged:

- Maximize/Restore remains the upper button and Reset View the lower button;
- the stack appears only while the Pane is hovered or has keyboard-visible
  focus; pointer focus and active-Pane state do not pin it after pointer exit;
- the stack is inset `76px` from the Pane right edge, clearing the adapter's
  `68px` minimum price scale, and `32px` above the bottom edge, clearing the
  time scale;
- single Pane still hides Maximize and exposes only its local Reset;
- Reset remains Pane-local and Maximize remains transient outer-DOM state.

The readout remains at the Canvas upper-left. No chart, Replay, Pane Layout,
Viewport, Bar Data, Session, persistence, or Workspace ownership changes.

## Gate

The Replay Layout browser Harness measures vertical order, horizontal
alignment, right and bottom safe insets, real pointer activation,
Maximize/Restore geometry, mounted chart preservation, and unchanged
Replay/Workspace revisions. It also physically clicks a Pane, verifies that it
becomes active, moves the pointer outside every Pane, then proves all control
docks hide while the active Pane remains unchanged. Updated fixed visuals cover
maximized, synchronized two-Pane, and mixed four-Pane states.

All 39 non-browser Harnesses and all 6 serial Chrome Harnesses pass. The visual
Harness waits for the short control transition and chart reflow before capture,
while retaining only a small allowance for browser anti-aliasing variance.

This is a visual-only correction and stops for focused human confirmation.
