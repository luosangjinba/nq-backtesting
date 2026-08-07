# V7 Foundation Execution Roadmap

Each step is independently committed and automatically verified. Steps that
change interaction or visuals then stop for manual acceptance.

Once this roadmap is accepted, the agent proceeds autonomously within the next
listed step. The user does not need to restate implementation instructions.
After every commit the agent reports evidence. A concise manual checklist and
explicit acceptance gate apply only when interaction or visuals changed;
headless steps continue in roadmap order.

Milestones use `R<n>`. Every repository-changing, independently reviewed step
uses the next immutable `R<n>.<m>` id and produces exactly one commit. Rejected
steps retain their ids and evidence; replacement work consumes a new id. See
`V7_TASK_NUMBERING.md`.

## R0 — Constitution And Isolation Gate

- create V7 skeleton;
- bind product scope, owners, transaction semantics, and V6 denylist;
- classify useful and rejected V6 structure and record the final product shape;
- add executable architecture manifest/harness;
- bind descriptor, public-port, independent-run, and removable-module gates;
- define the first black-box Session isolation matrix.

No production runtime or V6 runtime import is allowed.

## R0.1 — Harness Hardening

- every critical rule receives a lifecycle and activation step;
- executable rules require positive and intentional negative evidence;
- minimal-core architecture model proves public dependencies, unique writers,
  event notification, identity, terminal transactions, stale no-op, optional
  removal, and no global mutable state;
- later dynamic/product rules are declared but cannot be marked protected until
  their real owner boundary exists.

Gate: architecture hardening harness passes all negative controls; no rule is
marked accepted without human evidence.

## R0.2 — Source Modularity And Documentation Gates

- production file kind determines reviewed size/function budgets;
- one file owns one long-lived responsibility;
- size exceptions require machine-readable human evidence;
- artificial forwarding fragments cannot evade size review;
- public contracts document ownership and behavior;
- critical concurrency/data/viewport invariants explain why they exist;
- debt comments require decision id, owner, and removal condition.

Gate: source-quality harness passes its positive model and rejects every
intentional size, responsibility, documentation, and debt violation.

## R0.3 — Foundation Interaction And Phase Boundary

- inventory detailed foundation user intents and visible responses;
- bind every intent to one command/runtime owner and visible completion;
- declare persistence and last-accepted-snapshot behavior;
- require later disposition across TF, hours, pane, instrument, cache,
  ordering, lifecycle, viewport, and transport axes;
- record outside-foundation examples without planning a later phase;
- establish immutable task, harness, interaction, decision, and bug ids.

Gate: interaction-contract harness accepts the complete foundation model and
rejects missing owners, missing visible completion, unplanned-scope leakage, and
missing cross-product axes.

Human result: rejected. Outside-foundation examples were incorrectly named as
second-phase functions before phase two had been planned.

## R0.4 — Cache, Latency, And Atomic Refresh Correction

- reclassify outside-foundation examples as unplanned candidates only;
- set cache-hit and post-response visible latency budgets for Manual Next,
  Auto Replay, TF/session-hours switching, and history chunks;
- prohibit artificial production delay and separate provider time from local
  processing overhead;
- retain and dim the last accepted snapshot during TF/ETH/RTH refresh, then
  replace it atomically;
- prepend earlier history in automatic bounded chunks, never one bar at a time;
- bind raw cache ownership, complete identity, coalescing, eviction, no-future,
  and Replay prefetch watermarks.

Gate: cache/latency contract and interaction harnesses reject unbounded latency,
blank/partial refresh, user-driven incremental history repair, artificial
delay, and incomplete or Session-coupled cache identity.

## R1 — Pure Identity And Transaction Contracts

R1 is split into separately committed and manually reviewed boundaries:

- `R1.1`: opaque, immutable, version-serialized Session identity only;
- `R1.2`: activation generation only;
- `R1.3`: transaction identity, terminal results, and pure stale acceptance;
- `R1.4`: isolated minimal-core module host and lifecycle;
- `R1.5`: capability descriptor contracts without capability implementations.

### R1.1 — Session Identity

- opaque Session identity;
- strict branded input at every future Session-scoped public boundary;
- explicit versioned serialization with no implicit JSON identity leakage;
- no Session generation policy, active Session, persistence, transaction,
  Replay, bars, chart, or UI.

Gate: A and B remain unequal; raw strings, structural lookalikes, malformed
tokens, and unsupported serialized schemas/versions fail deterministically.

### R1.2 — Activation Generation

