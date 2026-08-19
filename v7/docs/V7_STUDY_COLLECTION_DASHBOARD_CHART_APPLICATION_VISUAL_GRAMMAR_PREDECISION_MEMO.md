# V7 Study Collections, Dashboard, Chart Application, Phenomenon Research, And Visual Grammar — Pre-Decision Memo

Memo id: `MEMO-V7-005`

First formed: 2026-08-18 23:25 PDT

Last substantive revision: 2026-08-18 23:38 PDT

Status: discussion captured; decision and implementation not authorized

Registry: `V7_NON_DECISION_MEMO_REGISTRY.md`

## Purpose And Non-Authorization Boundary

This memo preserves a proposed product layer above existing Replay, Journal,
Annotation/Semantic Artifact, calculated-series, Validation Campaign, and
future Research owners. It combines four related questions which must be
designed together but need not be implemented in one delivery:

1. one Dashboard for each user-visible research or trading dataset;
2. explicit, default-off application of one or several datasets to a Chart;
3. research into market phenomena which do not constitute a Setup or trade;
4. one uniform semantic visual grammar for Entry, Stop Loss, Target, Exit,
   sweep/respect/invalidation events, comparison state, and explanatory text.

The product owner specifically requested that datasets remain non-visual by
default, become visible only after an explicit Apply-to-chart action, and allow
several datasets to coexist—for example actual live trades beside hindsight
counterfactual trades. The product owner then added that Entry, Stop Loss,
`4h FVG respected`, and text explanations require a uniform explicit Chart-
element standard.

This is not a product or architecture decision. It does not amend or accept
the pending FVG + SMA Validation Campaign / Study Case Demo candidate, allocate
a delivery or Harness id, implement a Dashboard, Journal, Research module,
Phenomenon detector, Chart projection, text tool, persistence namespace, or
state-sync route, add a plugin/algorithm, or change H117. P1c.4, P1b.4,
Community/Worker, Dataset Builder, AI, and all production work remain outside
this memo.

## Current Position As Of 2026-08-18 23:25 PDT

The current candidate position is:

- `Dataset` may remain concise product language, but the internal product model
  should be a versioned **Evidence Collection** referencing records owned by
  their native modules rather than one universal copied-data store;
- each Collection has a Dashboard read model and capability-aware metrics;
- every Collection is absent from the Chart by default;
- **Apply to chart** creates an explicit Workspace-owned application binding to
  one exact Collection snapshot; it does not modify the source Collection;
- several bindings may coexist and remain independently visible, selectable,
  diagnosable, removable, and attributable;
- business owners emit only portable semantic Chart-element intents; the
  existing Chart Runtime/Adapter remains the sole native visual writer;
- one host-governed semantic visual grammar maps roles such as actual Entry,
  planned Stop, counterfactual Entry, and FVG-respect confirmation to consistent
  primitive compositions, labels, state tokens, and accessible descriptions;
- semantic role, evidence mode, Collection identity, and availability state are
  separate visual dimensions and cannot be encoded by color alone;
- a `PhenomenonStudy` is a first-class non-Setup research type sharing Cohort,
  Analysis, Dashboard, and Chart-application infrastructure without inventing a
  trade or Setup;
- probability claims require a declared universe and defensible sampling
  completeness; hand-picked positive examples remain exploratory evidence;
- explanatory text has both a compact anchored Chart projection and a full
  readable record/Inspector representation; free-form Chart text remains a
  separate future Drawing type.

This position deliberately chooses a shared **application and visual grammar**,
not a shared source-of-truth schema for every business workflow.

## Why One Universal Dataset Store Is Rejected

The proposed product needs a common way to browse and compare heterogeneous
records, but their meanings and owners differ:

