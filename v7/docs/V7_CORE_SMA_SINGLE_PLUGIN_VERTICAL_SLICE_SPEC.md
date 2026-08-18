# V7 Core Moving Averages / SMA Single-Plugin Vertical Slice — Accepted Specification

Status: all ten material decisions accepted without amendment on 2026-08-17;
proposed delivery `P1c.3` and gate `H120` remain unallocated and unregistered;
no implementation is authorized

Drafted: 2026-08-17

Accepted: 2026-08-17

Upstream decisions: accepted `ADR-V7-004`, accepted `ADR-V7-006`, accepted
`ADR-V7-005`, accepted `P1c.1`/H118, and accepted `P1c.2`/H119

Accepted scope: one complete trusted-build Core Plugin product loop for the
Moving Averages package containing exactly one SMA definition

## Product-Owner Direction

The product owner directed:

> 授权起草 P1c.3/H120 Core SMA 单插件完整垂直切片候选规格；先完整闭环一个插件，不实施其他插件。

This instruction authorizes this candidate specification and its documentation
record only. `P1c.3` and H120 are proposed review labels in this document; they
do not become an allocated repository delivery or executable Harness record
until a later explicit implementation instruction. No production, SDK,
manifest, schema, catalog, fixture, test, runtime, adapter, persistence, route,
UI, or dependency change is authorized by this draft.

“Core SMA” is shorthand for the already classified **Moving Averages** Core
Plugin with one canonical SMA definition. It does not create a separate SMA
package lifecycle. No EMA, WMA, crossover, ribbon, oscillator, or other plugin
is included.

## Product-Owner Acceptance

After reviewing the ten candidate decisions through the focused checklist, the
product owner stated:

> 1–10 全部接受。

This accepts all ten material decisions without amendment and makes this the
binding specification for the proposed first complete Core calculated-series
plugin slice. Decision 10 remains controlling: specification acceptance does
not allocate `P1c.3`, register H120, authorize implementation, resume P1b.4,
change H117, or permit another plugin or algorithm to start. Each such
repository-changing step still requires a separate explicit instruction.

Acceptance record:
`../sessions/session_20260817_core_sma_single_plugin_vertical_slice_specification_acceptance.md`.

## Purpose

P1c.1 established the portable calculated-series truth contracts. P1c.2 proved
that complete calculated-series frames can be materialized through the sole
Chart owner and corrected the pinned renderer's whitespace-bridging behavior.
Neither slice created a usable Indicator.

This accepted specification defines the first product-complete calculated-
series vertical slice. A separately authorized implementation would let a user:

- find the built-in Moving Averages package in Core Plugins;
- add one or more Simple Moving Average instances to an exact Workspace Pane;
- see a deterministic `SMA(close, length)` line against the current Replay
  truth without future or stale values;
- change Inputs, Style, and Visibility through one host-rendered dialog;
- move the line between Main and one host-created internal Chart Region without
  recalculating it;
- inspect its state and value in a host-owned region legend;
- hide, show, or remove the instance;
- restore it after hard reload and through the existing cross-device state
  snapshot;
- retain it as unresolved with no pixels when the Core package is disabled,
  then resolve and freshly recalculate it when the exact package returns.

That is the complete loop required before another real calculated-series
plugin or Moving Average algorithm may be proposed. The implementation may add
only the thin package-neutral host seams that this SMA loop exercises. It must
not pre-build a broad Indicator platform or populate another catalog.

## Binding Baseline

The accepted specification preserves these accepted facts:

- the user-facing package is **Moving Averages**, and SMA is one versioned
  definition within it;
- the exact Contribution Profile is
  `analysis.calculated-series@1.0.0`;
- P0a owns trusted-build Core manifest, contribution, capability, and
  host-rendered parameter-schema contracts;
- P0b owns restart-bound Core package enablement plus package/profile settings;
- P1c.1 owns branded Definition, Plot, Scale, instance/document, result/frame,
  provenance, migration, diagnostic, and structural-limit contracts;
- P1c.2 owns the removable complete-surface child transaction beneath the sole
  Chart Snapshot Application and the adapter-private native resources;
- the Chart adapter remains the only owner that may create, update, move, or
  remove native Lightweight Charts panes, Series, Scales, price lines,
  Primitives, subscriptions, DOM, or Canvas resources;
- the Bar Data runtime remains the only owner that requests and caches Bars;
- the Replay runtime remains the only owner of cursor and reveal state;
- UI dispatches commands and subscribes to immutable state; it writes no
  runtime, Chart, Replay, Bar Data, ModuleHost, or persistence state directly;
- H117 remains `executable`, human-review-required, and unaccepted, while
  P1b.4 remains paused.

