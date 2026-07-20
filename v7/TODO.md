# V7 TODO

## Established Foundation Governance

Established:

- bounded V7 replay/chart rebuild scope;
- one-way owner and atomic transaction architecture;
- explicit Session/activation/transaction identity invariant;
- V6 runtime migration denylist;
- reviewed V6 retain/re-derive/reference/reject disposition matrix;
- intended final product shape and autonomous execution between audit gates;
- binding independently-runnable and removable module harness contract;
- registry/adapter contracts for future TF, seconds, instruments, indicators,
  and formula engines without core-owner edits;
- versioned contracts, capability negotiation, permissions, persistence
  migrations, background-work budgets, and observability for future complex
  modules without expanding the kernel prematurely;
- professional UI, complete visible states, accessibility, and visual
  regression gates from the first browser-visible vertical slice;
- FXReplay and TradeZella visual/product references plus shadcn/ui,
  ui-ux-pro-max, and UI-extraction workflow references with explicit
  absorb/do-not-copy rules;
- executable empty-runtime/writer boundary;
- black-box Session isolation acceptance matrix.

R0 changes no product behavior and activates no runtime.

## R0.1 — Harness Hardening

Established:

- machine-readable lifecycle for 21 critical V6-derived rules;
- explicit activation steps and no premature acceptance;
- architecture-model validator with one valid minimal-core fixture;
- nine intentional violations proving duplicate writers, internal imports,
  dependency cycles, event orchestration, identity, transaction liveness,
  stale side effects, optional-module coupling, and global state are detected;
- future blocking families for concurrency, atomic snapshots, bars,
  projection, Replay step, Viewport, visible completion, latency, persistence,
  extension, and cross-product coverage.

R0.1 adds no production runtime.

## R0.2 — Source Modularity And Documentation

Established:

- kind-specific file and function size budgets;
- single-long-lived-responsibility rule;
- human-reviewed size exception schema;
- artificial-fragment rejection;
- documented public contract and critical-invariant requirements;
- tracked debt-comment requirements;
- positive source model and seven intentional violations.

R0.2 adds no production runtime and was human-accepted on 2026-07-19.

## R0.3 Foundation Interaction And Phase Boundary — Rejected

Established but not accepted:

- immutable delivery numbering (`R<n>.<m>`) with one commit and human gate;
- detailed foundation user-intent, owner, visible-completion, failure, and
  persistence contracts;
- explicit cross-product test-disposition axes;
- outside-foundation candidate inventory;
- executable interaction-contract validator and intentional failures.

R0.3 added no production runtime or browser behavior. Human review rejected its
description of unplanned candidates as second-phase functions.

## R0.4 Cache, Latency, And Atomic Refresh — Accepted

Human-accepted on 2026-07-19:

- reclassify outside-foundation examples as unplanned candidates only;
- bind Manual Next and Auto Replay cache-hit visible latency;
- separate provider delay from bounded local post-response overhead;
- retain/dim existing candles during TF and ETH/RTH refresh;
- atomically replace complete target projections;
- extend earlier history automatically in fast bounded chunks;
- define raw Bar Data cache identity, coalescing, eviction, no-future, and
  Replay prefetch watermarks;
- add executable positive and negative cache/latency contracts.

R0.4 adds no production runtime or browser behavior.

## R1.1 Session Identity — Accepted

Human-accepted on 2026-07-19:

- add one pure `SessionId` public contract owned by the Session Store boundary;
- reject raw strings, coercion, trimming, structural lookalikes, and forged
  prototype instances at Session-scoped boundaries;
- use explicit schema/version serialization only;
- activate the first production module descriptor and its independent harness;
- add no Session generation, activation, persistence, network, Replay, bars,
  chart engine, transaction, composition root, or UI.

## R1.2 Activation Generation — Accepted

Human-accepted on 2026-07-19:

- add one immutable branded activation-generation public contract;
- require a positive safe integer and provide a pure strictly-later successor;
- reject raw numbers, pane-local structural lookalikes, invalid ranges,
  overflow, and unsupported serialized forms;
- activate an independent module descriptor and focused harness;
- add no allocator state, active Session, cancellation, persistence,
  transaction, Replay, bars, chart, composition root, or UI.

## R1.3 Transaction Identity And Pure Currency — Accepted

Human-accepted on 2026-07-19:

- add an opaque immutable TransactionId without a global allocator;
- compose branded Session/activation/transaction identity tuples;
- define immutable generic intent, plan, and terminal envelopes without domain
  payload or runtime behavior;
- assess current/stale identity deterministically and declare zero allowed stale
  side effects;
- prove module dependencies exist and remain acyclic;
- add no scheduler, cancellation owner, transaction runtime, state writer,
  persistence, Replay, bars, charts, composition root, or UI.

## R1.4 Isolated Module Host And Lifecycle — Accepted

Human-accepted on 2026-07-19:

- validate complete descriptors and explicit required/optional port graphs;
- construct real R1 minimal core without application-global state;
- inject only declared public APIs into dynamic instances;
- prove independent hosts, optional-module absence, reverse cleanup, idempotent
  stop, and partial-start rollback;
