# V7 TODO

## R9 Replay Product Tuning — R9.4 Implemented, Human Review Pending

- [x] cap registered Replay choices at `4h` while retaining `8h`/`12h` and
  calendar display timeframes;
- [x] map Sync timeframe above `4h` to the maximum registered Replay step
  without concrete timeframe-id branches or cursor movement;
- [x] retain the established `500`-minute cadence for Replay steps through
  `1h`, and give larger steps a bounded duration-derived 64-step forward wall;
- [x] reuse exact accepted immutable raw batches, branded Projection snapshots,
  and unchanged Chart data prefixes without weakening unbranded/contained
  validation paths;
- [x] prove 128 real-Chrome `4h` advances on a `1m` Pane with 125 warm-cache
  samples, three provider requests, warm-cache p95 `210.8ms`, and Chart-apply
  p95 `84.5ms`;
- [x] activate H080 as executable with a fail-closed request-bound mutation;
- [ ] obtain human acceptance after a hard reload and sustained rapid `4h`
  Next sequence, including selector and high-Pane-TF Sync checks.

Binding decision/evidence: `docs/V7_REPLAY_FOUR_HOUR_CAP_AND_LATENCY_R9_1.md`.

### R9.2 Multi-Pane Replay Latency — Implemented, Human Review Pending

- [x] reproduce that Single Pane remains immediate while warm-cache `4h` Next
  latency grows with two and four Panes;
- [x] compute exact same-transaction/same-input Pane Projection once and retain
  branded per-Pane identity with one shared immutable bars array;
- [x] convert shared immutable bars to Chart OHLC once per Pane-set stage while
  retaining one independent real chart and the atomic paint gate per Pane;
- [x] replace two full per-Pane interaction Maps with one shared read-only
  binary-search index and update display-gap evidence from only the changed
  append tail;
- [x] pass a sustained 64-action 1/2/4 Pane Chrome gate ending at 14,180 bars
  per Pane, with warm-cache p50 `85.6ms`/`102.0ms`/`150.0ms`, identical Pane
  bar counts, and no browser errors;
- [x] activate H081 as executable without changing H080's pending human state;
- [ ] obtain human acceptance after a hard reload and rapid `4h` Next sequence
  in Single Pane, two Panes, and four Panes.

Binding evidence: `docs/V7_REPLAY_MULTI_PANE_LATENCY_R9_2.md`.

R9.2 did not receive human acceptance: a hard-reloaded Multi-pane Session still
had perceptible press-to-candle delay. Its safe shared-projection foundation
remains, while R9.3 below supersedes its performance mechanism and human gate.

### R9.3 Viewport-Segmented Multi-Pane Replay — Implemented, Human Review Pending

- [x] profile the browser main thread and bind the remaining amplification to
  repeated full-history mutation proofs, deep immutability traversal, time-axis
  formatter construction, and independent Lightweight Charts rendering;
- [x] retain the accepted base series while writing `append-replace` Replay
  tails into bounded 512-bar series segments instead of replacing complete
  7,000–14,000-bar histories in every Pane;
- [x] render only Replay segments intersecting the default follow viewport and
  reveal all segments immediately on manual drag, horizontal wheel, or explicit
  time location, preserving complete history access;
- [x] share exact mutation proofs, Chart data, and future-axis data across
  equivalent Panes, cache proven frozen subtrees, and reuse one timezone
  formatter policy without changing owner boundaries;
- [x] preserve full replacement, empty transition, Workstation Settings,
  Crosshair, no-future whitespace, stale rollback, later-participant rollback,
  and atomic finalization behavior;
- [x] pass the tightened 64-action 1/2/4 Pane Chrome gate at 14,180 bars per
  Pane: warm p50 `44.9ms`/`53.9ms`/`78.1ms`, four-Pane p95 `126.5ms`, active
  four-Pane p50 `71.9ms`, identical bar counts, and no browser errors;
- [x] activate H082 as executable while keeping H080/H081 and R9.3 human
  acceptance explicitly pending;
- [ ] obtain human acceptance after a hard reload and rapid `4h` Next sequence
  in Single Pane, two Panes, and four Panes, including a drag into older Replay
  segments and Reset back to the latest wall.

Binding evidence: `docs/V7_REPLAY_VIEWPORT_SEGMENTED_MULTI_PANE_R9_3.md`.

### R9.4 Aggregated Bucket Time Labels — Implemented, Human Review Pending

- [x] preserve every fixed/calendar candle's completion-slot Chart coordinate,
  partial-bucket placement, Replay cutoff, and no-future behavior;
- [x] resolve fixed-duration Crosshair and time-axis text from the exact
  projected bucket `startEpochMs`, covering the shared mechanism used by all
  registered fixed display timeframes;
- [x] carry one explicit trading-period `labelDate` for calendar buckets so
  `1D` shows its trading date and `1W`/`1M` show their trading-period start
  date without an ETH prior-evening timezone shift;
- [x] render calendar Crosshair/time-axis labels as date-only through the
  official Lightweight Charts formatter ports;
- [x] prove native 1h/4h/1D/1W/1M formatting, real API parity across DST,
  Calendar and full Replay Workspace behavior, plus the 1/2/4 Pane sustained
  4h latency gate;
- [ ] obtain human acceptance after a hard reload by hovering representative
  intraday and `1D`/`1W`/`1M` candles in ETH and RTH.

Binding decision/evidence:
`docs/V7_AGGREGATED_BUCKET_TIME_LABELS_R9_4.md`.

### Data Integrity Follow-up — NQ 2025 Roll Repair Complete

- [x] compare all four 2025 NQ legacy boundaries with Databento raw-contract
  volume, minute coverage, direct `NQ.v.0` mapping, and FXReplay observations;
- [x] reject direct `NQ.v.0` as the stored-series authority because its
  `00:00 UTC` changes split the `18:00` CME session;
- [x] retain raw quarterly acquisition, automatic two-complete-session volume
  confirmation, the expiry-week hard horizon, and explicit session-aligned
  manual confirmation where required;
- [x] bound the historical repair to 2,262 current rows replaced by 2,400
  source rows, restoring 138 missing minute timestamps;
- [x] make non-`available` Databento condition dates ineligible for automatic
  two-session confirmation;
- [x] implement a separate backup/stage/validate/atomic historical repair path
  without weakening insert-only acquisition or R7.3c rejection;
- [x] govern all four audited boundaries, atomically repair the three changed
  intervals, and complete API plus representative Replay-read verification.

Binding audit/evidence:
`docs/V7_NQ_2025_ROLL_LIQUIDITY_AUDIT.md`.

### Data Integrity Follow-up — NQ Recent Pre-2025 Roll Repair Complete

- [x] prove the original continuous CSV volume was retained exactly in DuckDB
  outside the approved 2025 repair intervals;
- [x] implement a read-only continuous-volume risk prescreen that cannot
  confirm a roll or write market data;
- [x] calibrate the prescreen against the known 2025 March/June red and
  September amber outcomes;
- [x] scan all 68 complete 2008–2024 quarterly windows: 8 red, 33 amber, and
  27 green;
- [x] obtain Databento raw old/new evidence for the five recent amber windows
  (`2023 Q3`, `2024 Q1–Q4`);
- [x] add the adjacent green `2023 Q4` raw review required to preserve the
  quarterly calendar chain, proving green is not boundary certification;
- [x] bound four proposed repair intervals to 14,321 current rows replaced by
  14,517 raw rows, restoring 196 minute timestamps;
- [x] implement a generic manifest-driven historical repair path and execute
  the four reviewed intervals only after a fresh fingerprint-matching Preview;
- [ ] review the eight red legacy windows after the recent batch, accounting
  for old session schedules and market-event confounders before any repair.

Binding prescreen/evidence:
`docs/V7_NQ_PRE_2025_CONTINUOUS_ROLL_PRESCREEN.md`.

Binding recent raw audit:
`docs/V7_NQ_2023Q3_2024_RAW_ROLL_AUDIT.md`.

### Deferred Candidate — General Futures Plugin Platform

- [x] preserve the proposed general-futures positioning, first-party pack
  model, calculated Indicator/manual semantic annotation/suggestion/Setup
  Workflow boundaries, governed AI Harness, `human`/`suggested`/`computed`
  provenance, declarative Chart contribution, common-package local/Marketplace
  installation, commercialization hypothesis, permissions, performance
  controls, SDK requirements, and unresolved decisions in a non-binding
  pre-decision memo;
- [ ] retain the current binding SMC/ICT scope and activate no plugin runtime,
  loader, SDK, AI provider, remote evidence transmission, registry,
  Marketplace, payment, product-scope change, or delivery step until every
  then-applicable human-review obligation is explicitly accepted or governed
  as retired/superseded;
- [ ] after that gate, decide the product scope, prototype MA, MACD native
  sub-pane, one manual semantic annotation, and one annotation-referencing
  Setup Workflow; separately prove a frozen-evidence AI boundary and common
  local/test-registry package; bind security/transaction/performance/privacy/
  distribution contracts; and reconcile sequencing with the seconds/tick
  candidate before implementation or any paid-Marketplace decision.

Deferred memo:
`docs/V7_GENERAL_FUTURES_PLUGIN_PLATFORM_PREDECISION_MEMO.md`.

### Deferred Candidate — Second-Level Replay And Tick-Sourced Data

- [x] preserve the product motivation, candidate data/API boundary,
  performance constraints, provider criteria, and unresolved decisions in a
  non-binding pre-decision memo;
- [ ] activate no research prototype, formal decision, delivery step, or
  implementation until every then-applicable human-review obligation is
  explicitly accepted or governed as retired/superseded;
- [ ] after that gate, audit a representative tick sample and current direct-
  seconds/tick providers, benchmark a throwaway `tick -> 1s` pipeline, and
  convert the memo into a binding decision before implementation.

Deferred memo:
`docs/V7_SECOND_LEVEL_REPLAY_TICK_DATA_PREDECISION_MEMO.md`.

## R8 Architecture Conformance Recovery — Human Accepted And Closed

Binding plan: `docs/V7_ARCHITECTURE_CONFORMANCE_RECOVERY_PLAN.md`.
Pre-remediation checkpoint: `fa561599`.

R8 was the only permitted V7 work until the explicit R8.15 acceptance on
2026-07-31. Recovery mode and its feature freeze are now closed. Preserve
rejected commits and assign a new delivery id to replacements.

- [x] `R8.1` bind the recovery constitution, stable bug ids, TODO/restart
  continuity, and executable `regressed` rule lifecycle;
- [x] `R8.2` make architecture gates analyze production imports,
  construction, writers, lifecycle, and independent boot;
- [x] `R8.3` repair descriptors, lifecycle declarations, independent
  harnesses, and the real optional-removal matrix;
- [x] `R8.4` define the transaction-scoped bounded Raw Coverage Lease contract;
- [x] `R8.5` make Bar Data Runtime the sole raw retention/cache owner and
  remove UI source ledgers;
- [x] `R8.6` make one Workspace State runtime the sole accepted semantic-state
  owner with complete identity;
- [x] `R8.7` define prepared commit/rollback/finalize participant contracts;
- [x] `R8.8` make Chart application staged and reversible;
- [x] `R8.9` make Workspace Transaction Runtime the only global atomic commit
  coordinator and remove post-terminal UI commits;