The binding upstream sources are
`V7_CORE_AND_COMMUNITY_PLUGIN_MODEL_SPEC.md`,
`V7_GENERIC_INDICATOR_PROJECTION_AND_CHART_REGION_SPEC.md`,
`V7_BUILT_IN_PLUGIN_CONTRACT_SUBSTRATE_P0A.md`,
`V7_CORE_PLUGIN_CENTER_P0B.md`,
`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md`, and
`V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md`.

## Existing-Capability And Ecosystem Check

The 2026-08-17 drafting review checked the pinned
`lightweight-charts@5.2.0` behavior and these current upstream references:

- <https://tradingview.github.io/lightweight-charts/tutorials/analysis-indicators>
- <https://tradingview.github.io/lightweight-charts/tutorials/demos/moving-average>
- <https://github.com/tradingview/lightweight-charts/tree/master/indicator-examples/src/indicators/moving-average>
- <https://github.com/tradingview/awesome-tradingview>
- <https://github.com/deepentropy/lightweight-charts-indicators>

The official Indicator examples expose two materially different patterns:

1. an `applyMovingAverageIndicator` helper attaches a Primitive, subscribes to
   source-Series changes, creates an Indicator Series, and calls `setData()`;
2. a pure `calculateMovingAverageIndicatorValues` function accepts static data
   and returns value/whitespace points while leaving lifecycle to its caller.

The first pattern conflicts with V7 ownership. It would give an Indicator
helper its own candle subscription and native writer, bypassing Bar Data,
Replay, Chart Snapshot Application, and reversible complete-surface admission.
It must not be copied or installed. The pure-calculation shape and explicit
whitespace output are useful reference behavior, but V7 freezes its own exact
formula, input, warmup, provenance, and output contracts below.

The two official examples are also not a sufficient semantic specification by
themselves: the standalone demo delays the first value one index differently
from the newer calculation helper. V7 therefore explicitly defines the first
SMA value on the `length`-th accepted input Bar and protects it with golden
fixtures rather than inheriting an illustrative off-by-one choice.

The current awesome-tradingview inventory lists
`lightweight-charts-indicators`, whose current documentation advertises
hundreds of standard/community Indicators and drawing outputs, depends on
`oakscriptjs`, directly creates and writes Lightweight Charts Series in its
integration example, and uses a separately synchronized chart for an
oscillator pane. That breadth and lifecycle do not fit this single-plugin
slice, same-chart Chart Regions, sole native writer, accepted Profile
separation, or trusted-build evidence boundary. It is not adopted as a
dependency, formula engine, registry, runtime, projection owner, or source of
additional product definitions.

No external production dependency is selected. Lightweight Charts remains a
rendering adapter below P1c.2; it does not become the calculation, instance,
persistence, or plugin owner.

## Complete-Loop Scope Freeze

| In this accepted slice | Explicitly later or excluded |
| --- | --- |
| one built-in Core Moving Averages package | another package or plugin family |
| one `SMA(close)` definition | EMA, WMA, RMA, VWMA, source selection, offset, or secondary smoothing |
| one standard instrument-price line Plot Group | multi-Plot, histogram, band, signal line, candle coloring, marker, or custom renderer |
| add/settings/legend/hide/show/remove | alerts, signals, strategies, scans, ranking, optimization, or automation |
| Main and one newly created dedicated internal region | move to existing region, sharing, reorder, resize, collapse, or general layout editor |
| current Workspace Pane Bars only | another symbol, timeframe, Session, Pane, or external dataset |
| trusted first-party in-process calculation | Community/local execution, Worker, formula language, Pine, or arbitrary ESM |
| local durable restore and existing state-sync transport | remote registry, Marketplace, collaboration, or hosted calculation |

An implementation must delete or reject any accidental second real definition,
product-catalog entry, formula branch, UI card, fixture, or dependency added in
the same delivery. Synthetic negative controls may describe foreign identities,
but they must not become visible product plugins.

## Canonical Package, Contribution, And Definition Identity

The accepted specification freezes one identity chain:

| Layer | V1 identity |
| --- | --- |
| package | `first-party.moving-averages@1.0.0` |
| optional package module | `optional.core-moving-averages@1.0.0` |
| P0a Contribution | `indicator.moving-averages@1.0.0` |
| calculated-series Definition | `moving-averages.sma.close@1.0.0` |
| Contribution Profile | `analysis.calculated-series@1.0.0` |
| executor | `host.trusted-calculated-series@1.0.0` |

The manifest remains P0a Manifest V1:

