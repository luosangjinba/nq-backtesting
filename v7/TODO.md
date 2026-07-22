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

### R6.9 Resizable One-To-Four Pane Layouts — Review Corrections In Progress

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

R6.9 changes interaction and visuals and therefore stops with R6.9a/R6.9b for
one combined explicit human acceptance gate. Remaining R6.10 sync is not part
of this correction.

### R6.9a Active Pane, OHLC, And Crosshair Review Correction — Awaiting Human Review

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
- [ ] obtain explicit human interaction and visual acceptance for
  R6.9/R6.9a/R6.9b.

### R6.9b Canvas Overlay And Pane Maximize Review Correction — Awaiting Human Review

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
- [ ] obtain explicit human acceptance for R6.9/R6.9a/R6.9b.

Do not start the remaining R6.10 Symbol/Interval/Time/Date-range sync families
until this combined review gate is accepted.

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
