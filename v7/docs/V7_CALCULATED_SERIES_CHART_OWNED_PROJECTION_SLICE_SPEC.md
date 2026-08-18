# V7 Calculated-Series Chart-Owned Projection Slice — Accepted Specification

Status: ten material decisions accepted on 2026-08-13 with decisions 7 and 8
amended; separately authorized P1c.2 implementation complete; H119 first review
rejected and whitespace-corrected on 2026-08-17, then accepted on corrected
focused human re-review; P1c.2 closed; no product/runtime availability

Drafted: 2026-08-13

Accepted: 2026-08-13

Upstream decisions: accepted `ADR-V7-006`, accepted `ADR-V7-005`, and accepted
`P1c.1`/`H118`

Accepted scope: the second required ADR-V7-005 dependency; synthetic,
Chart-owned projection mechanics and evidence only

## Product-Owner Direction

The product owner directed:

> 起草 V7 Calculated-Series Chart-Owned Projection Slice 候选规格；不实施，
> 不分配 P1c.2/H119，不启动 MA/SMA、实例/持久化/UI、Community/Worker 或
> P1b.4，不变更 H117。

That drafting instruction authorized the candidate specification and its
documentation record only. It did not accept the candidate, allocate `P1c.2`
or H119, or authorize production, SDK, schema, catalog, fixture, test, runtime,
adapter, persistence, or UI changes.

## Product-Owner Acceptance

After technical review, the product owner directed:

> 接受第 1–6、9–10 项，并按审阅建议修订第 7、8 项；不实施。

This acceptance makes the ten material decisions binding with decisions 7 and
8 replaced by the amended text below. It authorizes no implementation and
allocates neither `P1c.2` nor H119. Every exclusion and the H117/P1b.4 boundary
remain unchanged.

## Product-Owner Implementation Authorization

The product owner subsequently directed:

> 授权按已验收的 V7 Calculated-Series Chart-Owned Projection Slice 规格实现
> P1c.2，并分配 H119；不启动 MA/SMA、实例/持久化/UI、Community/Worker 或
> P1b.4，不变更 H117。

That instruction allocated P1c.2 and H119 and authorized only the synthetic,
Chart-owned projection slice specified here. It did not authorize product-route
wiring, an executable Profile, a named Indicator, a live instance owner,
persistence/UI, Community/Worker execution, P1b.4, or any H117 field change.

## Purpose

P1c.1 established portable calculated-series truth without a Chart writer. The
next dependency must prove that an already validated, complete synthetic
projection frame can be materialized through V7's existing sole Chart owner
without giving a Contribution, package, future calculation executor, or UI a
native handle.

A separately authorized implementation of this accepted specification would
establish:

- one removable, package-neutral calculated-series projection transaction;
- one bounded adapter bridge for native pane, Series, Price Scale, price-line,
  and host-owned band-Primitive mechanics;
- stable logical-to-native resource mapping for one mounted Workspace Pane;
- exact prepare/apply/rollback/finalize and disposal behavior;
- one synthetic real-Chromium fixture covering Main and internal Chart Regions;
- a future composition seam that can become a child stage of the existing sole
  Chart Snapshot Application.

The slice would not calculate an Indicator, own a live instance, persist a
layout, add an Indicator UI, or wire a visible feature into the production
Workstation. It is projection infrastructure, not MA/SMA or a generic layout
product.

## Binding Baseline

This accepted specification preserves the following repository truth:

- `analysis.calculated-series@1.0.0` is an active host contract descriptor but
  remains unavailable for SDK or production execution;
- only an exact host-owned Contribution binding can select that Profile;
- P1c.1 owns immutable Definition, Plot, Scale, Workspace document, result,
  projection-frame, provenance, limit, diagnostic, and migration contracts;
- a Workspace Pane is one independent product chart; an internal Chart Region
  is a vertically stacked region inside that same chart;
- Main/internal-region placement belongs to the host-owned instance document,
  not to an Indicator category or `overlay` boolean;
- the existing Chart Snapshot Application remains the sole outer Chart
  participant in a Workspace transaction;
- the Lightweight Charts adapter remains the only native Chart writer;
- new candles and calculated-series output may never display against different
  accepted Workspace snapshots or Replay cutoffs;
