# Session — R6.1 Pane Workspace Domain

Date: 2026-07-21
Status: automated complete; no browser-visible change

## Boundary

Activated `core.pane-workspace-domain` as the pure owner of uniform one-to-many
Pane intent semantics. Session Store remains the durable owner, Workspace
Transaction Runtime remains the accepted snapshot owner, Replay Runtime remains
the only cursor owner, and Viewport Runtime remains the pane-local wall owner.

## Contract

- every Pane uses the exact same instrument/timeframe/Viewport record;
- Pane and Viewport scope match Session, activation, and Pane identity;
- every instrument belongs to the Session asset set;
- every Pane Viewport observes one shared Replay cursor;
- Pane records cannot carry Replay state;
- focus changes no Pane intent;
- instrument changes target one Pane or all Panes according to explicit sync
  intent while preserving all Viewport values.

## Evidence

- `node v7/tests/pane-workspace-domain-harness.js` passes with 20 negative
  controls;
- architecture boundary/hardening and module-host gates pass;
- the full non-browser Harness suite and `git diff --check` pass.

## Continuation

R6.2 should define complete-Pane-set acquisition/projection and atomic visible
application through the existing Workspace Transaction Runtime. It must remain
headless and use fake ports before any browser-visible multi-Pane layout.
