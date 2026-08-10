# V7 R13.9 Semantic Package Registry And Liquidity Level Slice

Status: accepted; automated and human H107 gates passed

Date: 2026-08-09

Depends on: accepted R13.2–R13.8 and ADR-V7-001

## Decision

R13.9 activates the first trusted-build Semantic package vertical slice. A
host-owned, removable Semantic Package Registry controls package compatibility,
activation, disable/re-enable, failure isolation, definition discovery,
construction, projection assembly, and read-only Inspector schemas. The first
package registers `liquidity.bsl@1.0.0` and `liquidity.ssl@1.0.0` through that
same public contract.

This step proves plugin-first business composition. No BSL/SSL id or behavior
may enter Annotation Runtime, Chart, Replay, Bar Data, Workspace Transaction,
Geometry, persistence, or context-projection internals.

## Bounded Product Meaning

R13.9 BSL/SSL values are explicit human assertions at one horizontal price
level. They do not claim an automatic swing-high/low calculation and do not
derive sweep, raid, mitigation, invalidation, confirmation, outcome, or trade
signals.

The accepted creation paths are:

1. construct from explicit manual market anchors through the active package;
2. promote one exact active horizontal Segment Drawing through the active
   package, either retaining or explicitly archiving the source Drawing.

Both paths record `recognitionSource: human`, `constructionSource: manual`, the
exact instrument/source-timeframe identity, the acceptance Replay cutoff, and
the explicit market anchors. Promotion additionally records the exact source
Drawing id and revision. A non-horizontal Segment, missing package, stale
Drawing, mismatched Session, future provenance, or invalid price fails without
changing document, history, bytes, or projections.

## Owner Boundaries

`optional.annotation-semantic-registry` owns only:

- trusted-build package manifests and host-contract compatibility;
- package activation state, definition collisions, failure isolation, and
  lifecycle disposal;
- branded validated Artifact drafts produced by active construction policies;
- active-definition resolution, declarative projection subject assembly, and
  read-only host-rendered Property Inspector schemas.

`optional.semantic-liquidity-level` owns only:

- BSL/SSL type definitions and human-manual construction validation;
- horizontal Segment-to-liquidity promotion policy;
- declarative level projection subjects and minimal Semantic/History property
  schemas.

`optional.annotation-runtime` remains the only accepted Annotation Document
writer. It gains generic Artifact create, exact Drawing promotion, archive,
restore, queries, history, and durable restore behavior, but receives no
concrete business id. `adapter.annotation-persistence` continues to own bytes
and opaque envelope sidecars. `optional.annotation-context-projection` and the
Chart-owned projection port consume only generic subjects and projections.

No package receives Chart, DOM, Canvas, Replay writer, Bar Data requester,
Workspace, Repository, storage, network, or owner-internal handles.

## Artifact And Persistence Contract

R13.9 uses the already-reserved `AnnotationDocument.artifacts[]` field and
retains document schema version 1 plus repository-entry version 2. It adds no
persistence migration.

The Runtime generically preserves:

- opaque Artifact id, exact revision, active/archived status, Session scope;
- stable type id/version;
- portable validated attributes, relations, Presentation, and provenance;
- unknown Artifact, attribute, relation, Presentation, and provenance fields in
  the persistence adapter sidecar.

When a compatible package is absent, disabled, failed, or incompatible, stored
Artifacts survive as unresolved read-only values. Generic restore, history,
undo/redo, export, and re-import remain available. Type-specific creation or
editing is unavailable. Compatible re-enable restores validation, Inspector
schema, tools, and projections without rewriting the Artifact or document
revision.

## Package Lifecycle Contract

The Registry accepts only exact branded manifests supplied at composition time.
R13.9 does not dynamically import code. Each package has exactly one state:
`disabled`, `active`, `failed`, `incompatible`, or `disposed`.

- enabling validates host range, type collisions, dependencies, and the
  activated instance before publishing definitions;
