# R8.6 Sole Semantic Workspace State Owner

Date: 2026-07-30

## Scope

R8.6 starts from clean R8.5 commit `23d2b17a`. It introduces one production
runtime owner for accepted Pane Workspace, Session Hours, semantic Viewport,
and persistence-facing checkpoint state, closes only the R8.6 writer finding,
and recovers H007 while accepting H075.

No HTML, CSS, label, visible chart behavior, or interaction contract changes.
Per the standing workflow, automated evidence is sufficient and no manual UI
review is required.

## Implementation Result

- added independently bootable `core.workspace-state-runtime` with explicit
  descriptor dependencies and disposal lifecycle;
- branded every accepted semantic snapshot with Session, activation,
  transaction, and monotonic runtime revision identity;
- required exact current transaction identity before Pane/Session Hours state
  can publish;
- moved accepted Pane construction, stable priority reduction, focus, and all
  mutable Viewport controllers out of Replay Workspace UI;
- moved Session Hours proposal/revision ownership out of
  `workspace-execution.js`;
- made persistence consume the checkpoint already created inside the accepted
  semantic snapshot instead of combining UI-owned getters;
- deleted `pane-workspace-state.js` and replaced its test with the independent
  Workspace State Runtime harness;
- preserved the R8.9 post-terminal publication finding without clearing any
  later recovery rule.

## Architecture Result

The refreshed exact production baseline contains:

- 44 active production modules;
- 113 actual dependency edges;
- 112 construction sites;
- two production roots;
- 15 declared writer surfaces;
- nine observed critical writer sites;
- one Pane Workspace writer, owned by `core.workspace-state-runtime`;
- three remaining blocking findings assigned to R8.9 and R8.11.

## Automated Evidence

- `node v7/tests/workspace-state-runtime-harness.js` — passed: sole snapshot
  owner, stable Pane priority, Session Hours, Viewport/checkpoint publication,
  restore rebranding, disposal, and ten negative controls;
- `node v7/tests/pane-time-location-controller-harness.js` — passed against the
  real semantic state public port;
- `node v7/tests/production-architecture-harness.js` — passed: 44 modules, 113
  edges, 112 construction sites, nine writer sites, three findings, and nine
  analyzer negative controls;
- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/architecture-hardening-harness.js` — passed: 79 rules and 12
  negative controls;
- `node v7/tests/production-module-assembly-harness.js` — passed: 44 public
  entries, 12 lifecycle descriptors, complete optional-removal matrix;
- `node v7/tests/source-quality-harness.js` — passed: seven negative controls;
- the complete top-level harness loop — all 72 harnesses passed, including real
  V4 API and Chrome workspace/layout/restore/performance gates;
- `git diff --check` — passed.

## Rule Lifecycle

- H007 `complete-session-activation-transaction-identity`: `regressed` →
  `accepted`, preserving the original R1.3 acceptance evidence and adding this
  recovery evidence;
- H075 `sole-semantic-workspace-state-owner`: `declared` → `accepted`;
- 14 later rules remain regressed; none is cleared early.

## Commit Gate

R8.6 is exactly one commit. Stop after committing and report the commit id,
automated evidence, three remaining findings, clean worktree, and R8.7 as the
next bounded step.