- immutable branded positive-safe-integer generation;
- pure strictly-increasing successor operation;
- explicit versioned serialization with no implicit JSON leakage;
- generation is a Session-activation identity component, never a pane-local
  retry, history, timer, or request counter;
- no allocator state, active Session, cancellation, transaction, persistence,
  runtime coordination, bars, chart, or UI.

Gate: reopening the same Session can receive a strictly later branded
generation; raw numbers, lookalikes, invalid ranges, overflow, and unsupported
wire forms fail deterministically.

### R1.3 — Transaction Identity And Pure Currency Contract

- opaque immutable TransactionId without a module-global allocator;
- branded complete Session/activation/transaction identity tuple;
- immutable generic intent, plan, and terminal result/failure envelopes;
- pure deterministic current/stale assessment with zero stale side effects;
- cancellation is resource cleanup and never the commit-safety proof.

Gate: same-Session older transaction, older activation, and other-Session
completions are rejected deterministically regardless of completion order.
Runtime liveness, actual side-effect suppression, and concurrency permutations
remain unprotected until the Workspace Transaction Runtime exists.

### R1.4 — Isolated Module Host And Lifecycle

- validate module descriptors and explicit required/optional ports;
- build a deterministic dependency-first assembly plan;
- inject only declared public ports into isolated module instances;
- stop and dispose in reverse dependency order;
- roll back partial start failure without leaking resources;
- boot the real pure minimal core with optional modules absent.

Gate: two hosts share no mutable lifecycle/API state, optional-module removal
still boots, and every normal/failure path cleans up deterministically.

R1.4 adds no application singleton, feature runtime, chart, bars, persistence,
network, DOM, or UI.

### R1.5 — Capability Descriptor Contracts

Define versioned capability descriptors for timeframe, market-data provider,
instrument/calendar, indicator, and formula-engine extension. Implementations
arrive only in their later vertical slices. Adding a descriptor must not add a
concrete-id branch to an existing core owner.

Gate: valid descriptors negotiate through public contracts while malformed,
incompatible, or undeclared capabilities fail without starting a host.

## R2 — Session Store Vertical Slice

R2 is split into four independently committed and manually reviewed boundaries:

- `R2.1`: headless versioned Session records, explicit-key persistence,
  revision CAS, activation allocation, migration, and runtime reconstruction;
- `R2.2`: professional Session browser UI for create/open/leave/reopen and the
  first visible A/B navigation and hard-reload evidence;
- `R2.3`: extract the accepted date-time UI into a shared, business-data-agnostic
  Calendar Surface without adding market coverage or chart behavior;
- `R2.4`: deepen and clarify the Session Browser presentation and add
  confirmed, explicit-key Session deletion through the existing Store owner.

### R2.1 — Session Store And Persistence Boundary

- per-Session versioned records with an explicitly uninitialized workspace;
- explicit keyed reads/writes and no implicit active/current Session key;
- compare-and-swap revision commits;
- persisted activation generation that remains monotonic after reconstruction;
- replaceable Web Storage-compatible adapter and deliberate schema migrations;
- no charts, bars, Replay cursor, pane state, DOM, UI, or global singleton.

Gate: A/B metadata and ranges never cross; A→B→A advances A independently;
reconstructed repository/store instances restore both Sessions and allocate a
strictly later activation; stale revision commits fail deterministically.

### R2.2 — Professional Session Browser Slice

- create/open/leave/reopen through the Session Store public boundary;
- visible loading, empty, unavailable, stale, error, and ready states;
- visibly distinct A/B Session metadata survives navigation and hard reload.

Manual gate: visibly distinct A/B metadata survives navigation and hard reload.

### R2.3 — Shared Calendar Surface

- one reusable public date-time selection boundary;
- deterministic day/month/decade models separated from DOM ownership;
- Session Browser consumes only the Calendar Surface public facade;
- Calendar Surface owns no market data, coverage, order/news, chart, Replay,
  viewport, or Session state;
- no future decoration or chart-navigation API is invented before its product
  interaction has been reviewed.

Manual gate: the accepted Session creation interaction and visual presentation
remain unchanged after extraction.

### R2.4 — Session Browser Readability And Delete

- scope darker/brighter/larger presentation tokens to the Session list so the
  immersive Replay workspace remains unchanged;
- show one Delete action per card and require an explicit inline confirmation;
- keep Browser UI command-only and make Session Store/Repository own
  revision-checked durable removal;
- prove Cancel is non-mutating, confirmed removal deletes index plus record,
  other Sessions remain isolated, and reconstruction preserves the result.

Manual gate: Session cards are clearly more readable, Delete is discoverable,
and the confirmation interaction prevents accidental permanent removal.

