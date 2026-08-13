# V7 Generic Indicator Projection And Chart Regions — Candidate Specification

Decision id: `ADR-V7-005` candidate

Status: product-owner-directed draft prepared 2026-08-12; not accepted;
implementation, delivery ids, Harness activation, P1b.4, and external indicator
execution are not authorized

Date drafted: 2026-08-12

## Authority And Current Boundary

The product owner directed V7 to treat indicator sub-panes as a generic host
capability rather than an RSI-, ATR-, MACD-, or other indicator-specific
feature. The same capability must support Core Plugins and future Community
Plugins. Main-price placement is also not a fixed indicator category: an MA
normally defaults to the price chart but a user may choose to place that same
indicator instance in a separate chart region.

This document turns that direction into a reviewable candidate specification.
It does not accept the candidate, change the current product, add an Indicator
runtime, make a local package executable, alter the P1a/P1b catalogs, register
a Harness, or begin the deliberately paused P1b.4 MCP slice. Every executable
step remains subject to a later explicit product-owner authorization.

## Candidate Decision Summary

V7 should add one vendor-neutral, host-owned Indicator projection and internal
Chart-region mechanism. Indicator plugins calculate from immutable no-future
inputs and return declarative output. The host owns Indicator instances,
effective settings, placement, regions, scales, lifecycle, persistence,
diagnostics, and conversion to Lightweight Charts resources.

The proposed model has these defining properties:

1. main chart and sub-pane are placement targets, not indicator types;
2. a plugin definition supplies output semantics and a default placement, while
   the user-owned Indicator instance supplies the effective placement;
3. one Indicator may produce several plots and several independently placeable
   Plot Groups;
4. compatible plots may share a Chart Region or Scale Group, while incompatible
   values are never silently normalized onto one axis;
5. Core and future Community Indicator Plugins use the same definition,
   instance, calculation-result, and Chart-projection contracts;
6. distribution and trust tier may change the calculation executor and resource
   policy, but never grant direct Chart, Series, pane, DOM, Canvas, Replay, Bar
   Data, or persistence handles;
7. every visible result is bound to an exact Workspace Pane snapshot and Replay
   cutoff, and stale Indicator output is never shown against newer candles;
8. the existing Chart adapter remains the only native pane/series writer.

## Relationship To Existing Decisions

This candidate preserves the accepted V7 product and architecture:

- validation remains the product outcome and Replay remains the controlled
  observation environment;
- V7 remains focused on the accepted SMC/ICT workstation rather than becoming
  a general technical-analysis product merely because the host can render
  generic indicators;
- Kernel Session, Replay, Bar Data, Workspace, Chart, persistence, and
  ModuleHost owners remain non-plugin infrastructure;
- ADR-V7-004's Core/Community package taxonomy, strict TypeScript/compiled ESM
  authoring model, host-rendered settings, declared dependencies, least
  privilege, and later isolated Worker boundary remain binding;
- MA/SMA remains an already classified Core Plugin capability; RSI, ATR, MACD,
  Volume, Bollinger Bands, or any other example in this document is not thereby
  classified as Core or authorized for implementation;
- Drawing Geometry and Semantic Artifact projection remain separate from
  calculated Indicator output under ADR-V7-001;
- current P1a/P1b Indicator contribution and `subpane.runtime` availability
  remains `unavailable`; P1b local packages remain installed-but-inactive and
  non-executing.

The candidate proposes to promote only MEMO-V7-001's calculated-indicator,
host-mediated Chart-contribution, native-sub-pane, resource-budget, and
Core/Community compatibility positions. It does not promote that memo's
general-futures repositioning, Setup/AI system, registry operation, arbitrary
native renderer, commercialization, or Marketplace positions.

## Upstream Capability And Reuse Decision

V7 already pins Lightweight Charts 5.2.0. The official native Pane API was
tested before R6.5 and is suitable for vertically stacked regions which share
one chart time scale. Relevant native operations include series creation with
a pane index, `moveToPane`, `addPane`, `panes`, `removePane`, pane height and
stretch-factor control, and resizable separators.

Official references:

- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/panes>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IChartApi>
- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi>
- <https://tradingview.github.io/lightweight-charts/tutorials/analysis-indicators>
- <https://github.com/tradingview/awesome-tradingview>

Those APIs prove rendering feasibility, not V7 ownership. The official
Indicator helper examples may attach to a source Series, subscribe to its data,
calculate, and write another Series. That helper ownership is incompatible with
V7's sole Chart writer. V7 may adapt separately audited pure calculations or
calculation fixtures, but the host must schedule them and the Chart adapter must
materialize their declarative output.

The existing community audit remains controlling: the reviewed
`lightweight-charts-indicators` package is only a calculation-adapter candidate.
No reviewed community library is adopted as a Chart controller, Indicator
runtime, Pane owner, persistence owner, or production dependency through this
candidate.

## Terminology

Two earlier uses of Pane must no longer be overloaded in the public Indicator
contract.

| Term | Meaning | Owner |
| --- | --- | --- |
| `WorkspacePane` | existing independent product chart with Pane-local instrument, timeframe, Viewport, and presentation under the shared Replay clock | existing Workspace owners |
| `ChartRegion` | vendor-neutral vertically stacked plot region inside exactly one Workspace Pane/chart instance | future host Indicator-layout owner; native mechanics stay in Chart adapter |
| `MainChartRegion` | mandatory region containing the Workspace Pane's candle Series | Chart adapter; never removable or plugin-owned |
| `IndicatorInstance` | one user-configured use of one exact Indicator definition in one Workspace Pane | future host Indicator-instance owner |
| `PlotGroup` | atomic placement unit containing one or more related plots which move together | definition declares; instance places; host validates |
| `Plot` | one declarative line, histogram, area, baseline, band, or later negotiated standard output | plugin definition/result semantics; Chart adapter renders |
| `ScaleGroup` | host-owned, region-local vertical transformation, range, formatter, axis, and compatibility group shared by eligible Plot Groups | host |
| `IndicatorProjectionFrame` | complete immutable pending/ready/empty/unavailable/error projection for one exact instance/input/cutoff revision | host projection boundary |

`ChartRegion` is intentionally vendor-neutral. A persisted value never stores a
Lightweight Charts pane handle or numeric `paneIndex`. Native indices change
when a region is moved or an empty native pane is removed. The adapter maps
stable host ids to native resources only for the lifetime of one mounted chart.

## Product Behavior

The same generic behavior must cover all of these examples:

| Indicator output | Suggested default | Valid user choice when the host can realize its Scale intent |
| --- | --- | --- |
| MA/SMA/EMA line | Main Chart Region on the instrument-price Scale Group | its own Chart Region or another compatible region |
| RSI-like oscillator | new Chart Region with bounded percentage Scale | Main Chart Region on an auxiliary Scale Group, its own region, or a compatible region |
| ATR-like line | new Chart Region with price-distance Scale | Main Chart Region on an auxiliary Scale Group, its own region, or a compatible region |
| MACD-like output | one new Chart Region containing histogram, primary line, signal line, and zero reference | another compatible region or a host-supported auxiliary Scale Group |
| Volume histogram | host-supported Main-region lower overlay or a new Chart Region | another compatible volume region |
| custom Indicator Plugin | definition-supplied standard Plot Groups and defaults | every host-supported placement satisfying the same structural and Scale rules |

These rows are examples, not hard-coded branches. Kernel, Workspace, Chart,
and UI code must never switch on `rsi`, `atr`, `macd`, `ma`, publisher, package
id, or another concrete Indicator identity to select placement or rendering.

The user-facing operations proposed by this candidate are generic:

- add an Indicator instance to one Workspace Pane;
- open host-rendered Inputs, Style, and Visibility settings;
- move one Plot Group to Main, a new region, or an existing eligible region;
- move all groups of one Indicator together when requested;
- create, reorder, resize, collapse, expand, and remove eligible Chart Regions;
- reorder Plot Groups and plots within host bounds;
- inspect the effective definition/package/version, settings source, input
  provenance, calculation state, cutoff, diagnostics, and resource use;
