# Session — P1c.3 Core Moving Averages / SMA Single-Plugin Implementation

Date: 2026-08-18

Status: implementation and automated H120 complete; focused human review open;
H120 remains executable and unaccepted

## Authority And Scope

The product owner authorized implementation of the accepted P1c.3/H120
specification, limited to `first-party.moving-averages@1.0.0` and exactly one
`SMA(close)` Definition. The instruction explicitly forbids another plugin,
P1b.4, Community/Worker, business-layer work, or any H117 state change before
H120 automated and human acceptance.

The same instruction recorded future visual requirements for Segment, Ray,
Infinite Line, Circle, and Arc. They are preserved separately as
documentation-only requirements and are not implemented in this slice.

## Delivered Vertical Slice

- the Core manifest/catalog exposes one Moving Averages package and one exact
  trusted Profile/Definition/executor binding;
- the package owns only the frozen SMA(close) formula and schema: integer
  length 2–500/default 20, static 499-Bar bound, exact whitespace until the
  L-th eligible Bar, and one instrument-price line;
- a package-neutral runtime owns revisioned instance documents and commands;
  the trusted adapter closes inputs and resource limits; the existing Chart
  owner alone materializes Main or one dedicated internal Region;
- a reversible Session-keyed sidecar and the existing state-sync allowlist own
  exact bytes, CAS, rollback, unresolved disable/re-enable survival, and hard
  reload;
- host UI owns only Add, legend, Inputs/Style/Visibility, Reset/Cancel/Apply,
  hide/show, placement, and removal DOM through a removable Pane add-on seam;
- a no-instance Workspace follows only a context preparation and allocates no
  calculated Chart surface or digest work, preserving Replay latency.

During production-route testing, three defects were corrected within scope:
calculated runtime initialization is now gated at its Workspace ports; Reset
uses the inherited package/profile/default layer rather than the current
instance override; and the Indicators overlay no longer covers the native OHLC
readout.

## Automated Evidence

H120 passes formula lengths 2/20/500, warmup and gap truth, cancellation,
resource ceilings, forged/mismatched registration rejection, settings
precedence, instance isolation, stale/CAS collision, failure rollback,
placement, persistence/state sync, unresolved re-enable, and removal.

The real `/v7/app/` Chromium flow passes Add → Settings → Move → Hide/Show →
Reload → Remove, exact warmup/color pixels, keyboard/focus behavior, native
Chart interactions, four isolated Panes, narrow containment, and measured
one/four-Pane Add timings. H118, H119, plugin/profile/state-sync, Workspace
transaction, optional-removal/minimal-core, architecture, sole-writer,
source-quality, Replay latency, and the nine-scenario production regression
matrix pass. The matrix retains only its two exact pre-existing visual known
failures and gains no new failure. The complete H117 Developer Kit regression
also passes without refreshing its generated fingerprint or changing its rule.

## Governance State

`v7/docs/v7-harness-rules.json` records H120 as `executable`,
`humanReviewRequired: true`, and `acceptanceEvidence: null`. H117 remains
`executable`, human-review-required, and unaccepted; no H117 field or baseline
was changed by this implementation.

The next allowed action is focused product-owner review using
`docs/V7_CORE_SMA_P1C3_HUMAN_REVIEW.md`. No other plugin, algorithm, P1b.4,
Community/Worker, or business-layer implementation may start before explicit
H120 acceptance.