- display name `Moving Averages`;
- Core/built-in/first-party distribution;
- `permissions: []`;
- exactly one `indicator` Contribution;
- exactly one matching provided capability;
- one exact optional module binding;
- one package conformance Harness path;
- no Manifest V2 Profile field, executable target, network permission, DOM
  contribution, or Community distribution metadata.

The existing host-owned `CalculatedSeriesContributionBindingV1` binds the exact
package, Contribution, Definition, and Profile identities. The runtime must not
infer the Profile from `kind: "indicator"`, package name, publisher, display
name, or a Domain Tag. A forged, partial, mismatched, or second binding fails
before registration.

The Core Plugin Center shows one package. The Add Indicator surface shows one
definition, `Simple Moving Average`, nested under that package. Neither surface
pretends that package lifecycle and definition identity are the same thing.

## Canonical SMA Definition

### Input and parameters

V1 accepts exactly one calculation parameter:

```text
length: integer, minimum 2, maximum 500, default 20
```

The source is fixed to the current Pane Bar's finite `close` value. Source
selection is deliberately absent. The input context is
`current-workspace-pane-bars`; `additionalContexts` is empty. The definition
declares:

```text
warmupBars: 499
insufficientWarmup: whitespace
deterministic: true
noFuture: true
incrementalMode: none
```

`warmupBars: 499` is the static safe bound required by the existing P1c.1 V1
Definition contract for every permitted length. The host supplies at most the
accepted prefix already available through the Bar Data/Projection owners. It
does not extend the Session date range, move Replay, or let the package request
history merely to satisfy this hint. Fewer Bars are valid and produce leading
whitespace until the selected length is available.

### Exact calculation

For one validated length `L`, the trusted formula processes the immutable
warmup prefix followed by the exact display timeline in strictly increasing
time order:

1. append each finite close to a FIFO window and add it to one ECMAScript
   binary64 running sum;
2. when the window exceeds `L`, remove the oldest close and subtract it from
   that running sum;
3. for a Bar on the display timeline, emit explicit whitespace while the
   window contains fewer than `L` closes;
4. when the window contains exactly `L` closes, emit `sum / L` at that Bar's
   exact display time;
5. canonicalize negative zero to positive zero and reject `NaN`, infinity,
   duplicate/out-of-order time, or an output outside the exact eligible
   timeline/cutoff.

There is no rounding, price-tick snapping, offset, lookahead, tail prediction,
realtime mutation, or session-gap interpolation. Closed-market gaps simply
contain no Bars; the window is the prior `L` accepted Bars in the Pane's exact
Session/timeframe projection. The first possible value is on the `L`-th
accepted input Bar, not the following Bar.

The implementation uses full calculation only. It may use the specified
rolling queue inside that full calculation, but it persists no incremental
state and must produce the same canonical output for every repeat of the exact
input envelope. Replay backwards, dataset replacement, parameter change,
definition change, or uncertain ancestry always starts a fresh calculation.

### Plot and Scale

The Definition declares exactly one Plot Group and Plot:

```text
plotGroupId: sma-price
displayName: Simple Moving Average
defaultPlacement: main
scaleIntent:
  dimension: market.instrument-price@1.0.0
  unit: market.instrument-price@1.0.0
  transform: linear
  domain: auto
  formatter: host.price@1.0.0, decimals 2
  zeroPolicy: not-required
plotId: sma
kind: line
displayName: SMA
legendIntent: value
visibleByDefault: true
default stroke: #2962FFFF, width 2, solid
referenceLines: []
```

The same instrument-price Scale intent is valid in Main or a dedicated
internal Chart Region. Placement never enters the formula or effective
parameter digest.

### Definition resource declaration

The V1 Definition uses lower limits within P1c.1's structural ceilings:

| Resource | V1 declaration |
| --- | ---: |
| maximum display output points | 20,000 |
| maximum admitted input Bars | 20,499 |
| maximum canonical output bytes | 4 MiB |
| maximum incremental-state bytes | 0 |
| active SMA instances per Workspace Pane | 4 |
| current product Workspace Panes | 4 |

Inputs are rejected before formula invocation when a declared ceiling would be
exceeded. The host may publish an attributed unavailable/resource diagnostic;
it may not truncate an exact frame silently.

## Host-Rendered Settings Contract

The P0a parameter schema contains exactly these controls:

| Tab | Field | Control/default | Scopes |
| --- | --- | --- | --- |
| Inputs | `length` | number `2..500`, step `1`, default `20` | package, profile, instance |
| Style | `lineColor` | color, default `#2962FFFF` | package, profile, instance |
| Style | `lineWidth` | number `1..4`, step `1`, default `2` | package, profile, instance |
| Style | `linePattern` | select `solid/dashed/dotted`, default `solid` | package, profile, instance |
| Visibility | `visible` | boolean, default `true` | instance |