- disable/remove an instance without disabling or uninstalling its package;
- preserve an unresolved instance when its package is disabled, absent,
  incompatible, quarantined, or uninstalled.

Removing a non-empty Chart Region never silently deletes its Indicator
instances or Plot Groups. The host requires an explicit compatible destination
or an explicit removal command for every remaining group before the canonical
region can disappear.

Moving a Plot Group changes projection/layout state only. It must not alter the
Indicator formula, accepted parameters, input Bars, Replay cursor, Workspace
Pane identity, or calculation output revision.

## Generic Definition Contract

The future public SDK should express an Indicator definition in strict,
versioned, machine-readable terms. The following is illustrative, not a wire
schema implemented by this document:

```text
IndicatorDefinitionV1 {
  definitionId
  definitionVersion
  inputProfile
  parameterSchemaVersion
  deterministic: true
  noFuture: true
  warmupRequirement
  plotGroups[]
}

PlotGroupDefinitionV1 {
  plotGroupId
  plots[]
  scaleIntent
  referenceLines[]
  defaultPlacement: main | own-region
  presentationHints
}
```

Definition and Plot Group ids are stable within a definition version. An
upgrade which renames, splits, merges, or removes a group must provide a
declarative migration or leave the old instance unresolved. The host never
guesses that two differently identified groups have the same meaning.

`defaultPlacement` is a default, not a plugin-controlled prohibition. Standard
declarative plots may be moved wherever the host can satisfy their Scale and
resource requirements. A separately authorized privileged renderer may later
declare structural placement constraints, but that cannot be smuggled into the
ordinary Indicator profile.

One Indicator may declare multiple Plot Groups. For example, a future custom
plugin could emit a price band to Main and an oscillator group to a separate
region. Each group has independent placement and Scale intent while retaining
one Indicator-instance and calculation provenance identity.

## Standard Plot Contract

The public contract should use a versioned catalog of host-rendered standard
plots rather than executable renderer callbacks. The initial candidate catalog
needs at least:

- `line`;
- `histogram`;
- `area`;
- `baseline`;
- a bounded host-rendered `band` composition;
- immutable horizontal reference lines tied to a Scale Group.

Each Plot declares a stable `plotId`, ordered time/value points or explicit
whitespace, host-supported style tokens, visibility, legend metadata, and its
Scale Group relationship. Output timestamps must be monotonic, unique per Plot,
and traceable to eligible input time coordinates. `NaN`, infinities, executable
values, arbitrary formatters, CSS, HTML, Canvas callbacks, native handles,
future timestamps, and undeclared plot kinds fail closed.

Markers, candle recoloring, custom series, Pane Primitives, and native Canvas
renderers remain separately negotiated output capabilities. They do not enter
the baseline merely because Lightweight Charts supports related APIs.

## Scale Intent And Compatibility

Scale compatibility is determined by declared value semantics, not Indicator
name. A candidate `ScaleIntentV1` needs at least:

```text
ScaleIntentV1 {
  dimensionId
  unitVersion
  transform: linear | logarithmic
  domain: auto | fixed | symmetric-around-zero
  fixedMinimum?
  fixedMaximum?
  formatter: host-supported-format-description
  zeroPolicy
}
```

Initial host dimensions may include instrument price, price distance,
percentage, ratio, volume, and unitless values. A future namespaced custom
dimension must carry a versioned declarative formatter and is compatible only
with the exact accepted dimension/version unless a host conversion capability
exists. Plugin code never formats axis DOM directly.

Two Plot Groups may share one Scale Group only when the host proves their
dimension, unit version, transform, domain constraints, formatter, and zero
policy compatible. Fixed domains must agree. A bounded `0..100` oscillator
cannot silently share an auto-scaled price-distance axis; the host offers a new
region or an additional supported Scale Group instead.

One Scale Group belongs to exactly one Chart Region. Compatibility allows the
host to create an equivalent region-local Scale Group; it never stretches one
native vertical range across multiple regions. Moving an MA from Main to its
own region therefore retains instrument-price semantics but receives an
independently autoscaled vertical range.

