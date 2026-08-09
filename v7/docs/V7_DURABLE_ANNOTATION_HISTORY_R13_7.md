# V7 R13.7 Durable Annotation History

Status: accepted; H105 automated gate closed

Date: 2026-08-09

Depends on: accepted R13.2–R13.6

## Decision

R13.7 adds the first durable, Session-local storage adapter for the generic
Annotation Document and makes exact-revision undo/redo survive a hard reload.
It also adds a versioned portable export/import boundary, one explicit storage
schema migration, and lossless preservation of unknown envelope fields.

This remains a headless foundation step. It adds no production toolbar, route,
Chart composition, cross-timeframe projection, semantic package, detector,
Journal workflow, server replication, or dynamic plugin loader.

## Owner Boundaries

`optional.annotation-runtime` remains the sole accepted Annotation Document and
history writer. It owns command validation, current document, undo/redo stacks,
exact revisions, and the single publication decision.

`adapter.annotation-persistence` owns only Session-keyed bytes, storage schema
migration, opaque-field sidecars, import parsing, export encoding, compare-and-
swap checks, and exact reversible writes. It cannot create business entities,
interpret Geometry meaning, mutate Runtime state, or access Chart/Replay/Bars.

`optional.annotation-geometry-domain` owns restoration of a portable Geometry
through its registered definition. Runtime and persistence may not branch on
concrete Geometry type ids during restore.

The adapter receives an explicit storage port. It never imports `window`,
chooses `localStorage`, keeps a current-Session singleton, or joins the Session
or Workspace transaction.

## Runtime State And History

Runtime state is one immutable tuple:

```text
{
  document,
  opaqueState,
  history: {
    undo: [{ document, opaqueState }],
    redo: [{ document, opaqueState }]
  }
}
```

Opaque state is an adapter-owned token. Runtime may retain and return it to the
same repository transaction but cannot inspect or manufacture its contents.

Every ordinary accepted create/revise/archive/restore/import operation appends
the exact previous state to `undo` and clears `redo`. History is bounded to the
latest 100 accepted states. Preview, selection, Inspector drafts, and failed
commands never enter history.

`undo` and `redo` require the exact current document revision and Session id.
They restore one historical content snapshot while allocating a new monotonic
document revision. They do not publish an old document revision as current.
The complete document, history stacks, and opaque state settle in the same
repository transaction.

## Durable Repository Contract

The separately removable repository exposes only:

```text
load({ sessionId }) -> null | initialState
prepare({ base/candidate document, history, opaque state, revision, session })
parseImport({ payload, sessionId }) -> { document, opaqueState }
exportDocument({ document, opaqueState, sessionId }) -> string
```

`prepare` is side-effect-free. `apply` writes and verifies one exact raw entry;
`finalize` seals the opaque-state decision; `rollback` restores the exact prior
bytes. An unprovable rollback poisons only the optional Annotation Runtime.

The storage namespace is explicit and Session-keyed. A missing entry restores
an empty revision-zero Runtime. A stored entry must match the requested branded
Session and expected document revision. No last-opened or fallback key exists.

## Wire, Migration, And Opaque Fields

The current durable entry is `v7.annotation-repository-entry` version `2` and
contains one canonical document plus persisted undo/redo states. Version `1`
entries containing only a document migrate deterministically to version `2`
with empty history. Other schemas or versions fail closed.

The portable export is `v7.annotation-document-export` version `1`. Import is a
normal Runtime transaction: source document revision is validated but current
revision advances exactly once; imported history is not trusted or installed.
Import of another Session fails.

Unknown JSON-compatible fields at the document, Drawing, Geometry envelope,
Presentation, provenance, and scope envelopes are stripped before domain
validation, retained in an adapter-owned sidecar, merged back on durable writes
and export, and restored by undo/redo. Known canonical fields always win over
opaque fields. Unknown Geometry payload meaning remains owned by its registered
Geometry definition and is not guessed by the persistence adapter.

## Geometry Restoration

Geometry definitions gain a pure restore policy in addition to creation
normalization. The Registry validates type id and exact semantic version, then
recreates a branded Geometry from portable payload. The Runtime consumes only
that injected public restore port. Missing type/version or malformed payload
fails without publishing bytes or state.

## H105 Acceptance

H105 must prove:

- durable create/revise/archive/restore and byte-exact hard-reload recovery;
- history persistence across repository and Runtime reconstruction;
- exact-revision undo/redo, redo clearing after divergent work, and the
  100-state bound;
- atomic rollback of document, history, opaque state, and stored bytes;
- version-1 to version-2 migration and rejection of unsupported/corrupt wire;
- versioned export/import with Session isolation;
- opaque envelope fields surviving import, edit, undo/redo, reload, and export;
- registered Geometry restoration with no concrete-type branch in Runtime or
  persistence;
- optional adapter removal with Annotation/Replay/Chart core still bootable;
- no Chart, DOM, Canvas, Bar Data, Replay, Workspace, V4/V5/V6, or server-state
  dependency;
- full architecture, sole-writer, source-quality, standalone, regression, JSON,
  and `git diff --check` gates.

R13.7 has no new visible product surface and therefore requires no manual
visual gate. Passing H105 closes only this headless persistence/history step.
R13.8 remains separately unauthorized.

Acceptance closed on 2026-08-09. The independent Harness proves 18 declared
negative controls plus hard reload, bounded history, exact undo/redo, divergent
redo clearing, import/export, migration, opaque-field continuity, interleaved
CAS rejection, and byte-exact rollback. Full module, architecture, writer,
source, standalone, and regression gates pass. Binding evidence is
`sessions/session_20260809_r13_7_durable_annotation_history.md`.

## Non-Authorization

R13.7 does not authorize Pane/timeframe projection policies, Replay visibility,
semantic-package registration, BSL/SSL/FVG/EQL/OB/Breaker behavior, detectors,
AI Agent tools, production drawing controls, cross-device sync, or automatic
conflict resolution.
