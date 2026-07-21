# Session — R6.2 Replay × Pane Response Contract

Date: 2026-07-21
Status: automated complete; no browser-visible change

## Boundary

Activated `core.replay-pane-response-contract` as a pure planning boundary over
the existing Replay, Pane Workspace, Viewport, and Session Hours contracts. It
does not add a cursor writer, transaction runtime, chart writer, I/O path, or
browser surface.

## V6 Re-Derivation

The targeted audit retains V6's accepted Previous replacement, shared cursor
materialization, Autoplay-through-Next, quick GoTo anchors, complete forward
GoTo range, Session-scoped ETH/RTH, primary-symbol clock authority, missing-bar
tolerance, and pane-local Viewport behavior.

The historical V6 target-Pane-only Next/Autoplay implementation is not carried
forward because it cannot represent a single atomic V7 workspace revision.
V6 has no accepted Economic Calendar implementation; that feature is deferred
as an optional business module over Exact GoTo and a future marker port.

## Contract

- all Replay/navigation actions affect every visible Pane in stable order;
- active focus never narrows Replay scope;
- Manual Next and Autoplay resolve the next eligible primary-source step;
- Manual Previous and Restart/Back-to replace visibility through an earlier
  cutoff rather than deleting a rendered candle;
- quick GoTo covers all five accepted V6 New York anchors;
- exact GoTo accepts a Session-range cutoff and plans forward, backward, or
  retain behavior;
- forward jumps require the complete interval; Pane-local missing data may end
  earlier but cannot stall or fork the cursor;
- every Pane preserves its exact Viewport intent;
- commit is Replay plus complete Pane set after exact visible completion;
- failure preserves the last accepted workspace and pauses; overlapping
  Autoplay work is forbidden.

## Evidence

- `node v7/tests/replay-pane-response-contract-harness.js` passes with all six
  action kinds, five quick anchors, exact forward/backward/retain cases, mixed
  NQ/ES and `1m`/`4h` Pane plans, and 18 negative controls;
- architecture boundary/hardening, module-host, source-quality, and full
  non-browser Harness gates pass;
- `git diff --check` passes.

## Continuation

R6.3 must materialize the planned complete Pane set through one existing
Workspace Transaction and one exact visible-completion acknowledgement, using
fake ports before the real multi-Pane browser surface.
