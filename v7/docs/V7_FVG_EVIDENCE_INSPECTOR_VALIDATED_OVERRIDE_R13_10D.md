# V7 FVG Evidence Inspector And Validated Override — R13.10d

Status: accepted and closed 2026-08-10

Date: 2026-08-10

Depends on: accepted R13.1, R13.6–R13.10c, ADR-V7-004, H104–H111

## Outcome

R13.10d adds the first editable host-rendered Semantic Inspector without adding
a production toolbar or plugin-management surface. One exact accepted FVG
Artifact can expose package-defined, host-validated groups for Semantic,
Evidence, and History information. The lower and upper effective bounds can be
edited as one validated inner-zone override while the strict evidence-derived
baseline remains immutable.

The active Core FVG Plugin validates every candidate. Annotation Runtime remains
the sole accepted Artifact writer, Annotation Persistence remains the only byte
writer, Annotation Interaction owns only the transient Inspector draft, and
Chart remains the only Primitive writer.

## Bounded Scope

This step implements:

- one bounded generic Semantic Inspector group/field/control schema;
- one optional Semantic type revision policy and branded generation-bound
  Artifact revision draft;
- one exact-revision Annotation Runtime command for package-validated Artifact
  replacements;
- one disposable, package-neutral Semantic Inspector controller with local
  draft, preview, cancel, reset, save, and read-only states;
- FVG Semantic/Evidence/History groups, effective-source badges, strict bound
  validation, append-only override provenance, durable history, and package-
  unavailable read-only inspection;
- one focused real-Lightweight-Charts browser fixture and H112.

It does not implement:

- R13.10e production Picker → Evidence → FVG composition or a production
  toolbar/route;
- a general Plugin Center, installer, SDK, Community registry, permissions UI,
  or dynamic code;
- automatic FVG detection, mitigation/fill state, displacement, tolerance,
  volume, ranking, alerts, Setup workflow, Journal, or statistics;
- arbitrary relation editing, generic Bar/Artifact pickers, a universal
  settings store, or a second Annotation/Chart owner;
- a new Workspace transaction or complete Workspace Chart Snapshot update.

## Upstream Capability Decision

Lightweight Charts 5.2 Series Primitives provide `attached`/`detached`,
`requestUpdate`, and `updateAllViews`; these are sufficient for the existing
Chart owner to refresh a preview or accepted Primitive without rewriting candle
data:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>

The official Rectangle Drawing Tool demonstrates mutable options followed by
`requestUpdate`, but also owns its toolbar DOM, Chart subscriptions, drawing
list, and Primitive attachment directly. V7 reuses only the Primitive update
pattern because that example's combined ownership conflicts with ADR-V7-001:

- <https://github.com/tradingview/lightweight-charts/blob/master/plugin-examples/src/plugins/rectangle-drawing-tool/rectangle-drawing-tool.ts>

The official examples are proof-of-concept starting points, and the current
awesome-tradingview catalog exposes no production host-rendered semantic
Inspector which satisfies V7's evidence, exact-revision, no-future, disposal,
and sole-owner rules. No external runtime or dependency is added.

## Owner And Public-Port Boundary

```text
host-rendered fixture DOM
  -> Semantic Inspector Controller
       owns: selected identity, local field values, draft revision, preview id
       reads: exact Artifact + package-produced validated Inspector schema
       calls: Registry revision-draft/preview ports and one Artifact command port
       never receives: Chart/Series/Canvas, Replay writer, Bar requester, store
  -> Semantic Package Registry
       owns: active definition/generation resolution and branded revision drafts
       invokes: pure package inspect/revise/project policies
  -> Core FVG Plugin
       owns: bound schema, validation, effective-value and provenance policy
  -> Annotation Runtime
       owns: exact accepted Artifact/document revision and durable transaction
  -> Chart Preview Port
       owns: transient Primitive replacement/rollback/cleanup
```

The fixture supplies small composition adapters over these public ports. The
controller contains no FVG id/field branch and no DOM. The FVG package contains
no DOM, Chart, Replay, Bar Data, persistence, or Annotation writer handle.

R13.10d proves transient Preview rollback independently from the Runtime's
durable persistence rollback. The production mounted-surface orchestration
which composes one accepted Annotation edit with its final Chart settlement is
reserved for R13.10e; this fixture must not invent a second transaction owner.