- Core and any future Community Contribution claiming the same Profile must
  use the same projection contract; trust must not create another Chart ABI;
- H117 remains `executable`, human-review-required, and unaccepted, and P1b.4
  remains paused.

The binding sources are
`V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md`,
`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md`,
`V7_REVERSIBLE_CHART_APPLICATION_R8_8.md`, and
`V7_GLOBAL_ATOMIC_WORKSPACE_TRANSACTION_R8_9.md`.

## Existing Owners This Slice Must Reuse

| Existing boundary | Authority retained | This slice must not duplicate it |
| --- | --- | --- |
| `core.calculated-series-contract` | branded Definition/document/frame values, Scale compatibility, no-future and stale identity | native resources, visible transaction state |
| `core.chart-snapshot-application` | sole outer Chart prepare/apply/rollback/finalize participant | calculated-series meaning or package lifecycle |
| `adapter.lightweight-chart` | all Lightweight Charts objects, calls, subscriptions, Canvas, and DOM-backed resource lifecycle | formula, instance persistence, package activation |
| Workspace/Replay/Bar Data owners | accepted Pane snapshot, cursor/cutoff, Bars and transaction identity | internal native region handles |
| `optional.annotation-chart-projection` | accepted Annotation Primitive projection only | calculated-series Plots, panes, or scales |

The calculated-series surface must not be added to route code, the broad P0a
`plugin-contract`, the Pane Workspace domain, Annotation projection, or a
package object. It is a focused concern expected to grow and therefore needs a
separate public boundary.

## Official And Ecosystem Capability Check

The repository pins `lightweight-charts@5.2.0`. The 2026-08-13 review checked
the pinned typings and these primary references:

- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://github.com/tradingview/lightweight-charts/tree/v5.2.0/plugin-examples/src/plugins>
- <https://github.com/tradingview/lightweight-charts/tree/v5.2.0/plugin-examples/src/plugins/bands-indicator>
- <https://github.com/tradingview/awesome-tradingview>
- <https://github.com/deepentropy/lightweight-charts-indicators>

The pinned API provides the required mechanics:

- `addPane(true)`, `panes()`, `IPaneApi.moveTo()`, `setStretchFactor()`, and
  `setPreserveEmptyPane()`;
- built-in Line, Histogram, Area, and Baseline Series with `setData()`;
- `ISeriesApi.moveToPane()`, ordering, Price Scale selection, and price lines;
- normal/logarithmic Scale modes, auto scale, and visible numeric ranges;
- Series Primitives with adapter-owned coordinate conversion and autoscale
  information.

The mechanics also impose constraints. Moving the last Series can automatically
remove an unpreserved pane. `removeSeries()` and `removePane()` are destructive.
Overlay price scales are always auto-scaled, and pane height has a native
minimum. Those behaviors require adapter-owned staging, stable host ids, clear
capability rejection, and deferred destructive cleanup.

The official Bands Indicator is useful only as a rendering reference. Its
example subscribes to Series data and calculates bands inside a Primitive. V7
may adapt the coordinate, segmented-fill, and autoscale pattern, but the host
Primitive must receive already validated band points and must not calculate,
subscribe to candle data, or own a Chart/Series.

The current awesome-tradingview inventory now lists
`lightweight-charts-indicators`. Its examples calculate named Indicators,
directly call `chart.addSeries()`/`setData()`, represent placement as an
`overlay` boolean, and create a second independently synchronized chart for an
RSI pane. Its broader output also combines calculated plots, Drawings, markers,
candle coloring, labels, and tables. These patterns conflict with V7's
user-owned placement, single-chart internal regions, sole writer, Profile
separation, and exact rollback boundary. The library is not adopted as a
dependency, registry, projection owner, or runtime in this slice. A later
trusted-formula decision may separately audit individual calculations.

The 2026-08-17 whitespace correction re-checked the official `WhitespaceData`
contract, the pinned 5.2.0 Line/Area/Baseline render path, and the current
awesome-tradingview inventory. `WhitespaceData` represents a time point without
a value, but the pinned connecting renderers operate on value rows and connect
the remaining adjacent points; the API does not promise a visible path break.
No ecosystem implementation found in that check preserved V7's sole-writer,
same-chart-region, reversible-resource, and package-neutral ownership rules.
The correction therefore uses only adapter-private built-in Series segmentation
and adds no dependency or writer.

