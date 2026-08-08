# Session — R13.2 Minimal Annotation Geometry Contract

Date: 2026-08-08

Status: implemented; headless automated gate

## Trigger And Decision

The user explicitly accepted R13.1/ADR-V7-001 and authorized a bounded R13.2.
The step activates only the smallest reusable Geometry domain required before
an Annotation document writer can be designed.

## Implementation

- Added branded, deeply immutable, exact `MarketAnchor` values in market
  time/price coordinates.
- Added branded Point, Segment, and direction-normalized Rectangle Geometry.
- Added versioned trusted-build Geometry definitions and one immutable,
  composition-local Registry with no concrete-type branching.
- Added bounded portable-payload validation that rejects vendor coordinates,
  Bar/Indicator/formula output, cycles, executable values, and class instances.
- Registered `optional.annotation-geometry-domain` with no ports or lifecycle
  and extended production optional-removal evidence to cover static modules.

## Evidence

H100 is exercised by `../tests/annotation-geometry-domain-harness.js` and 32
declarative negative controls. It additionally checks a harness-only fourth
Geometry type, input mutation isolation, source/import boundaries, descriptor
conformance, and ModuleHost boot both with and without the optional module.
Production assembly, architecture, source-quality, and repository consistency
Harnesses remain required closure evidence.

The focused Geometry, ModuleHost, production assembly, architecture boundary,
architecture hardening, production architecture, writer closure, source
quality, and standalone-runtime Harnesses pass. The eight-scenario production
regression matrix also passes while reproducing only its two already-declared
visual known failures; the isolated rerun after one transient local DevTools
JSON read passed without a code change.

## Continuation

R13.2 changes no browser behavior and has no manual visual gate. R13.3 remains
unauthorized until a separate Headless Annotation Runtime contract defines its
writer, revision, transaction, provenance, and removal boundaries.

Binding contract:
`../docs/V7_MINIMAL_ANNOTATION_GEOMETRY_CONTRACT_R13_2.md`.