## Host Inspector Schema

The Registry validates package output before UI sees it. An inspection contains
at most eight uniquely identified groups and at most thirty-two uniquely
identified fields. Every group is:

```text
InspectorGroup {
  id
  label
  fields[]
}
```

A field always contains:

```text
InspectorField {
  id
  label
  readOnly
  source: AUTO | MANUAL | OVERRIDDEN | LOCKED
  value
  baselineValue?       // parameter fields only
  control?             // required only when editable
}
```

R13.10d activates only a finite number control:

```text
NumberControl {
  kind: number
  min
  max
}
```

Ids and labels are bounded strings. Values are deeply portable. Numeric bounds
are finite and ordered. Editable fields require a control; read-only fields
cannot smuggle an active control. Functions, DOM nodes, vendor objects, cycles,
duplicate ids, unbounded lists, and unknown keys fail before rendering.

The host creates `<input>`/badges/buttons from this schema. The package never
supplies HTML.

## FVG Inspector Groups

The resolved FVG view includes:

- **Semantic** — direction, lower/effective midpoint/upper values, immutable
  baselines, and `AUTO`/`OVERRIDDEN`/`LOCKED` badges;
- **Evidence** — exact three source Bars, selected Bar, accepted Workspace
  revision, Pane, initial Replay cutoff, and strict profile identity;
- **History** — package/type/definition versions, Artifact revision, qualifying
  override event count, latest editor/source revision, and editability reason.

Before the Artifact observation cutoff, the existing cutoff-aware Inspector
returns no groups and no semantic values. With the package disabled/missing,
the existing unresolved view preserves raw attributes and construction identity
read-only after observation. No edit action is exposed without an exact active
definition.

## Validated Inner-Zone Override

R13.10c's strict evidence-derived formation remains authoritative:

```text
baselineLower < baselineUpper
baselineMidpoint = baselineLower + (baselineUpper - baselineLower) / 2
```

One accepted override supplies both effective bounds. It is valid only when:

```text
baselineLower <= effectiveLower
effectiveLower < effectiveUpper
effectiveUpper <= baselineUpper
effectiveMidpoint = effectiveLower + (effectiveUpper - effectiveLower) / 2
```

The baseline values never change. A non-baseline zone marks all three effective
parameters `effectiveSource: override`. Supplying both exact baseline bounds is
an explicit reset and restores `effectiveSource: derived`; earlier events are
still retained.

Every accepted edit appends one deeply immutable event:

```text
FvgOverrideEvent {
  editorId
  editedAtEpochMs
  lowerPrice
  observedAtReplayCutoffEpochMs
  sourceArtifactRevision
  upperPrice
}
```

The three parameter records share byte-equivalent append-only
`overrideProvenance.events`. Source revisions strictly increase; no-op,
retrograde time, non-finite, crossing, expanding, malformed, or unbounded
events fail closed.

## Observation-Cutoff Edit Gate

A semantic edit can encode future knowledge even when it requests no Bars.
Therefore an FVG override is editable only while the accepted Replay cutoff is
exactly the Artifact's original `observedAtReplayCutoffEpochMs`.

- before observation: the Artifact is hidden;
- exactly at observation: lower/upper controls are editable;
- after observation: the same accepted state remains visible but controls are
  read-only with “Return to observation cutoff to edit” status;
- every override event records the original observation cutoff, so raw
  unresolved attributes and projections cannot reveal a value before its
  evidence was visible;
- the package never moves Replay or acquires Bars to satisfy the gate.

Wall-clock `editedAtEpochMs` and editor identity remain audit metadata; they do
not alter market-evidence chronology.

## Branded Revision Draft And Exact Command

The Registry accepts:

```text
createArtifactRevisionDraft({
  artifact,
  revision: {
    editedAtEpochMs,
    editorId,
    fields,
    replayCutoffEpochMs
  }
})
```

It resolves the exact stored package/type/definition identity, invokes the pure
revision policy, constrains output to portable attributes/presentation/
relations, and returns an opaque draft bound to package generation plus source
Artifact id/revision. A disabled/re-enabled generation, incompatible package,
foreign Registry, or stale source invalidates the draft.