Package/profile edits remain P0b restart-bound. After restart, the accepted P0b
resolver provides the exact package/profile/default layers. An instance layer
wins where present. Existing instances without a higher override receive the
new effective lower-scope value and an exact instance/document revision; an
instance override remains unchanged. Reset removes only the selected scope's
override and discloses the next effective source.

The Moving Averages package exposes one pure, generation-bound settings
normalizer. It maps the already validated effective values to:

- `{ length }` for calculation parameters;
- one complete standard line-style override for `sma-price/sma`;
- resolved instance visibility.

The host revalidates that output through the P1c.1 Definition/document
contracts. The normalizer has no store, Chart, Bar, Replay, DOM, clock, network,
or lifecycle handle. Host runtime and UI code must not switch on the Moving
Averages package id or field ids to manufacture SMA-specific state.

Changing `length` invalidates and recalculates the exact current instance.
Changing color, width, pattern, visibility, or placement reuses the current
calculation result and must not invoke the formula. Apply is atomic; Cancel
changes nothing; Reset follows the explicit scope precedence above. Invalid or
fractional lengths fail before any document, storage, or Chart mutation.

## Required Ownership Boundaries

The implementation may choose smaller private helpers, but these long-lived
authorities remain separate:

| Boundary | Owns | Must not own |
| --- | --- | --- |
| `optional.core-moving-averages` | P0a manifest, exact Profile/Definition binding, parameter schema, pure settings normalizer, exact SMA formula, golden fixtures | user instances, Bar requests, Replay, Chart/DOM, storage, scheduling |
| `optional.calculated-series-runtime` | sole live instance/document revisions, immutable active Definition snapshot, settings resolution, command preparation, calculation orchestration, stale cancellation, unresolved transitions | native Chart writes, Bar caching/request transport, Replay cursor, persistent bytes, DOM |
| `adapter.trusted-calculated-series-execution` | validate immutable envelopes, invoke trusted formula, cancellation checkpoints, duration/resource accounting, result attribution | package discovery, user state, Bars, Chart, persistence, network, DOM |
| `core.chart-snapshot-application` plus existing P1c.2 child | sole visible admission of complete calculated-series Pane surfaces and exact same-snapshot settlements | formula, package lifecycle, durable instance meaning |
| `adapter.lightweight-chart` | every native region/Series/Scale operation and private handle | SMA meaning, instance state, Bars, Replay, persistence |
| `adapter.calculated-series-persistence` | Session-keyed canonical bytes, exact revision/CAS, reversible write, restore envelope | instance semantics, Definition resolution, Chart, formula |
| `optional.calculated-series-ui` | Add surface, legend, host-rendered dialog, accessible command dispatch and status rendering | direct writes to runtime, Chart, ModuleHost, storage, Replay, or Bars |
| existing ModuleHost/Core Plugin profile | one immutable enabled package generation and restart-bound package/profile settings | calculated-series instances, results, Chart, persistence |

`optional.calculated-series-runtime` receives an immutable, host-composed array
of exact trusted registrations from the active ModuleHost generation. It does
not import Moving Averages or scan manifests itself. The production composition
root may wire the generic runtime to the built-in registration; that explicit
composition is not permission for route code or the runtime to branch on SMA.

The host runtime and UI are removable infrastructure needed by this one
vertical slice. Minimal-core and optional-removal Harnesses must still boot with
all calculated-series host modules and the Moving Averages module absent.

## Trusted Execution And Input Planning

The package never receives a Bar Data runtime or Projection owner. A host input
planner creates one immutable envelope from the exact Pane snapshot already
owned by the Workspace/Projection path:

- Session and activation generation;
- Workspace Pane id and exact accepted Workspace revision;
- instrument, display timeframe, Session Hours, and dataset provenance;
- exact Replay-visible-through cutoff;
- exact Definition, instance, parameter, executor, host API, and package
  identities/digests;
- ordered display Bars plus up to 499 already accepted preceding warmup Bars;
- exact output timeline, cancellation token, and lower resource ceilings.

Only the Bar Data runtime may issue or cache a provider request. The input
planner may consume an immutable accepted Bar snapshot through a public port;
it may not open a provider, extend the historical range, read a sibling Pane,
or create a private cache. Insufficient accepted warmup is represented honestly
through `providedBars < requestedBars` and leading whitespace.

The trusted executor runs the built-in pure formula in the application realm;
this slice adds no Worker or general code loader. Before invocation it checks
identity, length, order, finiteness, cutoff, input count, and cancellation.
After invocation it checks complete Plot coverage, every point, output bytes,
duration, and provenance through the existing P1c.1 contracts.