## R3 — Bar Data And Replay Core

R3 is split into independently committed boundaries before milestone closure:

- `R3.1`: pure provider-neutral raw request/bar/batch values;
- `R3.2a`: bounded exact-window runtime/cache and fake-provider conformance;
- `R3.2b1`: transport-neutral provider policy and adapter port;
- `R3.2b2`: coverage/gap values and bounded request planning;
- `R3.2b3`: policy execution over fake-provider conformance;
- `R3.3`: one headless Replay clock and no-future cursor proposals.

### R3.1 — Raw Bar Data Value Contract

- exact Session-independent request identity across provider, instrument,
  source resolution, half-open window, and dataset revision;
- immutable normalized OHLCV bars and batches;
- strict ordering, uniqueness, price-envelope, and request-window validation;
- no provider I/O, cache, Replay, projection, chart, UI, or coverage calendar.

Gate: every identity component changes the request key; malformed, duplicate,
descending, and out-of-window bars fail before any future cache can observe them.

### R3.2a — Bounded Exact-Window Runtime

- the only raw requester/cache writer;
- injected fake-provider port, identical-request coalescing, global concurrency
  bound, exact-window LRU eviction, and deterministic disposal;
- no Replay or chart dependency.

Gate: cache hits avoid the provider, identical in-flight requests share one
Promise, queued work advances without user input, eviction is bounded, failures
are not cached, runtimes are isolated, and disposal blocks late writes.

### R3.2b1 — Provider Policy Contract

- provider-neutral revision freshness, request limits, deadline, bounded retry,
  stable failure taxonomy, and adapter port;
- no concrete provider or policy execution.

### R3.2b2 — Coverage And Request Planning

- ordered coverage/gap values, contiguous interval merge, missing-window query,
  bounded chunk planning, and prefetch watermarks;
- no concrete provider or policy execution.

### R3.2b3 — Fake-Provider Policy Execution

- revision discovery cache, deadline, bounded retry, request limits, coverage
  acquisition, cancellation, and automatic complete-plan execution against
  deterministic fakes;
- Replay-cursor high/low-watermark prefetch remains deferred until Replay owns
  a cursor;
- no Replay or chart dependency.

### R3.3 — Headless Replay Runtime

- `R3.3a`: provider-independent Replay range, deterministic manual/auto time
  inputs, transaction-scoped cursor proposals, and exclusive no-future cutoff;
- `R3.3b`: one mutable Session-activation Replay clock with visible-commit-only
  acceptance and stale proposal rejection;
- `R3.3c`: pure high/low-watermark prefetch advice without data I/O;
- no chart dependency.

## R4 — First Atomic Chart Slice

- `R4.1`: headless Workspace Transaction Runtime with one immutable complete
  identity, injected owner ports, inert Replay proposals, deterministic
  supersession, exact visible-completion acknowledgement, final currency check,
  and failure preservation;
- `R4.2`: pure provider-neutral pane Projection Domain, exclusive Replay
  no-future filtering, registered eligibility/aggregation policy ports, exact
  provenance, and one-pane identity `1m`/ETH fixtures;
- `R4.3`: headless sole-writer Chart Snapshot Application, staged atomic fake
  adapter, exact visible receipt, race/disposal rejection, and failure
  preservation;
- `R4.4`: pure pane-local Viewport Runtime intent, native logical-range manual
  wall measurement, data-independent cursor movement, explicit Reset/Follow,
  and deterministic adapter projection;
- `R4.5`: real Lightweight Charts 5.2 adapter and professional NQ/`1m`/ETH
  one-pane workspace, entry/Manual Next atomic path, screenshot-backed paint
  receipt, default/manual wall, and human acceptance on 2026-07-20;
- one pane, NQ, `1m`, ETH;
- entry and Manual Next through one transaction/visible completion;
- stable default/manual wall.
- first professional workstation surface using reviewed design tokens and
  complete loading/empty/error/ready states.

## R5 — Timeframe And Session Hours

- `R5.1`: carry forward settled V6 interaction decisions for Reset View,
  Replay, Settings, multi-pane, ETH/RTH, and multi-instrument behavior while
  rejecting V6 ownership/orchestration;
- `R5.2`: verify real NQ/ES timestamp/calendar facts and implement the pure
  Session Hours/calendar policy plus inherited cursor/eligibility fixtures;
- `R5.3`: implement registered fixed-duration timeframe projection and
  alignment fixtures through the existing pure Projection Domain;
