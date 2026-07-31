# V7 Harness Standard

Status: binding verification contract (R0.1, 2026-07-19)

## Purpose

V6 proved that many passing tests can coexist with a broken product when tests
encode helper sequences instead of observable invariants. V7 therefore treats
the harness catalog as architecture, not test bookkeeping.

## Rule Lifecycle

Every critical rule has one machine-readable record with:

- stable rule id and owner boundary;
- V6 failure prevented;
- activation step;
- enforcement state;
- executable harness path when executable;
- positive evidence;
- at least one negative fixture when executable;
- required human review;
- acceptance evidence only after human approval.

Allowed enforcement states:

- `declared`: binding rule, implementation boundary does not exist yet;
- `scaffolded`: harness shape exists but cannot yet exercise production;
- `executable`: positive and negative automated evidence runs;
- `accepted`: executable evidence plus recorded human acceptance.
- `regressed`: production evidence has disproved an accepted invariant; its
  historical acceptance remains recorded but current conformance is blocked.

A rule cannot skip states or be marked accepted by an automated run. When its
activation step begins, `declared` is a blocking failure.

### Regression Lifecycle

An accepted rule enters `regressed` only with all of the following in the same
commit:

- its original `acceptanceEvidence` retained unchanged;
- a current `regressionEvidence` record that identifies production behavior;
- a known `recoveryStep` and an exact entry in the active recovery inventory;
- a binding recovery plan, immutable pre-remediation checkpoint, and feature-
  delivery freeze.

`regressed` is an executable but blocking state. Its harness and existing
positive/negative evidence remain mandatory; a passing old harness does not
clear the regression. While any rule is regressed, only numbered recovery work
may land and product/feature acceptance is prohibited.

A rule returns from `regressed` to `accepted` only when its recovery step adds
production-path positive evidence, a negative control reproducing the failure,
new recovery evidence, and the required human approval. Historical acceptance
and regression records are never erased or rewritten.

Recovery mode may be deactivated only by its declared closure step after the
inventory has no regressed rules and the closure gate records explicit human
acceptance. Closed recovery metadata must name the closure step and evidence,
set `allowedWork` to `normal-delivery`, and clear the feature-delivery freeze;
the lifecycle Harness rejects incomplete or internally contradictory closure.

## Negative-Control Rule

Every architecture/product harness must prove it detects a representative
violation. A positive-only test is not sufficient for a critical invariant.
Negative fixtures live outside production roots and declare their expected
failure codes. If a negative fixture stops failing, the harness fails.

## Minimal Core

Minimal core is the headless architecture assembly:

```text
contract registry
+ module lifecycle
+ composition root
+ Session identity
+ transaction identity/acceptance
+ in-memory/fake ports
```

It owns no UI, chart, network, database, market bars, timeframe, Session Hours,
or product feature. It proves explicit dependency injection, isolated multiple
instances, deterministic lifecycle cleanup, and optional-module removal.

As modules arrive, the removal matrix boots minimal core with each optional
module absent. Core modules remain independently constructible against fake
ports; optional modules never become required implicitly.

## Mandatory Harness Families

1. architecture/ownership and exact writer inventories;
2. module public-port graph, cycles, independent boot, removal, lifecycle;
3. Session/activation/transaction identity and stale-result isolation;
4. transaction terminal-state liveness, exactly-once completion, rollback;
5. deterministic concurrency permutations and fake-clock execution;
6. atomic workspace/pane snapshot revision consistency;
7. Bar Data ordering, identity, gap, precision, and no-future invariants;
8. Projection determinism, eligibility-before-aggregation, generic TF rules;
9. Viewport wall/scale independence from data mutations;
10. browser-visible completion and explicit UI state settlement;
11. cache-hit/miss and interaction-to-visible latency budgets;
12. persistence isolation, migrations, interruption, and hard-refresh recovery;
13. capability conformance without existing core-owner edits;
14. cross-product coverage manifest and mandatory disposition of new cases.

## Test Assertion Policy

Assert outcomes: accepted cursor, final visible bars, provenance, pane revisions,
viewport intent, UI state, latency, persistence, and cleanup. Do not assert
private helper names, incidental event order, retry count, animation-frame
count, or implementation timing.

Correctness cannot depend on mouse movement, resize, wheel, arbitrary timeout,
or repeated retry. Browser input may trigger an explicit command only.

## Source Responsibility And Size Budgets

File size is a review signal, not the architectural goal. Production files
must first satisfy one-long-lived-responsibility. Default effective-code budgets
are:

| Kind | Review at | Block above | Function block above |
| --- | ---: | ---: | ---: |
| composition root / entry | 150 | 250 | 60 |
| domain / contract / runtime | 250 | 400 | 80 |
| adapter / persistence | 300 | 450 | 80 |
| UI surface / controller | 300 | 450 | 80 |

Fixtures, generated sources, and test data use separate reviewed budgets.
Exceeding a blocking budget requires a machine-readable exception with owner,
reason, why splitting is worse, human approval, and a removal/review condition.

The harness also rejects artificial fragmentation: a tiny forwarding-only file
without an owned contract or adaptation responsibility cannot exist merely to
avoid a size gate.

## Contract And Invariant Documentation

Comment quantity is not a metric. Required documentation explains ownership,
contracts, side effects, lifecycle, error behavior, concurrency/cancellation,
and non-obvious invariants.

Every public export must document its purpose and public behavior. Public ports,
commands, queries, notifications, snapshots, transactions, provider adapters,
and module lifecycle entries require the applicable fields:

- owner;
- inputs/outputs;
- side effects;
- lifecycle;
- errors;
- concurrency/cancellation;
- protected invariants.

Critical Session identity, stale rejection, atomic commit, no-future,
projection alignment, and Viewport-wall code must explain why its rule exists.
Comments that only translate syntax are not accepted as contract evidence.

`TODO`, `FIXME`, `HACK`, and compatibility paths require a tracked decision id,
owner, and removal condition. Comments remain secondary to executable contracts
and harnesses; prose cannot override runtime truth.

Current human-readable source totals must be declared in the source-quality
policy with exact occurrence counts and reconciled against the canonical
machine baseline. Historical step-local totals remain valid history, but a
current summary that is missing, duplicated, or numerically different must fail
closed rather than coexist with a green production-source Harness.

## Commit And Human Gate

The rule catalog, manifest, harness, fixtures, and implementation change in the
same commit. Steps with interaction or visual changes stop after commit for
human review. Rejection is recorded before corrective work; automated evidence
cannot overwrite it.

During R8 architecture recovery, every step was exactly one commit and stopped
after commit for explicit review, including headless and documentation steps.
R8 commits are never amended or squashed. A rejected step remains evidence and
its replacement receives a new delivery id.

Headless contract/runtime/documentation steps require automated evidence and a
clear completion report, but do not stop for manual acceptance. From the first
browser-visible slice, human review exercises real interaction, visual quality,
visible settlement, and perceived latency; automated checks cannot substitute
for that browser review.