One Workspace transaction has an 8 ms synchronous calculated-series inclusion
budget. Completed SMA results may join the initial complete Chart candidate.
When the budget is exhausted before another queued instance begins, that
instance crosses the candle commit as `pending` with no stale Plot points and
runs in a cancellable host task. A result may settle only through the Chart
Snapshot Application's existing same-snapshot P1c.2 admission while every
Pane, cutoff, document, instance, package-generation, parameter, and input
identity remains exact.

One started SMA calculation is bounded by the fixed O(input Bars) formula and
20,499-Bar input ceiling. H120 must measure and publish one/four-Pane timings.
A formula error, invalid result, resource breach, cancellation, or stale
identity becomes an attributed non-ready frame; it never blocks unrelated
Panes or restores an older line.

## Instance Document And Commands

`optional.calculated-series-runtime` is the sole writer of the accepted P1c.1
`CalculatedSeriesWorkspaceDocumentV1`. It publishes immutable snapshots and
accepts only explicit expected-revision commands:

```text
add-instance
apply-instance-settings
set-instance-visibility
move-plot-group-to-main
move-plot-group-to-new-region
remove-instance
```

Every command identifies the Session, Workspace Pane, instance when applicable,
expected document/instance revision, and current accepted Workspace/Replay
binding. IDs are host-generated opaque values. The UI cannot supply a package
formula, Definition, native pane index, Scale handle, or arbitrary placement
wire.

Command behavior is exact:

| Command | Recalculate | Durable write | Visible effect |
| --- | --- | --- | --- |
| add | yes | yes | ready or honest non-ready line in Main |
| apply Inputs | yes | yes | old line clears atomically; ready/pending/error replaces it |
| apply Style | no | yes | same points, new complete style |
| hide/show | show only if no current result | yes | no stale resources while hidden; fresh/current line when shown |
| move Main/new region | no | yes | same result/provenance in exact new placement |
| remove | no | yes | cancel task, remove document instance and all pixels/resources |

Multiple SMA instances are valid up to the lower per-Pane ceiling. Each has its
own length, style, visibility, placement, revisions, result, and legend. This
does not add another plugin or Definition.

When a Workspace Pane is explicitly removed, the owning Workspace transaction
must disclose and atomically remove its calculated-series instances and durable
Pane document with it. It may not silently move them to another Pane. Failure
restores the prior Pane, document, storage bytes, and Chart surface together.

## Atomic Command And Visible-Truth Contract

An add/settings/visibility/move/remove command is one global reversible
transaction over the exact current Workspace snapshot:

1. the instance runtime prepares, but does not publish, the next complete
   document and any calculation work;
2. the persistence adapter prepares an exact prior-byte CAS replacement;
3. the Chart Snapshot Application prepares the complete affected Pane surface,
   including its existing P1c.2 child transaction;
4. the owning Workspace transaction applies only exact preparations and
   receipts;
5. any failure rolls every applied participant back to the exact prior
   document, bytes, candle/Indicator surface, and task set;
6. finalize alone publishes the new document and destroys obsolete native
   resources.

P1c.2 remains a local child of the sole Chart participant, never a second
global participant. The calculated-series runtime cannot call its native
surface or bypass Chart-owner admission.

For Replay advance/back, Go To, timeframe, Session Hours, instrument, history,
or Workspace replacement, the Chart Snapshot Application receives a complete
calculated-series surface for the same target Pane snapshot. Ready results are
exact; unfinished results are pending with zero stale points. Candles are never
committed beside a result from an older cutoff or dataset.

Style and placement changes preserve the exact result and formula/provenance
digest. Input changes produce a new frame identity. A late result for an older
document, instance revision, package generation, Pane snapshot, input digest,
or Replay cutoff is discarded before any storage or visible mutation.

## Bounded Placement Behavior

The SMA Plot Group defaults to the Main Chart Region on the compatible primary
instrument-price Scale Group.

`Move to new region` creates one expanded host-owned calculated-series region
inside the same Lightweight Chart, directly below Main, with:

- a stable opaque `regionId` and compatible primary price `scaleGroupId`;
- canonical initial height weights Main `70`, new region `30`;
- no persisted pixel height or native pane index;
- the same line result, formatter, parameter digest, and provenance;
- one region-local host legend.

`Move to Main` places the group on Main's compatible price Scale. If the
dedicated internal region becomes empty, the same transaction removes its
canonical region/scale and P1c.2 finalization removes the obsolete private
native pane resources.