- [x] `R8.10` split UI command/presentation from composition and orchestration;
- [x] `R8.11` boot production through ModuleHost and prove isolation/removal;
- [x] `R8.12` close real source size, responsibility, contract documentation,
  and tracked-debt gates;
- [x] `R8.13` re-derive Calendar capability extension and dense RTH Locate
  through corrected owners;
- [x] `R8.14` pass the full production failure/concurrency/cross-product matrix;
- [x] `R8.15` obtain human acceptance of the exact reported workflow and close
  every regression/debt item before disabling recovery mode.
- [x] `R8.16` correct post-closure audit evidence summaries and bind all current
  human-readable source totals to the canonical machine baseline without
  reactivating recovery mode.

Closed recovery regressions:

- `BUG-V7-0001`: visible Chart can diverge from failed Workspace/Replay commit;
- `BUG-V7-0002`: raw source retention exists outside Bar Data Runtime;
- `BUG-V7-0003`: dense two-Pane RTH Locate can collapse the non-target Pane;
- `BUG-V7-0004`: production boot bypasses the declared ModuleHost graph;
- `BUG-V7-0005`: fixture/inventory gates can remain green while production
  violates the architecture.

R8.15 received the user's explicit `验收通过` after the hard-reloaded Calendar
and dense two-Pane ETH/RTH drag-and-Locate checklist. All 78 Harnesses pass;
H019/H021/H025/H066/H071/H072/H077/H078/H079 are accepted, H069 remains
accepted, and no rule is regressed. Recovery mode is inactive, normal delivery
scope is restored, and the production baselines remain at zero architecture
findings, zero source exceptions, and zero debt comments. H001/H003/H004 remain
at their pre-recovery executable governance status. The separately unreviewed
Data Acquisition H070 and R7.3/R7.3c administrator human gate remain open.

The independent post-closure audit found `BUG-V7-0006`: six current prose
summaries reported one fewer effective source line than the canonical machine
baseline. R8.16 corrects those summaries and adds a fail-closed H023 policy,
validator, real-document discovery, exact occurrence inventory, and two
negative mutations. Recovery remains inactive and no production source or
browser behavior changes.

R8.12 production source evidence binds 301 files, 22,279 effective lines, 2,370
functions, 302 public exports, six protected invariants, zero tracked-debt
comments, and zero source exceptions or findings. The architecture baseline
remains clean at 48 modules, 125 actual dependency edges, 115 construction
sites, two hosted production roots, 15 declared writer surfaces, and seven
critical writer sites. H022/H023 are recovered; five recovery regressions
remain. No later recovery rule is cleared early. H077 remains pending human
acceptance.

R8.13 separates fixed/calendar construction into registered contributions and
proves a synthetic extension without core-owner edits or concrete-id branches.
Bar Data lease and real Chrome evidence now preserve dense/non-target walls
through repeated ETH Locate, atomic RTH replacement, and both RTH target
directions without moving Replay. H019/H066/H078 are executable, not human-
accepted; R7.3n/R7.3o remain open through R8.15. Three R8.14 regressions remain.
The current production source baseline contains 309 files, 22,999 effective
lines, 2,460 functions, and 306 public exports; the architecture baseline
remains 48 modules, 125 edges, 115 construction sites, eight writers, and zero
findings.

R8.14 binds 11 production axes to eight real browser/owner scenarios and four
mandatory high-risk compounds, with five fail-closed negative controls. A real
Chrome persistence failure now occurs after every Pane paints a later ETH
candidate and proves exact RTH visual/semantic/Replay rollback plus an unchanged
durable Session record; all five owner participants have equivalent dynamic
post-visible evidence. H021/H025/H079 are executable and H069 is accepted. No
rule remains `regressed`, but recovery mode, R7.3n/R7.3o, and every human gate
remain open for R8.15. Production source and architecture baselines remain
currently at 309 files, 22,999 effective lines, 2,460 functions, 306 public
exports, 48 modules, 125 edges, 115 construction sites, eight writers, and zero
findings.

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

## R2.4 Session Browser Readability And Delete — Accepted

Human-accepted on 2026-07-21:

- [x] deepen only the Session-list theme without changing immersive chart
  colors;
- [x] brighten semantic primary/secondary/muted text and enlarge list/card/form
  typography;
- [x] add one visible Delete action to every Session card;
- [x] require an inline, keyboard-focused confirmation with Cancel before
  permanent deletion;
- [x] route deletion through Session Store and a revision-checked Repository
  remove operation;
- [x] remove both the Session index identity and record key while preserving
  every other Session across reconstruction;
- [x] bind Store, persistence, real-browser cancel/confirm, keyboard focus, and
  fixed visual regression evidence;
- [x] obtain explicit human interaction and visual acceptance.

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
- show 120 source minutes of historical prefix plus the selected Session start
  bar on entry, and reveal one additional eligible source bar per Manual Next
  without future bars;
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

## R5.2 Session Hours/Calendar Domain — Completed

Completed with automated evidence; no interaction or visual review is required:

- verify actual NQ/ES DuckDB timestamps are exchange-wall-clock labels encoded
  as UTC-like epochs and forbid a second timezone conversion;
- implement immutable weekly ETH/RTH schedules and versioned, sourced,
  verified date exceptions;
- preserve unknown/missing source truth instead of inferring a closure;
- expose Projection-compatible eligibility plus source-backed visible-through
  and next/previous traversal without owning Replay;
- cover NQ/ES, DST, weekend, maintenance, holiday, early close, exclusive
  cursor, immutable output, and negative controls;
- add no toolbar, Replay mutation, Bar Data I/O, chart mutation, persistence,
  multi-pane, or multi-instrument runtime.

## R5.3 Fixed-Duration Timeframe Projection — Completed

Completed with automated evidence; no interaction or visual review is required:

- confirm Lightweight Charts consumes ordered prepared data and does not own
  source-to-display aggregation;
- implement registered fixed-duration policy ports with immutable OHLCV output;
- use one canonical Unix/clock bucket formula with a configuration offset and
  no Session/Replay/request-window origin drift;
- preserve V6's accepted whole-hour and offset four-hour grids without concrete
  timeframe-id branches;
- prove Session Hours eligibility precedes aggregation, partial active buckets
  remain exclusive-no-future, gaps are not synthesized, and unknown volume
  remains unknown;
- prove independently immutable policy instances and reject a stale policy id
  against a newly selected timeframe definition;
- add no toolbar, runtime switch mutation, multi-pane, real provider, or
  calendar day/week/month aggregation.

## R5.4 Atomic Timeframe/Session-Hours Replacement — Completed

Completed with automated evidence; no interaction or visual review is required:

- resolve registered instrument/timeframe/Session Hours policy combinations
  without concrete capability-id branches;
- route both replacement operations through the existing Workspace Transaction
  Runtime and exact visible-completion gate;
- add branded Replay retention proposals that advance revision without moving
  the source cursor;
- record explicit Session Hours mode and real source-level visible-through in
  Projection provenance;
- prove ETH→RTH retains Tuesday `03:01` cursor while visible-through becomes
  Monday `16:14`, including RTH `1h` `09:30`-anchored aggregation;
- preserve the last accepted workspace, visible snapshot, cursor,
  visible-through, and revisions on failure;
- reject delayed/superseded acquisition and presentation with zero side
  effects;
- add no toolbar, multi-pane, real provider, persistence, or playback timer.

## R5.5 Compact Timeframe And ETH/RTH Controls — Partial Human Review

Implemented with automated evidence:

- register the V6 fixed minute/hour set from `1m` through `12h` × ETH/RTH;
- render one grouped TF dropdown by default and keep unsupported session-aware
  `1D`/`1W`/`1M` entries explicitly disabled;
- dispatch compact controls through the R5.4 replacement transaction and sync
  active state only from its accepted Workspace snapshot;
- retain the Replay cursor and manual/default wall across replacements;
- keep the accepted chart visible during cache-hit refresh and replacement
  errors, using only bounded inline status;
- prove real-browser timeframe and Session Hours projection, compact sizing,
  no centered update overlay, manual-wall preservation, and Reset View;
- update the intentional `1440x900` visual fixture.
- keep the Session, instrument, TF, ETH/RTH, Reset, and Next bar controls on one
  desktop toolbar row;
- use the V6 entry baseline: 120 minutes of earlier context plus the selected
  start bar, with every future bar hidden until Next bar;
- load bounded older history whenever manual browsing reaches the left edge,
  preserving Replay and allowing repeated extension.

The first review's mixed local/UTC chart labels and no-visible-change Friday
Next are corrected. The chart now shares the Session's explicit New York
clock, and Next reveals the next eligible ETH/RTH source minute across excluded
calendar gaps using a bounded expanded request.
The workspace also distinguishes the full Session range from the Replay cursor
and current source visible-through; the Session end is a no-future advancement
limit, not an initially visible candle.
The follow-up review's date-independent `01:59 PM` cutoff is corrected by
removing forward-context entry entirely. The selected start is the first Replay
bar; earlier bars are context and later bars remain hidden.

## R5.6 Real V4/DuckDB Bars Provider — Second Human Review Rejected

Implemented as a corrective gate after chart review exposed that R5.5 still
used visually misleading generated bars:

- remove all production sine-wave, pseudo-random candle, and artificial-wick
  generation;
- add an independent V4 bars provider adapter over the existing local DuckDB
  service;
- convert Session real instants to New York request wall time and normalize the
  API's UTC-like exchange-wall response back to real instants;
- filter the V4 API's automatic padding to the exact V7 half-open raw window;
- execute through the existing provider policy/deadline/retry boundary and Bar
  Data Runtime cache owner;
- show real-source failure explicitly with no synthetic fallback;
- replace the chart visual baselines with actual NQ OHLC from DuckDB;
- remove the redundant feed/wall/cursor strip above the Canvas so the chart
  begins directly below the single compact toolbar;
- route wheel input over the right price axis to pointer-anchored vertical
  price zoom while retaining horizontal time zoom over the plot; Reset View
  restores price autoscale;
- prove the V6 entry baseline, Next, TF/ETH-RTH replacement, manual/reset wall,
  and repeated left extension in real Chrome.

The 2026-07-20 human review passed real data, no-future/Next, repeated left
history, TF menu, ETH/RTH filtering, wheel regions, Reset, and Canvas layout.
It did not accept the gate. Execute these corrections before re-review:

1. audit and restore V6 exchange-wall display semantics so RTH is visibly
   `09:30–16:14` New York time without corrupting Session request instants or
   double-converting V4 timestamps;
2. restore V6 aggregate-candle display placement (`1h:59`, `30m:29/59`,
   `4m:3/7/11/15/...`) while preserving source cursor/no-future provenance;
3. profile and remove TF switch and higher-TF Next stalls through the owning
   cache/projection/chart boundaries;
4. remove cache-hit `Updating…`; allow only delayed, subtle chart dimming for
   perceptible uncached TF/ETH-RTH work;
5. navigate directly to the new chart after successful Session creation.

The next action is the targeted V6 time/TF/Replay audit, not R6 multi-pane.

### R5.6a Exchange-Time Presentation — Completed

- audited the V6 Session-input, V4 request, source timestamp, Session Hours,
  Replay, Projection, and chart-label chain;
- retained V7's provider-neutral real instants and prohibited a second V4
  wall-field conversion;
- moved only chart tick/crosshair presentation to `America/New_York`;
- locked summer and winter `09:30` plus RTH `16:14` browser-independent labels;
- changed no Session range, raw cache key, Replay cursor, eligibility, candle
  aggregation, viewport, or chart-series ownership.