A Chart Region may contain several Scale Groups only within an advertised host
capacity. The initial executable profile may deliberately allow one primary
visible Scale Group per Indicator region plus bounded auxiliary behavior in
Main, while preserving the versioned many-group model. Unsupported axis or
capacity requests fail during definition/placement validation, never through a
runtime visual approximation.

Reference lines are declarative values associated with a Scale Group. RSI-like
`30/70`, a zero line, or a custom threshold uses one generic contract. A
reference line does not identify or classify the Indicator.

## Instance And Layout State

The host, not the plugin, should own one immutable versioned
`IndicatorWorkspaceDocument` for Indicator instances and Chart Regions. Its
candidate shape includes:

```text
IndicatorWorkspaceDocumentV1 {
  sessionId
  revision
  workspacePanes[] {
    workspacePaneId
    regions[] {
      regionId
      kind: main | indicator
      order
      heightWeight
      collapsed
    }
    indicatorInstances[] {
      instanceId
      packageId
      packageVersion
      definitionId
      definitionVersion
      parameters
      visibility
      plotGroupPlacements[] {
        plotGroupId
        regionId
        scaleGroupId
        order
      }
      lifecycleState
    }
  }
}
```

The Main Chart Region has a stable host identity per Workspace Pane. It always
contains the candle Series and cannot be removed, moved out of its Workspace
Pane, or replaced by a plugin. Indicator Plot Groups may use its compatible
primary price Scale Group or bounded auxiliary Scale Groups.

Region order and normalized height weight are canonical host presentation
intent. Pixel height, native pane index, DOM geometry, Canvas coordinates, and
vendor handles are adapter state and never persisted. The host enforces
responsive minimums, maximum region count, accessible resizing, and a usable
Main region. A plugin may offer a bounded default height hint; it cannot reserve
screen pixels or prevent user resizing.

Parameter sources retain ADR-V7-004's precedence: instance overrides profile/
default, which overrides definition default. Effective Plot Group placement is
also an instance-level host value with a profile/default for future instances.
Placement is not a calculation parameter, so moving a group cannot invalidate
or recompute an otherwise identical calculation result.

The exact persistence adapter and Server State Sync inclusion require a later
implementation contract. Regardless of storage mechanics, package code never
writes the document. Missing, disabled, quarantined, incompatible, or
uninstalled definitions retain host-owned instance/settings/layout identity as
an explicit unresolved state until the user removes or successfully migrates
it. No stale visual Series remains mounted merely to preserve that identity.

## Calculation Input And No-Future Contract

An Indicator executor receives only a host-produced immutable input envelope.
At minimum it binds:

- Session and activation generation;
- Workspace Pane, instrument, display timeframe, Session Hours, and dataset
  provenance;
- exact accepted Pane snapshot and input revision;
- exact Replay-visible-through cutoff;
- canonical effective parameters and their hash;
- ordered eligible Bars and an explicitly bounded warmup prefix;
- cancellation, resource, and output limits;
- exact package, definition, executor, SDK, and host API identities.

The plugin cannot request Bars, extend history, select another instrument or
timeframe, read a later cutoff, inspect sibling Pane state, move Replay, or
retain a mutable owner handle. A definition may declare a bounded warmup
requirement. A host input planner decides whether accepted Bar Data can satisfy
it; unavailable history produces an explicit unavailable/partial policy result
rather than a plugin-owned acquisition.

Output is deterministic for exact definition code, input envelope, parameters,
and executor version. Every output point must be eligible at the supplied
cutoff. Future-leaking lookahead, evidence-displacing time offsets, repaint-
dependent behavior, undeclared other-timeframe/symbol input, and realtime
rollback assumptions fail conformance.

Incremental calculation may accept a separately versioned, bounded opaque
calculation state under the executor's ownership. A complete recomputation at
the same input/cutoff remains the oracle. Append or tail replacement output and
state must be byte-equivalent to that oracle, and backwards movement,
replacement, incompatible parameters, version change, or uncertain lineage
must discard incremental state.

## Projection And Visible-Truth Contract

Calculation output is not a native Chart command. The host validates and
normalizes it into an immutable `IndicatorProjectionFrame` containing:

