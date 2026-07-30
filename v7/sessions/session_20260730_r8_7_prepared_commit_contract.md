# R8.7 Prepared Commit Contract

Date: 2026-07-30

## Scope

R8.7 starts from clean R8.6 commit `a4576e13`. It defines the public prepared
participant protocol required by R8.8–R8.9 and activates no production Chart,
Replay, Workspace State, publication, UI, or persistence behavior.

No HTML, CSS, label, visual, or interaction change is present. Automated
evidence is sufficient under the standing workflow; no manual UI review is
required.

## Implementation Result

- added independently bootable `core.prepared-commit-contract`;
- restricted participants to Chart, Replay, Workspace State, and publication;
- bound every preparation to complete Workspace transaction identity, an exact
  deeply immutable candidate, participant role, and base/target revisions;
- required prepare to observe the unchanged base revision;
- made apply reversible and represented it with a branded exact-provenance
  Prepared Commit receipt;
- required rollback to prove exact base-revision restoration and finalize to
  prove exact target-revision acceptance;
- rejected forged/cross-preparation receipts, stale identities, revision skips,
  duplicate/out-of-order phases, rollback after finalize, and finalize after
  rollback;
- prohibited disposal of applied work until rollback;
- left H076 executable rather than accepted because real Chart activation and
  global coordination belong to R8.8–R8.9.

## Architecture Result

The refreshed exact production baseline contains:

- 45 active production modules;
- 114 actual dependency edges;
- 112 construction sites;
- two production roots;
- 15 declared writer surfaces;
- nine observed critical writer sites;
- three unchanged blocking findings assigned to R8.9 and R8.11.

## Automated Evidence

- `node v7/tests/prepared-commit-contract-harness.js` — passed: four
  participants, successful apply/finalize, reverse partial rollback, and 32
  negative controls;
- `node v7/tests/production-architecture-harness.js` — passed: 45 modules,
  114 dependency edges, 112 construction sites, nine writer sites, three
  blocking findings, and nine negative controls;
- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/architecture-hardening-harness.js` — passed: 79 rules and 12
  negative controls;
- `node v7/tests/production-module-assembly-harness.js` — passed: 45 public
  entries, 13 lifecycle descriptors, and one optional-removal case;
- `node v7/tests/source-quality-harness.js` — passed;
- the complete 73-file top-level Harness loop passed;
- `git diff --check` passed.

## Rule Lifecycle

- H076 `prepared-participant-global-atomic-commit`: `declared` → `executable`;
- no regressed rule is repaired or cleared early in R8.7;
- 14 later rules remain regressed.

## Commit Gate

R8.7 is exactly one commit. Stop after committing and report the commit id,
automated evidence, three remaining findings, clean worktree, and R8.8 as the
next bounded step.
