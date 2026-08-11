# V7 Production Manual FVG Workflow Closure — R13.10e

Status: accepted; H114 automated and focused human gates pass

Date: 2026-08-10

Accepted: 2026-08-11

Depends on: accepted R13.10a–R13.10d, P0a, ModuleHost, H109–H113

Harness: H114 / `tests/production-manual-fvg-workflow-browser-harness.js`

## Outcome

R13.10e closes one production user path from a discoverable built-in tool to
an evidence-constrained, durable Semantic Artifact:

```text
Core tool contribution
  -> active-Pane exact Bar Picker
  -> accepted Workspace/Pane/Replay evidence snapshot
  -> pure Evidence Resolver
  -> active Semantic package construction
  -> sole Annotation Runtime durable commit
  -> multi-Pane/no-future Chart projection
  -> host-rendered Inputs/Evidence/History Inspector
```

FVG is the first trusted-build reference package through the P0a thin waist.
The product route and UI render portable contribution metadata and validated
Inspector schemas; neither branches on the FVG semantic id. This step does not
create a Plugin Center, loader, public SDK, Community registry, detector, or a
second lifecycle owner.

## Upstream Reuse Decision

Lightweight Charts 5.2 officially supports Custom Series, Series Primitives,
Pane Primitives, attach/detach lifecycle, update callbacks, and axis/pane
rendering. Its current plugin examples include drawing tools and indicators:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/series-primitives>
- <https://tradingview.github.io/lightweight-charts/plugin-examples/>

The official examples and the awesome-tradingview catalog remain rendering or
Pine-script references; they do not supply V7's package lifecycle, exact Bar
evidence, durable revision, no-future, rollback, or host-rendered Inspector
contracts. R13.10e therefore adds no dependency. Existing V7 Chart-owned
Primitive and interaction adapters remain the only Lightweight Charts bridge.

## Production Owner Boundary

`optional.annotation-manual-workflow` is a removable composition owner. It may
hold only Session-scoped orchestration state: selected contribution, one Picker
controller, one host Inspector controller, the current accepted Workspace
snapshot, projection reconciliation sequence, and lifecycle/error status.

It receives public ports only and never becomes their owner:

- ModuleHost remains the sole module activation/disposal owner;
- P0a validates outer manifests and projects read-only package status;
- the Semantic Registry activates trusted inner definitions and constructs
  generation-bound drafts;
- the Evidence Resolver alone validates selected/neighbor Bars against the
  supplied accepted snapshot;
- Annotation Runtime remains the sole accepted Artifact/history writer;
- Annotation Persistence remains the only durable Annotation byte writer;
- Annotation Context Projection derives Pane/Replay-safe projection sets;
- the Chart adapter alone creates interaction leases and mutates Primitives;
- Replay Workspace UI dispatches commands and renders portable view models.

Removing the workflow, FVG, Picker, Inspector, persistence, or another required
optional port removes the workflow through the normal ModuleHost dependency
closure while the Session/Replay product still boots without annotation tools.

## Contribution-Driven Tool Binding

The workflow compiles the accepted P0a built-in plan from trusted manifests and
production module descriptors, then merges each outer `kind: tool`
contribution with an active inner Semantic tool descriptor by exact package id,
package version, contribution id, and contribution version. A tool descriptor
declares portable construction intent:

```text
SemanticConstructionTool {
  id
  version
  label
  semanticContributionId
  typeId
  typeVersion
  evidenceRequirement: {
    schemaVersion
    precedingBars
    followingBars
    maximumArtifactReferences
  }
}
```

The generic workflow invokes these values; it contains no `if FVG`, semantic-id
switch, field-id switch, or route-level package branch. The FVG package declares
the strict `[-1, 0, 1]` evidence requirement and type binding itself.

The compact toolbar label, package name/version/tier, description, parameters,
and lifecycle state come from the outer manifest plus P0a status projection.
Only `state: active` tools can arm. Inner Registry failure or an incompatible
binding fails closed and becomes visible workflow error state.

## Accepted Snapshot Adaptation

One exact Picker result is useful only against the still-current accepted
Workspace transaction snapshot. The workflow adapts, without requesting data:

- accepted Workspace revision;
- branded Session identity;
- selected Pane id and its exact immutable projected Bars;
- dataset, instrument, display-timeframe, and source-resolution identity;
- accepted Replay cursor as the exclusive evidence cutoff;
- exact visible Semantic Artifact identities/revisions.

The R13.10a Resolver must still find the selected Bar and every required
neighbor, prove each Bar closed by the cutoff, and reject missing, future,
stale, cross-Pane, malformed, or non-adjacent evidence. The workflow never
rounds a pointer coordinate, fills history, moves Replay, or substitutes a
nearby Bar.