- exact Session/activation/Workspace Pane/snapshot/cutoff identity;
- package/definition/instance/parameter/calculation revision identity;
- complete Plot Group and Plot output for that instance;
- pending, ready, empty, unavailable, or error state with stable diagnostics;
- input and dataset provenance;
- resource/timing accounting;
- no native Chart, Series, pane, scale, DOM, Canvas, or executable value.

On a Replay or Workspace snapshot change, visible candles and every mounted
Indicator state must refer to the same accepted snapshot/cutoff. The complete
Chart transaction first stages either exact ready output or an exact pending/
empty/unavailable/error state for every instance; a pending frame contains no
older Plot data. The accepted candle snapshot therefore never appears beside
stale Indicator values. A later calculation result may replace pending through
an Indicator-only exact-revision transaction only while the same Pane snapshot,
cutoff, instance revision, and package generation remain current.

An optional Indicator must not permanently block Replay. The future profile
defines a bounded synchronous inclusion budget; an unfinished calculation
crosses the candle commit as an honest pending frame with no stale Plot data.
Timeout, resource exhaustion, invalid output, Worker failure, or unavailable
warmup becomes an attributed non-ready projection. Whether a separately
classified required Core contribution rejects a transaction is an
implementation-spec decision; ordinary optional Indicators fail isolated and
honest.

Indicator-only commands such as placement, style, or parameter changes bind to
the exact current accepted Workspace snapshot. The future projection owner
prepares every affected mounted Workspace Pane, applies through Chart-owned
ports, accepts only exact receipts, and rolls back all applied surfaces on
failure. A newer Workspace or Indicator-document revision makes older work
stale before visible mutation.

The Chart adapter remains the only owner allowed to create, update, order,
move, remove, or dispose native panes, Series, Scale resources, reference lines,
or subscriptions. Empty native-pane auto-removal is an adapter mechanic; it
cannot mutate canonical ChartRegion state implicitly.

## Proposed Owner Matrix

| Owner | Owns | Must not own |
| --- | --- | --- |
| Indicator Plugin definition | formula/policy, parameters, stable Plot Groups, Scale intent, defaults, fixtures | Chart/DOM handles, user instances, Bars acquisition, Replay, persistence |
| ModuleHost | exact activated Core/future Community generation and reverse disposal | Indicator instance state, calculations, Chart state |
| existing Workspace owners | Workspace Pane membership, instrument, timeframe, Viewport, accepted snapshot | internal ChartRegion layout or Indicator package state |
| future Indicator-instance owner | sole accepted instance/document revisions, effective placement/settings, unresolved lifecycle state | Bars requests, Replay cursor, native Chart mutation |
| trusted calculation adapter or future Worker adapter | bounded execution mechanics, cancellation, resource measurement | product state, Chart, DOM, storage, network, owner handles |
| future Indicator projection coordinator | exact result validation, stale rejection, complete affected-surface preparation/rollback | native rendering, Bar acquisition, package activation |
| existing Chart adapter | stable-id-to-native mapping, pane/Series/Scale/reference-line lifecycle, visible receipts | Indicator meaning, formula, Replay, Bars, durable layout |
| host UI | accessible commands, menus, legends, dialogs, status and diagnostics | direct state, calculation, Chart, or storage writes |
| future persistence adapter | versioned byte mechanics and exact reversible writes | semantic ownership or package execution |

An implementation may choose smaller internal helpers, but it may not collapse
these long-lived responsibilities into route code, a plugin object, or the
existing Pane Workspace domain.

## Core And Community Compatibility Requirements

Core and future Community Indicator Plugins must share all public semantic
contracts:

- one `IndicatorDefinition` and parameter-schema model;
- one immutable input envelope and no-future rule;
- one Plot/Plot Group/Scale intent catalog;
- one Indicator-instance and ChartRegion placement model;
- one projection-frame and diagnostic model;
- one golden/full-recompute conformance model;
- one host-rendered Settings and placement experience;
- one unresolved/upgrade/migration model;
- one visible Chart contribution and cleanup contract.

Trust tier changes only execution and distribution mechanics:

- trusted Core code may execute through a first-party build adapter after a
  separately authorized implementation;