R5.6b aggregate-candle completion display placement is next.

### R5.6b Aggregate Candle Completion Placement — Completed

- audited V6 bucket start/end metadata and confirmed source/no-future identity
  was already separate from bucket completion;
- added canonical projected `displayEpochMs` without replacing bucket
  `startEpochMs` or Replay-visible provenance;
- placed zero-offset `4m`, `30m`, and `1h` candles at `:03/:07/...`, `:29/:59`,
  and `:59`, including the incomplete current candle;
- originally kept RTH-aligned grids anchored at `09:30`; R5.6h supersedes this
  rejected product expectation with one shared ETH/RTH exchange-clock grid;
- added invalid/duplicate display-time negative controls and real-browser
  evidence that a partial higher-TF candle does not move Replay.

This exposed the bounded cache/series-update work closed in R5.6c.

### R5.6c TF And Aggregate Next Latency — Completed

- separated provider, full projection, series mutation, and paint-receipt
  evidence in the real Chrome path;
- replaced expanding per-minute exact-window identities with bounded
  500-source-minute forward-buffer identities; entry still never loads the
  complete Session range;
- reused Bar Data cache for covered Next, TF, and ETH/RTH transactions with
  zero provider requests across the 100-sample cache-hit cadence;
- retained full `setData()` for atomic replacements and history changes;
- allowed `series.update()` only when all prior chart data is unchanged and
  exactly one tail candle is replaced or appended;
- retained screenshot candle-pixel proof for full replacements and used exact
  series-change plus two render opportunities for already-painted tail updates;
- measured the final 100-sample full-gate run at p95 `62.2ms`, p99 `66.1ms`,
  max `84.8ms`; adapter mutation p95 `0.3ms`, adapter paint p95 `29.0ms`.

This exposed the delayed refresh-feedback work closed in R5.6d.

### R5.6d Delayed Refresh Feedback — Completed

- removed toolbar `Updating…` from cache-hit Next and replacements;
- separated interaction disabling from visible workspace state so ignored
  duplicate input does not require flashing a loading label;
- added a UI-owned 500 ms delayed feedback controller that never delays or
  coordinates the transaction itself;
- cache-hit completion cancels the pending feedback before any visual change;
- a genuinely slow TF/Session-Hours replacement retains and subtly dims the
  accepted chart with no overlay text or geometry shift;
- failures continue to retain the accepted chart and show one bounded inline
  error; reduced-motion removes the dim transition animation.

This exposed the direct-open Session-creation work closed in R5.6e.

### R5.6e Direct-Open Session Creation — Completed

- retained Session Store as the only creator and used its returned branded
  Session identity;
- kept hash navigation in Session Browser route UI rather than Store, dialog,
  Replay Workspace, or persistence;
- navigated successful creation directly to the exact new Session URL;
- supported NQ Sessions mount the chart immediately; unsupported Session
  configurations open their exact selected-Session summary;
- creation failure still stays on the list surface with an inline error;
- browser evidence covers direct-open A/B, fresh drafts, back navigation,
  A→B→A, hard refresh, activation generations, and no active/current key.

R5.6f combined regression, handoff closure, and human checklist are next.

### R5.6f Corrective Gate — Automated Complete, Human Re-Review Pending

- all R5.6a–e corrections are independently committed;
- all V7 Harnesses, 100-sample latency, visual fixtures, architecture/source
  quality, race controls, Session isolation, and `git diff --check` pass;
- V4 health and the V7 static browser endpoint are verified for re-review;
- restart handoff and the revised Chinese human checklist identify the exact
  acceptance point;
- R6 remains blocked until the user explicitly accepts this combined gate.

### R5.6g Second Human Review — Rejected

The 2026-07-20 second human review rejected the combined gate. Preserve the
reported priority order during correction:

1. higher-timeframe aggregation, switching, and drag/history interaction can
   stall for roughly 20 seconds and can become effectively undraggable;
2. RTH completion slots are incorrect for the reviewed product expectation:
   `4m` appears at `:01/:05/:09/...` and hour families at `:29` instead of the
   shared exchange-clock completion grid;
3. Session creation input `12:40` was interpreted as browser-local Pacific
   time, causing the New York chart to begin at `15:40`; Session input must use
   explicit New York exchange-wall semantics;
4. low-to-high timeframe replacement compresses candles against the left edge
   and does not fill the missing left context until another mouse action;
5. ETH→RTH replacement remains perceptibly slow.

R6 remains blocked. First reproduce and close the high-timeframe/history
latency through the existing Bar Data, Projection, Chart Adapter, and Viewport
owners; then correct completion alignment and Session wall-time semantics.

### R5.6h Second-Review Corrections — Automated Complete, Human Review Pending

- removed the 20-second high-timeframe foreground chain by replacing fixed
  2,500-minute history chunks with timeframe-aware bounded windows and by
  stopping replacement/history completion from recursively scheduling more
  materialization;
- reduced New York Session Hours conversion from one `Intl` call per source
  minute to one cached offset lookup per UTC hour;
- kept target history inside the real provider deadline and capped the visible
  foundation at 35 days per foreground request;
- clamped only the adapter's transient logical range when high-TF data contains
  fewer bars than the canonical Viewport span, removing the empty left margin
  without mutating default/manual wall intent;
- registered one zero-offset completion grid for ETH and RTH, with executable
  `4m :03/:07/...` and `1h`/`2h`/`4h`/`8h`/`12h :59` evidence;
- interpreted Session creation fields explicitly in `America/New_York`,
  including summer/winter and nonexistent-DST-time tests, and made Session/
  Replay metadata use the same exchange clock;
- measured the final full real-Chrome gate at approximately `159ms` for first
  `5m` target-history expansion, `72ms` for cache-hit ETH→RTH, and `1.42s` for
  uncached `12h` RTH;
- retained 100-sample higher-timeframe Next performance at p95 `56.2ms`, p99
  `74.5ms`, and max `74.7ms`.

All corrections require another human interaction/visual review. R6 remains
blocked until explicit R5.6 acceptance.

### R5.6i Third Human Review — Rejected

The 2026-07-21 third review confirmed the high-timeframe latency improvement,
but found that ETH/RTH or timeframe replacement can leave candles short of the
expected interval and that `1h` can show an approximately ten-day internal
price/data discontinuity. R6 remains blocked. Correct source-window continuity
without restoring the removed recursive foreground request chain, then repeat
the full real-browser review gate.

### R5.6j Third-Review Corrections — Automated Complete, Human Review Pending

- source replacement now retains only an exactly contiguous accepted prefix;
- Projection rejects gapped raw request windows before publication;
- adapter-only range planning prevents an old low-TF manual wall from creating
  an inverted Lightweight Charts range after aggregate bar-count reduction;
- real Chrome covers history expansion→`1h`→RTH→ETH, reaches the Replay tail,
  and measures a 50-hour maximum `1h` ETH display gap instead of the rejected
  approximately ten-day discontinuity;
- full V7 Harnesses pass; final measurements remain about `1.69s` for uncached
  `12h` RTH, `156ms` for first `5m`, `55ms` for ETH→RTH, and aggregate Next p95
  `62.4ms`, p99 `70.1ms`, max `72.1ms`.

R6 remains blocked pending explicit fourth-review acceptance.

### R5.6k Fourth Human Review — Rejected

Rapidly dragging candles right to create a large left blank area can accumulate
earlier-history chunks across every timeframe. The observed load takes roughly
two to three seconds and blocks all mouse response; an `8h` example reached
1,348 accepted aggregate bars while Replay remained at May 1. R6 remains
blocked. Profile acquisition, full Projection, chart mutation, and paint under
coalesced rapid boundary input; then remove the main-thread stall without
regressing continuity, no-future, or bounded-request behavior.

### R5.6l Fourth-Review Responsiveness — Automated Complete, Human Review Pending

- 604,800-source-bar `8h` full Projection fell from about `3.93s` to `0.36s`;
- earlier-history extension now reprojects only the acquired plus boundary
  chunks and measures about `60ms` at that accumulated-history scale;
- validated Raw Bar/Batch fast paths, allocation-light Session Hours checks,
  direct fixed aggregation, and deterministic modern New York DST conversion
  preserve the existing owner graph and semantics;
- V4 logical windows above seven days use contiguous seven-day transport chunks
  with main-thread yields and still publish one exact Raw Batch identity;
- real Chrome rapid `8h` dragging completed two coalesced extensions in about
  `1.68s`, with no 200ms long task and a maximum event-loop interval of about
  `125ms` instead of the reproduced `695ms` stall;
- final performance remains about `1.10s` for uncached `12h` RTH, `123ms` for
  first `5m`, `60ms` for ETH→RTH, and aggregate Next p95 `52.7ms`, p99 `59.7ms`,
  max `62.5ms`.

R6 remains blocked pending explicit fifth-review acceptance.

### R5.6m Fifth Human Review — Accepted

- the user explicitly reported `R5.6复审通过` on 2026-07-21;
- rapid earlier-history loading no longer produces the reported two-to-three-
  second input freeze;
- the full R5.6 gate, including New York time semantics, shared completion
  slots, no-future behavior, continuous replacements, and responsive bounded
  history extension, is human-accepted;
- R5.6 is closed and R6 Atomic Multi-Pane And Instruments is unblocked.

### R6.1 Pane Workspace Domain — Completed

- activate one pure `core.pane-workspace-domain` boundary before multi-chart UI
  or materialization work;
- use one exact Pane record for a one-Pane or multi-Pane workspace: Pane id,
  instrument id, timeframe id, and branded pane-local Viewport intent;
- bind every Pane to the active Session/activation, restrict instruments to the
  Session asset set, and require all Pane Viewports to observe one shared Replay
  cursor;
- reject Pane-local Replay fields, duplicate Pane identities, foreign Viewport
  scope, mixed cursors, absent active focus, and out-of-Session instruments;
- make focus a data-command-free transition and instrument intent either
  pane-local or all-Pane without moving Replay or Viewport intent;
- pass the independent Harness with 20 negative controls plus architecture,
  module-host, and diff gates.

R6.2 Replay × Pane response semantics are next. Complete-Pane-set
materialization moves to R6.3; browser layout remains later.

### R6.2 Replay × Pane Response Contract — Completed

- re-derive the accepted V6 Previous, Autoplay, shared-cursor materialization,
  GoTo continuous-range, Session Hours, and multi-instrument rules without
  copying V6 command/event orchestration;
- bind Manual Next/Previous, Autoplay Next, Restart/Back-to, quick schedule
  GoTo, and exact GoTo to every visible Pane, regardless of active focus;
- retain the Session primary instrument as source-clock authority and one
  Session-scoped ETH/RTH plus calendar revision across all Panes;
- require Previous/backward targets to replace visibility, and every forward
  GoTo to cover the complete interval rather than destination-only data;
- preserve mixed instrument/TF Viewport intents, allow Pane-local missing or
  earlier visible-through data, and forbid separate Pane cursors;
- require one in-flight transaction, exact all-Pane visible completion, atomic
  Replay/workspace commit, and last-accepted preservation plus pause on failure;
- define both GoTo surfaces: the five V6 quick New York anchors and an exact
  Session-range cutoff that may move forward or backward;
- defer Economic Calendar to an optional second-phase event provider/container;
  it may later emit Exact GoTo intent but cannot own Replay or chart state;
