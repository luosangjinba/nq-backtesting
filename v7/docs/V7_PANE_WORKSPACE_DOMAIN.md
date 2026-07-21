# V7 Pane Workspace Domain

Status: R6.1 pure one-to-many pane intent foundation (2026-07-21)

## Ownership

`core.pane-workspace-domain` owns the pure semantic contract for the Pane set of
one activated Session. It defines one uniform Pane record, the active Pane,
Session-bounded instrument intent, and instrument-sync fan-out. It owns no
mutable runtime, persistence, Replay clock, bars, projection, chart instance,
DOM, or network access.

Session Store remains the durable owner. Workspace Transaction Runtime remains
the accepted snapshot revision owner. Viewport Runtime remains the owner of
each Pane's wall intent. R6.1 composes and validates those public values; it
does not duplicate their state.

## Uniform Pane Contract

The same exact record is used whether the workspace contains one Pane or many:

```text
paneId + instrumentId + timeframeId + viewportIntent
```

Pane records cannot contain a Replay cursor, playback state, Session Hours
mode, bars, or chart handle. Every Viewport intent must match the Workspace
Session, activation generation, and Pane id. All Pane Viewport intents must
observe the same accepted Replay cursor.

The Pane set is ordered and non-empty. Pane ids are unique, `activePaneId`
references an existing Pane, and every Pane instrument plus the primary
instrument must belong to the Session's ordered allowed instrument set.

## Pure Transitions

`focusPane` changes only active focus and preserves the exact Pane records. It
does not imply a timeframe, instrument, data, chart, or Replay command.

`changePaneInstrument` rejects out-of-Session instruments before a runtime
owner is involved. With `instrumentSync: pane`, only the targeted Pane record
changes. With `instrumentSync: all`, the intent fans out to every Pane. Both
forms preserve every Viewport intent and the shared cursor.

## R6.1 Exclusions

- no multi-Pane acquisition or Projection orchestration;
- no atomic multi-chart staging/application;
- no browser layout, active outline, Pane header, or instrument selector;
- no durable layout restore;
- no ES production provider activation.

R6.2 must materialize a complete Pane set through one Workspace transaction and
one exact visible-completion gate. It must not add a per-Pane transaction or
Replay runtime.

## Gate

`tests/pane-workspace-domain-harness.js` proves one-Pane/multi-Pane shape
identity, Session asset enforcement, active focus isolation, pane-local and
synchronized instrument transitions, shared-cursor preservation, immutable
Viewport retention, structural rejection of Pane-local Replay fields, and 20
negative controls.
