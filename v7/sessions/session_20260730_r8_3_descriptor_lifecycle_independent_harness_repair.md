# R8.3 Descriptor, Lifecycle, And Independent-Harness Repair

Date: 2026-07-30

## Trigger And Scope

The user requested R8.3 and explicitly waived manual review when there is no
major UI or interaction change. This step starts from clean R8.2 commit
`f19b7f32` and is limited to the seven findings assigned to R8.3.

No production JavaScript, HTML, visible UI, or interaction behavior changes.
The production changes are descriptor corrections only.

## Result

All seven assigned findings are closed:

- Fixed Timeframe and Calendar Timeframe declare Bar Data Contract;
- Session Store declares Replay Navigation Settings;
- Bar Data Runtime and Provider Execution Runtime declare `dispose()`;
- Replay Workspace UI has a direct public-entry independent harness;
- Session Browser UI has a dedicated public-entry browser fixture and boots
  with its optional Replay Workspace UI dependency absent.

The refreshed production scan still observes 42 modules, 100 actual dependency
edges, 101 cross-module construction sites, two production roots, all 14
declared writer surfaces, and 10 critical writer sites. Blocking findings fall
from 13 to six, with no R8.3 finding remaining.

## Assembly And Removal Evidence

The production descriptor assembly imports all 42 real public entries and
starts the graph through the real ModuleHost. It proves exact reverse disposal
for all 10 lifecycle-bearing descriptors and derives the complete production
optional-removal matrix. The single current optional edge proves Session
Browser UI remains bootable when Replay Workspace UI is removed.

Actual application factory boot remains deliberately assigned to R8.11, along
with replacement of the two manual production composition roots.

## Rule State

H073 advances from `executable` to `accepted` under the user's automated-review
instruction. Acceptance means the production analyzer and R8.3 descriptor-
assembly evidence are binding; it does not mean the remaining findings conform.

All 15 R8.1 `regressed` rules remain regressed. In particular, H018 stays
assigned to R8.11; R8.3 does not clear it early.

## Automated Evidence

- `node v7/tests/production-architecture-harness.js` — passed: 42 modules,
  100 dependency edges, 101 construction sites, 10 writer sites, six blocking
  findings, and eight negative controls;
- `node v7/tests/production-module-assembly-harness.js` — passed: 42 public
  entries, 10 lifecycle modules, one optional-removal case;
- `node v7/tests/replay-workspace-ui-independent-harness.js` — passed: direct
  public boot, capability checks, and idempotent disposal;
- `node v7/tests/session-browser-ui-independent-browser-harness.js` — passed:
  dedicated fixture boot, optional absence, DOM cleanup, and disposal;
- `node v7/tests/module-host-harness.js` — passed: nine negative controls plus
  the production descriptor assembly;
- `node v7/tests/architecture-boundary-harness.js` — passed;
- `node v7/tests/architecture-hardening-harness.js` — passed: 79 rules and 12
  negative controls;
- `node v7/tests/source-quality-harness.js` — passed: seven negative controls;
- `for test_file in v7/tests/*-harness.js; do node "$test_file" || exit $?;
  done` — all 71 top-level Harnesses passed, including real V4 API and Chrome
  gates;
- `git diff --check` — passed.

An earlier full-suite attempt observed one transient existing browser timing
sample at 454.85ms against the 400ms timeframe-switch budget. The isolated
rerun passed at 229.38ms and the clean complete rerun passed at 312.96ms; no
runtime or budget source was changed.

## Commit Gate

R8.3 is exactly one commit. Stop after committing and report the commit id,
automated evidence, six remaining findings, clean worktree, and R8.4 as the
next bounded step.
