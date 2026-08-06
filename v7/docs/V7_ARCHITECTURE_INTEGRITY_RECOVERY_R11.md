# V7 Architecture Integrity Recovery — R11

Status: automated repository recovery closed; human gates remain open

## Why Recovery Reopened

The 2026-08-06 full-code review confirmed that the V7 browser runtime has a
useful module graph and mostly clear owner boundaries, but it also found that
the original V7 modularity standard was not being applied to every deployed
runtime. It additionally found semantic failure paths which the static R8
architecture baseline could not observe.

R11 therefore reopens architecture integrity without discarding the accepted
V7 interaction model. Phase-one overall acceptance remains open. No R8 or R10
historical evidence is rewritten; R11 records and repairs the newly proven
gaps.

## Binding Outcomes

R11 is complete only when all of the following are true:

1. Workspace Transaction has one explicit irreversible decision point. Before
   it, every participant and durable write is exactly reversible. After it,
   completion cannot be reported as failed. Any unprovable recovery poisons the
   activation and blocks later commands until reconstruction.
2. Raw Coverage leases and projected-history consumers are scoped to one full
   Workspace Transaction identity; stale work cannot commit, reject, or retain
   resources belonging to a newer transaction.
3. Market-data cache identity uses a real database revision. Raw and projected
   caches cannot cross a database mutation or activation boundary.
4. Applying replicated state is an exact local transaction. Any Web Storage
   failure restores the byte-identical prior allowlisted snapshot.
5. Linux deployment treats code, Python environment, environment file, systemd
   units, proxy configuration, permissions, and current-release selection as
   one recoverable host transaction.
6. The static server exposes an explicit reviewed web asset surface rather than
   the repository root.
7. Database bootstrap and local market maintenance are independently composed
   capabilities. One unavailable service cannot mark another available service
   unavailable.
8. Production architecture evidence covers browser code, Node service entry
   points, Python services, the deployed V4 provider, proxy routes, database
   writers, and Linux deployment ownership.
9. Sole-writer evidence closes declared, observed, and allowed inventories in
   both directions. A declared writer with zero observed sites is a failure.
10. The production regression matrix executes the referenced Harnesses and
    cannot remain accepted while a referenced scenario is failing.

## R11.1 Recovery Workstreams

R11.1 is one architecture-integrity recovery delivery. Its workstreams are not
independent delivery IDs and cannot be partially accepted:

- `W1` — global transaction decision point, durable rollback, poisoned
  recovery state, and real finalize/rollback fault injection;
- `W2` — transaction-owned Raw Coverage leases and caller-cancellable
  projected history;
- `W3` — authoritative market-database revision and cache invalidation;
- `W4` — atomic replicated-state hydration and abort-listener cleanup;
- `W5` — versioned Linux runtime artifacts and complete failure rollback;
- `W6` — explicit static-public root plus Data Acquisition capability split;
- `W7` — cross-runtime production topology, writer closure, and source
  governance;
- `W8` — executable regression matrix, updated H-rule lifecycle, full
  automated sweep, and remaining human acceptance evidence.

Each step preserves the existing owner rules, adds focused negative evidence,
and updates its descriptor or service contract before it can close. A passing
legacy R8 baseline is supporting evidence only; it cannot override a failing
R11 semantic or deployed-runtime gate.

## Non-Goals

- no Backtesting or Journal product expansion;
- no multi-user role/permission product beyond the existing authenticated
  reviewer identity;
- no CSV normalization, database replacement, or automatic data repair;
- no visual redesign except removing unavailable-capability ambiguity;
- no copy of V4 frontend ownership into V7.

## Acceptance Evidence

Automated closure requires focused contract tests, production browser tests,
Python service tests, shell failure injection, a real matrix runner, and
`git diff --check`. Host deployment and any visible Data Acquisition changes
retain explicit human review. Known visual differences remain open and must be
represented as known failures rather than silently accepted fixtures.

## R11.1 Closure

All eight recovery workstreams are implemented. The complete 93-Harness sweep
has zero unexpected failure: 90 Harnesses pass directly and the remaining
three reproduce the exact pre-existing Session date-picker, mixed-Pane, and
Replay Workspace candle-body visual gates. H084/H085/H086/H089/H090 are
automatically accepted; H074/H076 retain historical acceptance with an R11.1
regression/recovery chain. H087/H088/H091 remain executable pending real-host
and visible human evidence. The durable closure record is
`sessions/session_20260806_r11_1_architecture_integrity_recovery.md`.

Repository recovery mode is inactive and normal delivery is restored. This
does not close phase-one overall acceptance, clean-host import, physical cross-
device state review, or any visual gate.
