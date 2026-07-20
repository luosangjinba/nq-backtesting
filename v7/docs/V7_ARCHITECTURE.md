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

### Projection Domain

Is pure. Its complete input includes instrument, source bars, proposed cursor,
session-hours mode/calendar revision, display timeframe, and no-future policy.
It returns final pane bars plus provenance. It performs no I/O and owns no
state.

### Workspace Transaction Runtime

Is the sole coordinator of chart-visible changes. It accepts an immutable
intent containing `sessionId`, `activationGeneration`, and `transactionId`.
It plans all affected panes, acquires data through Bar Data, projects, checks
currency once more, and commits or rejects the entire result.

It never becomes the owner of Session, Replay, Bar Data, Chart, or Viewport
state. It coordinates their public contracts.

### Chart Runtime/Adapter

Is the only chart-series writer. It applies an accepted workspace snapshot. It
does not infer missing bars, request history, choose a cursor, persist a
session, or initiate another projection.

### Viewport Runtime

Owns pane-local horizontal wall and vertical-scale intent. Data commits preserve
the current intent. Only explicit Reset/Follow creates a new default intent.
Replay places new bars at the existing wall and pushes prior bars left.

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
