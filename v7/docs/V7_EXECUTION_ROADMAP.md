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
- explicitly defer phase-two workflows without making them foundation gates;
- establish immutable task, harness, interaction, decision, and bug ids.

Gate: interaction-contract harness accepts the complete foundation model and
rejects missing owners, missing visible completion, deferred-scope leakage, and
missing cross-product axes.

## R1 — Pure Identity And Transaction Contracts

- opaque Session identity;
- activation generation and transaction identity;
- immutable intent/plan/result/failure contracts;
- pure current/stale acceptance function.

Gate: delayed A, activated B, then reopened A cannot share an accepted identity.

R1 also establishes the module descriptor schema and harness utilities used by
all later modules. It still adds no application composition or UI.

It also defines capability descriptors for timeframe, market-data provider,
instrument/calendar, indicator, and formula-engine extension. Implementations
arrive only in their later vertical slices.

## R2 — Session Store Vertical Slice

- per-session persistent workspace records;
- explicit keyed reads/writes;
- create/open/leave/reopen without charts or bars.

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
