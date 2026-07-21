# V7 Replay/Chart Architecture

Status: binding owner and transaction contract (2026-07-19)

## One-Way State Flow

```text
UI intent
  -> Workspace Transaction Runtime
    -> Session Store (identity/configuration)
    -> Replay Runtime (cursor/reveal proposal)
    -> Bar Data Runtime (raw acquisition/cache)
    -> pure Projection Domain (hours + TF + no-future)
    -> atomic Workspace Snapshot commit
      -> Chart Runtime/Adapter (series)
      -> Viewport Runtime (existing intent)
    -> visible completion
```

Events notify observers after accepted commits. Events do not form an
asynchronous business-process chain and never trigger a second materialization.

## State Owners

### Session Store

Owns durable records keyed by opaque `sessionId`: date range, instruments,
workspace layout, pane intents, Replay checkpoint, and schema version. Every
read/write requires an explicit `sessionId`; there is no implicit active-session
persistence key.

It does not request bars, advance Replay, project bars, or write charts.

### Replay Runtime

Owns the accepted cursor, revealed-through boundary, playback state, and source
traversal semantics for exactly one activated session generation. It can
produce a cursor proposal for a transaction, but publishes accepted progress
only when that transaction commits visibly.

There is one shared Replay clock. Panes and instruments never own cursors.

### Pane Workspace Domain

Is pure. It defines the uniform Pane intent record used from one Pane to many,
validates active focus and Session-bounded instrument selection, and plans
pane-local or synchronized instrument intent. It owns no mutable runtime,
persistence, Replay, bars, projection, chart, or DOM state.

R6.1 activates `core.pane-workspace-domain`. Every Pane has exactly `paneId`,
`instrumentId`, `timeframeId`, and one branded Viewport intent. The Viewport
scope must match the Session, activation, and Pane; every Pane must observe the
same Replay cursor. Pane records structurally reject per-Pane Replay fields.

R6.2 activates `core.replay-pane-response-contract`. Manual Next/Previous,
Autoplay Next, Restart/Back-to, quick schedule GoTo, and exact GoTo all produce
one complete visible-Pane response plan. Active focus cannot narrow Replay
scope; the Session primary instrument remains clock authority; Session Hours is
one Session-level revision; forward jumps require complete interval coverage;
and failure preserves the last accepted Pane set.

### Bar Data Runtime

Is the only raw market-data requester and cache owner. Cache identity includes
provider, instrument, source interval, and bounded time window. It never uses
the active UI session as an implicit cache identity and never writes Replay or
chart state.

Dataset revision completes raw cache identity. Identical in-flight requests are
coalesced, eviction is bounded, and Replay prefetch uses explicit watermarks.
Raw future bars may be cached but never projected past the accepted cursor.
Detailed performance and chunking rules are binding in
`V7_CACHE_AND_LATENCY_CONTRACT.md`.

Before the runtime is activated, `core.bar-data-contract` owns only immutable
provider-neutral request/bar/batch values. Raw identity is exactly provider,
instrument, source resolution, bounded half-open window, and dataset revision.
It excludes Session, pane, display TF, ETH/RTH, Replay, and viewport state.
Provider wire metadata is normalized at a future adapter boundary and cannot
leak into the raw domain merely for V4 compatibility.

R3.2a activates one `core.bar-data-runtime` acquisition/cache path over an
injected provider resolver. Each runtime instance owns a bounded exact-window
LRU cache, identical-request coalescing, a global concurrency queue, abort
signals, and disposal. Provider output is revalidated before cache admission;
failures and late post-dispose completions cannot write cache state. Real
transport, overlapping coverage, revision discovery, gap policy, retry,
deadline, and prefetch remain inactive after R3.2a.

R3.2b1 adds `core.provider-policy-contract` as a pure transport-neutral policy
boundary. Provider revision freshness, request limits, failure deadline,
bounded retries, stable error kinds, and the adapter port are declared before
any real provider is selected. Coverage math and policy execution remain later
substeps; no Session, Replay, chart, UI, or network owner is introduced.

R3.2b2 adds a pure `core.coverage-planning-contract`. Provider coverage is an
explicit full-window tiling rather than an inference from sparse bars. Its
planner subtracts settled intervals and splits unresolved acquisition by both
provider window and bar-count limits, in deterministic forward or backward
order. It performs no provider I/O and owns no runtime state.

R3.2b3 adds `core.provider-execution-runtime` between a concrete adapter port
and Bar Data Runtime. It executes revision TTL, deadline, retry, provider-local
concurrency, validated coverage, caller/root cancellation, and complete-plan
continuation. Bar Data Runtime remains the only raw cache/request owner. Only
deterministic fake adapters are used; no real transport is selected.

