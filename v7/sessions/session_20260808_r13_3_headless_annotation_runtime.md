# Session — R13.3 Headless Annotation Runtime

Date: 2026-08-08

Status: implemented; headless automated gate

## Trigger And Boundary

The user authorized R13.3 and reiterated that modularity, decoupling, and
plugin-first business modules are hard architecture principles. R13.3 therefore
adds only the generic Annotation document owner and deliberately implements no
semantic business type or browser integration.

## Implementation

- Added `optional.annotation-runtime` as one removable Session-scoped sole
  writer with no application singleton.
- Added caller-allocated branded Drawing ids and mandatory manual/import origin,
  creation time, and Replay-cutoff provenance.
- Added immutable generic Drawing create, exact Geometry replacement, archive,
  restore, complete-document, entity-list, one-entity, and health contracts.
- Added exact document/entity revisions, one active mutation, and deterministic
  stale/concurrent rejection.
- Added a narrow reversible Repository preparation port and Harness-only fake
  with prepare/apply/finalize/rollback fault injection.
- Added local capability poisoning only when rollback cannot be proven; the last
  accepted document remains queryable.
- Consumed Geometry only through its optional public read contract and retained
  honest query-only startup when Geometry is absent.

## Plugin And Ownership Evidence

The Runtime has zero semantic packages and contains no FVG, liquidity, equality,
OB, Breaker, detector, projector, or business-type branch. Future first-party
business types must enter through the same removable semantic package contract
as trusted external packages. They may submit validated commands and read
immutable queries but cannot access mutable document or Repository state.

The independent Harness exercises Session A/B isolation, exact revision
progression, deep immutability, Repository fault permutations, rollback poison,
concurrent rejection, disposal waiting, missing Geometry, ModuleHost composition,
and 39 declarative negative controls. Production inventory proves 53 public
modules, 19 lifecycle modules, and seven optional-removal cases.

The focused Geometry/Runtime, ModuleHost, production assembly, architecture
boundary/hardening, production architecture, writer closure, source-quality,
standalone-runtime, and `git diff --check` gates pass. The eight-scenario
production regression matrix also passes while reproducing only its two
already-declared visual known failures.

## Visual Gate And Continuation

R13.3 changes no HTML, CSS, Canvas, Lightweight Charts adapter, or browser
composition. There is therefore no manual visual acceptance window for this
step. R13.4 remains unauthorized until its dedicated accepted Annotation Chart
Projection Port specification is written and approved; any later visible step
must stop for explicit human acceptance.

Binding contract:
`../docs/V7_HEADLESS_ANNOTATION_RUNTIME_R13_3.md`.