- pass the independent Harness with 18 negative controls.

R6.3 complete-Pane-set acquisition, Projection, and atomic visible application
through the existing Workspace Transaction Runtime is next.

### R6.3 Complete Pane-set Materialization — Completed

- activate one stateless `core.pane-set-materialization` boundary behind the
  existing Workspace Transaction acquisition and Projection stages;
- bind one exact request to every planned Pane in stable order, using the same
  transaction identity, Replay proposal, operation, and cancellation signal;
- collect all Pane acquisition and Projection results before a complete
  workspace snapshot exists, with explicit `no-source-data` and
  `no-eligible-source` Pane results that cannot stall the shared Replay clock;
- extend the existing sole Chart Snapshot Application writer with an atomic
  Pane-set constructor and exact plan/proposal/provenance validation;
- apply a complete Pane set exactly once, while acquisition, Projection,
  staging, visible-apply, stale, and cancellation failures preserve the last
  accepted Replay, workspace, and chart state;
- prove mixed NQ/ES plus `1m`/`4h`, empty comparison Pane, delayed supersession,
  exact stable ordering, and 22 negative/race controls in an independent
  headless Harness;
- leave the accepted real single-Pane browser path unchanged until the R6.5
  multi-Pane interaction and visual gate.

R6.4 shared Replay Runtime navigation actions are next: Previous, Autoplay,
Restart/Back-to, quick GoTo, and exact GoTo over the R6.3 materialization path.

### R6.4 Shared Replay Navigation Runtime — Completed

- extend Replay Contract/Runtime with inert exact forward/backward/retain
  proposals and real Replay-owned playing/paused state;
- bind the active Replay range into R6.2 response-plan schema v2 and reject
  stale cursor/range inputs before materialization or exact-target no-op;
- add pure DST-aware `America/New_York` candidate generation for Next Day Open,
  Next Session, Asian, London, and New York quick GoTo anchors;
- resolve next/previous steps and real-bar-near-anchor targets through one
  injected cancellable primary-source traversal port, without another raw-data
  requester;
- route Manual Previous, one-step Autoplay, Restart/Back-to, quick GoTo, and
  exact forward/backward GoTo through one R6.3 complete Pane-set transaction;
- skip materialization for exact GoTo at the accepted cursor, retain complete
  forward-range intent, and use full replacement intent for backward moves;
- reject overlapping navigation without backlog; pause and preserve the last
  accepted Replay/workspace/chart state on target, Projection, or visible-apply
  failure;
- prove mixed NQ/ES plus `1m`/`4h`, empty comparison Pane, weekend anchor skip,
  primary-clock visibility, DST, and 20 negative/race controls headlessly.

### R6.5 Real Pane Workspace And Replay Surfaces — Human Review Rejected

- activate Session-configured NQ/ES capability composition and one real chart
  host per product Pane, because Lightweight Charts native Panes share one time
  scale and cannot own independent product-Pane Viewports;
- preserve one uniform Pane Workspace record for one or two visible Panes,
  active focus without a transaction, Pane-local instrument/TF/Viewport, and
  one Session-wide ETH/RTH policy;
- route Pane layout, instrument, TF, Session Hours, and earlier-history changes
  through one retained-cursor complete Pane-set Workspace transaction;
- mount Manual Next/Previous, one-step Autoplay plus Pause, Restart, all five
  New York quick GoTo actions with shortcuts, and exact New York date/time GoTo
  over the R6.4 shared-navigation owner;
- keep continuous Autoplay cadence/timer in R7 and Economic Calendar in the
  later optional business module;
- prove real NQ/`1m` plus ES/`4h`, host geometry, focus isolation, Pane-local
  native viewport input, Session-wide ETH/RTH, all-Pane Replay actions, both
  GoTo forms, one/two-Pane transitions, and fixed `1440x900` visual output in a
  dedicated browser Harness;
- retain the accepted single-Pane regression/performance gate: aggregate Next
  p95 `63.0ms`, p99 `70.1ms`, max `79.8ms`, 12h RTH replacement `1193ms`, and
  rapid high-TF history loading with zero observed long tasks.

The 2026-07-21 human review rejected this combined gate:

1. `Next` was still next source minute rather than Next bar;
2. the top toolbar was an interim shell, not the accepted final transport;
3. only single/two-column Pane layouts existed;
4. Symbol, Interval, Crosshair, Time, and Date-range layout sync were absent.

R6.6 corrects the bar-step invariant first. Economic Calendar remains a
separate later business module.

### R6.6 Independent Replay Bar Step — Human Review Rejected

- add one branded aligned Replay-step value and make Replay Runtime its sole
  Session-level selection owner;
- keep the selected step independent from active focus and every Pane display
  TF; changing it moves no cursor, increments no Replay revision, requests no
  bars, and issues no Pane transaction;
- upgrade the complete-Pane response plan to schema v3 with exact step
  provenance and stale-step rejection;
- make Manual Next and Autoplay Next resolve the next non-empty aligned
  primary-source step completion, and Manual Previous resolve the prior one;
- skip empty RTH/ETH closed periods and weekends, retain fixed completion slots
  across missing source minutes, and never synthesize a source bar;