| Product dataset | Native truth owner | Truth which must not be flattened |
| --- | --- | --- |
| Setup-validation observations | Validation Campaign / future Research owner | definition versions, decision cutoff, Evidence Citations, Outcome policy |
| a trader's public Setup corpus | future sourced-research owner | public source, claim versus reconstruction, rights, interpretation revisions |
| the user's actual trades | future Journal/trade-import owner | orders, fills, fees, size, account/currency, realized capital path |
| hindsight/counterfactual trades | future Review owner | hypothetical assumptions, reviewer, comparison target, no claim of execution |
| Setup-free market phenomena | future Phenomenon Study owner | universe, event/outcome definitions, sampling method, censoring/completeness |

Copying all five into one `dataset.rows[]` schema would erase native
transactions, provenance, correction history, and metric eligibility. Instead,
the common layer should reference exact native record identities/revisions and
expose bounded portable read models.

Candidate internal terms are:

```text
EvidenceCollectionDescriptorV1
|-- collectionId / revision / kind / title
|-- nativeOwner / definition identities
|-- instrument/time coverage and provenance summary
|-- metricCapabilities[]
|-- chartElementCapabilities[]
`-- currentSnapshotRef / availability

EvidenceCollectionSnapshotV1
|-- snapshotId / revision / contentDigest
|-- exact source record ids/revisions
|-- inclusion/exclusion policy
|-- source availability summary
`-- createdBy / createdAt / parentSnapshotRef?
```

The descriptor is product discovery metadata. The snapshot is a reproducible
selection. Neither is a second copy of native trade, Artifact, Case, or Bar
payloads. The final terms remain undecided.

## Candidate Product Flow

```text
Native truth owners
  |-- Validation Campaign / Study Cases
  |-- Journal / actual executions
  |-- Review / counterfactual records
  |-- sourced public-Setup research
  `-- Phenomenon Study observations
             |
             v
  Evidence Collection registry + exact snapshots
             |
       +-----+------------------+
       |                        |
       v                        v
  Collection Dashboard      explicit Apply to chart
  (default destination)          |
                                 v
                   Workspace CollectionApplication
                                 |
                    portable ChartElementSet
                                 |
                    Chart-owned transaction/adapter
                                 |
                      one or many visible layers
```

No source module imports the Dashboard or Chart-application module. The
Dashboard and application coordinator consume only composition-supplied public
read ports. They cannot enable a plugin, create an Artifact, alter a trade,
move Replay, request/cache Bars, or obtain a native Chart/Series/Canvas handle.

## Dashboard Candidate

Each Collection opens on a Dashboard before any Chart visualization. Common
surface areas may include:

- title, kind, exact snapshot/definition versions, source and availability;
- Calendar with counts and outcome/status indicators by market date;
- counts, inclusion/exclusion, missing/incomplete, and source-unavailable data;
- metric cards only when their declared inputs are present;
- capital/equity or counterfactual paths only with exact model labels;
- case/trade/event table with raw-context drill-down;
- snapshot/freeze, compare, export, and Apply-to-chart actions;
- visible warnings for biased sampling, incomplete outcomes, incompatible
  versions, unavailable sources, and simulated/counterfactual values.

### Metric Applicability

One Dashboard shell must not imply that every Collection supports every
metric:

| Metric | Setup validation | Public Setup corpus | Actual trades | Counterfactual review | Phenomenon study |
| --- | --- | --- | --- | --- | --- |
| Calendar/counts | yes | yes | yes | yes | yes |
| qualification/outcome rate | when definitions exist | only with comparable outcome evidence | optional | when model exists | event-specific rate |
| win rate | only with an accepted trade Outcome policy | unavailable unless reconstructable without guessing | yes with exact trade policy | explicitly hypothetical | not applicable |
| MFE/MAE/time-to-event | when deterministic | only if source data supports it | yes | model-labelled | event-specific |
| capital/equity curve | unavailable in the current Campaign candidate | unavailable by default | only from exact fills/fees/currency/capital policy | separate simulated curve | not applicable |
| conditional probability | exploratory or validation cohorts | source-limited | possible process analysis | possible | primary metric |

`Not applicable`, `Unavailable`, `Incomplete`, and numeric zero are distinct
states. A Dashboard cannot silently synthesize a $100,000 account, position
size, fill, commission, or win/loss definition to make an attractive chart.
Actual and counterfactual capital curves must never be summed or presented as
one realized account history.

## Explicit Chart Application

The candidate Workspace record is tentatively named
`CollectionChartApplicationV1`:

```text
CollectionChartApplicationV1
|-- applicationId / revision
|-- workspaceId / paneMapping
|-- collectionId / exact snapshotId / snapshotDigest
|-- instrument/timeframe/time-range policy
|-- collectionStyleToken / visibility / z-band
|-- labelDensity / noteVisibility
|-- resolutionState / diagnostics
`-- appliedBy / appliedAt
```