- a failed package operation withdraws only that package's definitions and
  leaves generic Drawings, unresolved Artifacts, other packages, Replay, and
  Chart usable;
- disabling withdraws tools/definitions/projection policies and disposes the
  instance exactly once;
- re-enable constructs a fresh compatible instance;
- Registry disposal disables every active package in reverse activation order;
- zero-package startup is valid.

Dynamic package loading, arbitrary community JavaScript, signatures,
sandboxing, permissions UI, public SDK, registry service, and Marketplace
remain deferred.

## Projection And No-Future Contract

The liquidity package emits one source-agnostic horizontal Segment projection
subject per resolved active Artifact. It uses explicit market anchors and the
accepted exact-instant policy. The package does not mutate or store Geometry
as the Artifact's semantic identity.

An Artifact is invisible before its `observedAtReplayCutoffEpochMs`. Package
disable/failure makes its subjects absent; compatible re-enable reproduces the
same subjects from the unchanged Artifact. Multi-Pane settlement and all Chart
primitive writes remain owned by the accepted R13.8/R13.4 boundaries.

## Minimal Inspector Contract

The package declares bounded Semantic and History groups. The host fixture
renders the schema; package code supplies no DOM.

Required read-only fields are type, side, level price, recognition source,
construction source, observed Replay cutoff, source Drawing identity when
present, type/package version, Artifact revision, and resolution state. R13.9
does not introduce an editable generic form framework or production toolbar.

The host must use the cutoff-safe Inspector entry for Replay surfaces. Before
the Artifact's observation cutoff it returns no resolution, type, price,
attribute, provenance, or package-defined group and the surface may show only
the generic `Not visible before observation cutoff` state. Moving after the
cutoff restores the unchanged Inspector view. Administrative non-Replay views
may use the context-free read-only Inspector entry.

## H107 Acceptance Gates

H107 must prove:

- zero-package boot and complete optional removal;
- exact manifest compatibility, duplicate/collision rejection, and deterministic
  active/disabled/failed/incompatible/disposed lifecycle;
- one package failure does not disable another package or generic Annotation;
- BSL/SSL use the public package extension port and have no core business-id
  branch;
- valid manual construction and exact horizontal-Segment promotion with retain
  and archive choices;
- stale, non-horizontal, forged-draft, invalid-provenance, duplicate-id, and
  mismatched-Session commands have zero side effects;
- Artifact history, hard-reload restore, undo/redo, export/import, opaque-field
  preservation, and unresolved survival;
- disable removes semantic projections, re-enable restores them at the same
  Artifact/document revision, and Replay before/after cutoff hides/restores
  both projection and Inspector fields without future leakage;
- the real-browser fixture leaves candles and native drag/wheel behavior
  unchanged and renders only host-owned Semantic/History Inspector fields;
- architecture, writer, source-quality, optional-removal, standalone,
  regression, JSON, and patch-format gates pass.

H107 requires a local visual/interaction review. The corrected fixture was
accepted by the user on 2026-08-09. R13.10 remains unauthorized.

Automated implementation evidence on 2026-08-09 covers 22 declared negative
controls and a real Chromium pass over generic Drawing promotion, BSL color,
host-rendered Semantic/History fields, package disable/re-enable, unchanged
Artifact/document revision, Replay before/after visibility, and byte-identical
candlestick data. Production assembly contains 59 modules, 24 lifecycle
modules, and 21 optional-removal cases. The local visual gate then confirmed
the corrected cutoff-safe Inspector, projection hide/restore, package
disable/re-enable, and native Chart interaction.

## Explicit Non-Authorization

R13.9 does not authorize FVG, Evidence Resolver, Bar/Artifact/relation pickers,
EQL/EQH tolerance, OB, Breaker, automatic detection, lifecycle-event inference,
trade simulation, Journal/Backtesting workflow composition, production drawing
controls, cross-device replication, or R13.10 implementation.