This slice exposes no move-to-existing-region target, sharing, reordering,
resizing, collapse/expand, drag separator, or generic layout editor. Those
behaviors belong to the later generic multi-Plot/layout slice. The fixed
Main/new-region operation is nevertheless generic: it uses Definition Scale
compatibility and Plot Group placement, never an `SMA` or overlay branch.

## Durable Restore, State Sync, And Unresolved Lifecycle

The accepted specification chooses a focused removable sidecar rather than adding
calculated-series meaning to Session Store:

```text
storage key: v7.calculated-series:document:<session-id>
envelope schema: v7.calculated-series-document
envelope version: 1
payload: canonical CalculatedSeriesWorkspaceDocumentV1 wire
```

`adapter.calculated-series-persistence` owns only versioned byte mechanics. It
enforces the 4 MiB document ceiling, exact prior-byte CAS, reversible writes,
canonical restore, and corruption diagnostics. The runtime owns semantic
validation and Definition resolution. No result points, native handles,
calculation tasks, or formula code are persisted.

The existing Server State Sync allowlist would add only the exact non-empty
`v7.calculated-series:document:` prefix. Its existing canonical capture,
conflict backup, exact replacement, and rollback mechanics remain the owner.
H120 must prove local hard reload plus a two-client capture/apply/restore round
trip without adding a second network client or synchronization protocol.

Core package disable/enable remains restart-bound under P0b:

1. disabling Moving Averages stages only the Core Plugin profile change;
2. after restart, ModuleHost omits `optional.core-moving-averages` while the
   generic instance runtime and persistence adapter remain available;
3. each affected resolved instance becomes an inert unresolved envelope that
   preserves its exact original wire/digest, Definition reference, display
   metadata, settings, visibility, and placement intent;
4. the complete Chart surface contains no SMA pixels and no calculation runs;
5. after exact re-enable and restart, the runtime resolves only an exact valid
   binding/schema/Definition, writes the resolved document transactionally,
   and recalculates from the current Pane snapshot;
6. it never revives cached result points from an earlier cutoff or package
   generation.

Corrupt bytes, digest mismatch, foreign Definition, incompatible version,
failed settings normalization, or resource overflow remain unresolved with a
stable diagnostic until the user removes the instance or a future separately
authorized migration succeeds. No guessed migration or silent deletion is
permitted.

## Production UI And Accessibility

`optional.calculated-series-ui` adds only the surfaces required for this one
complete plugin loop:

- one keyboard-operable `Indicators` command in each Workspace Pane;
- one host-owned Add dialog/search surface listing enabled exact Definitions;
- package/Core/version/source disclosure and an honest disabled/unavailable
  state without directly controlling the Plugin Center;
- one region-local legend row per instance with `SMA <length>`, current state,
  effective setting sources, and latest/crosshair-aligned value;
- one action menu containing Settings, Hide/Show, Move to Main, Move to New
  Region, and Remove, with inapplicable actions omitted or disabled honestly;
- host-rendered Inputs, Style, and Visibility tabs with Apply, Cancel, Reset,
  inline validation, dirty-state protection, Escape, focus return, and visible
  focus;
- pending, unavailable, error, and unresolved status text that never leaks a
  stack, native id, Canvas coordinate, or private package callback.

The legend value comes from the validated immutable result indexed by the
host-normalized crosshair/display time, not from a native Series handle. It is
`—` for whitespace, hidden, pending, unavailable, error, or unresolved state.

Controls must remain usable by keyboard and pointer at the supported responsive
widths. Opening a menu or dialog may acquire only its existing UI interaction
lease; ordinary chart drag, wheel zoom, time-scale movement, price-scale
interaction, Crosshair, Reset View, Replay truncation selection, and Drawing
interaction must remain unchanged when no control is active.

## Diagnostics And Observability

Diagnostics are stable, attributed, and bounded. H120 must cover at least:

- unknown/disabled/foreign package, Contribution, Profile, or Definition;
- invalid setting, schema digest, settings normalization, or style target;
- unavailable or insufficient warmup without false future acquisition;
- input order, duplicate time, non-finite close, cutoff, or dataset mismatch;
- cancellation, stale document/instance/Pane/cutoff/generation, and late result;
- input/output/resource/duration ceiling breach;
- incomplete/invalid result or provenance mismatch;
- incompatible placement or exhausted region/Series capacity;
- persistence corruption, stale byte CAS, rollback, and state-sync conflict;
- Chart prepare/apply/rollback/finalize failure and owner-level poison
  escalation inherited from P1c.2.