### Required Semantics

1. A Collection is never Chart-visible merely because it exists, is selected
   in a Dashboard, or was used by an Analysis Run.
2. `Apply to chart` is an explicit command with a review of snapshot,
   instrument, time coverage, Pane mapping, and style identity.
3. The first version should pin an exact immutable snapshot. A possible later
   `follow-latest` mode must be visibly identified and cannot be used as if it
   were a frozen Analysis input.
4. `Remove from chart` removes only the application and its projections; it
   does not remove, archive, or edit the Collection or native records.
5. Several applications may coexist. They retain distinct identities,
   independent visibility, diagnostics, legends, hit selection, and removal.
6. One failed/unavailable application cannot blank the base chart or other
   applications. A global Workspace commit still needs exact preparation,
   rollback, finalize, and Chart-owner fault escalation.
7. Applications never copy raw Bars, full source payloads, native objects,
   callbacks, plugin code, or private owner state into Workspace records.
8. Applying a snapshot does not automatically restore the Replay cursor or
   alter current viewport. An explicit drill-down command may restore recorded
   context through existing owners.

### Actual Versus Hindsight Comparison

The motivating comparison should work as follows:

- apply one actual-trade Collection snapshot;
- apply one hindsight/counterfactual Collection snapshot;
- render both with the same semantic roles but distinct evidence-mode and
  Collection-identity styles;
- independently toggle actual Entries/Exits, counterfactual Entries/Exits,
  stops, targets, notes, and comparison connectors;
- draw a connector or calculate a delta only when an exact versioned relation
  such as `counterfactualOf(actualTradeId@revision)` exists;
- never pair records merely because timestamps or prices are nearby;
- keep realized and hypothetical metrics, curves, labels, legends, exports,
  and source provenance visibly separate.

## Unified Semantic Chart-Element Standard

### Semantic Roles Are Not Drawing Primitives

`Entry`, `Stop Loss`, `Target`, `Exit`, `FVG respected`, and `EQL swept` are
semantic roles. They may be composed from Point, Segment/Ray, Rectangle,
connector, badge, and text projections, but they cannot become special native
Chart objects owned by business modules or string aliases for geometry.

The candidate portable projection contract is:

```text
ChartSemanticElementV1
|-- elementId / elementRevision
|-- sourceCollection / snapshot / record exact references
|-- semanticRoleId / semanticRoleVersion
|-- evidenceMode
|   `-- actual | planned | observed | counterfactual | public-claim | derived
|-- direction? / status / availability
|-- marketAnchors[] / sourceEvidenceRefs[]
|-- primitiveComposition[]
|-- shortLabel? / explanationRef?
|-- collectionStyleToken / roleStyleToken / stateStyleToken
|-- zBand / densityPriority / interactionPolicy
|-- observedAtReplayCutoff? / outcomeObservationWindow?
`-- provenanceDigest / elementDigest
```

It contains no vendor enum, native Marker/PriceLine/Primitive object, Canvas
function, DOM node, event listener, mutable owner handle, or executable style
callback. The Chart adapter privately chooses a supported native realization.

### Three Independent Visual Dimensions

The renderer must combine, not conflate:

1. **semantic role** — Entry, Stop, Target, Exit, respect, sweep, invalidation,
   observation window, or explanation;
2. **evidence mode** — actual, planned, observed, counterfactual, public claim,
   or derived result;
3. **Collection identity/state** — which applied dataset produced it, selected/
   dimmed/unavailable/stale status, and source availability.