- `R5.4`: route timeframe and ETH/RTH replacement intents through one headless
  workspace transaction with stale/superseded isolation;
- `R5.5`: one grouped fixed minute/hour timeframe menu and compact ETH/RTH
  controls are implemented over atomic replacement; V6 prefix-plus-start entry,
  single-bar reveal, and repeatable leftward extension are restored before the
  interaction/visual acceptance gate;
- all TF projection through the pure domain;
- ETH/RTH eligibility before aggregation;
- delayed/superseded switches cannot commit.

## R6 — Atomic Multi-Pane And Instruments

- `R6.1`: define the pure uniform Pane Workspace value and Session-bounded
  active-focus/instrument transitions, with one shared Replay cursor and no
  Pane-local Replay state;
- `R6.2`: bind Manual Next/Previous, Autoplay, Restart/Back-to, quick GoTo, and
  exact GoTo to one shared cursor and complete visible-Pane response plan;
- `R6.3`: materialize the complete Pane set through one Workspace transaction
  and one atomic visible-completion boundary; completed headlessly with fake
  per-Pane acquisition/projection and chart ports;
- `R6.4`: activate Previous, Autoplay, Restart/Back-to, and both GoTo forms over
  that shared materialization path; completed headlessly with one Replay target
  proposal path, DST-aware New York anchors, and overlap/failure controls;
- `R6.5`: real single/multi-Pane chart hosts, active-Pane instrument/TF intent,
  Session-wide ETH/RTH, shared Replay transport, quick/exact GoTo, and the
  combined browser/visual gate were implemented but human review rejected the
  Next-minute semantics, interim transport, limited layouts, and absent sync;
- `R6.6`: replace implicit source-minute stepping with one Session-level Replay
  bar-step grid independent from Pane TF, resolve aligned non-empty
  Next/Previous completions through real source traversal, and expose the
  bounded Replay-step selector; its interaction gate was human-rejected because
  Autoplay performed only one step and Pause had no continuing work to stop;
- `R6.7`: add a completion-driven continuous Autoplay cadence over the existing
  one-step navigation action, make Pause cancel future work without overlapping
  all-Pane transactions, and stop at Session end/failure; its review exposed a
  blocking multi-Pane RTH history regression;
- `R6.7a`: preserve accepted Pane candles while earlier RTH history crosses
  consecutive non-contributing closed-session windows, retain exact coverage
  provenance, and prove two-Pane ETH→RTH extension plus ETH recovery; follow-up
  review exposed a manual-span collapse under rapid boundary input;
- `R6.7b`: translate left-clamped transient manual logical ranges without
  shrinking their canonical span, preserve that wall through two-to-one Pane
  replacement, and make the first subsequent drag extend history; follow-up
  review exposed repeated non-contributing wall-clock requests at RTH `09:30`;
- `R6.7c`: keep contributing nominal history windows unchanged, but expand a
  wholly closed nominal window within the same bounded request until it reaches
  prior eligible source minutes, crossing overnight and weekend closures
  without synthetic bars or recursive foreground transactions;
- `R6.7d`: retain functional input locking during candle transactions while
  keeping the accepted toolbar DOM and visual opacity stable; intrinsic
  unavailable/complete/playback states remain visibly disabled;
- `R6.8`: replace the interim top-row controls with the reviewed fixed `38px`
  bottom rail and centered capsule, combine Play/Pause, and add bounded dynamic
  playback speed without covering any Pane or changing Replay ownership;
- `R6.8a`: add Session-bounded Replay truncation through the existing exact
  all-Pane transaction, add one-way `Sync timeframe`, and refine the capsule
  with TradingView-like icons while retaining the fixed non-overlay rail;
- `R6.8b`: render Autoplay speed and Replay step as compact arrowless text
  selectors in speed-to-step order, retain native selection behavior, and keep
  the adjacent timeframe-sync switch icon-only with an accessible name;
- `R6.9`: human accepted: the exact reviewed one-to-four
  Pane layout set, draggable and keyboard-adjustable horizontal/vertical
  boundaries, nested minimum-size constraints, Session-persisted accepted
  ratios, and the corrected `280×120px` readability floor without data or
  Replay work;
- `R6.9a`: strengthen active focus, add accepted Pane-local OHLC, and implement
  chart-only Crosshair sync through adapter-owned official APIs without Replay,
  data, focus, Session, or Workspace transaction effects; accepted on
  2026-07-21;
- `R6.9b`: integrate compact symbol/TF/OHLC/change into the Canvas, move Reset
  to each Pane, and add transient hover Maximize/Restore that keeps every chart
  mounted and preserves exact layout, Replay, and Workspace state; accepted on
  2026-07-21;