## Specified Module And Ownership Boundary

P1c.2 adds one removable projection transaction and one adapter-internal native
bridge:

```text
optional.calculated-series-chart-projection
  owns: exact Pane-surface candidate validation, logical resource plan,
        preparation state, branded receipts, rollback/finalize orchestration
  imports: calculated-series-contract and small identity/value contracts
  receives: one bounded native-surface adapter by explicit construction
  imports no: package store, ModuleHost, Bars, Replay runtime, Workspace state,
              persistence, route, UI, DOM, Canvas, Worker, network

adapter.lightweight-chart / calculated-series-chart-surface
  owns: native pane/Series/PriceScale/price-line/host-band-Primitive handles,
        adapter-local formatter callbacks, paint/readback, and disposal
  exposes: bounded create/update/hide/move/readback/destroy operations only
  exposes no: Chart, Pane, Series, PriceScale, Primitive, HTMLElement, Canvas,
              callback, native pane index, or native priceScaleId
```

The projection transaction is not a second global Workspace participant. A
future production composition must nest its prepared state inside the existing
Chart Snapshot Application's one outer Chart stage. A separately authorized
implementation of this slice would remain unwired from the Workstation route
and exercise that seam only through a synthetic test composition.

This split follows the existing Annotation projection precedent while keeping
calculated-series lifecycle distinct. Annotation primitives and calculated-
series Plots may coexist on one chart, but neither projection module controls
the other.

## Exact Adapter-Facing Candidate

The slice needs one branded, deeply immutable in-process candidate. It is not a
portable wire, persistence schema, plugin SDK value, or package callback:

```text
CalculatedSeriesPaneSurfaceCandidateV1 {
  mode: workspace-stage | same-snapshot-settlement
  baseSurfaceRevision
  targetSurfaceRevision
  chartBinding
  definitions[]
  workspaceDocument
  projectionFrames[]
}

CalculatedSeriesChartBindingV1 {
  acceptedChartRevision
  workspaceTransactionIdentity
  workspacePaneId
  workspaceStateRevision
  projectedPaneSnapshotDigest
  replayVisibleThroughEpochMs
}
```

`chartBinding` is host-created from the exact candle/Workspace stage. It is not
accepted from a Contribution. `workspaceDocument`, `definitions`, and
`projectionFrames` must already be branded by P1c.1; structural lookalikes are
rejected.

Candidate closure requires:

1. exactly one Workspace document Pane matching `workspacePaneId`;
2. an exact Definition set for every resolved instance in that Pane, with no
   foreign or duplicate Definition;
3. exactly one projection frame for every resolved `visible` instance;
4. no frame for a hidden or unresolved instance;
5. exact document/instance/definition/Profile identity between the document
   and each frame;
6. one common Workspace transaction, Pane, Workspace revision, projected-Pane
   digest, Replay cutoff, and document revision across the complete surface;
7. strict forward surface revision and exact base revision CAS;
8. complete Plot Group placement and Scale compatibility before native
   planning;
9. no package object, executable, Bars, formula, UI command, native value, or
   open property bag.

The candidate is always a complete target surface. Neither mode accepts a
partial “update this Plot” patch. Reusing a target revision with different
canonical logical content is a hard collision.

## Visible-State Closure

The projector maps semantic state to visible resources exactly:

| Host state | Required native result |
| --- | --- |
| unresolved instance | no frame and no native resource |
| hidden resolved instance | no frame and no native resource |
| pending frame | accepted pending identity; no old or new Plot resource visible |
| empty frame | accepted empty identity; no Plot resource visible |
| unavailable/error frame | accepted diagnostic identity; no Plot resource visible |
| ready frame | complete eligible visible Plots and reference lines only |
| Plot/reference line with `visibleByDefault: false` | no native resource in this slice |

Style overrides in the host instance document replace the exact Definition
style before planning. The projection surface does not invent per-Plot settings
or treat a missing Plot as hidden. A ready frame remains complete even when a
declared Plot is not visibly materialized by its accepted default.

