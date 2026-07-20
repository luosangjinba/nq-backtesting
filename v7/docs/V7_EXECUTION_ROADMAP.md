# V7 Foundation Execution Roadmap

Each step is independently committed, automatically verified, and then stopped
for manual acceptance.

Once this roadmap is accepted, the agent proceeds autonomously within the next
listed step. The user does not need to restate implementation instructions.
After every commit the agent must stop, report evidence, and provide a concise
manual checklist. Only explicit human acceptance opens the next step.

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

R2 is split into two independently committed and manually reviewed boundaries:

- `R2.1`: headless versioned Session records, explicit-key persistence,
  revision CAS, activation allocation, migration, and runtime reconstruction;
- `R2.2`: professional Session browser UI for create/open/leave/reopen and the
  first visible A/B navigation and hard-reload evidence.

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

## R3 — Bar Data And Replay Core

- bounded raw requests/cache;
- one Replay clock and no-future cursor proposals;
- no chart dependency.

## R4 — First Atomic Chart Slice

- one pane, NQ, `1m`, ETH;
- entry and Manual Next through one transaction/visible completion;
- stable default/manual wall.
- first professional workstation surface using reviewed design tokens and
  complete loading/empty/error/ready states.

## R5 — Timeframe And Session Hours

- all TF projection through the pure domain;
- ETH/RTH eligibility before aggregation;
- delayed/superseded switches cannot commit.

## R6 — Atomic Multi-Pane And Instruments

- same pane model from one to many panes;
- all panes switch/restore atomically;
- pane-local instrument with one shared Replay clock.

## R7 — Transport, Restore, And Performance

- Auto/Previous/Restart/Go-to;
- soft re-entry and hard refresh restore;
- cache-hit and delayed/reordered response gates.
