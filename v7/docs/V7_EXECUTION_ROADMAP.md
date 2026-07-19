# V7 Foundation Execution Roadmap

Each step is independently committed, automatically verified, and then stopped
for manual acceptance.

Once this roadmap is accepted, the agent proceeds autonomously within the next
listed step. The user does not need to restate implementation instructions.
After every commit the agent must stop, report evidence, and provide a concise
manual checklist. Only explicit human acceptance opens the next step.

## R0 — Constitution And Isolation Gate

- create V7 skeleton;
- bind product scope, owners, transaction semantics, and V6 denylist;
- classify useful and rejected V6 structure and record the final product shape;
- add executable architecture manifest/harness;
- bind descriptor, public-port, independent-run, and removable-module gates;
- define the first black-box Session isolation matrix.

No production runtime or V6 runtime import is allowed.

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
