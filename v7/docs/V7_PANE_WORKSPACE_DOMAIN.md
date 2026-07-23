# V7 Pane Workspace Domain

Status: R6.1 foundation with R6.10b Symbol/Interval transitions (2026-07-22)

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

`setPaneInstrumentSync` changes only the effective future-command policy
snapshot. `changePaneTimeframe` accepts an explicit local/all-Pane choice and
retains every Viewport intent. Neither transition requests bars, mutates the
accepted Workspace, or moves Replay; one later Workspace Transaction owns
materialization.

## R6.1 Exclusions

- no multi-Pane acquisition or Projection orchestration;
- no atomic multi-chart staging/application;
- no browser layout, active outline, Pane header, or instrument selector;
- no durable layout restore;
- no ES production provider activation.

R6.2 defines how every Replay/navigation action targets this complete Pane set.
R6.3 then materializes the set through one Workspace transaction and one exact
visible-completion gate. Neither step may add a per-Pane transaction or Replay
runtime.

## Gate

`tests/pane-workspace-domain-harness.js` proves one-Pane/multi-Pane shape
identity, Session asset enforcement, active focus isolation, pane-local and
synchronized instrument transitions, shared-cursor preservation, immutable
Viewport retention, structural rejection of Pane-local Replay fields, and 24
negative controls including local/all-Pane timeframe and instrument-policy
transitions.
