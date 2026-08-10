# Session — R13.9b Semantic Contract Hardening

Date: 2026-08-09

Status: accepted; H108 and standing automated gates complete

## Scope

Implemented only the three remediation preconditions recorded by the R13.9a
stage review. This step adds no FVG, detector, Evidence Resolver, dynamic package
loader, production toolbar, Chart behavior, or R13.10 work. There is no intended
visual change and no human visual gate.

## Contract Repair

- Semantic Artifact schema 2 stores exact host-stamped package and definition
  construction identity separately from type identity;
- the universal no-future provenance header now contains one deeply immutable
  portable `packageProvenance` record, so a new package can carry profile,
  detector, creator, and per-attribute evidence without editing core;
- Registry resolution requires exact package, type, definition, and version
  identity, so replacement code cannot silently claim older evidence;
- Persistence migrates schema-1 Artifacts to truthful `legacy-unrecorded`
  identity, retains unknown definition fields in its opaque sidecar, and keeps
  package provenance canonical for a compatible package;
- synchronous policy-failure cleanup is tracked and awaited before re-enable;
  cleanup failure prevents replacement activation;
- construction/identity, cleanup, and document migration were split into
  focused internal modules instead of extending the reviewed Registry and wire
  hotspots.

## Evidence

H108 passes three negative controls and a second independent synthetic package
path. It proves nested definition/profile, detector, creator, and per-attribute
provenance through Runtime acceptance, durable reload, export/import, package
absence, disable/re-enable, and unknown-field round trips. Package or definition
version replacement remains unresolved. A delayed disposer proves the exact
order `activate-1 → dispose-start-1 → dispose-end-1 → activate-2`; a failed
disposer rejects activation.

The complete R13.2–R13.9 Annotation chain passes: Geometry, Runtime, accepted
Chart projection, interaction, Rectangle/Inspector, persistence, context
projection, and H107. Production architecture remains 61 modules, 132
dependency edges, 115 construction sites, 23 writer sites, and zero blocking
findings. Module assembly remains 61 public entries, 25 lifecycle modules, and
24 optional-removal cases. Writer closure remains 18 surfaces and 23 observed
writer files. Architecture hardening now covers 110 rules. Current source quality
is 411 files, 32,863 effective lines, 3,451 functions, and 388 public exports,
with no accepted exception.

## Closure

All R13.9a blockers are repaired and H108 is accepted. Existing H107 behavior
remains accepted. R13.10 is technically unblocked by this remediation but is
still unauthorized and must receive a separate bounded specification and user
approval.
