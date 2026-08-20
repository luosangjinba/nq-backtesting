# V7 Chart Activity Calendar, Authoring Contexts, And Visibility Lenses — ADR-V7-007 Candidate

Status: candidate product/architecture decision; decision 1 is already binding
product-owner direction and implemented as a reversible production hold;
decisions 2–10 await later reconciliation with MEMO-V7-006 and explicit review
and authorize no Calendar, workflow, order, record-schema, Chart-projection, or
geometry-migration implementation

Drafted: 2026-08-20 PDT

Promotes or resolves parts of: `MEMO-V7-003`, `MEMO-V7-005`, and the
unaccepted R14.1/H121 product surface

Subsequent discovery boundary: the product owner paused candidate review and
successor implementation later on 2026-08-20. Continue first with
`V7_CHART_NATIVE_RESEARCH_MODEL_SETUP_PLUGIN_BOUNDARY_PREDECISION_MEMO.md`,
which records the developing software portrait, atomic Plugin versus Model
versus Setup distinction, and three-minute/three-step interaction constraint.
This candidate remains useful input but is not the immediate approval action.

## Product-Owner Direction And Immediate Hold

The product owner rejected the current form-first `Capture Study Case`
experience, directed that it be removed temporarily, and required the next
foundation work to begin with a Chart-overlay Calendar and consistent
background parameters for geometrically anchored elements. Study/review/order
authoring must not be rushed before those foundations exist.

That withdrawal is implemented as product composition, not deletion:

- production Session boot omits `adapter.validation-campaign-ui` and the
  existing catalog removes the complete eight-module Campaign closure;
- Validation navigation, Pane actions, route UI, code modules, and stylesheet
  are absent from the default product boot;
- existing Campaign source, schemas, tests, screenshots, and persisted/state-
  sync bytes are retained without rewrite or cleanup;
- the old implementation remains executable only through an isolated H121
  fixture so its useful evidence/provenance work is not lost;
- H121 remains unaccepted and is no longer the next product acceptance action.

This is decision 1. It is not waiting for review in this document.

## Recommended Product Shape

V7 should share one Chart, Replay, Bar Data, Workspace, Session, Calendar, and
location foundation while keeping the meanings of research observations,
practice orders, hindsight alternatives, and imported executions separate.
The product does not need four replay/chart applications or one global mode
that hides every other kind of evidence.

```text
native truth owners
  |-- Research Observation / model occurrence
  |-- Replay Practice order and decision evidence
  |-- Retrospective Review / counterfactual scenario
  `-- Imported Execution / live reproduction
             |
             v
     read-only Chart Activity summaries
             |
       derived Activity Index
        +----------+-----------+
        |                      |
        v                      v
  Calendar overlay       visibility lenses
        |                      |
        `--> locate intent --> Session / Replay / Workspace --> Chart owner
```

The shared layer indexes and locates records. It does not flatten them into one
universal order/case schema or become another business truth owner.

## Authoring Context Is Not A Visibility Mode

Two concepts must remain independent:

1. **Authoring context** — at most one active context controls what the next
   user action may write, which clock/evidence policy applies, and which owner
   receives the command. It has an explicit Start/Stop action.
2. **Visibility lens** — zero or more independently switchable read-only Chart
   and Calendar layers. Research, practice, hindsight, and imported executions
   may be viewed together without changing their source records.

Candidate first contexts are:

| Authoring context | May write | Time/evidence policy | Must never claim |
| --- | --- | --- | --- |
| Research observation | setup/model occurrence and later observation outcome | no-future decision cutoff | an order, fill, or P&L |
| Replay practice | simulated decisions/orders/fills | no-future Replay clock and declared fill model | live execution |
| Retrospective review | counterfactual/hindsight scenario and comparison | full-history access, visibly retrospective | that the action was knowable or executed then |
| Execution reproduction | notes/relations around imported actual events | external broker/event timestamps and provenance | that V7 generated the broker truth |

Starting one context does not erase, hide, convert, or disable other records.
Visibility lenses remain independently selectable. A record is never converted
in place: a promotion, comparison, or copy creates a new native record with an
exact relation such as `derivedFrom`, `reviewOf`, or `counterfactualOf`.

## Native Truth And Common Read Model

The exact owners remain subject to later slice specifications, but their truth
must stay distinct:

| Record family | Candidate native owner | Distinct truth |
| --- | --- | --- |
| `ResearchObservation` | future Research owner | model/definition version, decision cutoff, evidence, classification, non-execution outcome |
| `ReplayPracticeExecution` | future Training/Simulation owner | user decision, order intent, fill assumptions, simulated result |
| `RetrospectiveScenario` | future Review owner | hindsight availability, assumptions, comparison target, reviewer |
| `ImportedExecution` | Journal/import owner | broker order/fill ids, fees, size, account/currency, source revision |

Each owner may expose a bounded read port yielding a candidate
`ChartActivitySummaryV1`. The common summary should contain only identity,
owner/kind, instrument, exact event or span time, calendar day basis, compact
status/badge data, immutable source reference, and a locator intent. It must
not copy full orders, Cases, Bars, private plugin payloads, or mutable owner
handles.

The Activity Index is derived and rebuildable. It may cache summaries and
day/count aggregates, but it owns no source record and cannot write back to a
provider. Missing or incompatible providers produce attributed unavailable
summaries rather than silent record deletion.

## Chart Activity Calendar

The current `calendar-surface` is a reusable date picker/month-grid foundation;
it does not know business activity and should not be overloaded into a truth
owner. The successor Calendar should be a new removable surface that reuses
its pure month grid while adding an Activity contract, index, aggregation, and
location controller.