- `R6.9c`: move Pane-local Maximize/Restore and Reset to a vertical lower-right
  Canvas dock with explicit price/time-scale safe insets, retaining all
  accepted interaction and ownership semantics; awaiting focused visual review;
- `R6.9d`: freeze the redesigned shared GoTo contract: eight strict-forward
  New York anchors, primary-session-only Next Session, exact Session-range
  semantics, and a non-mutating range-end rejection before later quick/exact
  presentation slices;
- `R6.9e`: implement the eight-action Quick GoTo menu, one globally persisted
  seven-time New York settings value, Reset/Discard/Save behavior, immediate
  dynamic schedule use, and non-blocking range-end feedback without Replay or
  Pane transaction side effects; accepted on 2026-07-22;
- `R6.9e1`: keep fixed-duration future time labels visible through bounded
  adapter-owned whitespace points with no future OHLC, Replay, source-bar, or
  Viewport ownership; accepted on 2026-07-22;
- `R6.9f`: freeze the global Workstation Settings catalog, transactional draft,
  persistence scope, consumer routing, and all-Pane presentation invariants
  without activating production behavior;
- `R6.9g`: refine the field catalog from the user-reviewed FXReplay audit:
  price precision, nullable Volume, rich shared Crosshair, simplified Grid,
  current-price controls, practical time formats, and explicit non-goals;
- `R6.9h`: separate Exact GoTo into its own Workspace-level entry and add
  Session-range-aware Calendar presentation plus boundary validation; accepted
  on 2026-07-22. The 2026-08-05 acceptance correction defaults it to the latest
  revealed minute and translates that customer value to the exclusive cursor;
- `R6.9i`: activate the versioned Workstation Settings owner, durable global
  record, transactional draft shell, and one honest Grid consumer; accepted on
  2026-07-22;
- `R6.9j`: activate candle body/border/wick presentation plus Auto/manual
  shared price formatting through chart-owned option fan-out; accepted on
  2026-07-22;
- `R6.9j1`: replace native color inputs with a V7-owned palette/recent/opacity
  shell around a small precise-picker engine, migrate colors to normalized
  hex-alpha, and keep recent history global but outside Settings transactions;
  accepted on 2026-07-22;
- `R6.9k`: activate bounded OHLC/change/Volume and current-price Name/Value/Line
  controls, proving all eight price-label combinations without hiding essential
  symbol/TF provenance; accepted on 2026-07-22;
- `R6.9l`: activate solid Canvas background, shared rich Crosshair, scale text,
  Pane-control visibility, owner-routed top/bottom/right margins, and complete
  live-preview/discard restoration; accepted on 2026-07-22;
- `R6.9m`: activate shared New York/UTC/local, date, weekday, and 12/24-hour
  presentation across native chart formatters, Replay Workspace, Exact GoTo,
  and Session Browser without changing canonical instants or Replay semantics;
  accepted on 2026-07-22;
- `R6.10a`: define one versioned Session-workspace Layout Sync policy, advance
  configured workspaces to schema 5, and migrate the existing Crosshair switch
  to durable restoration without exposing inert future controls;
- `R6.10b`: activate Symbol and Interval synchronization through one atomic
  complete-Pane Workspace replacement; accepted on 2026-07-23;
- `R6.10c`: real-time ordinary-click Time synchronization was implemented but
  rejected as a product interaction and removed in R6.10c2; the versioned
  preference remains inert for compatibility;
- `R6.10c2`: remove rejected real-time coupling while retaining its persisted
  preference only as inert compatibility data; accepted on 2026-07-23;
- `R6.10c3`: replace real-time coupling with an explicit right-click
  market-time command targeting stable P1-P4 identities; accepted after its
  post-location history-fill correction on 2026-07-23;
- `R6.10d`: deliberately defer Date-range synchronization beyond the chart
  foundation; keep its versioned key inert and native pan/zoom Pane-local;
- same pane model from one to many panes;
- all panes switch/restore atomically;
- pane-local instrument with one shared Replay clock.

## R7 — Restore And Performance

- `R7.1`: define and implement one versioned Session Workspace checkpoint plus
  atomic soft re-entry and hard-refresh restoration for UX-FND-004; accepted
  after automated contract/Store/real-Chrome gates and human re-entry review
  on 2026-07-23;
- `R7.2`: rerun and close cache-hit, delayed/reordered-response, and full
  foundation cross-product performance gates against restored workspaces;
  automatically accepted on 2026-07-23 with no interaction/visual change.