Crossing from ready to any non-ready state clears stale calculated-series
pixels in the same apply. The accepted logical snapshot retains the state and
diagnostics for future UI composition, but this slice renders no legend,
status badge, tooltip, or error panel.

## Stable Logical Resource Graph

The projection transaction plans by stable logical identities:

```text
Workspace Pane
  Chart Region: regionId
    Scale Group: scaleGroupId
      Scale anchor: scaleGroupId
      Plot: instanceId + plotGroupId + plotId
      Band Primitive: instanceId + plotGroupId + plotId
      Reference line: instanceId + plotGroupId + referenceLineId
```

The adapter keeps the corresponding native objects in private maps for one
mounted chart lifetime. Numeric pane indices, native Scale ids, handle object
identity, pixel height, Canvas coordinates, and DOM nodes never enter the
candidate, receipt, snapshot, persistence, SDK, or diagnostic payload.

One logical line, area, or baseline Plot may map to an ordered private set of
built-in Series handles, one per contiguous value run. That segment topology is
an adapter realization detail: candidates, receipts, snapshots, diagnostics,
and packages still expose exactly one logical Plot and no native handle. Only
the final segment carries the logical title so one Plot does not duplicate its
visible axis label.

Retaining the same logical Plot identity with the same native kind, Scale
Group, and segment count updates the same native handle set. A changed kind,
incompatible Scale Group, changed segment count, or generation requiring
replacement creates candidate-only handles, hides the prior handles during
apply, and destroys them only after finalize. Every private segment counts
toward the existing native Series/band ceiling before mutation.

## Native Chart Region Mapping

V1 materialization uses one Lightweight Chart per Workspace Pane:

- the required Main Chart Region maps to the existing native pane at index
  zero and never creates or removes the candle pane;
- every expanded internal Chart Region maps to one `addPane(true)` native pane;
- region order maps through adapter-owned pane moves, never persisted indices;
- positive `heightWeight` maps to relative `setStretchFactor()` intent rather
  than pixels;
- every old or candidate internal pane remains `preserveEmptyPane: true`
  throughout apply and rollback so the library cannot silently delete host
  layout truth;
- candidate-only panes may be removed during rollback; obsolete accepted panes
  may be removed only during finalize, in a deterministic safe order;
- all regions share the same native time scale and crosshair; no manual
  cross-chart synchronization exists.

This first slice accepts expanded regions only. A non-Main region with
`collapsed: true` returns an exact unsupported-capability diagnostic before any
native mutation. Interactive resize/reorder/collapse commands and durable
layout ownership remain in the later generic layout slice. Initial accepted
order and height intent are nevertheless materialized and rollback-safe here.

## Scale Group Materialization

Scale selection remains structural. A definition name, package id, Domain Tag,
Plot kind, `overlay` convention, or familiar Indicator behavior cannot choose
a native Scale.

For every internal calculated-series region containing materialized output,
exactly one `primary` Scale Group at local order zero is required and maps to
the pane's native right Scale. In Main, the candle Scale is the implicit
primary right Scale: a calculated-series `primary` group is optional, but if
present there may be only one at order zero and it must have the exact
compatible instrument-price and host candle-Scale policy. This preserves the
accepted ability to place an oscillator in Main using only an auxiliary Scale.

The remaining mapping is:

- an admitted Main primary group aliases the existing candle Scale;
- the first auxiliary group maps to the native left Scale;
- later auxiliary groups map to adapter-generated overlay Scale ids that stay
  private and are always axis-hidden;
- one adapter-owned non-painted Line anchor per materialized Scale Group keeps
  the native Series logically present while disabling its own line,
  last-value, default price-line, and crosshair-marker pixels; it owns host
  formatting, autoscale contribution, band attachment, and reference-line
  attachment.

The closed mapping is:

