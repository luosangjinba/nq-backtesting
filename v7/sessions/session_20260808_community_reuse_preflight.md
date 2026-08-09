# Session — Community Reuse Preflight For R13.6

Date: 2026-08-08

Status: accepted architecture preflight; R13.6 remains unauthorized

Decision: ADR-V7-002

## Authorization And Scope

After R13.5 acceptance, the user asked whether mature public Lightweight Charts
drawing and indicator implementations already exist and approved the proposed
next step. The repository rule requires checking official documentation and
the public ecosystem before implementing a Chart/workstation feature.

This step therefore evaluates reuse only. It changes no production source,
route, fixture pixel, package dependency, or accepted R13 owner. It does not
implement Rectangle, selection, edit Preview, Property Inspector, persistence,
semantic packages, or indicators.

## Findings

- official Lightweight Charts plugin examples are the approved source for
  current Series Primitive lifecycle, renderer/view, coordinate conversion,
  update, and teardown patterns;
- `lightweight-charts-drawing` installs beside 5.2.0 but its manager directly
  owns drawing state, selection, DOM interaction, Chart subscriptions,
  serialization, and primitive lifecycle; its repository license evidence is
  also inconsistent, so production adoption is blocked;
- `lightweight-charts-indicators` passed an isolated import and SMA(3) formula
  probe and remains only a future per-definition calculation-adapter candidate;
- `lightweight-charts-line-tools-core` is source-only, has no operative test
  suite, and owns interaction/Chart/import-export concerns, so it is reference-
  only;
- CandleKit is useful architecture/test comparison evidence, but its published
  peer versions conflict with the current indicator release and its controllers
  own Chart, drawing interaction, Replay, and persistence concerns;
- KLineChart is a mature alternate-engine benchmark, not a drop-in Lightweight
  Charts plugin; engine migration is outside R13.

Every candidate and exact revision is frozen in
`docs/v7-community-reuse-audit.json`. Network-fetched source/package probes ran
only in temporary directories and did not enter the repository.

## Binding Result

R13.6 must remain V7-owned behind the Geometry, Annotation Runtime,
Annotation Interaction, and Chart Projection ports already accepted in
R13.2–R13.5. It may adapt official vendor patterns but may not add the reviewed
community drawing/toolkit owner runtimes. Indicator reuse needs its own later
decision, formula provenance, deterministic fixtures, and Replay/no-future
evidence.

No human visual gate is required because this step changes no visible surface.

## Automated Evidence

The focused audit Harness validates candidate pinning, license disposition,
Lightweight Charts 5.2 compatibility evidence, owner conflicts, the zero-
dependency decision, package/lockfile pins, and negative controls. Existing
Geometry, Annotation Runtime, Chart projection, interaction, architecture,
writer, source-quality, standalone, and regression Harnesses must remain green
before the decision commit is formed.

Closure evidence:

- community reuse audit: six pinned candidates, thirteen negative controls,
  zero production dependency additions;
- R13.2 Geometry, R13.3 Annotation Runtime, R13.4 Chart projection, and R13.5
  interaction Harnesses: passed with 32, 39, 30, and 28 negative controls;
- architecture boundary and 104-rule architecture hardening: passed;
- deployed runtime, 55-module production architecture, 55-entry production
  module assembly, and 16-surface writer closure: passed;
- production source quality: 363 production files, 352 public exports, and 22
  negative controls passed;
- standalone runtime: 441 files across three roots and seven negative controls
  passed;
- production regression matrix: all eight scenarios resolved as passed or
  exact registered known-failure reproductions; eleven axes and eight negative
  controls passed;
- `git diff --check`: passed.

No human visual gate was opened because the audited decision adds no visible
surface and every fetched probe remained outside production and test fixtures.
