# Session — R8.9 Globally Atomic Workspace Transaction

Date: 2026-07-30
Branch: `v7/rebuild`
Starting commit: `83a82364 feat(v7): make chart application reversible`

## Scope

Execute only R8.9 from the binding recovery plan: make Workspace Transaction
Runtime coordinate prepared Chart, Replay, Workspace State, and publication;
remove the post-terminal UI commit domain; prove failure and concurrency restore
one exact prior accepted revision; update governance; create exactly one commit
and stop.

## Implementation

- added prepared Replay and Workspace State owner handles using the R8.7
  participant contract;
- made Replay cursor, visible-through, Replay Step, playback completion, and
  revision reversible until finalize;
- added exact Workspace-owned Pane/Viewport replacement and restoration;
- added Workspace semantic/publication candidate contracts and a prepared
  publication participant owned by Workspace Transaction Runtime;
- changed the coordinator to prepare all four participants without mutation,
  await reversible Chart paint, apply the remaining owners in one synchronous
  turn, finalize exact receipts, and rollback in reverse on failure;
- routed Pane/Layout publication, Raw Coverage finalization, and checkpoint
  persistence through the coordinator-controlled publication port;
- removed UI-side Workspace State acceptance and data/publication commits after
  terminal return;
- removed the production Chart `present()` bridge and obsolete visible-
  completion acknowledgement implementation;
- retained successful UI/interaction behavior while making failure settlement
  atomic.

## External Capability Check

Using `agent-reach` via Jina Reader, the current official Lightweight Charts
Series API, Chart API, plugin introduction, and awesome-tradingview catalogue
were checked. They expose immediate mutations, readback, plugins, and
irreversible removal, but no cross-owner transaction. R8.9 therefore remains a
V7-owned coordinator protocol and reuses the R8.8 adapter snapshot strategy.

## Evidence

- `workspace-transaction-runtime-harness.js`: 18 negative/race controls;
- `workspace-global-atomic-commit-harness.js`: five real-owner participant
  failures with exact Chart/Replay/Workspace/publication/persistence restore;
- `prepared-commit-contract-harness.js`: four-role phase/receipt matrix;
- `pane-set-materialization-harness.js`: 23 negative/race controls plus three
  later-boundary Chart rollbacks;
- `replay-navigation-runtime-harness.js`: 25 negative/race controls;
- Replay Pane Workspace, Replay Layout Workspace, real Lightweight Chart, and
  checkpoint restore browser Harnesses pass with unchanged product behavior;
- Architecture Boundary, Architecture Hardening, Production Module Assembly,
  Production Architecture, Source Quality, and `git diff --check` pass;
- all 74 top-level Harnesses pass sequentially, including every real browser,
  restored-performance, architecture, source-quality, and global-atomic gate;
- `git diff --check` passes.

## Recovery Ledger

- H009, H010, H049, H050: `regressed -> accepted`;
- H076: `executable -> accepted`;
- nine recovery regressions remain;
- production baseline: 45 modules, 118 dependency edges, 118 construction
  sites, seven writer sites, two blocking findings, both assigned to R8.11.

No manual review was requested because R8.9 changes no successful UI or
interaction behavior. The next permitted step is R8.10.
