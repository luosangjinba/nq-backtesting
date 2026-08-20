# Session — P1c.2 H119 Whitespace Rejection And Correction

Date: 2026-08-17

Status: correction implemented and focused human re-review accepted; H119
accepted; P1c.2 closed

## Review Conclusion And Authorization

The product owner rejected H119 item 3 after inspecting the focused fixture:
the line, area, and baseline continued through their middle whitespace point.
This was the first focused H119 acceptance conclusion. The gate had been made
`executable` on 2026-08-13, but it had never been accepted and its
`acceptanceEvidence` remained `null`.

The product owner then authorized correction of whitespace segmentation and an
automated visual assertion. That authority remains bounded to P1c.2 synthetic
Chart projection evidence. It does not authorize a named Indicator, MA/SMA,
live calculated-series instances, persistence/UI, Community/Worker execution,
P1b.4, product-route wiring, or any H117 field change.

## Root Cause And Existing-Capability Check

The semantic projection correctly carried an explicit whitespace point, but
the adapter passed one complete value/whitespace/value data set to each built-in
Line, Area, and Baseline Series. In pinned Lightweight Charts 5.2.0,
`WhitespaceData` identifies a time without a value; the connecting renderers
operate on the remaining value rows and paint between them. The original H119
screenshot therefore contradicted its own third acceptance criterion.

The correction re-checked official Lightweight Charts WhitespaceData and
Series documentation, the pinned renderer implementation, and the current
awesome-tradingview inventory. No existing option, plugin, or ecosystem library
found in that check both forced a path break and preserved V7's sole native
writer, one-chart internal-region model, package-neutral input, and reversible
resource lifecycle. No dependency was added.

## Corrected Boundary

- one logical line, area, or baseline Plot is split into ordered contiguous
  value runs inside `adapter.lightweight-chart`;
- each run uses an ordinary built-in Series; whitespace is represented by the
  absence of a segment between runs, so native rendering cannot bridge it;
- only the final segment carries the logical title, preserving one visible
  label per logical Plot;
- the public candidate, receipt, snapshot, diagnostic, and package-facing
  values still contain one logical Plot and no native handle;
- stable logical records retain their private handle set only when kind,
  region, Scale Group, and segment count remain compatible; topology changes
  use the existing reversible candidate replacement path;
- every private Series counts toward the established native Series/band limit,
  and a 65-segment fixture fails before native mutation;
- ordering, capture, hiding, rollback, finalize, and disposal flatten all
  private handles while retaining the existing sole-writer boundary.

Histogram whitespace and the host-owned band Primitive keep their existing
materialization because neither exhibited the rejected connecting-path defect.

## Automated Visual Evidence

The real-Chromium H119 fixture now reports:

- four logical scalar Plots backed by seven adapter-private native Series;
- three value-to-value whitespace gaps across line, area, and baseline;
- two interpolated pixel probes per gap, six checked probes total;
- zero matching stroke pixels at those bridge locations.

The visual detector also runs against an isolated raw pinned-Lightweight-Charts
Line Series with the original value/whitespace/value shape. That negative
sensitivity control must report one gap, two checked probes, and a positive
bridge-pixel count. Thus a disabled, misplaced, or color-blind assertion cannot
make the corrected fixture pass. The first instrumented run against the faulty
fixture failed with 80 detected bridge-colored pixels; the corrected fixture
passes with zero.

The focused screenshot was regenerated at
`tests/fixtures/calculated-series-chart-projection/main-internal-1000x700.png`.
It shows visible separation at the middle whitespace point and one title per
logical Plot.

## Verification And State

The focused H119 command passes with 22 declarative negative controls, including
the new native-segment ceiling case. H118, Chart Snapshot Application,
Lightweight Charts browser, production architecture, production module
assembly, production writer closure, architecture boundary/hardening, deployed
runtime architecture, and source-quality Harnesses also pass. Current machine
evidence is 642 files, 60,097 effective lines, 6,155 functions, and 650 public exports, 71 modules, 162 dependency edges, 134 construction sites, 28
writer sites, and zero architecture findings.

The production regression matrix itself could not start in this environment:
the configured V7 market-data health endpoint returned HTTP 404 and no readable
acceptance DuckDB was available through `V7_MARKET_DATA_DB` or the documented
default path. Its static matrix contract is still covered by the passing
deployed/architecture gates; the external-data run remains an environment
prerequisite rather than a corrected-code failure.

## Human Review Result

On 2026-08-17 the product owner stated:

> H119 验收通过，下一步计划做什么？

H119 is now `accepted`, remains `humanReviewRequired: true`, and records this
correction session as `acceptanceEvidence`. This closes only P1c.2. H117 remains
executable and unaccepted, and P1b.4 remains paused. No trusted Core MA/SMA,
instance/persistence/UI, generic layout, or Community/Worker work starts from
this acceptance alone.