- add no feature runtime, capability implementation, persistence, network,
  Replay, bars, chart, DOM, or UI.

## R1.5 Capability Descriptor Contracts — Accepted

Human-accepted on 2026-07-19:

- six exact, versioned capability contracts and pre-start negotiation;
- arbitrary capability ids remain lookup keys rather than core branches;
- optional analysis contracts remain removable;
- no capability implementation or future feature engine was added.

## R2.1 Session Store And Persistence Boundary — Accepted

Human-accepted on 2026-07-19:

- versioned per-Session records and explicit branded Session-key persistence;
- revision CAS, migration, reconstruction, and monotonic activation allocation;
- A/B identity/key consistency and no implicit active Session storage key;
- no chart, bar, Replay, pane, viewport, DOM, or UI behavior.

## R2.2 Professional Session Browser — Accepted

Human-accepted on 2026-07-20:

- professional local-first Session list and selected-Session surfaces;
- accessible Create Session dialog with compact NQ/ES multi-select dropdown;
- every dialog open starts from a fully empty draft with no prior-form bleed;
- replaceable date-time-control boundary with native minute and future-second
  value conformance, without wall-clock market-data assumptions;
- professional day/month/decade and time-stepper picker behind that boundary,
  including Today/Clear and deterministic overlay dismissal;
- loading, empty, unavailable, stale, error, and ready presentation;
- create A/create B, A→B→A, hard refresh on B, and no cross-Session metadata;
- fixed `1440x900` real-Chrome visual regression fixtures;
- no chart, bars, Replay, panes, viewport, provider, or fake future controls.

## R2.3 Shared Calendar Surface — Accepted

Human-accepted on 2026-07-20:

- move accepted date-time UI/model/style ownership out of Session Browser;
- expose one documented Calendar Surface public facade and module descriptor;
- keep Session Browser dependent only on that facade;
- preserve byte-identical fixed Chrome fixtures and existing interaction;
- add no market coverage, Auto-update end date, orders, news, chart navigation,
  TradingCalendar domain behavior, bars, Replay, panes, or provider access;
- stop for interaction and visual review after the focused commit.

## R3.1 Raw Bar Data Value Contract — Accepted

Human-accepted on 2026-07-20:

- define one provider-neutral, versioned raw request identity;
- require provider, instrument, source resolution, half-open window, and dataset
  revision in every raw key;
- explicitly exclude Session, pane, display TF, ETH/RTH, Replay, and viewport;
- normalize immutable OHLCV bars and strictly ordered batches;
- reject malformed, duplicate, descending, and out-of-window input;
- add no provider I/O, cache, data-availability calendar, Replay, projection,
  chart, pane, or UI behavior.

## R3.2a Bounded Exact-Window Bar Data Runtime — Accepted

Accepted on 2026-07-20. It owns exact-window cache, request coalescing, bounded
concurrency, fake-provider acquisition, and deterministic disposal.

## R3.2b1 Provider Policy Contract — Completed

Completed with automated evidence; no interaction or visual review is required:

- define provider revision freshness without resolving a real dataset;
- define maximum request size, window, and concurrency;
- define a failure deadline without synthetic delay;
- define at most four attempts and explicit retryable failure kinds;
- define a transport-neutral adapter port and stable error taxonomy;
- add no concrete provider, network/database access, coverage, Replay, chart, or UI.

## R3.2b2 Coverage And Request Planning — Completed

Completed with automated evidence; no interaction or visual review is required:

- require explicit full-window coverage classification;
- keep missing bars distinct from market closure and provider failure;
- merge adjacent equal classifications into canonical segments;
- request only unknown or explicitly retried unavailable intervals;
- split by both maximum window duration and estimated source-bar count;
- preserve complete raw request identity in forward/backward plans;
- add no provider I/O, cache mutation, Replay, chart, viewport, or UI.

## Current Step — R3.2b3 Fake-Provider Policy Execution — Completed

Completed with automated evidence; no interaction or visual review is required:

- coalesce and cache revision discovery by exact provider scope;
- enforce policy TTL, deadline, bounded retries, window/bar limits, and
  provider-local concurrency;
- validate batch and coverage identity before Bar Data Runtime cache admission;
- propagate both Bar Data Runtime caller abort and executor disposal;
- submit complete coverage plans without requiring later pointer input;
- exercise deterministic fake adapters only;
- add no real provider, V4/network/DuckDB access, Replay, chart, or UI.

## Standing Gates

- every bounded step has one focused commit;
- architecture harness and focused tests pass;
- `git diff --check` passes;
- only interaction or visual changes stop for human review;
- headless contract/runtime/doc steps record automated evidence and continue;
- after acceptance, the agent autonomously executes the next roadmap step;
- no V6 production runtime import or copied orchestration;
- every module declares ports/lifecycle and passes an independent harness;
- optional-module removal and minimal-core boot remain executable gates;
- adding a capability cannot branch core code on its concrete id;
- replacement and deletion occur in the same commit.
