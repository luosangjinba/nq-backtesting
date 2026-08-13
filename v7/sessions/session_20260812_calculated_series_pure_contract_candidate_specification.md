# Session — Calculated-Series Pure Contract Candidate Specification

Date: 2026-08-12

Branch: `feature/v7-drawing-semantic-annotation`

Scope: draft the first ADR-V7-005 pure-contract candidate; documentation only

## Product-Owner Instruction

The product owner directed:

> 起草 V7 Calculated-Series Pure Contract Slice 候选规格；不实施，不启动P1b.4，不变更 H117 状态。

This authorizes a candidate specification and documentation synchronization
only. The candidate is not accepted and no repository implementation is
authorized.

## Inputs Reviewed

The draft reconciles:

- accepted ADR-V7-006 open Contribution Profile and typed-composition rules;
- accepted ADR-V7-005 generic calculated-series projection and Chart Region
  rules;
- P0a package/contribution/parameter contracts;
- P1a Developer Kit Contract Profile availability and diagnostics;
- P1b inactive local-package and H117 boundaries;
- existing immutable Workspace, projected-Pane snapshot, provenance, migration,
  and sole-Chart-writer patterns;
- pinned `lightweight-charts@5.2.0` and current official pane, Chart, Series,
  Price Scale, custom-Series, and Primitive documentation;
- the awesome-tradingview ecosystem inventory already accepted as
  reference/candidate evidence rather than an adopted lifecycle owner.

The external capability check confirms that native pane indices and handles are
transient adapter mechanics: moving the last Series may remove a native pane,
and native pane/Series/Scale/DOM APIs expose authority which cannot enter a
portable contract.

## Candidate Produced

`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md` proposes:

- focused `contribution-profile-contract` and `calculated-series-contract`
  owners;
- an exact `analysis.calculated-series@1.0.0` host descriptor whose contract
  recognition remains separate from execution availability;
- exact host-owned P0a Contribution binding without inferring a Profile from
  `kind`, name, package, Domain Tag, or Plot shape;
- closed Definition, Plot/PlotGroup, style, Scale, instance, ChartRegion,
  result, projection-frame, provenance, migration, diagnostic, and resource-
  ceiling values;
- strict immutable/canonical/no-future/stale-rejection behavior;
- inert unresolved survival and exact declarative forward migration;
- a future independent headless gate whose id is allocated only after separate
  implementation authorization;
- ten candidate material decisions for product-owner review.

## Preserved Boundaries

This drafting pass adds no:

- delivery id or Harness id;
- production module, public export, SDK value, JSON Schema, catalog, fixture,
  manifest field, receipt, dependency, or generated release;
- formula engine, runtime, Worker, calculation, instance owner, persistence,
  Chart projection, UI, MA/SMA, or other Indicator;
- Community activation, P2/P3 work, or external dependency.

P1b.4 remains paused. H117 must remain `executable`,
`humanReviewRequired: true`, and `acceptanceEvidence: null`.

## Documentation State

The pass updates the accepted upstream ADR cross-references plus INDEX, TODO,
Execution Roadmap, Restart Handoff, and this session record. It does not promote
the candidate into an accepted ADR or implementation step.

## Verification

The final documentation pass completed:

- `git diff --check` passed;
- the source-quality Harness passed across 497 production files, 461 public
  exports, and 22 negative controls;
- the production-architecture Harness passed across 68 modules, 150 dependency
  edges, 133 construction sites, 27 writer sites, and 15 negative controls,
  with zero blocking findings;
- H116 passed all 20 negative controls, including the unchanged rejection of
  unauthorized Community/Worker/sub-pane availability;
- H117 passed all 54 negative groups plus its browser, IndexedDB/storage, and
  product-surface evidence;
- `v7-harness-rules.json` remains unchanged, with H117 still `executable`,
  `humanReviewRequired: true`, and `acceptanceEvidence: null`;
- the changed-file audit contains only documentation, `v7/TODO.md`, and this
  session record; no production, SDK, schema, catalog, fixture, manifest,
  dependency, generated release, or Harness-rule file changed.

## Exact Next Step

The next action is product-owner review of the ten candidate material
decisions. Acceptance or amendments require an explicit instruction. Even
acceptance would authorize no code; implementation needs another explicit
instruction and only then may receive a delivery id and Harness id.