The first Calendar surface should:

- float as an accessible DOM overlay above the Chart rather than become a
  canvas Primitive;
- show day counts and compact type/status tokens for every enabled lens, with
  text/shape support rather than color-only meaning;
- expand a selected day into exact activities, source owner, time, status, and
  availability;
- support points and bounded time spans without loading historical Bars;
- declare the market/session-day basis and timezone instead of silently using
  browser-local midnight;
- let the user filter lenses without changing the active authoring context;
- retain unavailable activities and explain why their source cannot currently
  open;
- remain useful before Research, orders, or Journal are implemented by first
  indexing existing Session/annotation metadata through explicit providers.

Calendar opening must not create a Replay Session or load a full date range
into Chart state.

## Location Ownership

Selecting an activity dispatches one generic location intent. It must not call
Lightweight Charts, request Bars, or mutate Replay directly.

```text
Calendar activity click
  -> validate source reference and locator
  -> if necessary, open the source Session through Session Application
  -> wait for accepted Workspace identity
  -> dispatch existing exact-Go-To / Replay navigation command
  -> Workspace and Replay settle
  -> Chart owner renders the accepted snapshot
```

The existing exact-Go-To path should be reused or generalized behind the same
owners. Cross-Session location is a composed command with cancellation and
identity fences, not a Calendar-owned shortcut.

## Anchored Geometry Appearance V2

Geometry and appearance remain separate. Rectangle, FVG, future Circle/Arc,
and other filled anchored elements should use one host-owned appearance
contract rather than duplicate `fillColor`, `fillOpacity`, and package-local
defaults.

The candidate contract has two independent groups:

```text
AnchoredElementAppearanceV2
|-- stroke: enabled / color / opacity / width / style
`-- fill: enabled / color / opacity
```

The product Inspector may label `fill` as **Background**. Internally, one pure
normalizer must define exact color/opacity rules and a capability matrix:
Segment/Ray accept stroke only; Rectangle/Circle/closed regions accept stroke
and fill. Semantic packages may provide defaults but cannot define competing
schemas. Annotation and FVG projection must consume the same normalized value.
A V1-to-V2 migration must preserve current pixels and history; no bulk rewrite
occurs merely because the product boots.

This is a small independent contract/migration slice. It need not wait for the
Calendar UI, but neither implementation is authorized by this candidate.

## Later Chart-Native Research Experience

After Calendar and appearance foundations are accepted, the retained research
model may return through a Chart-native workflow:

- product language such as `Add sample` or `Record model occurrence`, not the
  internal term `Capture Study Case`;
- choose a model/definition, then select or create evidence directly on the
  Chart;
- show a compact readiness checklist, ghost projection, source timeframe,
  decision cutoff, and missing evidence beside the Chart;
- require one understandable confirmation card, with advanced details in an
  optional Inspector;
- immediately expose the saved observation in Calendar and enabled Chart lens;
- keep later outcome evidence separate from decision-time evidence.

No order is required. This remains a pure price-action/model-occurrence study
unless the user explicitly starts a separate practice/review/execution context.

## Existing Capability Check

Official Lightweight Charts supports Series/Pane Primitives, custom series,
drawing tools, and time-axis rendering surfaces, while Series Markers support
time-anchored annotations. These are adapter-private rendering mechanisms, not
business record, Calendar-index, authoring-context, or location owners:

- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://tradingview.github.io/lightweight-charts/tutorials/how_to/series-markers>
- <https://tradingview.github.io/lightweight-charts/plugin-examples>
- <https://github.com/tradingview/awesome-tradingview>

No new chart dependency is selected here.

## Proposed Delivery Order

1. keep the current Study Case/Campaign product hold and preserve data;
2. accept and implement the pure Activity contract, provider boundary, and
   derived index before a business-specific Calendar;
3. implement the floating Calendar plus exact location path with synthetic
   activities, accessibility, timezone/day-basis, and no-Bar-load evidence;
4. accept and implement Anchored Geometry Appearance V2 as its own bounded
   migration/projection slice;
5. redesign Chart-native research observation over Calendar/Activity;
6. add practice, retrospective review, and imported execution owners one at a
   time, all through the same Activity read boundary.

The standalone AI tooling candidate in `V7_AI_PLUGIN_AUTHORING_AND_MIGRATION_STUDIO_CANDIDATE.md`
may progress independently and does not block steps 2–4.

## Ten Material Decisions

1. **Binding/implemented:** withdraw the current Campaign/Study Case product
   surface through reversible composition while retaining source and data.
2. Share one Chart/Replay/Calendar foundation; isolate business truth, not
   whole workstation products.
3. Separate one active write-controlling authoring context from multiple
   independent read-only visibility lenses.
4. Keep Research, Practice, Retrospective, and Imported Execution records in
   native owners; relate or copy with provenance and never convert in place.
5. Introduce a bounded common Activity summary and rebuildable read-only index,
   not a universal business store.
6. Implement Calendar as an accessible DOM overlay reusing the pure month grid
   and loading summaries rather than Bars.
7. Route every location through Session/Replay/Workspace owners and the exact
   Go-To path.
8. Normalize anchored-element stroke/fill through one versioned appearance
   contract and pixel-preserving migration.
9. Return research capture later as Chart-native `Add sample` interaction with
   explicit decision/outcome separation.
10. Allocate no Calendar, geometry, order, Research, Review, Journal, delivery,
    or Harness implementation from candidate acceptance alone.

Explicit product-owner review is required for decisions 2–10.
