# V7 R1.4 Isolated Module Host And Lifecycle — 2026-07-19

## Trigger

R1.3 passed human review. The user clarified that future human review should
primarily assess interaction and visual quality when browser behavior exists.
Headless steps still stop at a human gate with focused architecture evidence.

## Targeted V6 Audit

V6 had a small runtime registry with reverse stop, but application composition
hard-coded large runtime lists, imported global command/event buses, and then
mounted many DOM bridges outside that registry. Dependencies were not declared
or injected from module descriptors, so optional features became implicit core
structure and removal could leave hidden ownership paths.

R1.4 copies no V6 production implementation. It replaces only the composition
invariant: descriptors declare dependencies, one isolated host injects public
ports, and lifecycle is visible and reversible.

## Decision And Boundary

`core.module-host` owns descriptor validation, deterministic dependency-first
planning, isolated instance creation, explicit required/optional port injection,
reverse stop/dispose, and partial-start rollback.

Static pure modules carry no lifecycle. A dynamic factory must declare and
implement disposal; starting requires stopping and disposal. A module cannot
hide a lifecycle method absent from its descriptor. Modules never receive the
host and therefore cannot use it as a service locator. Factories construct
isolated state only; external resources may be acquired in `start`, never in
`instantiate`, so every acquisition has a declared rollback path. Public ports
must be objects or functions rather than sentinel primitives.

Capability descriptor contracts are moved to R1.5. This step adds no application
singleton, feature runtime, persistence, network, Replay, bars, chart, DOM, or
UI.

## Automated Gate

Passed before commit. The focused harness covers:

- booting the real R1.1–R1.3 pure minimal core;
- optional-module absence without a core edit;
- two hosts with different instance APIs and resources;
- dependency-first start and reverse stop/dispose;
- idempotent stop;
- partial-start failure rollback and zero live resources;
- nine intentional invalid descriptor/graph/lifecycle controls, including
  surfaced rollback-cleanup failure after all cleanup paths are attempted.

The Session, activation-generation, TransactionId, workspace-transaction,
architecture-boundary, architecture-hardening, source-quality,
foundation-interaction, and cache/latency harnesses also pass. The production
source scan finds no browser global, storage, timer, global registry, active
module, or V6 runtime token. `git diff --check` passes.

## Human Review

Confirm the host has no global registry or active-module state, modules receive
only declared public ports, optional absence is normal, and cleanup is reverse
and complete on both success and failure. This headless step has no visual or
interaction surface to inspect. Automated evidence cannot accept the step.