Candidate styling rules:

- semantic role controls base shape/composition and short token (`E`, `SL`,
  `TP`, `X`, `RESPECT`, `SWEEP`);
- direction controls orientation, not just red/green color;
- actual evidence uses solid fill/stroke;
- planned evidence uses an outline and short-dash level;
- counterfactual evidence uses a hollow/double-outline or long-dash pattern and
  an explicit `CF` badge;
- public claims use a citation badge and never look like verified actual fills;
- Collection identity uses an accent/halo/pattern and legend namespace;
- unavailable or incompatible evidence uses a stable broken-link/status badge,
  never disappearance that looks like a negative result;
- color is supplementary: shape, stroke pattern, token, accessible name, and
  legend must preserve meaning in grayscale and common color-vision variants.

### Candidate Role-To-Element Grammar

| Semantic role | Required truth anchor | Candidate compact Chart composition | Important distinction |
| --- | --- | --- | --- |
| actual Entry | exact fill time/price/direction | solid direction-oriented marker at price plus `E`; optional average-entry level | actual fill, not plan or signal |
| planned Entry | decision cutoff and planned price/trigger | hollow direction marker plus bounded dashed level/stub and `PLAN E` | plan may exist without fill |
| counterfactual Entry | review definition and hypothetical time/price | hollow/double-outline marker, long-dash stub, `CF E` | never rendered as actual |
| planned Stop Loss | plan revision, price, active interval | danger-role dashed Segment/Ray from plan time to exit/horizon plus `SL` | moving a stop creates time-bounded revisions; old history is not dragged forward |
| stop execution | exact execution/outcome time/price | `X`/stop marker plus `SL HIT`, linked to exact plan revision | stop level and stop event are different elements |
| planned Target | target price and active interval | positive-role dashed Segment/Ray plus `TP`/R label | no claim of execution |
| actual Exit/partial | exact fill time/price/size role | solid square/exit marker plus `X` or partial token | multiple fills remain attributable |
| EQL/EQH sweep | exact referenced liquidity source and confirming Bar/event | directional sweep marker crossing/adjacent to the source level plus `SWEEP` | source level remains its owner's projection |
| FVG respect | exact FVG Artifact revision, touch and respect-confirmation evidence | respect/rebound marker at confirmation point, short connector/highlight to source Artifact, `4H FVG RESPECT` | the event is not a second FVG Rectangle |
| FVG invalidation | exact FVG and invalidating evidence | break/`X` marker at invalidation point plus `INVALID` | distinct from absence of respect |
| observation/outcome window | exact start/end and policy | low-emphasis time band/bracket behind events | visual window does not alter eligibility |
| explanation | exact source record/revision and anchor | numbered/speech-callout marker plus short label; full text in Inspector | text is evidence-linked explanation, not semantic truth by appearance |

The concrete glyphs, dash arrays, token vocabulary, sizes, and theme colors
remain decision items requiring real visual prototypes. The table binds no
production CSS or Canvas details.

### Relationship To The Future Primitive Family

The separately recorded Segment/Ray/Infinite Line, Rectangle, Circle, and Arc
requirements remain primitive capabilities rather than business meanings:

- time-bounded Entry/Stop/Target levels should normally compose Segment or Ray
  projections according to their declared active interval; an Infinite Line is
  appropriate only when the source meaning is genuinely unbounded;
- source zones such as FVG remain Rectangle-based semantic projections owned by
  their source Artifact;
- Circle may provide a secondary screen-space attention ring around a selected
  key point, but cannot be the only Entry/respect/state encoding;
- Arc may call attention to a move's visual form, but cannot claim measured
  probability, causation, price, duration, or outcome;
- no role may require Circle/Arc merely to make the first visual grammar look
  distinctive.

This memo does not authorize those future primitives or change their coordinate
and ownership requirements.

### `4h FVG Respected` Example

The proposed composition deliberately preserves two truths:

