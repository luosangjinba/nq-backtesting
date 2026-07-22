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
- persisted one workstation-wide schedule through a focused preference owner;
- retained Session workspace schema 3 as one-time migration input while current
  schema 4 stores Pane Layout only;
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
- the Replay Pane Workspace real-Chrome Harness proves a changed value appears
  in a newly created Session and survives deletion of the original Session;
- all non-browser and six serial real-Chrome Harnesses, JSON parsing, and
  `git diff --check` pass before commit.

## Human Review Boundary

Review the menu, settings dialog, custom-time behavior, Session re-entry, and
range-end feedback. Do not begin the separate Exact GoTo calendar slice until
this visible interaction gate is accepted.

## Review Correction

Human review clarified that every Quick GoTo key time is an unrevealed future
moment. Target resolution now uses the eligible anchor bar only as a validity
witness and commits the configured wall time as an exclusive cutoff. Thus a
saved `15:00` shortcut displays through `14:59` on `1m`, uniformly across all
eight actions and all Panes. Exact GoTo and Replay Next/Previous semantics are
unchanged.

## Second Review Investigation

Human review initially reported that custom `12:00` and `23:00` Next Day Open
actions preserved the entry cursor and surfaced only
`workspace-transaction-failed`. Both exact reported Session ranges were then
replayed through a fresh real Chrome document and the real bars provider; they
committed correctly through `11:59` and `22:59` New York time respectively.
The user subsequently repeated the workflow successfully, so no deterministic
target-resolution defect remained reproducible.

The investigation did expose one independent failure-path defect: uppercase
domain errors and bounded provider failures were being collapsed into the
generic Workspace code. Workspace Transaction Runtime now normalizes owner
codes and provider failure kinds without leaking transport detail. The main
real-Chrome Workspace Harness also saves a custom `12:00` Next Day Open,
crosses into the following day, asserts visible-through `11:59`, and requires
the Workspace to remain ready before continuing with another Quick GoTo.

The visible R6.9e gate remains open pending explicit human acceptance; this
correction does not treat the later successful retry as acceptance.

## Global Scope Correction

Human review then clarified that Quick GoTo Custom Settings are workstation-
wide, not Replay-Session-specific. Persistence moved from Session Store into
`core.replay-navigation-preference-store`. Save now changes one durable global
record, all newly mounted Sessions read the same snapshot, and deleting any
Session cannot remove it. Saving still moves neither Replay nor Workspace.

Existing schema-3 Session values remain valid migration evidence. When the
global record is absent, application composition orders them by Session update
time, seeds the first valid value globally once, and no longer consults Session
records. Current Session workspace schema 4 contains Pane Layout only.