- `R7.3`: close the phase-one market-data acquisition prerequisite through an
  independent trusted local admin surface over the guarded V4 maintenance
  boundary; require roll Preflight, clean Dry Run, verified backup, exact
  confirmation, insert-only write, and V7-facing read verification without
  granting Databento or DuckDB authority to chart/session owners.

R7.1–R7.2 close the shared replay/chart runtime. R7.3 is the final operational
data prerequisite requested before phase-one closure. Tradovate import,
automatic scheduling, and Economic Calendar acquisition remain outside this
gate. After controlled ES/NQ catch-up, read verification, human Data
Acquisition review, and the user's complete foundation walkthrough, decide
whether to close phase one. The later Backtesting/Journal boundary must reuse
the same chart and Replay owners.

## R8 — Architecture Conformance Recovery (Completed)

R8 superseded phase-one closure while recovery was active. The binding detail,
bug identities, exact acceptance workflow, and per-step gates live in
`V7_ARCHITECTURE_CONFORMANCE_RECOVERY_PLAN.md`. The user explicitly accepted
the final hard-reloaded workflow on 2026-07-31; recovery mode is now inactive.

- `R8.1`: recovery constitution and executable regression lifecycle;
- `R8.2`: production architecture analyzer; completed as an executable exact
  production baseline with 13 blocking findings and eight negative controls;
- `R8.3`: descriptor, lifecycle, and independent-harness repair; completed with
  all seven assigned findings closed, 42 production public entries booted, 10
  lifecycle modules disposed in reverse order, and the complete one-case
  optional-removal matrix proven;
- `R8.4`: pure bounded Raw Coverage Lease contract; completed with complete
  transaction identity, finite window-count/per-window/aggregate budgets,
  callback-scoped synchronous reads, cancellation, disposal, and an executable
  sole-retention rule awaiting R8.5 activation;
- `R8.5`: sole Bar Data raw retention owner; completed with transaction-bound
  lease activation, deletion of both UI ledgers, bounded accepted-coverage/LRU
  reuse, delayed cancellation, inactive-Pane release, and disposal evidence;
- `R8.6`: sole semantic Workspace State owner; completed with one branded,
  revisioned Pane/Session Hours/Viewport/checkpoint snapshot, current complete
  transaction identity enforcement, UI ledger deletion, restore rebranding,
  and ten negative controls;
- `R8.7`: prepared commit participant contract; completed with exactly four
  branded Chart/Replay/Workspace State/publication roles, immutable candidate
  and complete transaction identity provenance, no-mutation prepare,
  reversible apply, exact rollback/finalize receipts, and exhaustive forged,
  stale, duplicate, partial, revision, ordering, and disposal controls;
- `R8.8`: reversible Chart application; completed with a branded prepared
  Chart handle, exact target revision receipts, real painted series/scale/OHLC
  restoration, retained prior Pane membership until finalize, and independent
  Replay/Workspace State/publication failure rollback evidence;
- `R8.9`: globally atomic Workspace transaction and removal of UI second commit;
  completed with one prepared semantic candidate across Chart, Replay,
  Workspace State, and publication/persistence, reverse exact rollback for all
  five injected failure boundaries, coordinator-only finalize, and deletion of
  the Chart `present()` compatibility bridge;
- `R8.10`: UI/composition responsibility split; completed with one dedicated
  composition module, a focused command port, an explicit UI presentation
  adapter, six negative controls, and deletion of the mixed UI controller;
- `R8.11`: production ModuleHost boot and removal matrix; completed with two
  real application lifecycle modules, exact descriptor-closure loading, two
  isolated hosts, reverse cleanup, partial-start rollback, and two production
  Replay Workspace optional-removal consumers;
- `R8.12`: source responsibility, size, documentation, and debt closure;
- `R8.13`: Open/Closed Calendar re-derivation and dense RTH Locate repair;
- `R8.14`: full production failure/concurrency/cross-product matrix; completed
  with 11 bound axes, eight real browser/owner scenarios, five fail-closed
  negative controls, and dynamic post-visible durable rollback evidence;
- `R8.15`: human acceptance and zero-debt recovery closure; completed after
  explicit user acceptance of the binding dense two-Pane Calendar/ETH/RTH
  workflow, a clean 78-Harness gate, zero regressed rules, and recovery-mode
  deactivation;
- `R8.16`: post-closure audit evidence consistency correction; completed by
  reconciling six human-readable source summaries with the canonical baseline
  and adding two fail-closed negative controls without reactivating recovery or
  changing production behavior.