Annotation Runtime exposes one command equivalent to:

```text
reviseSemanticArtifact({
  draft,
  expectedArtifactRevision,
  expectedDocumentRevision,
  sessionId
})
```

Runtime re-reads the branded draft through its injected Semantic port, checks
exact source Artifact/document/Session revisions and active status, and advances
Artifact plus document exactly once through existing history and Repository
prepare/apply/finalize/rollback. Package/UI code never calls the repository.

Undo, redo, reload, export/import, and compatible package re-enable preserve
the baselines, effective values, events, and construction identity.

## Inspector Controller Lifecycle

Selection captures one exact Artifact/document revision and Replay cutoff. The
controller creates field values only from the validated schema.

- each patch requires the exact local draft revision;
- generic host min/max checks run before package validation;
- the active package creates a new branded revision draft after each valid
  patch;
- the package-derived candidate is converted by an injected composition helper
  into at most eight transient Chart projections;
- Preview replacement is latest-wins and rollback-protected by the existing
  Chart owner;
- while a valid dirty Preview is visible, the fixture suppresses the same
  Artifact's accepted projections without changing accepted document bytes;
  Cancel restores those accepted projections and Apply settles to one accepted
  visual layer, so rollback retention never appears as a duplicate FVG;
- Cancel clears Preview and accepted state remains unchanged;
- Save submits the exact branded draft; stale/package-disabled/persistence
  failure retains the local draft and Preview for correction/retry;
- successful save clears selection/Preview only after Runtime success;
- reset uses baseline values through the same policy and command;
- dispose clears Preview and all selected/draft references.

## H112 Automated Gate

H112 must prove:

- bounded host schema acceptance and malformed/unbounded/DOM/function/cycle/
  duplicate negative controls;
- resolved Semantic/Evidence/History values and exact package/definition/source
  Bar identity;
- observation-cutoff hidden/editable/read-only states;
- valid inner-zone override, recomputed midpoint, immutable baseline, source
  badges, append-only editor/revision/time provenance, reset, and no-op reject;
- expanded/crossed/non-finite/stale/foreign/disabled-generation candidates fail;
- one exact Runtime Artifact/document revision per save plus undo/redo;
- durable reload and import/export retain override provenance;
- Repository apply/finalize failure restores exact prior bytes/document/history;
- Preview apply failure restores the prior transient projection; cancel/dispose
  leak no Primitive or draft;
- package disable makes the Inspector unresolved/read-only while retaining raw
  state; compatible re-enable restores validated fields/projections;
- zero FVG branch in Runtime/Interaction/Chart/Persistence and zero direct
  package DOM/Chart/Replay/Bar Data/storage/network access;
- real Chromium changes only Annotation primitives, preserves candlestick
  bytes/native pan/wheel, exposes the intended host-rendered controls, and
  renders exactly one FVG layer during Preview, Cancel, and Apply settlement;
- all standing architecture, writer, ModuleHost, source-quality, deployment,
  optional-removal, JSON, and diff gates remain green.

## Human Visual Gate

Before commit, the focused local fixture must let the user confirm:

1. exact FVG evidence and package/definition/history identity are legible;
2. baseline versus effective values and `AUTO`/`OVERRIDDEN` badges are clear;
3. a valid narrower zone previews and saves with midpoint alignment;
4. invalid/crossing edits fail visibly without changing the accepted Artifact;
5. Reset restores baseline while retaining visible history;
6. after-observation Replay is read-only and returning to observation restores
   editability;
7. disable shows unresolved preserved state and re-enable restores controls;
8. candles, labels, native wheel zoom, and drag navigation remain unchanged.

Accepted 2026-08-10. The first human pass identified overlapping accepted and
Preview FVG layers while the local draft was dirty. The fixture composition was
corrected to retain accepted document bytes while suppressing the accepted
Chart projections, show exactly one Preview FVG, restore the accepted layer on
Cancel, and settle to one accepted layer on Apply. H112's real-Chromium gate
now asserts that lifecycle explicitly. The user accepted the corrected
Semantic/Evidence/History surface, inner-zone edit flow, cutoff and package
lifecycle states, and unchanged native Chart behavior. H112 is accepted and
the temporary acceptance server was stopped.
