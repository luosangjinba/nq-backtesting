# V7 Headless Annotation Runtime — R13.3

Status: binding headless implementation step

Date: 2026-08-08

Parent decision: `ADR-V7-001`

Depends on: `R13.2`

Harness invariant: `H101`

## Outcome

R13.3 activates one removable, Session-scoped Annotation Runtime as the sole
writer of the accepted Annotation Document. It proves exact document/entity
revision checks and reversible repository failure handling using an injected
fake Repository. It provides generic Drawing commands and queries only.

The production module is `optional.annotation-runtime`. It is headless and has
no application composition, DOM, Chart, Replay, Bar Data, durable storage, or
semantic business-package implementation.

## Scope

R13.3 implements only:

- one immutable versioned Annotation Document for one branded Session id;
- opaque branded Drawing ids supplied by the caller, with no global allocator;
- mandatory immutable generic-Drawing provenance;
- generic Drawing creation, Geometry replacement, archive, and restore;
- exact expected document revision on every command;
- exact expected Drawing revision on every existing-Drawing command;
- one in-flight mutation per Runtime and deterministic concurrent rejection;
- one injected reversible Repository preparation per accepted mutation;
- rollback on apply/finalize failure and capability poisoning when rollback
  cannot be proven;
- complete-document, one-Drawing, Drawing-list, and Runtime-health queries;
- disposal that blocks new work and waits for already-started rollback/commit;
- an optional Geometry contract port and zero-semantic-package operation;
- descriptor, manifest, source-quality, independent Harness, negative fixtures,
  and optional-removal evidence.

R13.3 does not implement:

- Semantic Artifacts, semantic package/type manifests, FVG, BSL/SSL, EQL/EQH,
  OB, Breaker, or any business-type branch;
- Chart projection, Lightweight Charts Primitives, DOM, Canvas, hit testing,
  pointer/keyboard interaction, transient previews, or Property Inspector;
- durable browser/server persistence, restore, migration, import/export,
  cross-device replication, undo, or redo;
- presentation editing, style policy, labels, or visibility policy;
- Replay visibility filtering, cross-timeframe projection, Evidence Resolver,
  Bar selection, detector work, or lifecycle derivation;
- dynamic plugin loading, package enable/disable, Marketplace, or public SDK;
- Workspace Transaction participation or a second Chart/Replay/Bar owner.

## Annotation Document

The accepted public snapshot is deeply immutable and portable:

```text
AnnotationDocument {
  schemaVersion: 1
  sessionId
  revision
  drawings[]
  artifacts[]
}
```

Rules:

- `sessionId` is the exact serialized token of the branded Runtime Session;
- document revision starts at `0` and advances exactly once per accepted
  mutation;
- `drawings` are sorted by opaque Drawing id for deterministic queries;
- `artifacts` is an immutable empty array in R13.3;
- no command or Repository receives mutable document internals;
- raw Bars, vendor coordinates/handles, credentials, DOM, and functions cannot
  enter the document;
- R13.3 has no deserializer. Durable restoration and migration remain R13.7.

## Generic Drawing Entity

R13.3 uses the minimal entity shape:

```text
DrawingEntity {
  drawingId
  revision
  scope {
    kind: "session"
    sessionId
  }
  geometry
  presentation: null
  provenance
  status: "active" | "archived"
}
```

`drawingId` is exposed as an opaque token in the portable snapshot, but every
command requires the branded value. Entity revision starts at `1` and advances
exactly once for Geometry replacement, archive, or restore. A duplicate id is
rejected even when its existing entity is archived.

`presentation` is explicitly `null`. R13.6 owns the first presentation and
Inspector contract; R13.3 does not invent an unversioned style bag.

The Runtime stores only Geometry accepted through the injected R13.2 public
contract. It calls `readDrawingGeometry`; it never inspects concrete Point,
Segment, Rectangle, or future Geometry payloads and contains no type-id switch.
When the optional Geometry port is absent, queries and lifecycle still work but
create/replace commands fail with a stable capability-unavailable error.

## Provenance

Every created Drawing requires exactly:

```text
DrawingProvenance {
  origin: "manual" | "import"
  createdAtEpochMs
  observedAtReplayCutoffEpochMs
}
```

Both times are non-negative safe integers. Wall-clock creation time cannot
replace Replay cutoff. Geometry replacement, archive, and restore preserve the
original provenance unchanged. R13.3 stores this no-future prerequisite but
does not derive visibility; R13.8 owns visible projection at an exact cutoff.

## Public Commands And Queries

The public factory is:

```text
createAnnotationRuntime({
  geometryContract?
  repository
  sessionId
})
```

Commands are asynchronous because injected Repository work may be asynchronous:

```text
createDrawing({
  sessionId
  expectedDocumentRevision
  drawingId
  geometry
  provenance
})

replaceDrawingGeometry({
  sessionId
  expectedDocumentRevision
  drawingId
  expectedDrawingRevision
  geometry
})

archiveDrawing({
  sessionId
  expectedDocumentRevision
  drawingId
  expectedDrawingRevision
})

restoreDrawing({
  sessionId
  expectedDocumentRevision
  drawingId
  expectedDrawingRevision
})
```