| P1c.1 intent | Native policy |
| --- | --- |
| `linear` | normal Price Scale mode |
| `logarithmic` | logarithmic mode; every visible value and reference line must be positive |
| `domain:auto` | native auto scale; retain adapter-local user range when the same logical Scale survives |
| `domain:fixed` | right/left Scale visible range with auto scale disabled |
| `symmetric-around-zero` with fixed magnitude | exact `[-magnitude, +magnitude]` on right/left Scale |
| `symmetric-around-zero:auto` | anchor autoscale range derived symmetrically from already validated visible values |
| `zeroPolicy:include` | anchor autoscale includes zero |
| `zeroPolicy:forbid-nonpositive` | preflight rejection of any nonpositive visible value |

Lightweight Charts documents overlay Scales as always auto-scaled. Therefore a
fixed or fixed-symmetric domain assigned to a generated overlay Scale fails
with a capability diagnostic; the adapter must not silently coerce it to auto,
normalize values, or move it to another region.

`host.price`, `host.decimal`, `host.percentage`, and `host.volume` map only to
host-owned formatters. Formatter callbacks are adapter code selected from the
pinned catalog; a Definition cannot supply a function. Adding calculated-
series output to the Main instrument-price Scale must not mutate candle data,
writer revision, Series options, price increment, formatter, or Series order.
With an admitted auto domain, its values are an intentional native autoscale
input and may change the computed visible price range; that change must remain
inside the same receipt and restore exactly on rollback.

## Standard Plot Mapping

V1 maps the P1c.1 catalog without a product-Indicator branch:

| Standard Plot | Native materialization |
| --- | --- |
| `line` | one built-in Line Series per contiguous value run |
| `histogram` | built-in Histogram Series with point color chosen against the declared base value |
| `area` | one built-in Area Series per contiguous value run |
| `baseline` | one built-in Baseline Series per contiguous value run |
| `band` | host-owned Series Primitive attached to the Scale anchor |
| reference line | price line attached to the Scale anchor |

All scalar points map `displayEpochMs / 1000` to the same Lightweight Charts
time used by candles. Explicit whitespace must break a line, area, baseline,
histogram, or band segment; the adapter never bridges a missing value. Because
the pinned connecting built-ins do bridge across `WhitespaceData`, line, area,
and baseline omit whitespace from native data and materialize each contiguous
value run as a separate adapter-private Series. Histogram retains native
whitespace data, while the band Primitive performs its own segmented fill and
stroke over validated upper/lower points. The Primitive reports adapter-derived
autoscale bounds and contains no formula, candle-data subscription, hit testing,
package callback, or business identity.

Colors, stroke widths, solid/dashed/dotted patterns, base values, fills, and
reference-line label visibility map from the closed P1c.1 styles. Native style
options are generated afresh by the adapter and never round-trip into portable
state.

The first slice uses complete `setData()` replacement and adapter-owned prior
snapshots for every accepted Plot update. It does not introduce incremental
`update()`/`pop()` optimization. Incremental projection may be considered only
with later equivalence and performance evidence.

## Projection Transaction

The public projection port is bounded to complete calculated-series surfaces:

```text
ChartCalculatedSeriesProjectionPort
  prepare(candidate) -> prepared
  apply(prepared) -> exact receipt
  rollback(prepared, receipt?)
  finalize(prepared, receipt)
  snapshot()
  dispose()
```

The lifecycle is exact:

- `prepare` is inert, allows only one active preparation, validates the entire
  P1c.1 closure and native capability, computes a deterministic logical diff,
  and calls no Chart method;
- `apply` rechecks candidate currency, captures prior data/options/visibility,
  pane order/stretch/preservation, Scale mode/range, reference-line state, and
  logical maps before the first native mutation;
- native apply contains no timer, network, package callback, or asynchronous
  calculation gap; it crosses one bounded Chart paint/readback boundary only
  after the complete candidate has been installed;
- destructive removal of an accepted Series, price line, Primitive, or pane is
  deferred; obsolete resources are hidden or detached reversibly during apply;
- the branded receipt binds base/target surface revision, Chart binding digest,
  candidate digest, exact logical resource inventory, and painted readback,
  but exposes no native handle;
- `rollback` requires the exact preparation/receipt when apply succeeded,
  restores prior handles, data, options, order, height, preservation, ranges,
  and visible inventory, then removes candidate-only resources;
