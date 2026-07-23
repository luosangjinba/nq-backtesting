# Session — R7.1 Durable Workspace Checkpoint

Date: 2026-07-23
Status: automated gates pass; human review pending

## Delivered

- added `core.workspace-checkpoint-domain` with an exact version-one semantic
  wire contract;
- advanced configured Session workspaces lazily to schema 6 and saved Layout,
  Layout Sync, and checkpoint in one compare-and-swap revision;
- restored Replay cursor, RTH/ETH, stable active P1–P4 configuration, and each
  Pane's semantic Viewport through one all-Pane materialization;
- isolated checkpoint capture, equality suppression, and persistence feedback
  from the main Workspace controller behind one focused UI persistence API;
- reset transport to paused and excluded bars/native ranges/transient UI state;
- deduplicated equal checkpoint saves and retained schema 1–5 readability.

## Automated Evidence

- Workspace Checkpoint Domain, Session Store, Viewport Runtime, and Pane
  Workspace State Harnesses pass;
- the dedicated real-Chrome Harness passes first-save, route re-entry, and hard
  refresh with two mixed-capability Panes, RTH, Crosshair sync, manual Viewport,
  exact cursor retention, and paused playback;
- existing Replay Pane and Layout Workspace browser Harnesses remain green;
- all 56 focused/runtime/real-Chrome Harnesses pass, including the existing
  Replay Workspace latency gate, and `git diff --check` passes.

## Human Review

Follow `docs/V7_SESSION_WORKSPACE_CHECKPOINT_R7_1.md`. Review both returning to
the Session list and opening the same Session again, then browser refresh. The
saved Replay point must not advance one bar and no partial/default Pane state
may flash as the accepted result.