- future Community executable code may run only through the separately
  authorized isolated TypeScript-to-ESM Worker tier with stricter budgets;
- a future declarative formula tier may use a bounded FormulaEngine, but it must
  emit the same result contract;
- privileged native renderers require a distinct reviewed capability and are
  not part of ordinary Indicator compatibility.

An Indicator package never receives extra Chart authority because it is Core.
A Community package is not forced into a second reduced projection model. A
definition which is portable across tiers preserves its ids, settings,
fixtures, and visual semantics; only its admitted executor and provenance
change.

The current `local-declarative-package-v1` profile has no contributions and no
execution target. This candidate does not add Indicator fields to Manifest V2,
make Installed packages active, or alter P1b.4. When a future Indicator profile
is authorized, SDK discovery must publish exact schemas, plot/scale catalogs,
limits, examples, fixture ABI, compatibility diagnostics, and availability.

## Lifecycle, Upgrade, And Removal

The host treats package, definition, instance, result, and native resources as
different lifecycles:

1. ModuleHost activates one exact package/definition generation.
2. The Indicator-instance owner resolves stored instances against that
   generation without rewriting their historical identity.
3. Calculation executes only for resolved, enabled, visible instances.
4. Projection prepares complete frames and the Chart adapter materializes
   native resources.
5. Disable, incompatibility, quarantine, or uninstall removes live output and
   marks affected instances unresolved while retaining host-owned settings and
   layout identity.
6. Re-enable or compatible reinstall resolves and recomputes from the current
   exact Pane snapshot; it never revives cached output from another version or
   cutoff.
7. Disposal removes subscriptions, tasks, Workers, staged results, Series,
   reference lines, Scale Groups, and now-empty native panes in reverse order.

An upgrade which changes parameters or stable Plot Group identities must run a
declared host transaction. Partial migration never activates. A failed new
generation settles completely before the old accepted generation is retained
or restored. Removing one Plot Group deletes only its live projection and
placement after dependency/migration review; it cannot delete unrelated
regions or another plugin's plots.

## UI And Accessibility Requirements

The host owns one consistent Indicator experience. A future implementation
should provide:

- one searchable Add Indicator surface which discloses Core/Community source,
  trust, version, availability, required input, and resource class;
- region-local legends showing Indicator/Plot names and exact crosshair values;
- host-rendered Inputs, Style, and Visibility dialogs with Apply/Cancel/Reset;
- instance actions for Move to Main, Move to New Region, Move to an eligible
  existing region, Settings, Hide, and Remove;
- keyboard-operable region focus, movement, resizing, collapse/expand, and
  menus with visible focus and status announcements;
- pointer separator resizing without breaking native horizontal time
  pan/zoom, price-scale interaction, Crosshair, Reset View, Replay truncation,
  drawing interaction leases, or Pane-local controls;
- responsive clamping which preserves a usable Main region and avoids page
  overflow or clipped legends;
- explicit pending, unavailable, timed-out, invalid-output, disabled,
  unresolved, and restricted states without leaving stale plots visible.

Within one Workspace Pane, every Chart Region shares the same time scale and
vertical Crosshair time. Horizontal Crosshair and value labels are
Scale-Group-local. Crosshair observations include exact values from eligible
plots without allowing a plugin to subscribe to native Crosshair events.

Synchronization of Indicator instances or region layouts across different
Workspace Panes is not implicit. A later generic layout-sync command may copy
or link host-owned instance/layout intent, but each Workspace Pane retains its
own instrument/timeframe/input snapshot and exact result provenance.

## Resource And Performance Contract

Generic does not mean unbounded. A future accepted profile must publish
measured limits per definition, instance, Workspace Pane, Workspace, and
application generation, including:

- input and warmup Bars;
- output points and bytes;
- Plot Groups, plots, reference lines, Scale Groups, and Chart Regions;
- calculation wall/CPU time, cancellation latency, memory, and retained
  incremental state;
- concurrent and queued calculations;
- diagnostics and persisted instance/layout bytes.