Each success returns the complete accepted immutable document. Extra fields,
raw Session/Drawing strings, another Session, stale/future revisions, duplicate
ids, missing Drawings, invalid state transitions, and malformed Geometry fail
without Repository publication or notification.

Queries are synchronous:

- `getDocument()`;
- `getDrawing(drawingId)`, returning `null` when absent;
- `listDrawings()`, returning all active and archived Drawings in stable order;
- `health()`, exposing only status, accepted revision, active-transaction state,
  Geometry availability, and semantic-package count `0`;
- `dispose()`, which is asynchronous lifecycle cleanup rather than a command.

There is no public mutable registry, current-Session key, selected Drawing,
active Chart, package list, or application singleton.

## Repository Preparation Port

R13.3 accepts a fake/test Repository through one narrow port:

```text
repository.prepare({
  baseDocument
  candidateDocument
  expectedRevision
  sessionId
}) -> preparation

preparation.apply()
preparation.finalize()
preparation.rollback()
preparation.snapshot()
```

The port contract requires:

- prepare is side-effect-free;
- apply may expose the candidate to the fake Repository but remains reversible;
- finalize seals the accepted fake write;
- rollback restores the exact base Repository state after an apply or finalize
  failure;
- one preparation settles once;
- the Runtime publishes its in-memory document only after finalize succeeds;
- prepare/apply/finalize failure with successful rollback leaves the exact
  prior accepted document;
- rollback failure poisons only this optional Runtime; later commands fail,
  while last-accepted queries remain available for diagnosis;
- Repository failures cannot mutate Replay, Chart, Session, Bars, or Geometry.

The fake implementation belongs to the independent Harness, not production.
R13.7 must define a separately reviewed durable Repository, wire format,
migration, history, and hard-reload contract rather than promoting this fake.

## Transaction And Concurrency Rules

For each command the Runtime:

1. validates exact fields, Session, expected revisions, state transition,
   provenance, and branded Geometry;
2. constructs one immutable candidate document;
3. asks the injected Repository to prepare the exact base/candidate pair;
4. applies and finalizes that preparation;
5. publishes the candidate once;
6. otherwise rolls the preparation back and retains the exact prior document.

Only one mutation may be active. A concurrent second command is rejected; it is
not queued against an implicitly newer revision. A command which loses its
expected document or Drawing revision is stale and causes no side effect.

Dispose stops accepting new work, waits for the already-started transaction to
settle, clears internal references, and makes later commands/document queries
fail. It cannot abandon an applied Repository preparation.

## Modularity And Plugin Boundary

R13.3 reinforces these hard rules:

- the Runtime is one generic document owner, not a business-feature container;
- it contains no SMC/ICT type id, formation rule, tolerance, detector, projector,
  or semantic switch;
- future first-party business types enter through the same removable semantic
  package contract as external trusted-build packages;
- packages will submit validated generic Runtime commands and consume immutable
  queries; they never receive mutable document or Repository access;
- Geometry is consumed only through its public read contract and remains
  independently removable;
- absence of Geometry or every semantic package must not prevent the remaining
  V7 production graph from booting;
- Annotation Runtime removal leaves Session, Replay, Bar Data, Chart, Workspace,
  Data Acquisition, and every existing route unchanged.

R13.9 remains the first step allowed to activate a semantic package Registry
and business module. That step must prove compile-time plugin composition,
runtime disable/re-enable, failure isolation, unresolved-artifact survival, and
zero-package boot without adding concrete business branches to this Runtime.

## H101 Acceptance Gates

R13.3 closes only when executable evidence proves:

- exact initial document and Session isolation;
- branded opaque Drawing ids and structural-lookalike rejection;
- mandatory cutoff provenance and exact-field validation;
- create/replace/archive/restore revision progression;
- stale document and stale Drawing commands are side-effect-free;
- duplicate/missing/entity-state failures are deterministic;
- deep immutability and caller-input mutation isolation;
- one active mutation and deterministic concurrent rejection;
- Repository prepare/apply/finalize failures retain the prior accepted state;
- rollback failure poisons only the optional Annotation capability;
- disposal waits for active work and rejects later work;
- zero semantic packages and no business-type branch;
- absent Geometry capability still boots and produces an honest stable error;
- descriptor/public entry, manifest inventory, production ModuleHost assembly,
  source-quality policy, and optional-removal matrix conform;
- no Chart, DOM, Canvas, Bar Data, Replay, persistence adapter, or V4/V5/V6
  imports;
- `git diff --check` and focused architecture/source-quality Harnesses pass.

This is a headless non-visual delivery and changes no browser surface. It has no
manual visual acceptance gate. R13.4 remains unauthorized until its dedicated
Accepted Chart Projection Port specification is written and approved.