Runtime snapshots expose exact document/instance revisions, lifecycle state,
effective settings and source, calculation state, cutoff, Definition/executor
identity, warmup coverage, resource use, and last stable diagnostic. They expose
no Bars cache, Replay mutator, native resource, package function, storage
handle, filesystem path, network client, DOM node, or Canvas detail.

## Proposed H120 Automated Evidence

Only a later implementation authorization may register H120. When registered,
it must begin as `executable`, retain `humanReviewRequired: true`, and keep
`acceptanceEvidence: null` until a focused product-owner review passes.

The independent automated gate must prove:

1. one exact P0a manifest/module/Contribution/Profile/Definition registration,
   one Core Plugin Center package, one Add definition, and deterministic
   rejection of inferred, forged, mismatched, or second real registrations;
2. golden SMA formula fixtures for lengths 2, 20, and 500, the exact `L`-th-Bar
   first value, provided/insufficient warmup, closed-market time gaps,
   deterministic repeat, negative-zero normalization, invalid values/order,
   resource ceilings, and no output later than the cutoff;
3. package/profile/instance settings precedence, Apply/Cancel/Reset,
   fractional/out-of-range rejection, exact settings sources, length-only
   recalculation, and calculation-free style/visibility/placement changes;
4. immutable input-envelope closure, zero package Bar/Replay/Chart/storage
   handles, synchronous-budget pending behavior, cancellation, stale late-result
   rejection, formula failure isolation, and measured resource provenance;
5. add, multiple-instance isolation, settings, hide/show, remove, exact CAS,
   instance/document revision collision, and full participant rollback at each
   injected failure phase;
6. Main placement, new dedicated same-chart region, return-to-Main cleanup,
   identical result/provenance across movement, structural Scale compatibility,
   and no generic layout action;
7. exact local sidecar round trip, hard reload, corrupted/stale-write recovery,
   state-sync capture/apply/conflict backup, disabled-package unresolved
   preservation, and exact re-enable/fresh-recalculation behavior;
8. Replay forward/back, Go To, timeframe, Session Hours, history, and Pane
   replacement with exact candle/result cutoff closure, no stale flash, no
   future line, and no Replay or Bar Data ownership change;
9. real Chromium production-route Add → Settings → Move → Hide/Show → Reload →
   Remove flows in one Pane plus one SMA in each of four Panes, with isolated
   state, responsive containment, keyboard operation, focus recovery, and no
   browser error;
10. automated pixel evidence using known synthetic Bars: no SMA-colored pixel
    before the first valid value, expected line pixels after it, old-color/
    old-region clearing after style/move, zero line pixels while hidden/removed,
    and unchanged candle pixel/readback evidence;
11. native chart drag/wheel/scale/Crosshair/Reset View, Replay selection,
    Annotation/Drawing interaction, candle writer revision, and Workspace Pane
    ownership remain unchanged outside the admitted complete transaction;
12. one- and four-Pane timing/resource reports, complete disposal, optional
    module removal/minimal-core boot, H118/H119, P0a/P0b, state sync,
    architecture/writer/source-quality, and the complete existing regression
    graph.

Synthetic foreign identities and failure fixtures do not count as additional
product plugins. The gate must inspect the built product catalog and fail if an
EMA/WMA/RSI/MACD/Volume/other real definition or external Indicator dependency
appears.

## Proposed Focused Human Gate

After automated H120 passes, focused human review must use a real production
route and verify:

1. Core Plugins contains one Moving Averages package, while Add Indicator
   contains one Simple Moving Average definition with clear Core/version
   provenance;
2. adding default SMA 20 paints a credible blue price line in Main with honest
   leading warmup and no future value;
3. Inputs, Style, Visibility, Apply, Cancel, Reset, validation, legend value,
   and keyboard/focus behavior are understandable and complete;
4. changing length visibly recalculates without showing the old line against
   the new setting; style changes preserve values;
5. Move to New Region and Move to Main preserve the exact values, keep one
   synchronized chart, and do not disturb native interactions or candles;
6. Replay forward/back and timeframe/Session changes never reveal a future or
   stale SMA point;
7. Hide/Show, hard reload, and Remove produce the expected durable state with
   no orphan legend, region, line, or blank pane;
8. disable/restart shows the retained unresolved instance with no pixels, and
   re-enable/restart resolves and freshly recalculates it;
9. one- and four-Pane layouts remain responsive, contained, and practically
   usable without an obvious new interaction stall.

Human review may reject any semantic, visual, interaction, latency, or recovery
defect even when automation passes. Only an explicit product-owner acceptance
may set H120 to `accepted` and attach a durable acceptance record.

## Explicit Exclusions

This accepted specification does not authorize or include:

- implementation or registration of proposed P1c.3/H120 through specification
  acceptance alone;
