# Session — P1c.2 Calculated-Series Chart-Owned Projection Implementation

Date: 2026-08-13

Status: implementation complete; H119 executable; focused human acceptance
pending

Correction note: the first focused review on 2026-08-17 rejected the whitespace
evidence described below. The authorized correction and current re-review state
are recorded in
`session_20260817_p1c_2_h119_whitespace_rejection_and_correction.md`; this file
otherwise preserves the original implementation checkpoint.

## Authorization

The product owner authorized implementation of the accepted
`V7_CALCULATED_SERIES_CHART_OWNED_PROJECTION_SLICE_SPEC.md`, allocated P1c.2 and
H119, and explicitly excluded MA/SMA, live instance/persistence/UI,
Community/Worker, P1b.4, and every H117 field change.

## Delivered Boundary

- added removable `optional.calculated-series-chart-projection` with branded
  Chart binding and complete Pane-surface candidates, deterministic
  vendor-neutral plans, exact preparations/receipts, CAS and collision checks,
  and prepare/apply/rollback/finalize/dispose sequencing;
- added a Chart Snapshot Application-owned local child admission boundary for
  both workspace-stage and same-snapshot settlement; the projector is not a
  global Workspace transaction participant and cannot bind without that owner;
- added an adapter-private Lightweight Charts surface with stable logical maps
  for Main/internal regions, structural right/left/private overlay Scales,
  built-in Line/Histogram/Area/Baseline Series, host-owned band Primitive, and
  reference lines;
- delayed destructive cleanup until finalize, restored retained data/options/
  pane order/stretch/preservation/Scale state on rollback, and escalated
  unprovable apply/rollback/finalize recovery to Chart activation poison;
- kept native Chart/Pane/Series/Scale/Primitive/DOM/Canvas handles out of
  candidates, receipts, snapshots, package state, and public Profile values;
- kept the bounded native surface private inside the existing Lightweight
  Charts adapter and exposed only a fixed-path, owner-bindable lazy factory.
  No production route constructs the optional projector.

## H119 Evidence

`tests/calculated-series-chart-projection-harness.js` covers 21 declarative
negative controls, forged/stale/collision/unsupported input, inert preparation,
complete-candidate digest and exact receipt binding, all non-ready clearing,
same-snapshot settlement, same-points placement movement, retained logical
handles, closed painted readback, ordinary failure restoration, unprovable
apply/rollback/finalize poison, and idempotent disposal.

The real Chromium fixture uses one Lightweight Charts instance with candles,
Main calculated output, and one internal region. It proves all five standard
Plot kinds, a reference line, explicit whitespace, candle data/writer revision
invariance, native crosshair/drag/wheel behavior, responsive containment, and
produces the focused screenshot
`tests/fixtures/calculated-series-chart-projection/main-internal-1000x700.png`.

H119 is registered as `executable`, `humanReviewRequired: true`, and
`acceptanceEvidence: null`. The focused checklist is
`docs/V7_CALCULATED_SERIES_CHART_PROJECTION_P1C2_HUMAN_REVIEW.md`.

The refreshed production source baseline contains 534 files, 48,655 effective
lines, 5,109 functions, and 519 public exports with no source-size/function,
documentation, or accepted-exception finding. The architecture baseline
contains 71 modules, 162 dependency edges, 134 construction sites, 28 writer
sites, and zero violations.

## Preserved Exclusions

No formula engine, MA/SMA or other named Indicator, live instance/document
owner, persistence migration, product UI, SDK execution availability,
Community/Worker executor, P1b.4 work, or product Workstation wiring was added.
H117 remains executable, human-review-required, and unaccepted with
`acceptanceEvidence: null`.
