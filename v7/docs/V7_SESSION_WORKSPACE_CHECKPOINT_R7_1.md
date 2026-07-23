# V7 Session Workspace Checkpoint — R7.1

Date: 2026-07-23
Status: implemented; automated gates pass; human re-entry review pending

## Product Decision

One Session owns one complete durable Workspace checkpoint. A soft re-entry or
hard refresh restores that checkpoint through the existing Replay, Pane,
Viewport, Session Hours, Layout Sync, Bar Data, chart application, and
Workspace Transaction owners. Restore is not a sequence of UI events and never
advances Replay by an implicit `Next bar`.

The checkpoint is semantic and data-independent. It stores what the user means
to restore, not a screenshot of Lightweight Charts internals.

## Durable Envelope

Configured Session workspaces advance lazily to schema version 6:

```text
workspace
  schemaVersion: 6
  state: configured
  paneLayout: v7.pane-layout/v1
  layoutSync: v7.layout-sync/v1
  checkpoint: v7.workspace-checkpoint/v1
```

The checkpoint contains exactly:

- accepted Replay `cursorEpochMs`;
- accepted Session Hours mode;
- stable active Pane id;
- one-to-four stable priority Panes, each with instrument id and timeframe id;
- each Pane's semantic Viewport origin, latest-bar offset, and manual span.

Schema versions 1–5 remain readable. They are not rewritten on repository
startup. Their next successful visible Workspace commit writes one complete
schema-6 envelope, so migration is bounded to the Session the user opened.

## Deliberately Transient

The checkpoint does not contain:

- bars, provider responses, Projection output, or chart series;
- native `from`/`to`, pixels, canvas dimensions, or price autoscale state;
- activation generation, Workspace/Replay/Viewport revisions, or transaction
  ids;
- autoplay playing state, speed, truncation selection, Sync timeframe, menus,
  dialogs, hover state, or maximized presentation.

Playback always reconstructs paused. Activation-scoped identities and revisions
are allocated again by their owning runtimes.

## Save Semantics

Session Store remains the sole durable writer. `saveWorkspaceCheckpoint()`
serializes Pane Layout, Layout Sync, and checkpoint together under one Session
revision and one repository compare-and-swap. Partial legacy layout writes may
not split a schema-6 layout from a checkpoint with a different Pane count.

Replay Workspace UI delegates semantic capture, serialized equality
suppression, and persistence feedback to its focused
`workspace-checkpoint-persistence.js` boundary; the route/controller only
orchestrates when accepted transitions ask that boundary to save.

Replay/Pane/Session Hours changes save only after the matching visible
Workspace commit. Layout, focus, and completed Viewport intents save after
their accepted semantic transition. Equal serialized checkpoints are skipped,
so history extension and restore materialization do not create redundant
Session revisions.

A persistence failure after a visible chart commit does not falsify the already
accepted Workspace Transaction. The chart remains usable, an error is shown,
and hard refresh restores the last durable checkpoint. Fallible Layout Sync,
same-count Layout, resize, and focus changes retain their existing local
rollback behavior where a rollback is still safe.

## Restore Semantics

1. Session Store activates the selected Session with a new activation
   generation and deserializes the complete envelope.
2. Replay Runtime starts at the saved cursor, paused.
3. Pane Workspace reconstructs stable P1–P4 configuration and active Pane.
4. Viewport Runtime rebrands each saved semantic intent to the new Session
   activation/current cursor and resets its transient revision to zero.
5. Capability composition rejects unsupported instruments, timeframes, Session
   Hours, malformed Pane identity, or a layout/checkpoint count mismatch before
   partial chart publication.
6. One `goto-exact` materialization at the current cursor acquires/projects all
   Panes and publishes one complete chart/Workspace/Replay acceptance.

This same path serves route re-entry and browser hard refresh.

## Lightweight Charts Boundary

Lightweight Charts exposes `getVisibleLogicalRange()` and
`setVisibleLogicalRange()`, and its logical range may extend beyond loaded data.
Those APIs remain adapter mechanisms, not durable product state. V7 therefore
persists the Viewport Runtime's offset/span intent and lets the adapter project a
fresh logical range after data materialization. See the official
[`ITimeScaleApi`](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ITimeScaleApi)
and [time-scale guide](https://tradingview.github.io/lightweight-charts/docs/5.1/time-scale).
The [awesome-tradingview catalog](https://github.com/tradingview/awesome-tradingview)
does not provide a Session/Replay checkpoint owner that fits V7's ownership
rules.

## Executable Evidence

- `tests/workspace-checkpoint-domain-harness.js` binds the exact wire schema,
  Session range/asset constraints, semantic Viewport fields, and forbidden
  transient/native fields.
- `tests/session-store-harness.js` binds schema-5-to-6 lazy upgrade, complete
  atomic save, reconstruction, and partial-write rejection.
- `tests/viewport-runtime-harness.js` binds activation rebranding and revision
  reset.
- `tests/pane-workspace-state-harness.js` binds active Pane, per-Pane
  configuration, stable priority identity, and semantic Viewport restore.
- `tests/workspace-checkpoint-restore-browser-harness.js` proves first-save,
  soft re-entry, and hard refresh against real Lightweight Charts with mixed
  Pane capabilities, RTH, Layout Sync, manual Viewport, paused transport, and no
  extra Replay advance.

## Human Review Gate

Create a multi-instrument Session, configure two or four Panes, move Replay,
set different Pane timeframes/instruments, switch RTH, manually pan/zoom at
least one Pane, and choose a non-P1 active Pane. Return to Sessions and reopen;
then refresh the browser. Both restores must reproduce the same cursor,
layout/configuration/active Pane and Viewport wall, while playback remains
paused and no future bar appears.