```text
FVG package / Annotation owner
  -> source 4h FVG Rectangle + midpoint + source label

Phenomenon Study or Case owner
  -> respect observation at exact touch/confirmation Bar
  -> context/outcome definition and evidence mode
  -> RESPECT event marker + optional connector + explanation
```

When the exact FVG provider is available, both projections may coexist and the
event can select/highlight the referenced Artifact through a public intent.
When the provider is absent, the Study-owned respect marker and explanation may
remain because they are frozen Study truth, but the application must show
`source unavailable` and must not reconstruct the missing FVG Rectangle from a
citation. A user must never mistake a standalone respect marker for currently
verified source geometry.

## Text And Explanation Candidate

Text has two different ownership paths:

1. **business/evidence explanation** — rationale, observation, error,
   counterfactual explanation, source note, or conclusion attached to an exact
   Case/Trade/Event record and projected through a Collection application;
2. **free Chart text** — a future `geometry.text` Drawing Entity authored on a
   chart without automatically becoming Study, Journal, or semantic evidence.

They may share a Chart-owned text/callout renderer but cannot share semantic
storage or mutation commands.

Candidate business record:

```text
ChartExplanationV1
|-- explanationId / revision
|-- sourceRecord exact reference
|-- explanationKind
|-- marketAnchor or bounded interval
|-- shortLabel / plainTextBody
|-- author / createdAt / observedAtReplayCutoff?
|-- sourceCitationRefs[]
|-- presentation preference
`-- contentDigest
```

Initial candidate rules are:

- bounded UTF-8 plain text first; no arbitrary HTML, script, remote image,
  iframe, CSS, executable Markdown, or external font;
- short labels remain compact; long text opens in an Inspector/side panel and
  does not cover the candle task by default;
- a callout's market anchor is truth, while pixel offset, wrapping, leader-line
  routing, and collapsed/expanded state are presentation;
- explicit note kinds distinguish observation, decision rationale, mistake,
  alternative, source claim, and later conclusion;
- later Outcome knowledge cannot rewrite a decision-time explanation; create a
  later attributed explanation revision/role;
- public-source quotation and interpretation remain separate, with source and
  rights provenance; the Chart should normally display a short paraphrase or
  citation token rather than a long quotation;
- hidden/collapsed labels remain discoverable from the parallel element list,
  legend, keyboard navigation, and Inspector;
- deleting a Chart application never deletes its explanations.

## Z-Order, Density, Interaction, And Accessibility

Candidate stable visual bands are:

```text
background study windows
  < source zones/geometry
  < planned levels/connectors
  < candles and calculated series according to existing owner policy
  < event/trade markers
  < compact labels/callouts
  < selection handles/focus/interaction preview