- EMA, WMA, RMA, VWMA, HMA, DEMA, TEMA, another SMA source, offset, smoothing,
  crossover, ribbon, regime, signal, alert, scanner, strategy, optimizer, or
  private formula;
- RSI, ATR, MACD, Volume, Bollinger Bands, another named Indicator, another
  Core/Community plugin, or a product-visible synthetic Indicator;
- generic multi-Plot/layout sharing, move-to-existing-region, reorder, resize,
  collapse, region drag, eight-Pane performance, or a universal Indicator UI;
- another timeframe/symbol/Session input, multi-context calculation, package-
  initiated Bar request, network or filesystem access;
- Community/local package execution, Manifest V2 execution fields, SDK/Profile
  authoring availability, Worker, formula language, Pine migration, registry,
  signing, Marketplace, P2, P3a, or P3b;
- plugin-owned Chart/Series/pane/Scale/Primitive/DOM/Canvas/subscription,
  second-chart region synchronization, or an external Indicator dependency;
- persisted result caches, native handles, pane indices, pixel dimensions, or
  silent deletion/migration of unresolved instances;
- P1b.4 work, H117 acceptance/reclassification, or any H117 field change;
- starting another plugin or algorithm before a separately implemented and
  human-accepted H120 closes this one-plugin loop.

## Accepted Material Decisions

The product owner accepted these ten decisions without amendment on 2026-08-17:

1. **One package, one definition:** P1c.3 is a complete Moving Averages Core
   Plugin loop containing exactly one `SMA(close)@1.0.0` Definition; SMA is not
   a second package, and no other algorithm or plugin enters before H120
   acceptance.
2. **Exact trusted binding:** the P0a `indicator` Contribution is bound by an
   exact host-owned P1c.1 Profile/Definition binding and an immutable
   ModuleHost generation; production availability is trusted-built-in-only and
   does not activate Community/local SDK execution.
3. **Frozen SMA semantics:** length is integer `2..500`/default `20`, close is
   fixed, static warmup is 499 with whitespace, the first value is on the
   `length`-th accepted Bar, calculation is deterministic full-only, and one
   instrument-price line is the complete output.
4. **Minimal generic ownership:** the package owns formula/definition/schema;
   a package-neutral instance runtime owns documents/commands; a trusted
   adapter executes; the existing Chart owner/P1c.2 child writes visuals; a
   removable persistence adapter owns bytes; host UI owns DOM. No host runtime
   branches on SMA and no external helper/runtime is adopted.
5. **Complete instance/settings loop:** add, multiple instances, scoped
   Inputs/Style/Visibility with Apply/Cancel/Reset, legend, hide/show, and
   remove are exact revisioned commands; only length recalculates, while
   style/visibility/placement reuse validated output.
6. **Exact visible truth:** current accepted Pane Bars are the only input;
   package code cannot request data or move Replay; an 8 ms transaction budget
   may produce honest pending frames; ready or late settlement is admitted only
   by the Chart owner against exact Pane/cutoff/document/generation identity,
   with no stale points.
7. **Bounded placement before generic layout:** SMA defaults to Main and may
   move only to one newly created dedicated expanded region and back to Main;
   movement preserves result/provenance and empty-region cleanup is atomic;
   sharing/reorder/resize/collapse remain later.
8. **Durable unresolved survival:** one Session-keyed reversible sidecar plus
   the existing state-sync allowlist preserves instance/settings/placement;
   package disable removes pixels and retains exact unresolved bytes, while
   exact re-enable resolves and freshly recalculates without persisted output.
9. **Independent H120 closure:** a later implementation must register H120 as
   executable/human-required/unaccepted, pass golden, transactional,
   no-future, persistence/state-sync, real-Chromium pixel/interaction,
   one/four-Pane, removal, and regression evidence, then wait for explicit
   product-owner human acceptance.
10. **Draft authority is documentation-only:** accepting this candidate would
    bind its scope but still would not allocate or implement P1c.3/H120, start
    another plugin/layout/Community slice, resume P1b.4, or change H117; each
    repository-changing step requires a later explicit instruction.

## Accepted Boundary And Later Sequence

The ten material decisions are accepted. No implementation is currently
authorized. A later explicit implementation instruction would allocate P1c.3,
register H120, and authorize only the one Moving Averages/SMA vertical slice
defined here.

No second plugin, second Moving Average definition, or generic real-Indicator
catalog work may begin until that implementation passes automation and the
product owner accepts H120. H120 acceptance would close only P1c.3; every later
layout, algorithm, plugin, SDK, Community/Worker, or P1b.4 step would still
require a separate product decision and authorization.
