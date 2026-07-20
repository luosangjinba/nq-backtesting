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

## R3.2b3 Fake-Provider Policy Execution — Completed

Completed with automated evidence; no interaction or visual review is required:

- coalesce and cache revision discovery by exact provider scope;
- enforce policy TTL, deadline, bounded retries, window/bar limits, and
  provider-local concurrency;
- validate batch and coverage identity before Bar Data Runtime cache admission;
- propagate both Bar Data Runtime caller abort and executor disposal;
- submit complete coverage plans without requiring later pointer input;
- exercise deterministic fake adapters only;
- add no real provider, V4/network/DuckDB access, Replay, chart, or UI.

## R3.3a Replay Value Contract — Completed

Completed with automated evidence; no interaction or visual review is required:

- define one half-open, millisecond Replay range and exclusive visibility cutoff;
- express Manual Next and Auto Replay as identical time advancement inputs;
- bind every cursor proposal to the complete workspace transaction identity;
- clamp proposals at the activated Session end and reject unsafe time overflow;
- expose no scheduler, mutable cursor, bars, projection, chart, pane, viewport,
  persistence, provider, network, or UI behavior.

## R3.3b Single Replay Clock — Completed

Completed with automated evidence; no interaction or visual review is required:

- activate exactly one accepted cursor/revision owner per Session activation;
- keep proposals inert until `commitVisible` confirms the workspace result;
- reject cross-Session, cross-activation, foreign, rejected, and stale proposals;
- preserve the accepted cursor when a proposal is rejected or superseded;
- keep Manual and Auto inputs on the same proposal/commit path;
- add no scheduler, bar I/O, projection, chart, viewport, persistence, or UI.

## R4.2 Pure Projection Domain — Completed

R4.2 completed with automated evidence; no interaction or visual review is required:

- consume immutable Raw Bar Batches and one branded Replay proposal;
- require common provider/instrument/source-resolution/dataset identity across
  ordered, non-overlapping source windows;
- apply exclusive Replay no-future filtering before Session Hours eligibility
  and aggregation;
- preserve every eligible intermediate source bar in the identity `1m` fixture;
- dispatch frozen registered policy ports without concrete capability-id branches;
- return one deeply immutable pane snapshot with exact source, dataset,
  capability, calendar, policy, request-key, and cursor provenance;
- reject empty, malformed, mixed, unordered, incompatible, or future output;
- add no I/O, cache mutation, Replay mutation, chart, DOM, viewport, actual CME
  calendar policy, or higher-timeframe aggregation.

## R4.3 Headless Chart Snapshot Application — Completed

R4.3 completed with automated evidence; no interaction or visual review is required:

- activate the sole chart-series writer boundary per Session activation;
- validate exact frozen Projection Domain output and Replay-proposal identity;
- stage without visible mutation and apply only after a final currency check;
- bind adapter receipt and visible completion to the exact identity and snapshot;
- reject stale, failed, duplicate, foreign, forged, and disposed applications;
- preserve prior accepted chart state on adapter failure;
- move visible-completion ownership out of Workspace Transaction Runtime while
  retaining public-only, acyclic dependencies;
- add no DOM, Lightweight Charts dependency, viewport, Replay mutation, Bar
  Data request, projection, persistence, or concrete capability branch.

## R4.4 Pure Viewport Runtime Intent — Completed

R4.4 completed with automated evidence; no interaction or visual review is required:

- bind immutable viewport intent to Session activation and pane identity;
- distinguish initial/explicit-reset default wall from native-captured manual wall;
- retain manual origin, offset, span, and revision across Replay cursor movement;
- project default/manual intent through one deterministic logical-range formula;
- shift the logical window with new bars while retaining the latest-candle wall;
- keep adapter logical ranges transient rather than canonical product truth;
- add no chart mutation, DOM, Lightweight Charts, Replay mutation, Bar Data
  request, projection, persistence, or concrete capability branch.

## R4.5 Real Lightweight Charts Slice — Accepted

Implemented with automated evidence:

- pin official Lightweight Charts `5.2.0` without copying V6 runtime code;
- isolate every chart API call in one replaceable adapter;
- prove actual candle pixels after two rendering opportunities before exact
  adapter receipt and workspace/Replay acceptance;
- compose one NQ/`1m`/ETH deterministic local foundation workspace through
  Session, Bar Data, Replay, Projection, Workspace Transaction, Chart Snapshot,
  Viewport, and adapter public ports;
- reveal the complete first two hours on entry and one additional minute per Manual
  Next without future bars;
- preserve native drag-created manual offset/span through the next snapshot and
  restore default wall only through Reset View;
- provide professional chart-first loading, empty, unavailable, stale, error,
  and ready surfaces with keyboard-visible controls and responsive layout;
- add independent adapter and complete workspace real-Chrome harnesses, six
  negative controls, cache-hit maximum, and a fixed `1440x900` visual fixture.

The first human review rejected the fixed-size chart card, artificial-looking
bar fixture, oversized actions, and centered Manual Next overlay. The corrective
pass delivered an immersive chart route, denser varied candles,
compact actions, no stale-state chart cover, exact NQ quarter-tick OHLC, and
bounded low-frequency wick spikes.

Human-accepted on 2026-07-20 after re-review of real chart interaction, wall
behavior, visible settlement, perceived latency, and visual quality.

## R5.1 V6 Interaction Decision Carry-Forward — Complete

Settled V6 interaction decisions for Reset View, Replay transport, Chart
Settings, multi-pane, ETH/RTH, and multi-instrument behavior now carry forward
as binding V7 product evidence. V7 does not repeat the product interview unless
a recorded reopen trigger applies. Implementation ownership, atomicity, stale
rejection, persistence, and executable proof are re-derived in V7.

## Exact Next Step — R5.2 Session Hours/Calendar Domain

Verify the actual NQ/ES source timestamp and exchange-calendar facts, then
implement the pure Session Hours/calendar policy and inherited ETH/RTH cursor,
visible-through, eligible traversal, DST, weekend, holiday, early-close, and
maintenance-break fixtures. Add no toolbar, Replay mutation, Bar Data I/O,
chart mutation, persistence, multi-pane, or multi-instrument runtime yet.

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