- expose `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, and `4h` Replay steps and
  label the forward action `Next bar`;
- prove a real `5m` Replay step remains unchanged with the active comparison
  Pane at ES/`4h`, and that one Next displays through `12:44 EDT` under one
  atomic Pane-set transaction;
- preserve the established single-Pane visual, latency, replacement, and rapid
  history regression gates.

The 2026-07-21 human review found that `Auto ×1` advanced only one Replay bar,
left Replay marked `playing`, and therefore gave Pause no future work to stop.
The bar-step correction remains regression-protected, but R6.6 is not accepted
as a complete interaction gate.

### R6.7 Continuous Autoplay And Effective Pause — Human Accepted

- add one UI-local cadence scheduler that invokes the existing
  `autoplay-next` action without taking cursor, target, transaction, or chart
  ownership from their established runtimes;
- publish `playing` immediately, run the first selected Replay bar immediately,
  and schedule each later bar only after the prior complete Pane-set visible
  commit plus a `500ms` cadence;
- use completion-driven timeouts rather than an interval, so a slow
  materialization cannot overlap, queue, or build an input backlog;
- make Pause cancel every scheduled future step while allowing at most one
  already in-flight atomic Pane transaction to settle without a successor;
- stop and publish `paused` at Session completion, navigation rejection, or
  failure;
- expose the interim control as `Play`, keep Pause available during an
  in-flight autoplay step, and prove that cursor/revisions remain unchanged for
  more than two cadence intervals after Pause;
- preserve the selected Replay step and the one shared cursor/atomic all-Pane
  response on every autoplay tick.

The 2026-07-21 review then exposed a blocking pre-existing multi-Pane history
regression: after ETH left extension and an RTH switch, extending either Pane
could replace accepted candles with an empty Pane and a later action could show
`workspace-transaction-failed`. Continuous Autoplay remains regression-tested,
but the combined review cannot pass until the following correction is accepted.

### R6.7a Multi-Pane RTH History Preservation — Human Accepted

- preserve a ready accepted Pane when a bounded earlier-history prefix and its
  boundary chunk contain no eligible RTH bars;
- still prepend the exact raw request key so later leftward requests advance
  across closed-session and weekend windows rather than retrying one boundary;
- rebind preserved provenance to the current retained Replay proposal while
  proving unchanged cursor, instrument, TF, dataset, calendar, aggregation, and
  Session Hours policy identities;
- continue rejecting gaps, overlaps, forged request-key chains, changed
  policies, and other real Projection failures;
- reproduce `05/01/2026 12:40–05/11/2026 12:40` with two NQ `1m` Panes, ETH
  extension, RTH switch, repeated left extension in both Panes, and ETH
  recovery in real Chrome;
- require both Panes to retain candles, Session Hours to remain interactive,
  and no Workspace/browser error to appear.

The follow-up review confirmed candles no longer become false-empty, but rapid
RTH drags collapsed the manual Viewport from roughly 80 visible bars to about
seven. Candles became oversized, further history input stalled, and a two-to-
one Pane transition preserved the damaged wall until another irregular drag.

### R6.7b Manual Viewport Span Preservation — Human Accepted

- keep the adapter's transient left clamp separate from canonical manual wall
  state when an RTH history chunk contributes no new display candles;
- translate a left-clamped manual logical range as a whole instead of clamping
  only `from` while retaining `to`, preserving the exact manual `spanBars`;
- prove rapid alternating history drags cannot shrink an unzoomed 80-bar wall
  below 40 visible bars or create oversized candles;
- transition two Panes to one without changing the surviving Pane wall, then
  require the first deliberate drag to issue the next history transaction;
- keep deliberate wheel zoom authoritative: a user-selected small span remains
  valid and is not widened by this correction.

The next review confirmed that candle width and the manual span remain stable,
but exposed a separate request-coverage defect at every RTH `09:30` boundary.
The nominal one-minute history request covered only 240 wall-clock minutes,
which could contain no eligible RTH minute; each accepted empty request moved
through only part of the overnight/weekend closure and visibly snapped `09:30`
back to the left edge.

### R6.7c Session-Aware Contributing History Windows — Human Accepted

- retain the existing timeframe-aware nominal history size when that window
  contains at least one eligible source minute;
- when the complete nominal window is closed, expand that same request backward
  until it contains up to 240 eligible source minutes, still under the existing
  35-day foreground cap;
- cross an overnight close or weekend with one bounded Workspace transaction,
  without synthesizing bars, recursively scheduling requests, or changing
  Replay/Projection/Chart ownership;
- prove exact Tuesday and Monday `09:30` RTH request windows and require the
  first accepted browser history transaction to add at least 200 prior-session
  candles;
- preserve the R6.7a ready-Pane fallback when no earlier eligible data exists
  inside the hard cap, and preserve the R6.7b manual Viewport span.

The user confirmed the RTH boundary defect fixed on 2026-07-21, then reported a
minor visual-only issue: the top toolbar flashed whenever candles refreshed.

### R6.7d Stable Toolbar During Candle Refresh — Human Accepted

- retain the same toolbar DOM node across every Workspace transaction;
- continue disabling transaction-conflicting inputs while work is pending, but
  distinguish that transient lock from an intrinsically unavailable control;
- keep the visual opacity of transiently locked controls identical to their
  accepted ready-state appearance, including delayed stale feedback;
- keep genuinely unavailable, completed, or playback-incompatible controls
  visibly disabled;
- prove real Chrome observes the disabled-attribute lock without any sampled
  toolbar-opacity change during a candle refresh.

The user accepted the combined R6.7/R6.7a–d interaction gate on 2026-07-21 and
approved replacing the earlier floating-overlay proposal with a fixed bottom
rail whose centered capsule retains the visual lightness without covering a
Pane.

### R6.8 Fixed Bottom Replay Transport — Human Accepted

- keep Reset View, Restart, Go to, and Local status in the compact top toolbar
  for the R6.8 gate; R6.9b later moves Reset to each Pane;
- move Previous bar, one stateful Play/Pause button, Replay step, Autoplay
  speed, and Next bar into one Workspace-level centered capsule;
- place that capsule in a dedicated `38px` bottom rail outside the Pane grid,
  preserving an `800px` real-chart host at the `1440×900` review viewport;
- expose bounded `0.5×`, `1×`, `2×`, and `5×` speeds, defaulting to `1×`, with
  cadence gaps of `1000/500/250/100ms` after each complete visible commit;
- let an in-play speed change replace at most one scheduled timeout or affect
  the next post-commit timeout, never overlap Pane transactions or move Replay;
- keep Pause available during an in-flight tick and retain stable transport
  and toolbar opacity during every candle transaction;
- prove speed and Replay-step selection create no Pane materialization or
  cursor movement, while every actual step still atomically updates all Panes.

### R6.8a Replay Truncation And Sync Timeframe — Human Accepted

- add one truncation/time-machine mode to the fixed transport, with a blue
  vertical-only chart crosshair and explicit cancelable armed state;
- map a clicked aggregate completion slot back to its real bucket start, then
  use the existing exclusive `goto-exact` action so the selected candle and all
  later candles disappear atomically from every Pane;
- reject unavailable, outside-Session, and not-yet-revealed targets without
  mutating accepted Replay/Workspace state;
- add the explicitly named one-way `Sync timeframe` switch and cover every
  supported fixed display TF with a real Replay step;
- keep manual Replay-step selection independent when sync is off and read-only
  while sync is on; focus/TF synchronization moves no cursor and creates no
  Pane transaction;
- refine the capsule with TradingView-like SVG transport icons and switch
  treatment while retaining the accepted fixed `38px` non-overlay rail.

### R6.8b Text-Only Replay Selectors — Human Accepted

- remove the native dropdown arrows and reserved arrow space from Autoplay
  speed and Replay-step selectors;
- present the selectors in the reviewed TradingView order, speed before step,
  while preserving native click and keyboard selection;
- bind `appearance: none`, selector order, and the compact treatment in the
  real-Chrome Harness and fixed `1440×900` visual fixtures.
- remove the visible `Sync timeframe` caption after acceptance while retaining
  its accessible name, tooltip, and switch behavior.

The user accepted the combined R6.8/R6.8a–b gate on 2026-07-21 and reaffirmed
that ETH/RTH is one Session-wide clock policy: switching it must atomically
reproject every Pane even when Panes use different instruments. R6.9 expands
one-to-four layouts with draggable, persisted nested split ratios and minimum
Pane sizes; R6.9a pulls in the review-required Crosshair portion of layout sync.

### R6.9 Resizable One-To-Four Pane Layouts — Human Accepted

- expose exactly 12 reviewed variants: single; two columns/rows; three
  columns/rows/two-left/one-right/one-left/two-right; four grid,
  three-left/one-right, one-left/three-right, one-top/three-bottom, and
  three-top/one-bottom;
- keep one independent Lightweight Charts host per product Pane because native
  chart panes share one time scale and cannot represent independent product
  Pane instruments, TFs, and Viewports;
- activate a pure Pane Layout Domain for versioned split-tree intent,
  deterministic leaf order, serialization, and measured resize constraints;
- support pointer and keyboard resizing for every split while preserving at
  least `280×120px` per Pane after the OHLC readability correction;
- persist accepted layout and nested ratios under an explicit Session id and
  restore them on Session re-entry;
- make same-count variant changes and resize commits data-, Replay-, and
  Workspace-transaction-free; keep Pane-count changes on the existing atomic
  complete Pane-set materialization path;
- preserve Pane identities/configuration, one shared Replay clock, and
  Session-wide ETH/RTH across mixed instruments and timeframes;
- bind the pure domain, Session persistence, real-browser geometry/input,
  visual, all-Pane Replay/RTH, re-entry, architecture, and regression gates.

R6.9/R6.9a/R6.9b were explicitly human accepted on 2026-07-21. The same review
requested the R6.9c control-dock placement correction below. Remaining R6.10
sync is not part of this correction.

### R6.9a Active Pane, OHLC, And Crosshair Review Correction — Human Accepted

- [x] make active focus unmistakable with a `2px` blue Pane boundary; R6.9b
  replaces the temporary header tint with a neutral Canvas overlay;
- [x] render symbol/TF plus Pane-local OHLC from the accepted chart snapshot;
- [x] use selected candle OHLC on a native hit and latest Pane OHLC outside
  candle data, including empty fallback;
- [x] keep non-active Pane hover independent from active focus when Crosshair
  sync is off;
- [x] add the `Crosshair` switch and synchronize chart-only presentation via
  the official adapter-owned crosshair APIs;
- [x] prove same-TF selection, mixed-TF latest fallback, no programmatic
  feedback source, and zero Replay/Workspace revisions;
- [x] update real-browser visuals and retain the complete R6.9 layout,
  persistence, Replay/RTH, performance, architecture, and source-quality gates;
- [x] obtain explicit human interaction and visual acceptance for
  R6.9/R6.9a/R6.9b.

### R6.9b Canvas Overlay And Pane Maximize Review Correction — Human Accepted

- [x] remove the separate Pane header row and place short symbol, compact TF,
  OHLC, change value, and change percentage over the Canvas;
- [x] keep minute units implicit while retaining `s`/`h` and `D`/`W`/`M`;
- [x] remove the global Reset and expose one hover/focus Pane-local Reset;
- [x] add multi-Pane-only Maximize/Restore without changing or persisting Pane
  Layout state;
- [x] keep every chart host mounted, restore exact split geometry, and prove
  zero Replay/Workspace revisions;
- [x] use neutral black chart surfaces, brighter readouts/axes, and a stronger
  active Pane boundary;
- [x] omit market-open status until a reliable product contract exists;
- [x] obtain explicit human acceptance for R6.9/R6.9a/R6.9b.

### R6.9c Lower-Right Pane Control Dock — Awaiting Focused Visual Review

- [x] move Maximize/Restore and Reset from the upper-right to the Canvas
  lower-right;
- [x] stack Maximize/Restore above Reset View;
- [x] keep the dock left of the price scale and above the time scale;
- [x] reveal on pointer hover or keyboard-visible focus, but never let pointer
  focus or active-Pane state pin the controls after pointer exit;
- [x] preserve actual pointer activation;
- [x] preserve Pane-local Reset, transient maximize, mounted chart hosts,
  exact restored geometry, and zero Replay/Workspace revisions;
- [ ] obtain focused human visual confirmation of the final control position.

Do not start the remaining R6.10 Symbol/Interval/Time/Date-range sync families
until R6.9c receives focused visual confirmation.

### Stage Code Review P1 Corrections — Completed

Completed on 2026-07-22 with automated evidence:

- [x] reject every V4 bar instrument except explicit NQ/ES identities before
  transport, eliminating the silent unknown-instrument→NQ fallback;
- [x] preserve and restore the previously accepted series, OHLC index, time
  range, price range, adapter revision, and visible metadata after apply,
  paint, stale, or outer-discard failure;
- [x] settle all child chart applications and roll back the complete Pane set
  when any child fails after visible mutation;
- [x] make `ready → empty → ready` cross the same chart-writer boundary,
  clearing series/OHLC/data attributes without leaking replacement adapters;
- [x] bind the corrections with provider-negative, headless multi-Pane, real
  Lightweight Charts, Replay Pane Workspace, and Replay Layout evidence.

The code review's narrow P2 GoTo patch was superseded by the user-approved
redesign below instead of being applied in isolation.

### R6.9d Shared GoTo Redesign Contract — Completed Headlessly

- [x] design Quick and Exact GoTo together over the one shared Replay cursor;
- [x] expand the pure schedule/response contract from five to eight fixed
  quick actions with New York DST-aware defaults;
- [x] keep `Next Session` derived from only Asian/London/New York anchors;
- [x] make every quick anchor strictly forward, including an exact wall-time
  match;
- [x] retain Exact GoTo as an exclusive cutoff inside the closed Replay
  Session start/end cursor range;
- [x] translate exhausted quick lookup into the non-mutating
  `rejected/goto-target-unavailable-in-range` result;
- [x] keep Calendar Surface reusable while preserving Economic Calendar as a
  later independent business-event provider/consumer;
- [x] bind the result with pure response-plan and navigation-runtime Harnesses.

### R6.9e Quick GoTo Settings And Range Feedback — Human Accepted

- [x] expose all eight fixed Quick GoTo actions and only the five accepted
  keyboard shortcuts;
- [x] add a simplified seven-time New York settings dialog with Reset,
  Discard, Save, and derived Next Session guidance;
- [x] use explicit 24-hour dropdowns with all 96 quarter-hour values and
  reject off-grid minutes in the settings contract;
- [x] validate and version the settings through a focused pure contract;
- [x] persist one accepted workstation-wide schedule outside Session Store,
  migrate the most recently updated legacy schema-3 value once, and keep
  then-current Session schema 4 limited to Pane Layout;
- [x] apply saved settings immediately without moving Replay or issuing a
  Workspace transaction;
- [x] treat every configured shortcut time as an exclusive cutoff so `1m`
  presentation stops one minute before the anchor and exposes no future bar;
- [x] present exhausted anchors as non-blocking range-end feedback while the
  Workspace stays ready and all accepted revisions remain unchanged;
- [x] preserve actionable domain/provider failure classifications through the
  lowercase Workspace terminal contract and bind a custom cross-day Next Day
  Open path in the real-Chrome Workspace regression;
- [x] bind the menu, settings lifecycle, dynamic schedule, cross-Session
  inheritance, Session-deletion independence, range end, and fixed visual
  output in focused and real-Chrome Harnesses;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9e1 Future Time-Axis Continuity — Human Accepted

- [x] test the official Lightweight Charts whitespace-data mechanism before
  adding a custom renderer;
- [x] carry fixed timeframe duration through immutable Projection provenance;
- [x] add 256 bounded time-only future slots per fixed-duration Pane through a
  separate adapter-owned series without adding OHLC or source bars;
- [x] keep Replay cursor, visible-through, Pane bar count, Viewport latest-bar
  index, Crosshair latest OHLC, truncation, and history ownership unchanged;
- [x] include future time-axis state in stale/failure rollback;
- [x] bind native future coordinates, no-OHLC whitespace, Crosshair behavior,
  multi-Pane Replay, and fixed visual output in real Chrome;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9h Exact GoTo — Human Accepted

- [x] separate Exact GoTo from the Quick GoTo menu into its own Workspace-level
  entry;
- [x] default its New York date/time to the current shared Replay cursor;
- [x] add immutable generic Calendar date-range presentation without adding
  Replay or Economic Calendar ownership;
- [x] highlight included Session dates and boundaries and disable outside
  dates;
- [x] validate boundary-date time against the closed Replay Session range;
- [x] retain invalid input with explicit New York lower/upper bounds and no
  Replay or Workspace transaction;
- [x] retain the existing exclusive-cutoff `goto-exact` action and atomic
  visible-Pane response;
- [x] bind the interaction and fixed dialog visual in real Chrome;
- [x] replace raster-color-only visible completion with bounded raster plus
  validated series-data/coordinate proof after repeated GoTo and Next Day Open
  exposed intermittent false rollback at futures roll boundaries;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9f Workstation Settings Catalog And Ownership — Completed Headlessly

- [x] classify visual Workstation Settings as one global durable preference
  scope, separate from the global domain-specific Quick GoTo preference and
  Pane operational state;
- [x] retain the V6-proven draft/Save/Cancel/Reset interaction while rejecting
  its global command/event registry and large mixed-purpose shell;
- [x] route Canvas/Candles only through the Chart adapter, OHLC/change only
  through the Pane readout, default right margin only through Viewport, and
  workstation tokens only through a shared presentation port;
- [x] reject per-Pane appearance overrides, Apply-to-all, templates, and hiding
  essential Replay/failure/active-Pane context without a new user journey;
- [x] define the initial background/grid/axis/Crosshair/candle catalog and the
  bounded OHLC/change/current-price/Pane-control visibility catalog;
- [x] require all current and future Panes to receive one committed Settings
  revision without Replay, Workspace, Pane, series-data, or manual-Viewport
  mutation;
- [x] keep inactive fields out of the UI until a real consumer and focused
  acceptance evidence land in the same production step;
- [x] verify native Lightweight Charts chart/series `applyOptions` support so
  presentation changes do not require custom rendering or data replacement.

R6.9f changes no production behavior and requires no visual acceptance. Its
field-level product catalog is refined by R6.9g below.

### R6.9g Workstation Settings Product Refinement — Completed Headlessly

- [x] promote Auto/Integer/1-15 decimal price precision into the active plan,
  using exact Instrument `priceIncrement` for Auto, applying one formatter to
  axis/current-price/OHLC/change, and rejecting fractions;
- [x] retain Body/Border/Wick visibility and independent up/down colors while
  requiring a verified adapter mapping for the non-native Body switch;
- [x] promote nullable Volume visibility into the active readout plan with
  honest `Vol —` presentation and no synthetic zero;
- [x] expand shared Crosshair presentation to color, opacity, native width, and
  solid/dashed/dotted style across every Pane;
- [x] simplify Grid to one visibility switch and reject gradient background,
  editable Grid color, Session breaks, Watermark, and Canvas boundary color;
- [x] retain current-price Name/Value/Line as independent controls while
  requiring all eight combinations to pass and rejecting percentage, scale
  placement/modes, ratio lock, countdown, and plus;
- [x] add simplified New York/UTC/local, four practical date formats, weekday,
  and 12/24-hour presentation without changing canonical time or Replay;
- [x] retain the four-tab Symbol/Status line/Scales and lines/Canvas shell with
  Reset/Cancel/OK and omit Template/Apply to all;
- [x] split future production delivery into focused owner/consumer slices.

R6.9g changes no production behavior and requires no visual acceptance. After
R6.9e human acceptance, R6.9h delivers Exact GoTo. R6.9i activates the Settings
owner/persistence/shell with one real Grid consumer; R6.9j adds Symbol;
R6.9k adds Status/current price; R6.9l adds Canvas; R6.9m adds shared time
presentation.

### R6.9i Workstation Settings Foundation — Accepted

- [x] activate one versioned global Workstation Settings owner and a separate
  durable `v7.workstation-settings:global` record;
- [x] recover missing/corrupt/unavailable records to defaults without touching
  Session records or the Quick GoTo preference;
- [x] implement stage/apply/persist/commit with all-consumer rollback on any
  Save failure;
- [x] expose the four-tab Symbol/Status line/Scales and lines/Canvas shell while
  keeping future fields honest and inactive;
- [x] retain draft-only Reset and discard through Cancel, close, Escape, or
  backdrop click;
- [x] activate only the Canvas Grid-lines visibility control;
- [x] fan one committed revision to all mounted Panes and apply it to future
  Panes before their first data paint;
- [x] prove that Settings do not move Replay, Workspace, series-data, bar-count,
  Pane intent, or Viewport revisions;
- [x] bind durable hard-reload/cross-Session restore, current/future-Pane fan-out,
  rollback, native chart mapping, and the dialog visual in focused Harnesses;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9j Symbol Candles And Shared Precision — Accepted

- [x] migrate accepted R6.9i version-1 records without losing Grid preference;
- [x] activate independent Body/Border/Wick visibility and up/down colors;
- [x] map style changes through native series options without `setData`/`update`;
- [x] derive Auto precision from each Pane instrument's exact `priceIncrement`;
- [x] preserve tick size when manual precision requires a custom formatter;
- [x] share one precision across the price scale, current-price value, OHLC, and
  absolute change while preserving raw bars and percent precision;
- [x] apply one committed revision to all current and future Panes and restore it
  after hard reload and across Sessions;
- [x] prove presentation changes do not move Replay, Workspace, Viewport, Pane,
  bar-count, series-data, or chart-visible receipt revisions;
- [x] bind strict value/migration/formatter, native chart mapping, all-Pane
  inheritance, and the Symbol dialog visual in focused Harnesses;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9j1 Maintainable Color Picker — Accepted

- [x] replace browser-native color inputs with a V7-owned fixed palette,
  opacity control, recent-color row, and optional precise editor;
- [x] use exact-pinned `vanilla-colorful` only as the replaceable precise
  hex-alpha interaction engine rather than as Settings or popup owner;
- [x] migrate version-2 six-digit colors to normalized version-3
  `#RRGGBBAA` values while preserving every accepted candle choice;