```

Exact adapter ordering requires a later Chart-owner decision. A Collection
cannot request an arbitrary unbounded z-index.

Applying several dense Collections must not silently drop source records or
change Dashboard counts. Visual decluttering may cluster, collapse labels,
limit simultaneously expanded notes, or show a density diagnostic, but the
parallel element list must retain exact membership. Selection should expand
one source group and temporarily dim others without rewriting visibility
preferences.

Every rendered element needs a stable accessible name containing Collection,
semantic role, evidence mode, direction/status, time, and price when applicable.
Keyboard users need a non-Canvas list/Inspector path to select, inspect, hide,
and drill down. Contrast, focus, touch targets, narrow widths, localization,
and high-DPI alignment require focused human and automated evidence.

## Setup-Free Phenomenon Study

A phenomenon question must not be forced into a fake Setup or trade. Candidate
records are:

```text
PhenomenonStudyDefinitionV1
|-- ResearchQuestion
|-- UniverseDefinition
|-- EventDefinition
|-- OutcomeDefinition
|-- ContextDimensionDefinitions[]
|-- SamplingAndCompletenessPolicy
`-- visualizationRoleBindings

PhenomenonObservationV1
|-- exact definition versions
|-- event/source Evidence Citations
|-- no-future observation cutoff
|-- later outcome evidence/window
|-- context values and provenance
|-- classification / ambiguity / censoring
`-- explanation references
```

It can reuse immutable Study Cohorts, deterministic Analysis Runs, Dashboard,
raw-context drill-down, export, and Chart application. It does not use
`SetupDefinition`, qualification as a trade Setup, entry, stop, P&L, or win
rate unless a separate explicit trade policy actually exists.

### Example: 5m EQL/EQH Sweep Probability

Before calculating a rate, the Definition must freeze at least:

- exact EQL/EQH meaning, formation count, price tolerance, source timeframe,
  and earliest knowable formation cutoff;
- eligible instruments/date/session windows and market-data revision;
- what counts as a sweep versus close-through, touch, or invalidation;
- horizon and incomplete/censored handling;
- exhaustive, sampled, manual-discovery, or detector-aided collection method;
- duplicate/overlapping-liquidity policy and denominator.

The Chart application may show source liquidity levels from their owner and
Study-owned `SWEEP`/`NOT SWEPT`/censored event outcomes. A rate based only on
remembered sweeps must be labelled illustrative, never probability.

### Example: 4h FVG Respect Probability

Before calculating a rate, the Definition must freeze at least:

- exact eligible FVG definition/version and formation cutoff;
- first touch versus any touch, wick versus close, depth, mitigation, respect,
  invalidation, reaction magnitude, and observation horizon;
- whether opposite structures, gaps, holidays, incomplete sessions, and
  overlapping FVGs are included;
- context dimensions such as session, direction, age, touch count, fill depth,
  displacement, higher-timeframe trend, volatility regime, and location;
- sample completeness, censored records, unavailable sources, and denominator.

“What conditions increase respect probability?” should begin with deterministic
stratified Cohorts and exact denominators. Later AI may propose interactions or
new hypotheses, but cannot manufacture missing negative cases or redefine
`respect` after seeing outcomes.

The current manual FVG workflow can support carefully sampled or exhaustively
audited manual observations. It cannot by itself prove that every eligible FVG
in a large range was found. A later detector/enumerator may improve coverage,
but requires its own plugin/Profile/owner/no-future/conformance decision.

## Lifecycle And Failure Matrix

| Event | Dashboard/source records | Applied Chart elements | Base Chart/plugins |
| --- | --- | --- | --- |
| no Collection is applied | Dashboard remains complete | none by design | unchanged |
| apply one snapshot | source bytes unchanged | exact application appears or transaction rolls back | unchanged |
| apply several snapshots | each remains separately attributable | independent layers/legend/status | unchanged |
| remove one application | source remains | only that layer detaches | other layers/base Chart remain |
| source business module disabled | durable bytes remain under its persistence contract | binding becomes unresolved; no ghost cached projection | Replay/plugins remain usable |
| cited plugin disabled/absent | Collection citations/history remain | Study-owned markers/notes may remain with source-unavailable state; plugin-native geometry/series disappears and is not reconstructed | unrelated plugins remain usable |
| one application projection fails | source remains | failed application reports exact diagnostic/rolls back | other applications and base Chart remain |
| exact compatible source returns | history remains byte-identical | explicit/current resolution may restore supported source visuals | no historical rewrite |
| incompatible definition/provider | old records remain pinned | unresolved/mismatch state | no guessed migration |
| remove Dashboard/application feature | native owners remain | all application visuals disappear | Replay, Journal, FVG, SMA remain independent |

## Owner Boundaries

| Candidate boundary | Allowed responsibility | Forbidden responsibility |
| --- | --- | --- |
| native business/source owners | authoritative Cases, trades, phenomena, Artifacts, calculated instances, revisions | Chart native writes, universal copied dataset |
| Collection registry/snapshot owner | exact cross-owner references, selection, digest, availability and declared capabilities | copying private payloads, rewriting source truth |
| Dashboard projection | capability-aware read model, metric/result links, commands as intents | metric invention, source writes, Chart writes |
| Workspace Collection-application owner | exact default-off bindings, order/visibility/style identity, reversible persistence | source mutation, Bar/Replay requests, native objects |
| semantic Chart-element compiler | pure validation and role-to-portable-element composition | Canvas, DOM, native vendor handles, private plugin imports |
| Chart-owned Collection projection | prepare/admit/update/detach all validated element sets under Chart transaction/fault rules | business truth, direct source mutation, alternate Chart owner |
| Chart adapter | adapter-private Markers/Price Lines/Primitives/Text realization and hit testing | portable contract ownership, business meaning |
| explanation UI/Inspector | bounded text editing through owning business command, full readable text and citations | direct record/storage mutation, executable markup |

A future generic public Contribution Profile for business Chart elements is not
accepted by this memo. The first implementation, if ever authorized, should be
a first-party removable host module using exact known providers before exposing
an SDK surface.

## Existing Capability And Ecosystem Evidence

V7 currently pins Lightweight Charts `5.2.0`. The 2026-08-18 review found:

- official `createSeriesMarkers` creates a Series Markers primitive with time,
  optional exact price, id, text, size, color, position, and supported shapes;
- official Series API supports native horizontal Price Lines with title, line
  style, axis label, and lifecycle methods;
- official Series/Pane Primitive APIs support layered Canvas visualizations and
  scale labels, with explicit attach/detach and update lifecycles;
- official plugin examples include Anchored Text, Partial Price Line, Rectangle
  Drawing Tool, Tooltip, Trend/Vertical Line, alerts, and session highlighting;
- pane text watermark is a pane-level presentation feature, not a market-
  anchored explanation record;
- the current `awesome-tradingview` inventory points to official plugin
  examples and a very small set of community utilities; it exposes no accepted
  uniform Entry/Stop/respect/business-Collection visual grammar or owner model.

Useful references:

- [Series Markers API](https://tradingview.github.io/lightweight-charts/docs/api/functions/createSeriesMarkers)
- [Series API: Price Lines and Primitive attachment](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi)
- [Official plugin architecture](https://tradingview.github.io/lightweight-charts/docs/plugins/intro)
- [Official plugin examples](https://tradingview.github.io/lightweight-charts/plugin-examples/)
- [awesome-tradingview](https://github.com/tradingview/awesome-tradingview)

The candidate therefore reuses official native capabilities only inside the
existing V7 Chart adapter. It does not adopt an external Dashboard, annotation,
trade marker, journal, or plugin package, and it does not let business modules
call those native APIs.

## Alternatives Preserved

### A. One Monolithic Journal/Research Dataset

Rejected as the current recommendation because it collapses actual, planned,
counterfactual, public-claim, and phenomenon truth and creates one new owner of
other modules' records.

### B. Each Module Invents Its Own Chart Style

Rejected as the current recommendation because Entry/Stop/respect meaning would
change by workflow, multiple datasets would become visually ambiguous, and
accessibility/performance would be impossible to govern consistently.

### C. Automatically Display Every Dataset On Open

Rejected as the current recommendation because it obscures price action,
creates surprising cross-context state, and makes comparison/application
intent irreproducible.

### D. Screenshot-Only Or Text-Only Review

Retained only as supplemental human context. It cannot replace exact market
anchors, record revisions, no-future provenance, Cohorts, metric denominators,
or raw-context drill-down.

### E. Make Each Dataset A Plugin

Rejected as the current recommendation. A dataset is user-owned business data,
not executable package code. A provider plugin may produce source evidence or
portable visual intents, but package lifecycle and dataset lifecycle remain
separate.

## Open Product Decisions

1. Is `Dataset` the final UI word while `EvidenceCollection` remains the
   internal contract term, or should one term serve both?
2. Which native owners exist for public Setup research and counterfactual
   review, and which cross-owner Collection references are legal?
3. Which Dashboard surfaces and metric-capability rules form the first slice?
4. Is exact pinned snapshot the only first Apply-to-chart mode?
5. How are Pane/timeframe mappings chosen when a Collection contains several
   source timeframes?
6. Which maximum simultaneously applied Collections/elements/notes and
   deterministic decluttering rules are acceptable?
7. Are the proposed role/evidence-mode/Collection-state visual dimensions
   complete?
8. Which exact glyphs, lines, patterns, tokens, z-bands, light/dark themes, and
   accessible names define the first visual standard?
9. Which Entry/Stop/Target/Exit semantics belong to Journal versus a generic
   plan/review contract?
10. Which exact `FVG respected` definition and marker/connector composition is
    suitable for the first phenomenon fixture?
11. Is first-slice explanatory text bounded plain text only, and which note
    kinds/lengths/anchor policies are required?
12. Should free-form Chart text be decided with the future Drawing primitive
    family or separately from business explanations?
13. What constitutes an exhaustive/manual/detector-aided sampling receipt for
    a defensible phenomenon probability?
14. Which Collection/app/source removal states may retain Study-owned markers
    while refusing to reconstruct unavailable plugin-native visuals?
15. Should this direction be promoted as one ADR with several delivery slices
    or separate Dashboard/Application, Visual Grammar, and Phenomenon Study
    decisions?

## Evidence Required Before A Decision

At minimum, promotion should be informed by:

1. product wireframes for an empty/default Dashboard, Calendar, metric
   applicability, one Collection, and multiple Collections;
2. one actual-versus-counterfactual fixture with exact relations, independent
   toggles, legends, actual/hypothetical metrics, and no visual ambiguity;
3. one `4h FVG respected` fixture with source Artifact available and absent;
4. one dense multi-Collection fixture proving deterministic decluttering with
   unchanged membership/counts and complete parallel Inspector access;
5. light/dark, grayscale/color-vision, keyboard/focus, touch, high-DPI, narrow-
   width, pan/zoom/Crosshair, and candle-readability review;
6. official Marker/Price Line/Primitive/Anchored Text realization spikes inside
   the Chart adapter, including bounded time levels and callout collision;
7. exact Workspace apply/remove/reload/state-sync/rollback/fault lifecycle and
   module/plugin absence matrices;
8. one manually complete small-range phenomenon study and one deliberately
   biased positive-only sample demonstrating different allowed claims;
9. resource budgets for snapshots, elements, notes, markers, native
   primitives, render time, hit testing, and state bytes;
10. source-quality, optional-removal, sole-writer, no-future, state-sync,
    production-regression, and focused human-gate plans.

## What Would Change The Current Position

The recommendation should be revisited if:

- native owners cannot provide portable exact-revision read models without
  duplicating their truth;
- official Marker/Primitive density or text collision behavior cannot meet
  bounded one/four-Pane interaction budgets;
- a simpler host-owned element set cannot distinguish two or more Collections
  accessibly;
- actual and counterfactual records cannot share a safe comparison relation;
- manual phenomenon sampling cannot produce any defensible completeness
  evidence and detector work would be prerequisite;
- user testing shows Dashboard-first/default-off application interrupts the
  dominant Replay/review workflow;
- source licensing or privacy prevents the proposed public Setup or actual-
  trade representation.

## Promotion Checklist

Before any content here becomes binding:

- [ ] accept or amend the fifteen open product decisions;
- [ ] reconcile MEMO-V7-003, ADR-V7-001/003/005/006, and the pending FVG + SMA
  business Demo candidate;
- [ ] select exact owners, public contracts, persistence namespaces, limits,
  state-sync behavior, diagnostics, migrations, and removal semantics;
- [ ] select and visually review the first semantic-role style tokens and text
  behavior;
- [ ] decide whether one or several ADR/specifications are required;
- [ ] allocate no delivery/Harness id until a separate implementation
  instruction;
- [ ] require automated negative controls plus applicable real-browser human
  acceptance for every visible slice.

## Append-Only Position History

### 2026-08-18 23:25 PDT — Initial Position

Captured the product owner's Dashboard-first/default-off dataset model,
simultaneous multi-dataset Chart application, actual-versus-hindsight use case,
Setup-free EQL/EQH/FVG phenomenon research, and request for a uniform explicit
Entry/Stop/FVG-respect/text visual standard. The initial recommendation is a
shared Evidence Collection read/application layer plus one host-governed
semantic visual grammar over native owners, with no implementation authority.
