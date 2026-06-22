# Step 325: TradingView-Style Sliding Comparison Window

## Context

The current Comparison Window is still a floating MVP. It replaced old Split workflow technically, but the intended product shape is a TradingView-style sliding comparison window:

- the right edge stays fixed to the chart area;
- the left edge is dragged like a sliding window rail;
- dragging the left edge changes the visible clipped area, not the comparison chart's internal scale;
- candles, drawings, and overlays should not resize just because the left boundary moves.

## Goal

Replace the default floating Comparison Window interaction with a sliding/clipped comparison window that is anchored to the right side of the chart area.

## Non-goals

- Do not reintroduce old Split Screen.
- Do not remove floating mode persistence compatibility until sliding has real-use validation.
- Do not change comparison data loading, PDA/Segment/SMT/Order/Live overlay semantics.
- Do not implement Order Setup Optimal Exit / Max Profit Exit in this step.

## Step 325.1: Sliding Contract And Persistence Compatibility

Status: completed.

Update the comparison view contract so the default layout is `sliding`.

Required behavior:

- old saved `floating` workspaces still normalize safely;
- new/reset window defaults to a right-anchored sliding window;
- visible window state represents the left edge and visible width for sliding mode.

Result:

- Default comparison descriptor now uses `layoutMode='sliding'`.
- Reset/default visible window is right anchored by contract: `x=34`, `width=66`, `height=100`.
- Persistence normalizes missing/invalid layout mode to `sliding`, while existing saved `floating` workspaces remain accepted.
- Store and persistence smoke tests were updated for the new default.

## Step 325.2: Right-Anchored Sliding Layout

Status: pending.

Change the controller/CSS so sliding mode:

- positions the comparison shell with `right: 0`;
- uses the left edge as the drag handle;
- keeps the chart canvas internally full-width and right-aligned so dragging the left edge clips the visible area instead of rescaling chart content;
- disables old full-window drag for sliding mode.

## Step 325.3: Interaction Guards

Status: pending.

Ensure left-edge dragging:

- captures the pointer and stops propagation;
- does not trigger chart pan, crosshair, context menu, or selection;
- keeps buttons/selects usable;
- reset returns to the default sliding position.

## Step 325.4: Browser Verification

Status: pending.

Extend or add browser smoke for:

- Comparison Window default mode is sliding;
- old Split DOM remains absent;
- dragging the left handle changes the shell left edge while right edge remains fixed;
- the internal chart canvas width is not reduced to the clipped shell width;
- comparison chart still loads and renders nonblank pixels.

## Step 325.5: Docs And Closeout

Status: pending.

Update user-facing docs/TODO/session with the final behavior and note any retained floating compatibility.