- [x] persist at most eight deduplicated recent colors in the separate global
  `v7.color-history:global` record and restore them across Sessions/reloads;
- [x] add recent colors only after an accepted Settings Save; Cancel, Escape,
  backdrop dismissal, and rejected Saves remain side-effect free;
- [x] prove alpha reaches native series presentation without Replay, Workspace,
  Viewport, Pane, series-data, or bar-count mutation;
- [x] bind migration/value/history contracts, real chart mapping, cross-Session
  restore, popup interaction, Cancel isolation, and a dedicated visual fixture;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9k Status Readout And Current Price — Accepted

- [x] migrate accepted version-3 records to schema version 4 while preserving
  every candle, precision, and Grid preference;
- [x] activate independent OHLC, bar-change, and Volume visibility while
  keeping compact symbol and TF provenance permanently visible;
- [x] render explicit unknown Volume as `Vol —` and format finite source Volume
  compactly without inventing zero;
- [x] activate independent current-price Symbol name, Price value, and Price
  line controls with defaults on;
- [x] route compact instrument labels explicitly from foundation metadata
  without parsing opaque Instrument ids inside the chart adapter;
- [x] prove all eight Name/Value/Line combinations against real Lightweight
  Charts 5.2, including bounded name-only price-axis presentation;
- [x] apply one global revision to all current/future Panes and restore it after
  hard reload and across Sessions;
- [x] prove Settings do not move Replay, Workspace, Pane, Viewport, series-data,
  bar-count, or chart-visible receipt revisions;
- [x] bind strict value/migration, nullable Volume, native/custom price-axis,
  all-Pane inheritance, and both active-tab visuals in focused Harnesses;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9l Canvas, Crosshair, Scale And View Defaults — Accepted

- [x] migrate every accepted schema-version-4 record to version 5 while
  retaining Grid, Symbol, Status-line, and current-price preferences;
- [x] activate a solid Canvas background and retain one shared Grid visibility
  switch through native chart options;
- [x] activate shared Crosshair color, opacity, width, and
  solid/dashed/dotted style across every Pane;
- [x] keep Replay truncation's temporary blue Crosshair authoritative while it
  is armed, then restore the committed user Crosshair on exit;
- [x] activate scale text color/font size and top/bottom price-scale margins
  through native chart/price-scale options;
- [x] activate hover/always/hidden visibility for the existing lower-right
  Pane Maximize/Restore and Reset View dock without changing active-Pane state;
- [x] route right-margin bars to Viewport Runtime as the future/new-Pane and
  Reset View default without moving or overwriting an existing manual wall;
- [x] apply one global revision to all current/future Panes and restore it after
  hard reload and across Sessions;
- [x] prove Save cannot mutate Replay, Workspace, Pane, series-data, bar count,
  chart-visible receipt, or existing manual Viewport intent/revision;
- [x] bind strict schema/migration, native Lightweight Charts mapping,
  truncation restoration, Viewport defaults, current/future Pane inheritance,
  hard reload, and the active Canvas visual in focused Harnesses;
- [x] add owner-managed live preview for every valid draft without persistence
  writes or committed revision movement;
- [x] make Cancel, close, Escape, backdrop dismissal, and Workspace disposal
  restore the complete committed presentation after any preview;
- [x] promote Replay Workspace readout/control presentation to a formal
  reversible Settings consumer instead of controller-side post-commit writes;
- [x] let OK commit the already-visible preview while read/write/consumer
  failures restore every previewed consumer;
- [x] prove right-margin preview still cannot move or replace an existing
  manual Viewport wall;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.9m Shared Time Presentation — Accepted

- [x] record R6.9l live-preview acceptance before starting the next bounded
  slice;
- [x] migrate every accepted schema-version-5 record to version 6 without
  changing any prior visual preference;
- [x] activate New York/UTC/browser-local, four practical date formats,
  optional detailed weekday, and 12/24-hour presentation;
- [x] centralize canonical-epoch formatting under Workstation Settings and
  reuse it for native chart axes/Crosshair, Replay Workspace, Exact GoTo, and
  Session Browser;
- [x] retain Session creation and Quick GoTo as explicit New York market-time
  domain behavior regardless of display timezone;
- [x] add injected Calendar date/time presentation and an explicit AM/PM
  control without adding Replay, Settings, or Economic Calendar ownership;
- [x] retain live preview, OK persistence, and complete Cancel/close/Escape/
  backdrop/disposal/failure rollback across all current and future Panes;
- [x] prove format changes do not move Replay, change Session bounds or visible
  cutoff, issue a Workspace transaction, rewrite series data, or mutate Pane/
  Viewport revisions;
- [x] bind version migration, DST/local/UTC formatting, native chart mapping,
  Exact Calendar, hard reload, cross-Session/future-Pane inheritance, Session
  Browser, and updated visual baselines in focused Harnesses;
- [x] obtain explicit human interaction and visual acceptance on 2026-07-22.

### R6.10a Layout Sync Contract And Crosshair Persistence — Executable

- [x] define one immutable, versioned Session-workspace policy for Symbol,
  Interval, Crosshair, Time, and Date range;
- [x] retain reviewed defaults: Symbol on and the other four switches off;
- [x] keep Replay and ETH/RTH outside the switches because they are always
  Session-wide;
- [x] advance configured Session workspaces to schema version 5 while retaining
  schemas 1–4 as lazy migration inputs;
- [x] make Session Store the sole durable policy writer and preserve A/B
  isolation plus revision CAS;
- [x] migrate the existing Crosshair switch from a component-local boolean to
  the accepted policy without Replay, Workspace, bars, series, focus, or
  Viewport mutation;
- [x] restore accepted Crosshair synchronization after Session re-entry;
- [x] keep unimplemented Symbol/Interval/Time/Date-range controls out of the UI
  until each real owner/consumer lands;
- [x] bind fixture-backed domain failures, persistence/migration, real-browser
  projection, architecture, and source-quality evidence.

Next bounded slice: R6.10b activates Symbol and Interval policies through one
atomic complete-Pane Workspace replacement, not per-Pane event fan-out.

### R6.10b Symbol And Interval Layout Sync — Executable

- [x] expose Symbol, Interval, and Crosshair only after each has a real owner
  and consumer; keep Time and Date range absent;
- [x] retain reviewed defaults: Symbol on, Interval/Crosshair off;
- [x] make a toggle affect only later commands rather than immediately forcing
  existing mixed Panes to converge;
- [x] add pure local/all-Pane timeframe and instrument-policy transitions while
  retaining exact Viewport intents and the shared cursor;
- [x] calculate one complete target Pane Workspace for the next synchronized
  Symbol or Interval choice and issue exactly one Workspace Transaction;
- [x] restore Pane-local behavior after disabling either policy and restore all
  accepted switch values after Session re-entry;