## Durable Construction And Projection

After evidence resolution, the active tool binding supplies the exact type and
version to the Semantic Registry. Annotation Runtime commits the branded draft
at the exact document revision through the existing durable repository. A
construction failure creates no Artifact or projection.

Every accepted Workspace/Replay publication schedules a latest-wins
reconciliation from the durable document. The frame contains current accepted
Pane buckets, instrument/timeframe identity, Replay cutoff, Annotation revision,
and a strictly increasing reconciliation revision. Before-observation subjects
remain absent; compatible multi-Pane subjects map only through registered
anchor policies. Removed Pane Chart surfaces are never retained by the workflow.

Hard reload restores the Session-keyed Annotation document before projection.
Unknown or temporarily unavailable package meaning remains durable and
readable through the existing unresolved contract.

## Host-Rendered Inspector And Preview

Selecting a newly created or clicked projected Artifact opens one generic
right-side Inspector. The host derives its fixed tab order and group mapping
from the P0a parameter schema:

```text
Inputs -> Style -> Visibility -> Evidence -> History
```

Only declared tabs render; FVG therefore renders Inputs, Evidence, and History.
The package supplies validated group/field values, controls, baselines, and
source badges, never DOM or CSS.

An Inspector edit remains restricted to the Artifact observation cutoff. The
workflow suppresses the selected accepted projection while the package-
validated multi-Pane Preview is visible, so one Pane never displays accepted
and Preview copies simultaneously. Cancel restores exact accepted projections;
Apply first commits through Annotation Runtime and then settles the new accepted
projection. Preview or durable failures preserve the last accepted document and
surface a retryable error.

Replay-changing controls are locked only while a Picker lease, construction,
dirty draft, save, or rollback is active. Native Chart drag, wheel zoom, scale,
and crosshair behavior remain available.

## H114 Automated Gate

H114 must prove:

- production ModuleHost composition discovers FVG through a P0a tool
  contribution and no product-route semantic-id branch exists;
- outer/inner package, tool, version, semantic contribution, type, and evidence
  binding mismatch fails before a tool can arm;
- exact active-Pane Picker selection adapts only the current accepted snapshot;
- missing neighbor, non-FVG triple, stale Workspace, future/unclosed Bar, and
  package/workflow failure produce zero accepted Artifact writes;
- valid construction advances the durable Annotation document exactly once and
  hard reload restores the same Artifact/provenance;
- accepted and Preview projection settlement remains single-layer,
  rollback-safe, multi-Pane, cutoff-bound, and candlestick-byte neutral;
- the host renders only manifest-declared tabs and Registry-validated fields,
  with editable-at-observation and read-only-after-observation behavior;
- optional-removal, lifecycle cleanup, full production assembly, architecture,
  sole-writer, source-quality, deployment, JSON, regression, and diff gates
  remain green;
- real Chromium proves toolbar arm/cancel, exact click construction, Inspector
  edit/cancel/apply, persisted reload, native drag/wheel, and visible error
  settlement.

Representative negative controls are mandatory; positive-only product
automation cannot make H114 executable.

H114 passes six declarative negative controls plus its real-Chromium production
path. Its focused human visual gate was accepted on 2026-08-11, so H114 is
accepted.

## Human Visual Gate

The user confirmed the following on the focused production surface on
2026-08-11:

1. the Core FVG tool is discoverable, compact, and has clear armed/error state;
2. one exact candle click either creates one strict FVG or visibly explains why
   no FVG was created;
3. the resulting Inputs/Evidence/History panel is consistent and legible;
4. a valid inner-zone edit shows exactly one Preview, Cancel restores the
   accepted zone, and Apply persists one accepted zone;
5. Replay cutoff changes make editing read-only without hiding accepted history;
6. multi-Pane projection, native drag/wheel/scale/crosshair, candles, and labels
   remain correct;
7. a hard reload restores the Artifact and its override provenance.

That explicit review accepts R13.10e and H114. The intentional R13.10e toolbar
pixel change was recorded into the four affected R6.9 visual fixtures only
after this decision; the three unrelated H091 visual findings remain open and
were not re-recorded.

## Explicit Exclusions

- visual Core Plugin Center or user-facing enable/disable management;
- install-from-file, load-unpacked, archive format, public SDK/build tooling;
- Community discovery, signing, updates, permissions, restricted mode;
- executable Worker/WASM extensions or external code;
- automatic FVG detection, mitigation/fill state, alerts, ranking, Setup/AI;
- MA/SMA, BSL/SSL, Fibonacci, EQL/EQH, OB/Breaker, or another plugin family;
- Marketplace, payment, licensing, or product-scope expansion.