R3.3a adds `core.replay-contract` without activating a mutable clock. Manual
and Auto advancement are the same duration-based input, never a request for one
sampled display candle. A branded cursor proposal carries the complete workspace
transaction identity, base Replay revision, bounded target, and half-open reveal
window. Its cursor is an exclusive no-future cutoff; Projection remains the
future owner that applies that cutoff to bars.

R3.3b activates `core.replay-runtime` as the only mutable Replay cursor writer.
Each instance is permanently scoped to one branded Session/activation pair.
Proposing Manual or Auto advancement has zero state effects. The cursor and
revision advance only through `commitVisible`, after the future coordinator has
completed the matching visible workspace transaction. Foreign, rejected, and
base-revision-stale proposals cannot mutate the clock.

R3.3c adds `core.replay-prefetch-contract` as pure advice rather than another
request owner. When explicit contiguous raw coverage ahead of the accepted
cursor drops below low watermark, it recommends one bounded forward window
toward high watermark, clamped at Session end. A future coordinator may map the
window to provider identity and submit it to Bar Data Runtime; Replay never
performs provider I/O and pointer events never continue the plan.

### Projection Domain

Is pure. Its complete input includes instrument, source bars, proposed cursor,
session-hours mode/calendar revision, display timeframe, and no-future policy.
It returns final pane bars plus provenance. It performs no I/O and owns no
state.

R4.2 activates its provider-neutral identity-projection foundation. Ordered,
non-overlapping Raw Bar Batches must share provider, instrument, source
resolution, and dataset revision. The proposed Replay target is an exclusive
cutoff applied before Session Hours eligibility and aggregation. Registered
pure policy ports must match the selected Timeframe/Calendar capability ids;
the core domain contains no concrete capability-id branches. Output is one
deeply immutable pane snapshot with source request keys, capability/calendar
revisions, policy ids, dataset revision, and the original cursor proposal.
R4.2 implements no actual CME eligibility or higher-timeframe aggregation.

R5.2 activates `core.session-hours-domain`. It interprets the verified source's
UTC-like exchange wall-clock labels without a second timezone conversion,
applies half-open weekly ETH/RTH intervals plus versioned verified date
exceptions, and exposes source-backed visible-through and eligible traversal.
It is pure and does not own Replay or Bar Data state. Unknown/missing source
coverage remains unknown; it cannot silently become a holiday or a synthesized
bar.

R5.3 activates `core.fixed-timeframe-domain` as a pure registered aggregation
policy. Fixed buckets use an explicit Unix/clock origin and configuration offset
rather than caller/session/Replay origins. It aggregates only the eligible,
exclusive-no-future bars supplied by Projection Domain, preserves gaps, and
contains no concrete timeframe-id branches. Calendar day/week/month alignment
remains a separate policy boundary.

R5.4 activates `core.workspace-replacement-runtime` as a thin registered
selection and routing boundary over the existing Workspace Transaction Runtime.
Replay retention proposals distinguish projection-only replacement from time
advancement; exact projection provenance supplies explicit Session Hours mode
and source-level visible-through. Acquisition/presentation races and failures
cannot publish a stale selection, chart snapshot, cursor, or visibility value.

R5.6 activates `adapter.v4-bars-provider` as the concrete local market-data
boundary. It converts real request instants to V4 New York wall-clock strings,
normalizes V4's UTC-like wall timestamps back to real instants, removes API
padding outside the exact half-open request, and returns validated Raw Bar and
Coverage contracts through the existing policy executor. It has no Session,
Replay, Projection, chart, or viewport ownership. Production has no synthetic
bar fallback; an unavailable V4/DuckDB source remains a visible failure.

### Workspace Transaction Runtime

Is the sole coordinator of chart-visible changes. It accepts an immutable
intent containing `sessionId`, `activationGeneration`, and `transactionId`.
It plans all affected panes, acquires data through Bar Data, projects, checks
currency once more, and commits or rejects the entire result.

It never becomes the owner of Session, Replay, Bar Data, Chart, or Viewport
state. It coordinates their public contracts.

R4.1 activates its headless coordination foundation for one branded Session
activation. A newer complete transaction identity supersedes older work;
aborting that work is cleanup only. Replay proposals remain inert across
acquisition and projection. An opaque visible-completion acknowledgement must
bind the exact identity and immutable projected snapshot before one final
currency check permits Replay `commitVisible` and accepted workspace revision
publication in the same synchronous turn. Late stale successes, late stale
failures, dependency failures, and disposal preserve the last accepted
workspace snapshot and Replay cursor. R4.1 uses fake owner ports and does not
claim real chart-visible completion.

### Chart Runtime/Adapter

Is the only chart-series writer. It applies an accepted workspace snapshot. It
does not infer missing bars, request history, choose a cursor, persist a
session, or initiate another projection.