- [x] keep Replay-control `Sync timeframe` separate from Layout Sync Interval;
- [x] retain Session primary-instrument clock authority when synchronized
  Symbol leaves every visible Pane on a comparison instrument;
- [x] reuse accepted authority cache at the first Session cutoff and otherwise
  resolve bounded source evidence only through Bar Data Runtime;
- [x] prove policy-only zero-transaction behavior, atomic complete-set commits,
  comparison-only authority, strict failures, real-browser behavior, and the
  updated Layout menu visual.

Interaction gate: review Symbol/Interval menu semantics, synchronized and
Pane-local changes, mixed-Pane non-convergence on toggle alone, and Session
re-entry before starting R6.10c Time synchronization. Human accepted on
2026-07-23.

### R6.10c1 Stable Pane Priority Identity — Executable

- [x] define stable P1-P4 identities independently of active focus;
- [x] place Pane priorities by farther-right first, then higher first when right
  edges match, across all 12 layouts;
- [x] make two-column P1 right, two-row P1 top, and four-grid P1/P2/P3/P4 map
  to right-top/right-bottom/left-top/left-bottom;
- [x] retain P1..Pn on every count reduction, including 4-to-3 and multi-to-one,
  while preserving retained Pane instrument, timeframe, Viewport, and chart
  identity;
- [x] ignore active focus when choosing survivors and fall back to P1 if the
  active lower-priority Pane is removed;
- [x] expose compact P1-P4 labels in multi-Pane status lines and semantic DOM/
  accessibility labels while hiding redundant P1 in single Pane;
- [x] bind all layout placements, stable identity lookup, priority-preserving
  state reduction, real geometry, and updated visual baselines;
- [x] obtain explicit human interaction and visual acceptance before changing
  the separate R6.10c Time implementation.

Human interaction and visual review accepted on 2026-07-23. Next corrective
slice: execute the isolated real-time Time-sync rollback, then specify
right-click time location using the now-stable P1-P4 target identities. R6.10d
remains deferred.

### R6.10c2 Real-time Time Sync Rollback — Accepted

- [x] remove the Time switch from Layout Sync without changing the accepted
  Symbol, Interval, or Crosshair controls;
- [x] remove ordinary-click time projection and its adapter/domain consumer so
  an ordinary Pane click cannot move another Pane's Viewport;
- [x] retain the versioned `time` preference only as an inert compatibility
  field, allowing existing Session records to reopen without schema churn;
- [x] preserve stable P1-P4 identities, priority count reduction, Replay,
  Workspace, Bar Data, Crosshair, and chart-series ownership;
- [x] bind the absent Time control and retained Pane-priority interaction in
  focused and real-browser Harnesses;
- [x] obtain explicit human interaction and visual acceptance of the rollback.

Human interaction and visual review accepted on 2026-07-23. Next: specify and
implement the replacement right-click time-location contract. Do not activate
Date-range synchronization in this corrective sequence.

### R6.10c3 Explicit Right-click Pane Time Location — Accepted

- [x] require an exact real source candle and carry its canonical market start
  time rather than compressed chart-display time;
- [x] expose one explicit context menu with stable P1-P4, instrument, and
  timeframe target labels plus `All other panes`;
- [x] preserve each target's current logical span and center only a real target
  candle that contains the selected market instant;
- [x] request missing target history only through bounded Bar Data and atomic
  Workspace Transaction owners, with finite serial retry;
- [x] keep source focus, Replay, Pane configuration, ETH/RTH, and non-target
  Viewports unchanged, and never snap an unavailable target to unrelated data;
- [x] bind negative fixtures, pure-domain/controller Harnesses, real adapter
  hit-testing, mixed-instrument/timeframe four-Pane behavior, and a dedicated
  visual baseline;
- [x] obtain explicit human interaction and visual acceptance after correcting
  automatic post-location left-history extension.

Interaction gate: review exact-candle selection, stable target labels,
single-target and all-target location, missing-history behavior, blank-space
rejection, RTH gaps, unchanged Replay/source focus, and menu dismissal.

First human review on 2026-07-23 found that post-location left blank space did
not request history until another mouse interaction. The adapter now publishes
the accepted programmatic range to the existing history-boundary owner. Repeat
human review passed on 2026-07-23.

### R6.10d Date-range Synchronization — Deliberately Deferred

- [x] decide that native pan/zoom remains Pane-local in the chart foundation;
- [x] retain `dateRange: false` only as inert versioned compatibility data;
- [x] keep the control and all visible-range fan-out absent from production;
- [x] bind that absence with H067 and the real Layout Workspace browser Harness;
- [x] require concrete comparison-workflow evidence before reconsideration.

R6 interaction work is closed. Date-range synchronization is not an R7 task.

### R7.1 Durable Session Workspace Checkpoint — Accepted

- [x] activate one versioned, data-independent Workspace Checkpoint domain;
- [x] persist Replay cursor, Session Hours, active Pane, Pane
  instrument/timeframe, and semantic Viewport intent with Pane Layout and
  Layout Sync in one Session workspace schema-6 revision;
- [x] keep bars, native chart coordinates, activation/revisions, autoplay,
  maximize, menus, and other transient presentation outside persistence;
- [x] lazily upgrade schema 1–5 only after an opened Session reaches a successful
  visible commit;
- [x] restore Replay paused at the exact saved cursor and rebrand Viewports under
  the new activation before one all-Pane atomic materialization;
- [x] skip equal checkpoint writes and reject layout/checkpoint count splits;
- [x] bind domain, Store, Viewport, Pane state, soft re-entry, and hard-refresh
  behavior in focused and real-Chrome Harnesses;
- [x] obtain explicit human review of mixed-Pane re-entry and hard refresh.

Human review passed on 2026-07-23 after confirming that a stale pre-R7.1
browser module was the only observed non-persisting path; a forced reload
upgraded the Session to schema 6 and both soft re-entry and hard refresh
retained the accepted Replay position.

After acceptance, R7.2 reruns cache/reordering and full foundation
cross-product performance gates against restored workspaces.

### R7.2 Restored Workspace Performance And Race Closure — Accepted

- [x] run 100 warm-cache Manual Next samples after schema-6 soft re-entry and
  hard refresh with NQ `1m`, ES `4h`, RTH, two Panes, and a manual Viewport;
- [x] retain the binding p95 `<100ms`, p99 `<150ms`, max `<250ms` budget,
  `tail-update` mutation, and zero provider requests during measured samples;
- [x] verify restored Autoplay advances continuously, adds no warm-cache
  provider request, pauses, and persists the final accepted Replay cursor;
- [x] share one buffered forward request identity between Replay traversal and
  Pane materialization instead of issuing one current-minute range request per
  Next;
- [x] add a provenance-checked strictly-forward incremental Projection path
  and prove exact equality with complete Projection;
- [x] rerun delayed, stale, reordered, all-or-none Pane-set, source traversal,
  and visible-completion evidence;
- [x] map all nine foundation cross-product axes and every declared value to
  executable evidence with one intentional missing-axis negative control;
- [x] close without manual review because production interaction and visuals
  are unchanged.

The accepted Chrome run measured p95 `63.2ms`, p99 `74.6ms`, max `75.9ms`,
and zero provider requests across the 100 measured restored mixed-Pane Next
actions. R7 now closes the shared chart/replay foundation.

### R7.3 Data Acquisition Milestone Gate — Executable

- [x] audit the V4 `data-maintenance.html`, API, Databento updater, roll
  workflow, authoritative DuckDB, live coverage, and V7 read path;
- [x] retain V4 Maintenance API as the sole Databento/DuckDB write boundary and
  keep chart/session owners read-only;
- [x] add a removable-independent V7 administrator page with structured ES/NQ
  coverage and masked environment state;
- [x] require unchanged-range Preflight, clean Dry Run, verified recoverable
  database backup, exact `WRITE ES/NQ`, insert-only write, and V7 feed verify;
- [x] retain one maintenance job at a time and make long tasks recoverable by
  immediate job id plus retained status polling;
- [x] correct stale ES/NQ freshness guidance so selected-range writes depend on
  current roll preflight and Dry Run rather than an obsolete blanket NQ block;
- [x] bind domain, client, backend, negative, real-Chrome interaction, and
  `1440×900` visual evidence;
- [x] run current-source API against the canonical DuckDB and confirm local
  V7-origin access;
- [x] run full ES/NQ catch-up Preflight and Dry Run with zero duplicate
  candidates and no degraded warning;
- [x] create and verify named durable pre-write backups before ES and NQ;
- [x] execute controlled insert-only ES/NQ catch-up and verify coverage,
  duplicate integrity, V4 bars API, and V7 chart reads;
- [ ] obtain explicit human interaction and visual acceptance.

The controlled 2026-07-23 run inserted `30,834` ES and `30,837` NQ rows from
the exact frozen Dry Run ranges. Final coverage is ES `6,491,818` rows through
`2026-07-23 14:12` and NQ `6,158,352` rows through `2026-07-23 14:17`, with
zero duplicate timestamps for both instruments. Two distinct pre-write backups
passed read-only restore smoke before their respective writes, and both latest
ranges were returned through `/v4/bars`.

Tradovate import, automatic scheduling, and Economic Calendar acquisition are
not required for this phase-one milestone gate.

After R7.3 acceptance and the user's complete foundation walkthrough, decide
whether to close phase one. Only then specify the phase-two Backtesting/Journal
module boundary; do not create another Replay/chart owner.

### R7.3a Maximized Pane Timeframe Pointer Correction — Executable

- [x] reproduce the failure with real mouse hit-testing instead of scripted
  DOM `click()` calls;
- [x] confirm the timeframe menu opened but its options lost pointer ownership
  to the later maximized chart Canvas at an equal stacking level;
- [x] raise only the timeframe menu to the established toolbar-menu layer;
- [x] keep Pane focus, independent timeframe ownership, mounted chart hosts,
  maximize state, Replay cursor, and other Panes unchanged;
- [x] bind a maximized active-Pane `1m → 2m → 1m` round trip with real CDP
  mouse events and an explicit `elementFromPoint` invariant;
- [x] rerun Layout Workspace, Replay Pane Workspace, architecture, module-host,
  source-quality, visual, and whitespace gates;
- [ ] obtain explicit human interaction acceptance before resuming the R7.3
  Data Acquisition review.

This is a UI stacking correction in the existing outer-DOM maximize boundary.
It does not reopen R6 ownership or add a chart-runtime fullscreen mode.

### R7.3b Source-Aware Session Calendar — Awaiting Human Review

- [x] expose one read-only V4 market-date endpoint backed by the configured
  authoritative DuckDB;
- [x] cache ES/NQ date indexes only while the database file signature remains
  unchanged;
- [x] refresh source availability whenever Create Session opens and keep the
  Session Browser unavailable-date policy outside Calendar Surface domain
  state;
- [x] disable dates containing no bars for the selected instrument and use the
  date intersection when more than one instrument is selected;
- [x] render previous/next-month placeholders grey and non-selectable in the
  Session picker without changing Exact GoTo calendar behavior;
- [x] keep a partially populated latest date selectable while rejecting a
  Start/End wall minute beyond the selected instruments' shared source bounds;
- [x] prevent rapid repeated time-stepper clicks from selecting weekday, date,
  or time text while preserving button and keyboard interaction;