- failed apply attempts reverse restoration. If exact restoration cannot be
  proved, the calculated-series surface is poisoned, refuses further writes,
  and reports the fault to the sole Chart Snapshot Application. Before another
  Chart command, that owner must either complete adapter-owned teardown/remount
  from its last accepted Chart snapshot or poison the current Chart activation;
  uncertainty in shared native pane/Scale state cannot be reported as a merely
  local failure;
- `finalize` publishes the target surface revision before destroying obsolete
  resources. Cleanup failure follows the same escalation path without
  rewriting accepted candle data, semantic ownership, or writer revision;
- `dispose` rolls back unfinished work, then detaches/destroys every owned
  calculated-series resource exactly once. Disposal is idempotent.

Logical retain/update/create/hide/destroy order is deterministic by region,
Scale Group, placement, instance, Plot Group, Plot/reference-line identity.
Failure injection at every phase must prove reverse-order restoration.

## Workspace Commit And Late Settlement

The same port supports two complete-candidate modes without introducing two
Chart writers:

### `workspace-stage`

The candidate is prepared against the exact candle stage which will become
visible in the same outer Chart transaction. Pending/empty/unavailable/error
frames carry no old points. A future production composition must nest the
prepared calculated-series surface inside the existing Chart Snapshot
Application and fold its receipt into the one outer Chart receipt. It must not
register this surface as another Workspace transaction participant.

### `same-snapshot-settlement`

A settlement is admitted and sequenced only by the Chart Snapshot Application
through its owned local child transaction. It does not register another global
Workspace participant, and no calculator, Contribution, package, or projection
port caller may bypass that owner to invoke the native adapter.

A later ready frame may replace pending/non-ready output only when the complete
candidate repeats the exact currently accepted Chart binding, document and
instance revisions, package/definition generation, parameters, input digest,
and Replay cutoff. It advances only the surface revision. Candle data, candle
writer revision, time scale, Viewport intent, Annotation state, and accepted
Workspace revision remain unchanged.

A newer candle/Workspace binding, a stale base surface revision, or any partial
frame makes settlement fail before side effects. Settlement still submits the
complete Pane surface rather than a Plot patch. Multi-Workspace-Pane settlement
coordination is not implemented by this slice; a later coordinator must compose
these one-Pane preparations atomically when an instance affects several mounted
Workspace Panes.

## Runtime Projection Ceilings

P1c.1 wire ceilings remain authoritative, but the first native projector needs
lower per-mounted-Pane admission limits:

| Resource per Workspace Pane candidate | Candidate V1 ceiling |
| --- | ---: |
| Chart Regions including Main | 8 |
| materialized Scale Groups | 16 |
| visible built-in Series plus band Primitives | 64 |
| visible reference lines | 64 |
| total visible Plot point records | 100,000 |
| total owned logical native resources | 256 |

The limit check occurs during inert preparation. A structurally valid P1c.1
document which exceeds native admission remains valid portable state but
returns an honest projector resource-limit diagnostic. The projector never
silently drops a Plot, reference line, Scale, or region.

## Diagnostics

Stable diagnostics use a `CALCULATED_SERIES_CHART_` prefix and structured
logical identities. The first catalog must distinguish at least:

- unbranded, foreign, incomplete, duplicate, or non-current candidate input;
- missing/foreign Definition, instance, Plot Group, frame, or placement;
- stale base/target surface revision and revision-content collision;
- candle-binding, snapshot, cutoff, document, instance, or generation mismatch;
- unsupported collapsed region, Scale topology, fixed overlay domain, or
  native capability;
- nonpositive logarithmic value, invalid formatter mapping, or incompatible
  Main candle Scale;
- resource-limit, native identity collision, and unexpected native inventory;
- prepare phase, receipt, apply, painted-readback, rollback, finalize, disposal,
  and poisoned-surface failure.

Messages may improve, but code, phase, logical identity, and deterministic
ordering are machine meaning. Diagnostics contain no native id or stack-derived
DOM/Canvas detail.

## H119 Conformance Evidence

The separate implementation authorization allocated H119. Its independent
gate covers:

1. branded complete candidate closure, exact Chart binding, revision collision,
   and declarative negative fixtures;
2. stable logical resource planning with no native value escaping receipts or
   snapshots;