R4.3 activates the headless Chart Snapshot Application behind this boundary.
It validates immutable projection provenance, stages without visible mutation,
checks complete transaction currency at the adapter's final mutation boundary,
and accepts only an exact branded adapter receipt before issuing exact visible
completion. Stale, failed, duplicate, forged, and disposed applications publish
no completion. R4.3 uses a deterministic fake adapter and makes no browser-paint
claim; the first Lightweight Charts adapter must add a paint-level visual gate.

R4.5 activates `adapter.lightweight-chart` as the only concrete series-API
implementation. It applies one complete snapshot, reapplies Viewport intent,
waits across rendering opportunities, and requires candle pixels from
`takeScreenshot()` before returning its exact receipt. The adapter owns native
logical-range capture and chart disposal, but no Replay, bars, projection, or
durable viewport state.

### Viewport Runtime

Owns pane-local horizontal wall and vertical-scale intent. Data commits preserve
the current intent. Only explicit Reset/Follow creates a new default intent.
Replay places new bars at the existing wall and pushes prior bars left.

R4.4 activates its pure horizontal intent foundation. One branded Session
activation and opaque pane identity bind immutable default/manual wall values.
Replay cursor movement preserves origin, offset, span, and intent revision;
native logical-range measurements create manual intent, while adapter logical
ranges remain transient projection output. There is still no chart mutation,
DOM, persistence, vertical-scale policy, or Lightweight Charts dependency.

R4.5 adds the mutable pane controller inside the same owner. The real adapter
may request a projection or submit a native logical-range measurement; it
cannot replace intent through data application.

## Modular Assembly Contract

V7 is assembled from modules; it is not one application object split across
files. Every production module declares a machine-readable descriptor:

- stable module id and version;
- exactly one owning responsibility;
- public commands, queries, notifications, and data contracts;
- required and optional ports;
- lifecycle: `create`, `start`, `stop`, `dispose` as applicable;
- persistence namespace and schema, if any;
- independent harness entry;
- whether the module is core or removable.

Rules:

- imports may target another module's public entry only, never its internals;
- a module receives dependencies through explicit ports, not globals or service
  location;
- notification subscribers cannot be required for the publisher to be correct;
- stopping/disposal releases subscriptions, requests, timers, and surfaces;
- optional features can be absent without conditional branches in core owners;
- replaceable adapters pass the same contract suite;
- persistence namespaces do not overlap;
- a module's independent harness uses in-memory/fake ports and no app shell;
- the composition root wires modules but owns no product behavior;
- circular module dependencies fail the architecture gate.

Core modules are not necessarily removable from a running replay, but each is
independently constructible and replaceable behind its contract. Optional
Backtesting, Journal, analytics, evidence, drawing, and future plugins must be
freely addable/removable without modifying replay/chart core source.

## Module Harness Gates

The executable modularity harness must enforce:

1. descriptor completeness and unique ownership;
2. imports only through declared public entries;
3. acyclic dependency graph;
4. unique command/state writer inventories;
5. independent contract harness for every module;
6. minimal-core boot without optional modules;
7. optional-module removal boot matrix;
8. lifecycle cleanup with no leaked subscriptions/timers/requests;
9. adapter replacement against a shared conformance suite;
10. no V4/V5/V6 runtime imports.

No feature step is accepted when it adds production code without adding its
descriptor and independent harness to the manifest.

## Capability Extension Contract

Growing supported values must not require edits to replay/chart core. V7 uses
typed registries at the composition boundary; core owners consume capability
interfaces and opaque identities.

### Timeframes

`TimeframeDefinition` declares identity, duration/calendar alignment,
aggregation policy id, source-resolution requirements, and display metadata.
Core code cannot enumerate `1m`, `1h`, or other concrete values in branching
logic. A user-defined fixed duration is a validated definition. Calendar-based
periods use a registered alignment policy.

### Data Granularity And Seconds

`MarketDataProvider` declares instruments, available source resolutions,
coverage, precision, and request limits. Replay operates on the selected source
timeline through a provider-neutral port. Adding seconds/ticks is a provider
and execution-precision capability; it does not create a second Replay or Chart
runtime. Product surfaces must disclose the precision actually available.

### Instruments And Calendars

`InstrumentDefinition` declares symbol identity, price/quantity precision,
exchange timezone, calendar id, and supported providers. `TradingCalendar` and
Session Hours policies are registered separately. NQ/ES are configuration, not
branches in core runtime.

### Indicators And Formula Engines

Indicators are optional modules. They receive immutable, no-future pane bar
snapshots and parameters, and return declarative series/overlay outputs plus
provenance. They cannot request bars directly, move Replay, write chart-engine
instances, or mutate pane data. A future formula language runs behind a
sandboxed `FormulaEngine` adapter with versioned syntax and deterministic
conformance fixtures.