- [x] bind service, HTTP adapter, provider adapter, intersection/bounds policy,
  real-browser interaction, and updated visual evidence;
- [ ] obtain explicit human interaction and visual acceptance.

The running local V4 API was moved to the current source and the canonical
DuckDB. Its `/v4/available_dates` endpoint returned HTTP `200` for NQ+ES. This
step does not mutate market data, Session persistence, chart state, or Replay
ownership.

### R7.3c Contract Roll v2 — Awaiting Human Review

- [x] replace reminder-only roll reporting with structured ES/NQ active,
  expected-next, decision-deadline, and ready/due-soon/blocked health;
- [x] validate contiguous H/M/U/Z quarterly chains and stop treating the final
  configured contract as valid forever;
- [x] retain accepted historical midnight boundaries while making every new
  transition effective at the full CME trade-date session open;
- [x] aggregate scan evidence by CME trade date and reject incomplete source
  sessions using count plus first/last-minute coverage;
- [x] bind Scan evidence to calendar revision, require Preview and exact typed
  confirmation, reject historical boundaries, and expire retained evidence;
- [x] disable the legacy V4/API roll-calendar write path so it cannot bypass
  v2 history, Preview, backup, atomic-replace, or audit gates;
- [x] back up, validate, fsync, atomically replace, and audit the Roll Calendar;
- [x] make Roll commit revoke selected-range Preflight, Dry Run, Backup, and
  read-verification evidence;
- [x] require the configured consecutive complete-session dominance count
  before exposing a roll candidate; retain a one-day overtake as diagnostics;
- [x] reject every transition later than the old contract's decision deadline
  before Preview or commit can extend the calendar horizon;
- [x] stage calendar and audit together and restore both exact prior texts if
  either atomic replacement fails, while retaining Preview for a safe retry;
- [x] revoke acquisition gates immediately on a successful commit response,
  before any fallible Roll-health or coverage refresh;
- [x] bind domain, adapter, updater, scanner, module, source-quality, and real
  Chrome interaction/visual evidence;
- [ ] obtain explicit human review without committing the future U6→Z6 roll
  before real complete-session evidence exists.

The current health result derives `ESU6→ESZ6` and `NQU6→NQZ6`, with a hard
New York horizon at `2026-09-14 00:00`. This is a safety deadline rather than a
preselected roll date. R7.3c mutates no authoritative market-data row.

### R7.3j Single-Pass Dense History Fill — Awaiting Human Review

- [x] re-derive the dense-history prepend fix after the explicit rollback to
  `5077c13e`, without restoring the removed consolidated correction commit;
- [x] preserve a partially negative manual logical range exactly so prepended
  candles occupy Canvas whitespace without moving the prior pointer anchor;
- [x] derive one display-bar target from the actual left-side gap through the
  accepted logical-index-24 buffer, retaining a 240-bar minimum;
- [x] count ETH/RTH-eligible fixed-duration buckets before acquisition so one
  bounded logical request targets the complete current Canvas fill;
- [x] remove post-commit automatic history continuation and require exactly one
  Workspace revision plus one chart `setData()` for one drag;
- [x] keep seven-day V4 transport parts invisible behind one Raw Batch while an
  adapter-wide two-transfer pool overlaps local I/O;
- [x] keep the accepted Canvas fully opaque and out of the delayed stale state
  throughout history acquisition;
- [x] bind pure gap/window/anchor controls, provider transport concurrency, and
  a real dense `8h` Chrome gesture with one visible commit;
- [ ] obtain explicit human confirmation that dense left-history navigation no
  longer rebounds, flashes, or paints block by block.

Human review then exposed a screenshot-scale `4h` gap beyond the 210-day raw
window. R7.3j remains the anchor/single-commit foundation, but its raw-only
high-timeframe acquisition evidence is superseded by R7.3k below.

The removed R7.3g–R7.3i experiment remains recoverable only through historical
commit `77b2714a`; this replacement does not reapply that bundled commit. The
current implementation keeps the same V7 owners: Bar Data owns acquisition,
Projection owns eligible/no-future candles, Chart Runtime is the sole series
writer, Viewport owns the drag wall, and Replay does not move.

### R7.3k Projected Screenshot-Scale History Fill — Human Accepted

- [x] identify the reported delayed partial fill as a high-timeframe request
  exceeding R7.3j's 210-day raw-source window rather than another anchor defect;
- [x] publish a released drag immediately and coalesce a held drag/wheel burst
  after 500 ms of stable logical range;
- [x] capture each gesture once and discard duplicate history boundary events
  during the active transaction instead of replaying an unexplained queued fill;
- [x] add a read-only V4 projected-history service for `1h`–`12h`, using the
  same immutable `1m` source, exact V7 real-instant grid, and ETH/RTH filtering;
- [x] add an explicit projected-history request/batch contract plus separately
  bounded Bar Data-owned cache/runtime and Pane provenance;
- [x] keep projected display context out of Replay raw-source traversal and
  retain authoritative raw acquisition for lower-timeframe drill-down/replay;
- [x] prove `4h` ETH/RTH projected bars equal raw `1m` aggregation across DST;
- [x] bind a real screenshot-scale `4h` Chrome drag: about 1,910 logical bars,
  2,427 final candles, logical `from=12.62`, one visible revision, no stale/dim,
  and `496.3ms` gesture-to-visible completion on the final cold-window run;
- [x] obtain explicit human confirmation after a hard reload that the reported
  `4h` Session fills its entire left edge once, predictably, without rebound or
  flashing (`2026-07-29`: user confirms speed is acceptable and loading is
  one-pass).

### R7.3l Premarket RTH Entry Warmup — Human Accepted

- [x] reproduce the reported `2026-05-01 05:47 EDT` Session where switching to
  RTH committed an empty Pane even though prior-session RTH bars existed;
- [x] identify the cause as a natural-minute entry prefix containing only
  closed-market minutes while the buffered same-day RTH bars remained correctly
  hidden by no-future Projection;
- [x] anchor Session-aware RTH context planning to the stable Session entry and
  cross the prior close/weekend when that nominal entry window is wholly closed;
- [x] preserve the exact 500-minute forward request identity so cache-hit Manual
  Next does not issue a new provider request;
- [x] prove in real Chrome that the exact premarket Session switches to ready
  RTH with at least 200 prior-session bars, survives a hard reload with two
  Panes, extends earlier RTH history, and returns to ETH;
- [x] obtain explicit human confirmation after a hard reload that the reported
  Session no longer shows `No visible bars` in RTH (`2026-07-29` screenshot
  shows ready `3m` RTH candles in the same Session).

### R7.3m Dense Projection Replacement Prefill — Human Accepted

- [x] reproduce the retained dense Viewport with a timeframe replacement that
  initially commits only a short series and waits for native mouse/wheel input;
- [x] identify the missing boundary as pre-commit replacement planning rather
  than provider speed, projected-history volume, or Chart rendering;
- [x] derive the replacement display target from the semantic Viewport span,
  latest-bar offset, 24-bar left buffer, and eight-bar safety allowance;
- [x] size sub-hour raw replacement windows against the sparser shared RTH plan
  so ETH/RTH retain one raw cache identity;
- [x] merge compact projected prefix with authoritative raw tail for dense
  `1h`–`12h` replacements before one visible Chart commit;
- [x] prove in real Chrome under RTH that dense `4h→3m→4h` and subsequent
  RTH→ETH each add exactly one Workspace revision, retain `logicalFrom >= 24`,
  and do not increment the native history-boundary capture count;
- [x] rebaseline and normally re-verify the affected Pane/Layout Canvas fixtures
  after confirming the rendered market/UI semantics are unchanged;
- [x] obtain explicit human confirmation that a hard-reloaded dense timeframe
  switch fills left context without any subsequent mouse action (`2026-07-29`:
  user supplied the filled dense-workspace screenshot and explicitly requested
  the accepted correction be committed).

### R7.3n Session-Aware Calendar Timeframes — Human Accepted

- [x] confirm from Lightweight Charts and awesome-tradingview primary sources
  that the chart library accepts timestamps but does not own source OHLC
  aggregation or exchange-timezone conversion;
- [x] add a pure Projection-owned calendar timeframe module with registered
  day/week/month alignment rather than enabling placeholder UI controls;
- [x] define ETH trading-date rollover at `18:00`, RTH same-date `09:30`,
  Monday trading weeks, calendar trading months, and stable eligible
  completion-minute display placement;
- [x] preserve Session Hours-before-aggregation, exclusive no-future source,
  immutable OHLCV, exact calendar/policy provenance, and Replay independence;
- [x] extend the Bar Data-owned projected-history contract, adapter, cache
  identity, and V4 read-only service to `1D`/`1W`/`1M` × ETH/RTH;
- [x] prefill calendar replacements with compact projected history plus an
  authoritative raw tail before one visible Chart commit, without waiting for
  a mouse/wheel boundary event;
- [x] prove frontend/API parity for day/week/month × ETH/RTH across DST and add
  five pure negative controls;
- [x] prove in real Chrome that all three menu choices are enabled, each arrives
  with at least 100 bars without a native history event, Replay does not move,
  and premarket RTH month history stays ready;
- [x] visually inspect and rebaseline the intentional enabled-state change in
  the open-timeframe-menu fixture;
- [x] re-derive fixed/calendar activation through versioned contributions and
  a policy-family-agnostic registry without new core-owner branches (`R8.13`);
- [x] obtain explicit human confirmation after a hard reload that `1D`, `1W`,
  and `1M` are clickable and fill their left context without pointer input
  (`2026-07-31`, accepted with the binding R8.15 checklist).

### R7.3o Dense RTH Time-Location Source Preservation — Human Accepted

- [x] reproduce the reported two-Pane sequence with a genuinely dense P1,
  RTH replacement, and the real right-click `Locate in P2` action;
- [x] isolate the failure to the non-target P1 source ledger replacing a wide
  accepted RTH wall with a fully contained ordinary navigation window;
- [x] retain wider ordered accepted batches only when they completely cover
  the acquired window under the exact same raw source scope;
- [x] preserve the existing target-history, Workspace Transaction, Bar Data,
  Projection, Chart-writer, and Replay ownership boundaries;
- [x] add pure controls for covered-window retention and foreign-instrument
  rejection;
- [x] extend the real multi-Pane RTH browser gate through dense zoom, Session
  Hours replacement, actual context-menu location, and non-target bar/span
  preservation;
- [x] replace the removed UI ledger with Bar Data Runtime-owned accepted
  coverage leases and prove repeated ETH plus bidirectional RTH Locate while
  Replay and both semantic Viewport walls remain stable (`R8.13`);
- [x] pass focused domain/runtime/architecture gates plus the real Workspace,
  Pane Workspace, and exact multi-Pane RTH browser regressions;
- [x] obtain explicit human confirmation after a hard reload by repeating the
  reported ETH/RTH drag-and-Locate sequence (`2026-07-31`, user reported
  `验收通过` under R8.15).

## Standing Gates

- every bounded step has one focused commit;
- every R8 step stops after its commit for explicit review before the next step;
- architecture harness and focused tests pass;
- `git diff --check` passes;
- automated evidence never changes a human-review requirement or clears a
  `regressed` rule by itself;
- no V6 production runtime import or copied orchestration;
- every module declares ports/lifecycle and passes an independent harness;
- optional-module removal and minimal-core boot remain executable gates;
- adding a capability cannot branch core code on its concrete id;
- replacement and deletion occur in the same commit.
