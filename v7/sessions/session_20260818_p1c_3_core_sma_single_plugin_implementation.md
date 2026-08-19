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

## Post-Deployment Server Validation Corrections

The first server deployment exposed three connected production failures while
H120 was still awaiting human acceptance:

- adding SMA caused server sync to return HTTP 400; after reload the Sessions
  route showed no records and New Session failed with a null `createSession`
  owner;
- changing one Pane from 1m to 5m rolled the Workspace transaction back with
  the generic Chart update error;
- later Pane-layout return attempts could encounter the same failed replacement
  path.

The sync failure had two exact causes. The browser snapshot contract already
replicated `v7.calculated-series:document:*`, but the Python state-service
allowlist omitted that prefix. In addition, an automatic startup upload
rejection escaped synchronization instead of degrading to offline mode, so the
application composed a null Session Store. The correction adds only the exact
non-empty calculated-series document prefix to the server allowlist and makes
automatic upload failures retain a usable local Session Store with explicit
offline status. Existing local Session bytes are never cleared by this path.

The timeframe failure came from a valid projected higher-timeframe Pane that
contained one trailing in-progress candle. Its display timestamp was later than
the exact Replay cutoff, so forwarding the complete candle list as the eligible
SMA timeline violated the no-future contract. The correction keeps the full
accepted Pane snapshot in its binding digest while admitting only the strictly
no-future prefix to calculation. A malformed non-trailing future timeline still
fails closed.

Permanent regressions now prove rejected first/startup uploads remain locally
usable, an existing Session remains listed, a New Session can still be created,
the real Python service accepts and restores the exact sidecar across restart,
and a second isolated Chromium profile hydrates the same Session/checkpoint and
sidecar. H120's production browser gate additionally drives an unaligned Replay
cutoff, two Panes, SMA 1m→5m, two-column→two-row→single layout return, and 5m→1m
without stale/future output or a generic Chart error.

These production corrections advanced the canonical source-quality evidence by
20 effective lines and three function records, with file/export totals
unchanged. That legitimate conformance change made the generated Developer Kit
browser/example identity stale. The existing canonical generators refreshed
only those two derived release outputs plus the consequent production source
hash to toolchain digest
`sha256:c20be4ed9753b0edd6597fa54b133f947326cadf911fc7e698a9b520c818f81c`.
H116 and all 54 H117 negative groups pass afterward; no H117 rule/state,
compiler, SDK, Schema, catalog, operation, simulator, or plugin behavior changed.

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