Each item is exactly one commit and stops for review. R7.3n and R7.3o were
accepted only through the combined R8.15 human gate, not independently of
R8.13–R8.15.

## R9 — Replay Product Tuning

- `R9.1`: cap Replay step selection at `4h`, map higher synchronized display
  timeframes to that registered maximum, and tune the `4h`→`1m` bulk-reveal
  path through bounded forward coverage, exact immutable batch reuse,
  Projection-issued snapshot identity, and one append replacement; implemented
  with 128-sample real-Chrome evidence and awaiting human acceptance.
- `R9.2`: remove same-input Multi-pane Replay amplification by sharing exact
  transaction-scoped Projection and Chart-data conversion, replacing duplicate
  full-history interaction Maps with one binary-search index per child, and
  binding sustained 1/2/4 Pane Chrome latency evidence; implemented and
  awaiting human acceptance.
- `R9.3`: supersede R9.2's still-perceptible complete-history Canvas rewrite
  with bounded Replay series segments, viewport-aware rendering, shared
  mutation/immutability/time-format proofs, and a tightened sustained 1/2/4
  Pane Chrome gate; implemented and awaiting human acceptance.
- `R9.4`: preserve completion-slot Chart coordinates while labeling fixed
  aggregates from bucket start and calendar aggregates from explicit trading-
  period dates through official Crosshair/time-axis formatter ports;
  implemented and awaiting focused human hover review.

## R10 — Deployment Validation

- `R10.1`: add a private-by-default one-command Linux acceptance-host deploy
  for exact committed releases, a systemd-enforced read-only external DuckDB,
  loopback V4/V7 services, optional authenticated Caddy HTTPS, proxy-enforced
  remote mutation blocking, local health rollback, and executable dry-run/
  negative/rendered-config evidence. It runs in parallel with the still-open
  phase-one overall acceptance checklist and awaits a real lightweight-host
  gate.
- `R10.2`: correct the first Alibaba Linux run by reusing existing Node/npm,
  selecting Python 3.10+ explicitly, failing closed on unmanaged legacy
  listeners, and adding authenticated direct public-IPv4 HTTPS through Caddy
  2.10.2+ plus Let's Encrypt's short-lived certificate profile; implemented
  and awaiting the real-host rerun.
- `R10.3`: add one interactive direct-IPv4 wrapper for service-user/password
  preparation and explicitly authorized, exact-match legacy-listener
  replacement while delegating all release/runtime behavior to R10.2;
  implemented and awaiting the same real-host gate.
- `R10.4`: preserve unrelated Caddy sites through an explicit imported-fragment
  deployment path, combined-config validation, repeat-safe import ownership,
  and main/fragment rollback; implemented after the Alibaba host exposed an
  existing Caddy site and awaiting the same real-host rerun.
- `R10.8`: retain local Web Storage as the immediate local-first persistence
  boundary while replicating allowlisted Session/checkpoint/preferences state
  to one user-scoped SQLite snapshot through strict revision CAS; expose only
  the authenticated `/v7/state/*` mutation route, preserve an optional/local
  boot path, and require explicit conflict resolution plus real two-computer
  confirmation. Automated implementation is complete; physical host review is
  pending. Binding contract: `V7_SERVER_STATE_SYNC_R10_8.md`.
- `R10.9`: allow a clean Linux host to start with one missing market-database
  target; add a visual administrator upload for strict UTF-8 CSV conversion or
  DuckDB validation, an isolated loopback import service, authenticated exact
  proxy route, candidate evidence, and create-if-absent activation. It performs
  no normalization, merge, append, or replacement, and locks permanently after
  first activation through a durable marker. Retained task discovery restores
  upload/validation state after browser or service restart. Automated
  implementation is complete; clean-host large-file and visual review is
  pending. Binding contract:
  `V7_DATABASE_BOOTSTRAP_IMPORT_R10_9.md`.
- `R10.10`: correct Debian/Ubuntu Python readiness by requiring importable
  `ensurepip`, allowing package planning to install the matching distribution
  venv package; R11 supersedes its incomplete shared-environment repair with a
  release-owned `.venv` and failed-release quarantine. The affected host still
  awaits a deployment/rollback rerun.

## R11 — Architecture Integrity Recovery

The 2026-08-06 full-code review reopened architecture integrity under V7's
original modularity standard. R11 repairs semantic transaction recovery,
transaction-scoped temporary state, authoritative dataset revision, atomic
state hydration, complete host rollback, explicit public assets, independently
composed administration capabilities, and cross-runtime production governance.
The binding sequence and acceptance conditions live in
`V7_ARCHITECTURE_INTEGRITY_RECOVERY_R11.md`.

