# V7 Prepared Commit Contract — R8.7

Status: completed contract activation (2026-07-30)

## Outcome

R8.7 adds `core.prepared-commit-contract`, a participant-neutral lifecycle for
Chart, Replay, Workspace State, and publication. It defines the identity,
candidate, revision, reversible-apply, rollback, finalize, and disposal
evidence required before Workspace Transaction Runtime can coordinate a global
atomic commit in R8.9.

This step changes no production participant and makes no Chart, Replay,
Workspace State, UI, or persistence mutation. H076 becomes executable but is
not accepted; real participant activation remains R8.8–R8.9.

## Participant Roles

Exactly four roles may enter the protocol:

| Role | Future accepted surface |
| --- | --- |
| `chart` | complete visible Pane-set state |
| `replay` | cursor, visible-through, and Replay revision |
| `workspace-state` | Pane/Session Hours/Viewport/checkpoint semantic revision |
| `publication` | accepted Workspace publication and durable/UI handoff |

Every preparation binds one deeply immutable candidate object to one complete
`SessionId + ActivationGeneration + TransactionId` identity and one participant
role. Receipts retain exact candidate-object provenance; structural lookalikes
and receipts from another preparation fail.

## Revision And Mutation Protocol

```text
prepare (base revision unchanged, mutation policy: none)
  ├─ rollback/discard -> base revision
  └─ apply -> target revision, reversible-only
       ├─ rollback -> exact base revision
       └─ finalize -> target revision, irreversible-accepted
```

`preparedRevision` must equal `baseRevision`, and `targetRevision` is exactly
`baseRevision + 1`. Prepare therefore cannot claim a visible or semantic
mutation. Apply returns a branded Prepared Commit receipt and remains
reversible. Rollback requires the exact commit receipt when apply occurred and
must prove restoration to the exact base revision. Finalize requires that same
receipt and exact target revision; rollback after finalize is forbidden.

Preparation may be disposed without apply. An applied participant cannot be
disposed until it rolls back, preventing cleanup from silently abandoning a
partial commit. Duplicate/out-of-order transitions are rejected.

## Receipt Boundary

Three branded receipts cross participant/coordinator boundaries:

- Prepared Commit receipt: exact candidate reached its next revision but is
  still reversible;
- Prepared Rollback receipt: prepared or applied work is back on the exact
  base revision, including whether an apply had occurred;
- Prepared Finalize receipt: the exact applied candidate is now irreversible
  at the target revision.

Public readers and matching validators reject raw objects, cross-preparation
receipts, foreign transaction identity, revision skips, and terminal reuse.

## Library And Ecosystem Decision

Lightweight Charts 5.2 `ISeriesApi` exposes immediate `setData`, `update`, and
`pop` mutations plus readback; it does not expose a cross-owner transaction,
prepare, or rollback protocol. Its official plugin model covers custom series
and primitives. The awesome-tradingview catalogue links those plugins and
wrappers but no global Chart/Replay/semantic-state commit mechanism.

V7 therefore keeps the generic protocol in its own core contract. R8.8 may use
adapter-owned prior-state snapshots and `setData` restoration behind the Chart
participant, without leaking Lightweight Charts concepts into this contract.

References:

- <https://tradingview.github.io/lightweight-charts/docs/api/interfaces/ISeriesApi>
- <https://tradingview.github.io/lightweight-charts/docs/plugins/intro>
- <https://github.com/tradingview/awesome-tradingview>

## Executable Evidence

`tests/prepared-commit-contract-harness.js` boots the public entry directly. It
proves all four roles prepare without owner mutation, exact reversible apply
and finalize receipts, reverse rollback after a two-of-four partial apply,
restoration of every participant to its base revision, and 32 negative
controls covering forged, foreign, stale, duplicate, partial, out-of-order,
revision, mutability, and disposal failures.

The production architecture baseline contains 45 active modules, 114 actual
dependency edges, 112 construction sites, nine critical writer sites, and the
same three later-step blocking findings. R8.7 adds no production writer or
participant activation.

No manual UI review is required because this step changes no UI, visual, chart,
or interaction behavior.

R8.8 subsequently activates the Chart role through this exact contract. H076
remains executable until Replay, Workspace State, publication, and the global
decision owner are activated in R8.9.