### Open/Closed Gate

Adding a conforming timeframe, provider resolution, instrument, calendar,
indicator, or formula package must require:

- a new descriptor/definition and focused module code;
- registration at composition or plugin installation;
- conformance and independent harnesses;
- no modification to existing owner implementations;
- no expansion of protected writer inventories.

If a new capability requires editing Replay traversal, Chart mutation, or
Workspace transaction branching by concrete feature id, the extension contract
has failed and the step must stop for architecture review.

## Long-Term Complexity Contract

V7 must support complex future modules without predicting their complete
behavior today. The stable kernel exposes versioned mechanisms rather than
feature-specific hooks:

- versioned command, query, notification, snapshot, and provenance schemas;
- capability discovery and compatibility negotiation at composition time;
- module-scoped persistence namespaces with independent schema migrations;
- explicit permissions for market data, persistence, chart overlays, files,
  network, and background work;
- cancellable task/scheduling ports with resource budgets and backpressure;
- structured diagnostics, transaction traces, performance metrics, and error
  attribution by module/transaction/session;
- read-only projection/snapshot subscriptions for analytics and AI consumers;
- import/export contracts that preserve version and provenance;
- compatibility suites for public ports and stored schemas;
- feature flags/configuration owned outside core business modules.

Complex modules such as semantic drawings, simulated orders, strategy formulae,
campaign analytics, bulk data providers, optimizers, or AI assistants may
coordinate through a workflow module, but they cannot receive private owner
state or bypass public commands. Workflow modules orchestrate; they do not
become alternate state owners.

The kernel must remain small: Session identity, Replay truth, Bar Data access,
projection transactions, Chart application, Viewport intent, module lifecycle,
and public contract/version infrastructure. Speculative feature engines are not
added to core until a reviewed vertical slice needs them.

## UI Architecture Boundary

UI modules render read-only view models, collect user intent, and dispatch
public commands. They never read owner internals or repair incomplete runtime
state. A presentation system module owns design tokens and reusable interaction
states; feature surfaces compose those primitives without owning global CSS or
chart lifecycle.

Every browser-visible module declares:

- supported viewport/container constraints;
- loading/empty/error/stale/ready view-model variants;
- keyboard/focus behavior and accessible names;
- visual-regression fixtures;
- whether refresh gating is workspace-wide or pane-local.

Calendar/date-time presentation is owned by the shared Calendar Surface
adapter. Feature surfaces consume its public selection contract and cannot
import its DOM or calendar-model internals. Calendar Surface owns navigation,
selection, focus, and its rendered subtree only; it never requests market data,
decides coverage, queries feature records, moves charts/Replay, or persists
Session state. The UI Calendar Surface is distinct from the future
`TradingCalendar` exchange-session/alignment capability. Future decorated-day
or chart-jump behavior requires a separate reviewed consumer contract rather
than speculative business-data ports in the calendar module.

Blank chart output is never treated as a loading indicator. Runtime readiness
must be explicit, and the prior accepted chart snapshot remains visible behind
a bounded refresh gate whenever product semantics allow it.

## Session Isolation Invariant

All mutable records and async results carry:

```text
sessionId + activationGeneration + transactionId
```

- activation generates a new monotonically increasing generation;
- leaving a session invalidates its pending transactions;
- a completion is accepted only if all three identities match current state;
- stale success and stale failure are observational only;
- no chart snapshot, cursor, viewport, layout, or persistence write can omit
  the explicit session identity;
- switching A -> B -> A creates three distinct activation generations.

Session identity is not a guard sprinkled across stages. It is required by
every public transaction and commit contract.

## Atomic Projection Invariant

A user intent produces at most one chart-visible commit:

1. capture immutable input;
2. produce one plan for all affected panes;
3. acquire all required raw data;
4. project every pane;
5. reject stale or failed work before mutation;
6. atomically accept Replay and workspace snapshot revisions;
7. apply all affected chart panes behind one visual gate;
8. reapply existing viewport intents;
9. publish completion after the result is visible.

Append, replace, prepend, cached, and uncached are internal strategies, not
separate semantic pipelines.

## Cross-Product Requirement

The same transaction owner handles create/open/re-enter, Next/Auto/Previous,
TF, ETH/RTH, pane layout, pane instrument, refresh restore, and history
extension. Tests cover their combinations rather than timeframe-specific fixes.

## Failure Semantics

- failure preserves the last accepted snapshot and pauses playback;
- partial multi-pane state is never exposed;
- a stale result cannot clear a newer loading gate or surface an error;
- network delay exists only at raw acquisition boundaries;
- cache-hit Next has no artificial delay;
- chart readiness is measured by visible output, not command dispatch.