Equivalent calculations should be cacheable by exact package/definition/
executor, parameter hash, input snapshot, cutoff, and input-requirement
identity. Placement, height, order, collapse, legend, and compatible style-only
changes reuse output and must not trigger calculation.

Forward Replay should use proven incremental append/tail replacement where the
definition supports it. Full replacement remains mandatory for backwards
movement, history replacement, input/parameter/version incompatibility, or
uncertain lineage. Disabled/unresolved plugin overhead must be negligible.

Performance evidence must cover one, four, and eight Workspace Panes with no
Indicators, one light overlay, one native Indicator region, one multi-Plot
oscillator, multiple instances sharing inputs, mixed timeframes, errors,
timeouts, removal, and restore. Replay, Crosshair, drag/zoom, history, Settings,
and drawing interaction latency remain protected product metrics.

## Security And Failure Rules

Ordinary Indicator Plugins receive no ambient globals or application handles.
The host rejects:

- direct or indirect Chart, Series, Pane, Scale, DOM, Canvas, WebGL, Worker,
  filesystem, network, credential, database, Replay, Bar Data, Workspace,
  Annotation, Journal, or ModuleHost access;
- dynamic code generation or imports outside the admitted bundle;
- nondeterministic time/random/environment input not supplied by a fixture;
- future Bars, output time offsets, repaint-dependent output, or undeclared
  multi-context requests;
- malformed, duplicate, out-of-order, non-finite, oversized, or unknown Plot
  output;
- a native-pane index, price-scale id, CSS selector, HTML fragment, formatter
  function, or renderer callback in portable state;
- attempts to mutate another instance, region, plugin, or owner;
- failure to cancel and release resources within the admitted budget.

One plugin failure is attributed to that exact package/definition/instance and
does not silently disable another plugin or corrupt candles. Repeated or severe
failures may quarantine the package through the existing package lifecycle,
but the Indicator runtime cannot invent trust, uninstall bytes, or enter
Restricted Mode itself.

## Candidate Conformance And Human Evidence

No Harness id is registered by this document. A later accepted implementation
contract should add independent evidence for at least:

1. schema closure, stable ids, immutable values, exact provenance, and negative
   Plot/Scale/placement fixtures;
2. no concrete Indicator-id branch in Kernel, Workspace, Chart, or UI owners;
3. one real classified Core MA definition rendered in Main and moved to a new
   region without recalculation or candle mutation;
4. one synthetic multi-Plot oscillator reference rendered through line,
   histogram, zero/reference-line, and fixed/auto Scale cases without becoming
   a product catalog entry;
5. one synthetic multi-region definition with independent group placement;
6. compatible-region sharing and deterministic rejection of incompatible
   dimensions/domains/capacity;
7. exact no-future, warmup, stale cancellation, full/incremental equivalence,
   timeout, invalid output, and result-isolation behavior;
8. atomic add/settings/move/reorder/resize/collapse/remove plus rollback and
   hard-reload restoration;
9. package disable/absence/quarantine/uninstall/reinstall and unresolved
   instance survival with no stale native resources;
10. one/four/eight-Workspace-Pane browser performance and disposal evidence;
11. unchanged candle/Replay/Viewport/Annotation writer revisions during pure
    placement changes;
12. accessible keyboard, pointer, responsive, reduced-motion, legend,
    Crosshair, and diagnostic behavior in real Chromium.

The first Community reference must wait for an authorized Community Indicator
execution profile and Worker tier. It must then pass the same semantic and
visual fixtures as the trusted reference plus isolation and resource negative
controls. A Community-only simplified output ABI would violate this candidate.

Human review should verify MA in Main and a separate region, a multi-Plot
oscillator, incompatible placement feedback, region resize/reorder/collapse,
multi-Workspace-Pane isolation, Replay truth, visible failure states, native
interaction preservation, and understandable Core/Community provenance.

## Proposed Delivery Decomposition After Acceptance

Accepting this architecture candidate would still authorize no code. The
recommended later sequence is:

1. **pure contract slice** — versioned Definition, Plot, Scale, Instance,
   ChartRegion, result, provenance, and migration values plus headless negative
   fixtures;
