# R8.1 Architecture Recovery Constitution

Date: 2026-07-30

## Trigger

Human review reported `BUG-V7-0003`: after dense multi-Pane navigation worked
in ETH, switching to RTH and locating a market instant could preserve the
target Pane while resetting/collapsing the non-target Pane to the Session
start. R7.3n and R7.3o therefore remain unaccepted.

A production architecture review then found broader false-green conditions:

- a Chart presentation can become visible before later Workspace/Replay/
  publication commit work succeeds (`BUG-V7-0001`);
- Replay Workspace UI retains raw source batches outside Bar Data Runtime
  (`BUG-V7-0002`);
- production construction bypasses the declared ModuleHost graph and allows
  descriptor/lifecycle drift (`BUG-V7-0004`);
- several architecture/source harnesses prove fixture models or inventories
  rather than the production graph and real writer behavior (`BUG-V7-0005`).

Dynamic failure injection reproduced a terminal failed transaction with the
new Chart snapshot visible while Workspace acceptance and Replay remained on
the old revision. Existing focused harnesses still passed, proving that a green
test suite did not establish current production conformance.

## Preservation Point

Before remediation, all then-current files were committed exactly as
`fa561599` (`chore(v7): checkpoint pre-remediation worktree`). It is an
immutable diagnostic checkpoint, not acceptance of R7.3n/R7.3o or the audited
architecture.

## Decision

- activate the binding R8 recovery plan;
- freeze new product work and R7.3n/R7.3o acceptance;
- retain historical acceptance evidence while marking disproven rules
  `regressed`;
- require exactly one commit per R8 step and stop after every commit for review;
- repair harness truthfulness before relying on it to certify runtime repair.

## R8.1 Scope

R8.1 changes governance, documentation, rule metadata, and enforcement only.
It intentionally changes no `v7/src`, `v7/app`, or V4 runtime file. Its
executable negative controls prove that a regressed rule cannot exist with
inactive recovery mode, missing regression evidence, or a catalog/recovery-set
mismatch.

## Acceptance

Automated evidence makes H072 executable but cannot human-accept R8.1. This
commit must be reviewed before R8.2 begins.

## Automated Evidence

- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/architecture-hardening-harness.js` — passed with 79 rules and
  12 negative controls, including all three R8.1 regression-lifecycle failures;
- `node v7/tests/source-quality-harness.js` — passed with seven negative
  controls; H022 remains `regressed` because this legacy gate does not yet
  inspect the audited production violations;
- `node v7/tests/module-host-harness.js` — passed with nine negative controls;
  H018 remains `regressed` because this legacy gate does not boot production;
- `git diff --check` — passed;
- changed paths are limited to `v7/docs`, `v7/sessions`, `v7/tests`, and
  `v7/TODO.md`; no production runtime or browser source changed.
