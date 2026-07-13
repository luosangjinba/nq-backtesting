# Session 2026-07-13 - Step 409 Settings Transaction And Durability

## Trigger

The Step 409 selection was accepted for implementation with one commit per
bounded substep.

## Completed

### Durable owner

- added versioned `workspaceSettings:global` records to the existing
  Persistence repository;
- hydrated Settings before snapshots and migrated legacy unversioned values;
- retained usable committed memory state and emitted failures when storage was
  malformed or unavailable;
- configured the existing Web Storage adapter at the composition root.

Commit: `e45f9562 feat(v6): persist versioned workspace settings`.

### Transactional UI and real consumer

- changed field events to panel-local draft updates;
- made OK one atomic Settings update;
- made Cancel, close, repeat-toggle, Escape, backdrop, and coordinator closure
  discard edits;
- made Reset draft-only;
- removed active disconnected/mislabeled controls;
- retained only Grid lines and connected committed changes through a focused
  bridge to chart-owned `applyOptions` for all panes.

Commit: `ac14851a feat(v6): make settings modal transactional`.

### Final regression and governance

- added real-browser hard-refresh persistence and draft-only Reset coverage;
- corrected the workflow-panel geometry assertion to distinguish overlay
  Settings from the existing compact Replay/Journal rows;
- passed Settings, persistence, app-shell, workflow, ownership, and chart
  foundation gates;
- chart browser regression passed `28/28` and its last five members were rerun
  directly after long-output truncation;
- recorded the remaining human visual matrix.

Commit: documentation/test closeout commit.

## Next

Run the five-item Step 409 visual matrix in the real workstation. If it passes,
close Step 409 and implement Step 410 Global Time Presentation Integration in
bounded surface groups.