3. all five standard Plot kinds, reference lines, style overrides, explicit
   whitespace, bounded private segment-Series topology, and deterministic
   z-order;
4. Main candle-Scale sharing, internal primary Scale, auxiliary Scale,
   fixed/auto/symmetric/logarithmic behavior, host formatters, and rejected
   unsupported overlay domains;
5. one real Lightweight Charts chart containing candles plus Main overlay and
   one internal synthetic region—never a second synchronized chart;
6. ready to pending/empty/unavailable/error clearing with no stale pixels, then
   exact same-snapshot pending-to-ready settlement;
7. a synthetic Plot Group moved between Main and an existing internal region
   using the same validated points and without calculation or candle mutation;
8. failure injection after every native mutation phase, exact rollback,
   deferred destructive cleanup, poison behavior, and idempotent disposal;
9. unchanged candle data/writer revision during projection-only settlement and
   unchanged Replay, Viewport, Workspace, Annotation, package, and persistence
   owners;
10. native wheel/drag/zoom/Crosshair behavior, shared time alignment, responsive
    pane containment, and screenshot evidence in real Chromium;
11. pixel readback at two probes across every synthetic line/area/baseline gap,
    requiring zero bridge-colored pixels, plus a raw pinned-native Line Series
    sensitivity control that must detect its known bridge;
12. projector absence/removal leaves the existing chart path behaviorally and
    visually unchanged under the same synthetic input;
13. H118, H116, H117, Chart adapter, Chart Snapshot Application, global
    transaction, architecture, source-quality, and complete existing Harness
    regressions.

Because P1c.2 adds real synthetic pixels, its human gate reviews the focused
browser evidence for Plot/Scale/region correctness.
It would not be product UI or MA/SMA acceptance, and it would authorize no
production Workstation wiring.

## Explicit Exclusions

This accepted specification does not authorize or include:

- a formula engine, calculation scheduler, incremental calculation state,
  trusted calculation adapter, Worker, or Community executor;
- MA, SMA, EMA, RSI, ATR, MACD, Volume, Bollinger Bands, or any named product
  Indicator definition or package;
- a live calculated-series instance/document owner, settings commands,
  persistence adapter, Session migration, Server State Sync, or unresolved-
  instance product workflow;
- Add Indicator, Plugin Center changes, legends, tooltips, status surfaces,
  settings dialogs, region headers, keyboard commands, or any production UI;
- interactive region creation/removal/reorder/resize/collapse or persistence of
  layout changes; `collapsed: true` remains a later capability;
- production Workstation route/composition wiring or a change to current
  visible product pixels;
- a second chart per internal region or manual time-scale/Crosshair sync;
- plugin-owned Custom Series, Series/Pane Primitive, renderer, formatter,
  native Series/Scale/pane handle, DOM, Canvas, WebGL, or subscription;
- candle recoloring, markers, custom candles, Drawings, FVG/SMT/Fibonacci,
  Semantic Artifacts, anchored studies, detectors, labels, tables, or a
  universal visual ABI;
- adoption of `lightweight-charts-indicators`, oakscript, another external
  dependency, or a concrete Indicator registry;
- SDK/Profile availability, Manifest fields, Installed activation, remote
  registry, signing, Marketplace, P2, P3a, or P3b;
- H119 acceptance/reclassification, P1b.4, H117 acceptance/reclassification,
  or any H117 field change.

## Accepted Material Decisions

The product owner accepted decisions 1–6 and 9–10 as drafted and accepted
decisions 7 and 8 with the technical-review amendments recorded here:

1. the slice establishes a removable package-neutral projection transaction
   plus an adapter-internal native bridge; the existing Chart Snapshot
   Application remains the sole outer Chart participant and the Lightweight
   Charts adapter remains the sole native writer;
2. the projector accepts only one complete branded Pane-surface candidate made
   from exact P1c.1 Definitions, Workspace document, projection frames, and a
   host-created candle binding; no partial Plot patch or structural lookalike
   may reach native planning;
3. Main and internal Chart Regions use one native chart with stable host-id
   maps, preserved empty panes, relative stretch factors, and no portable
   indices/handles; the first slice materializes initial expanded layout but
   rejects collapsed regions and adds no layout commands;
