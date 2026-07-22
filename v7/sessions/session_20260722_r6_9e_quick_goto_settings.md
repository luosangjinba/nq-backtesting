# Session — R6.9e Quick GoTo Settings And Range Feedback

Date: 2026-07-22
Status: awaiting human interaction and visual review

## Delivered

- replaced the five-item Quick GoTo menu with the accepted eight fixed actions;
- retained only the five accepted keyboard shortcuts and added no Silver Bullet
  shortcuts;
- added one simplified seven-time New York settings dialog with Reset, Discard,
  Save, and an explicit derived-Next-Session explanation;
- introduced a focused immutable/versioned Replay Navigation Settings contract;
- persisted settings per explicit Replay Session through Session Store workspace
  schema version 3 while preserving Pane Layout and older record restoration;
- applied accepted settings immediately through the existing Replay Navigation
  schedule resolver without moving Replay or issuing a Pane transaction;
- translated expected quick-anchor range exhaustion into non-blocking inline
  feedback while preserving the ready Workspace, Replay cursor, and every Pane;
- retained the current Exact date/time menu item temporarily for the next
  separate presentation slice.

## Evidence

- Replay Navigation Settings, Session Store, Replay Navigation Runtime, Replay
  Pane Response Contract, architecture, and source-quality Harnesses pass;
- the Replay Pane Workspace real-Chrome Harness proves the eight-action menu,
  default fields, Reset/Discard/Save, immediate custom SB target, zero-revision
  settings Save, ready-state range-end feedback, and fixed visual baseline;
- the Session Browser real-Chrome Harness proves workspace schema version 3 did
  not regress Session create, navigation, delete, or persisted reconstruction;
- all non-browser and six serial real-Chrome Harnesses, JSON parsing, and
  `git diff --check` pass before commit.

## Human Review Boundary

Review the menu, settings dialog, custom-time behavior, Session re-entry, and
range-end feedback. Do not begin the separate Exact GoTo calendar slice until
this visible interaction gate is accepted.