R11 does not invalidate the useful R8 browser module graph, but R8's static
zero-finding result cannot close R11 because it did not cover deployed Python,
Node service, V4 provider, and Linux deployment boundaries or real finalize /
rollback semantics.

### R11.1 — Cross-Runtime Integrity Recovery

R11.1 delivers the binding recovery workstreams as one inseparable architecture
change. All workstreams and negative controls pass together, and automated
repository recovery is closed by
`sessions/session_20260806_r11_1_architecture_integrity_recovery.md`. Real-host
rollback, cross-device synchronization, and the three retained full-sweep
visual scenarios remain explicit human gates, so repository implementation
does not close phase-one overall acceptance.

## R12 — Acceptance-Host Usability Recovery

R12 addresses usability findings discovered while executing the open
lightweight-host acceptance gate. It may improve administrator recovery without
weakening first-run database authority, public mutation policy, or the closed
R11 ownership boundaries.

### R12.1 — Database Bootstrap Re-upload Recovery

- add one authenticated command that discards only a stable, unactivated
  staged source/candidate under the database-import owner;
- retain an idempotent tombstone, user isolation, validation concurrency guard,
  and permanent post-activation lock;
- lock direct file replacement while a retained task exists and expose an
  inline `Upload another file` confirmation with no shell/API command;
- recover upload-busy responses into the retained task and prove cancel,
  discard, second upload, validation, activation, restart, and target
  non-mutation in service and real-browser Harnesses;
- accept H092 from executable declarative race/activation-lock controls and
  retain the visible confirmation as an exact browser fixture.

Gate: automated owner/identity/restart/browser evidence passes; the deployed
large-file path still requires human memory/disk/time and visual confirmation.

### R12.2 — Standalone V7 Runtime Separation

- replace the browser's versioned provider identity and every active read URL
  with `adapter.market-data-provider` and `/v7/market-data/*`;
- move the complete read-only DuckDB HTTP boundary into `v7/server`, retain the
  external `futures_1m` data contract, and reject every mutation method;
- ship only `v7/` in immutable releases, start
  `replay-lab-market-data.service`, and write only `V7_MARKET_DATA_*`
  configuration;
- migrate an old enabled/running market-data unit inside the existing host
  transaction, remove `/v4/*` after success, and restore old release/unit/
  health state on failure;
- keep first-run import V7-native and keep the historical Databento/Contract
  Roll writer visibly disabled until it becomes a separately governed V7
  service;
- bind isolated-service, V7-only archive, zero-runtime-coupling, deployed
  topology, regression-matrix, and complete-suite evidence.

Gate: the same commit boots on an upgraded host and a clean host without any
V4 source tree, preserves the external DuckDB fingerprint, and passes the
existing authenticated browser acceptance path. Binding contract:
`V7_STANDALONE_RUNTIME_SEPARATION_R12_2.md`.

### R12.3 — Adaptive Low-Memory Deployment

- make the provider 512 MB instance the minimum supported class, with a 450 MiB
  Linux `MemTotal` floor that rejects smaller hosts before release mutation;
- derive DuckDB memory and thread budgets from physical RAM and online CPUs;
- ensure a profile-specific total-swap floor through an idempotent persistent
  managed file while preserving unrelated host swap;
- route Market Data and Database Import spills into separate service-writable
  directories under the state root;
- bind profile boundaries, invalid configuration, a real compact DuckDB
  connection, rendered systemd/env policy, and deployed ownership as H094.

Gate: upgrade both lightweight hosts, validate the representative 901 MB
DuckDB on the 512 MB class without OOM, reboot to prove swap persistence,
preserve database fingerprints, and compare the same Play-bar scenario on both
network locations. Binding contract:
`V7_ADAPTIVE_LOW_MEMORY_DEPLOYMENT_R12_3.md`.

### R12.4 — Managed Swap Accounting Tolerance

- correct the exact comparison between nominal swap-file size and the slightly
  smaller kernel-reported `SwapTotal` after `mkswap` reserves its header;
- accept only an explicit 8 MiB accounting tolerance, add that overhead to new
  files, and keep larger capacity shortfalls as hard failures;
- recover the already-active R12.3 file on rerun without swap deletion,
  recreation, or operator repair commands;
- bind the positive 511/512 MiB and negative 503/512 MiB boundaries as H095.

Gate: pull the correction on the affected lightweight host and complete the
same one-command deployment. Binding correction:
`V7_SWAP_ACCOUNTING_TOLERANCE_R12_4.md`.