2. **Chart-owned projection slice** — stable region mapping, native
   pane/Series/Scale lifecycle, exact receipts, rollback, disposal, and one
   synthetic browser fixture;
3. **trusted Core vertical slice** — the already classified MA/SMA capability,
   instance/settings owner, Main-to-region movement, persistence, and human
   gate;
4. **generic multi-Plot and layout slice** — synthetic oscillator/multi-region
   references, sharing, move/reorder/resize/collapse, diagnostics, and measured
   one/four/eight-Pane behavior;
5. **future Community integration slice** — only after a separately accepted
   Indicator contribution profile and P3a isolated Worker execution boundary;
6. **future real Indicator catalog decisions** — RSI, ATR, MACD, Volume, or
   other product plugins receive independent Core/Community classification,
   definition, fixtures, and human review rather than entering through the host
   substrate implicitly.

Each slice requires its own bounded specification, delivery id, repository
commit, automated evidence, and applicable human gate. The sequence must not be
folded into P1b.4, P2 registry, or one broad “Indicators” implementation.

## Explicitly Rejected Alternatives

This candidate rejects:

- RSI-, ATR-, MACD-, Volume-, or MA-specific pane owners or Chart branches;
- treating “overlay Indicator” and “sub-pane Indicator” as different plugin
  programming models;
- fixing placement permanently from conventional usage or plugin default;
- creating a second chart instance for every internal Indicator region and
  manually synchronizing its time scale/Crosshair;
- merging internal Chart Regions into the independent Workspace Pane domain;
- persisting native pane indices, DOM geometry, or vendor handles;
- allowing plugins or official/community helper objects to subscribe to and
  write native Series directly;
- separate Core and Community projection ABIs;
- silently combining incompatible scales or normalizing values to make a plot
  appear compatible;
- showing stale Indicator output against a newer candle/Replay snapshot;
- using this generic substrate to classify every common Indicator as Core;
- using the draft to start P1b.4, activate H117, authorize Community execution,
  or add a privileged custom renderer.

## Material Decisions Awaiting Product-Owner Acceptance

The draft asks the product owner to accept, reject, or amend these eight
decisions before any implementation specification is written:

1. `ChartRegion`, `PlotGroup`, `ScaleGroup`, and `IndicatorInstance` are the
   generic public concepts; Workspace Pane and native pane remain distinct.
2. plugin definitions supply stable Plot semantics and defaults, while the
   host/user-owned instance supplies effective Main/new/existing-region
   placement; standard plots are movable when host capability permits.
3. Scale compatibility is structural and versioned, never inferred from an
   Indicator name; incompatible values require another Scale Group/region or a
   clear rejection.
4. one Indicator may emit several independently placeable Plot Groups and
   several standard plots without gaining a custom renderer or DOM surface.
5. the host owns instance/layout persistence and unresolved survival; plugins
   own formula/output meaning but no user state, native resources, or storage.
6. every committed pending/ready/non-ready Indicator projection binds the exact
   current Pane snapshot and Replay cutoff; stale values are removed rather
   than shown beside newer candles, and optional plugin delays/failures are
   isolated honestly.
7. Core and future Community Indicators share one semantic SDK/projection/
   settings/lifecycle contract; trust tier changes only admitted executor,
   distribution, and resource policy.
8. acceptance of this candidate authorizes no implementation; the pure
   contract and Chart projection must precede a trusted MA vertical slice, and
   Community execution waits for its separate Worker/profile authorization.

## Current Non-Authorization Boundary

Until the product owner explicitly accepts or amends this candidate:

- `ADR-V7-005` is not a binding architecture decision;
- no delivery id or Harness id is allocated;
- no production, SDK, schema, catalog, fixture, manifest, adapter, UI,
  persistence, or test code may be added for it;
- current Indicator contribution and `subpane.runtime` availability remains
  unavailable;
- MA/SMA classification does not authorize its implementation;
- RSI, ATR, MACD, Volume, and other examples remain unclassified examples;
- P1b.4 remains deliberately paused and H117 remains executable but
  unaccepted;
- P2 registry, P3a Worker, P3b Pine migration, privileged renderers,
  Marketplace, and product-scope expansion remain separately gated.