4. line, histogram, area, and baseline use built-in Series, while band and
   reference lines use host-owned anchor resources; official renderer patterns
   may be adapted, but no package/community renderer, calculation subscription,
   second-chart pattern, or new dependency is admitted;
5. Scale realization remains structural: internal primary/right, compatible
   Main primary/candle-right, first auxiliary/left, and later auxiliary/overlay
   mappings are adapter mechanics; exact domain, transform, zero, and formatter
   policies either materialize faithfully or fail before mutation without
   coercion;
6. hidden, unresolved, pending, empty, unavailable, and error states project no
   stale Plot resources; ready state uses complete `setData()` replacement and
   explicit whitespace, with incremental native updates deferred;
7. prepare is inert, apply is complete and receipt-bound, rollback restores
   exact prior resources and layout, and finalize alone destroys obsolete
   accepted resources. Unprovable restoration poisons the calculated-series
   surface and escalates to the sole Chart Snapshot Application, which must
   complete adapter-owned teardown/remount from its last accepted snapshot or
   poison the current Chart activation; shared native uncertainty cannot be
   treated as a local failure, while accepted candle data, semantic ownership,
   and writer revision remain unchanged;
8. workspace-stage and exact same-snapshot settlement share one complete-
   surface state machine and are admitted and sequenced only by the Chart
   Snapshot Application. Settlement is a Chart-owned local child transaction,
   not another global Workspace participant; no calculator, Contribution,
   package, or projector may bypass the Chart owner, and a newer candle/
   Workspace identity rejects stale settlement before any side effect;
9. an independently numbered gate must combine deterministic negative
   controls with a real single-chart synthetic Main/internal-region browser
   fixture, failure rollback, native interaction, candle-owner invariance, and
   focused technical human review;
10. specification acceptance authorizes no implementation,
    `P1c.2`/H119 allocation, product wiring, MA/SMA, live instance/persistence/UI,
    Community/Worker, P1b.4, or H117 change; each requires the separately
    accepted sequence and explicit later instruction.

## P1c.2 Implementation Record And Later Sequence

The product-owner acceptance made all ten decisions binding with the two
recorded amendments. The later implementation instruction allocated P1c.2 and
H119. P1c.2 now provides:

- removable `optional.calculated-series-chart-projection` complete-surface
  candidate, plan, preparation, receipt, rollback/finalize, and disposal
  contracts;
- one Chart Snapshot Application-owned local admission/fault boundary, without
  registering a second Workspace transaction participant;
- one adapter-private Lightweight Charts resource bridge for one-chart Main
  and internal regions, structural Scales, segmented Line/Area/Baseline and
  native Histogram Series, host band Primitive, and reference lines;
- deterministic fake-surface failure evidence plus a real Chromium one-chart
  synthetic fixture and focused screenshot.

The first H119 review on 2026-08-17 rejected the fixture because the pinned
Line/Area/Baseline built-ins connected value rows across the middle whitespace
point. The authorized correction maps their contiguous value runs to private
Series handles, extends preflight ceilings and reversible lifecycle coverage to
every handle, and adds real-pixel no-bridge evidence with a native sensitivity
control. This corrects the implementation of the already binding explicit-
whitespace requirement; it does not amend the ten accepted material decisions
or broaden delivery authority.

The module is intentionally not constructed by the production Workstation
route. The product owner accepted the corrected focused evidence on 2026-08-17;
H119 is `accepted`, its correction session is the durable acceptance evidence,
and P1c.2 is closed. The prerequisite for a trusted Core MA/SMA vertical-slice
candidate is satisfied. The product owner later authorized only that candidate
draft, now recorded in `V7_CORE_SMA_SINGLE_PLUGIN_VERTICAL_SLICE_SPEC.md`: one
Moving Averages package, one SMA Definition, and no other plugin. The product
owner accepted all ten decisions without amendment on 2026-08-17. Its proposed
`P1c.3`/H120 labels remain unallocated, and it authorizes no implementation.
Generic layout, another algorithm/plugin, Community/Worker integration, real
Indicator catalog decisions, and P1b.4 remain independently gated.
