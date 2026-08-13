# Session — P1c.1 Calculated-Series Pure Contract Implementation

Date: 2026-08-13

Status: accepted; H118 accepted after focused human contract/evidence review

## Authorization

The product owner authorized implementation of the accepted
`V7_CALCULATED_SERIES_PURE_CONTRACT_SLICE_SPEC.md` and explicitly withheld
Chart-owned projection, MA/SMA, Community/Worker work, P1b.4, and any H117 state
change. This delivery allocates `P1c.1` and `H118` only.

## Implemented Boundary

- `core.contribution-profile-contract` owns branded Profile references and
  descriptors plus one immutable host-pinned registry. Its first and only
  registered descriptor is `analysis.calculated-series@1.0.0`; package-supplied,
  unknown, duplicate, incompatible, deprecated-without-policy, and retired
  resolution fails closed.
- `core.calculated-series-contract` owns exact Contribution binding,
  Definition, standard Plot/Plot Group, Scale intent/compatibility, host-owned
  Workspace document, exact frame identity, result/projection-frame,
  diagnostics, resources, and forward declarative migration simulation.
- JSON schemas and host catalogs are production contract artifacts under those
  two module boundaries. They are deliberately absent from the executable SDK
  availability catalogs.
- Synthetic fixtures prove line, histogram, area, baseline, band,
  reference-line, multi-Plot, multi-PlotGroup, Main/internal-region placement,
  unresolved survival, result states, pending frames, stale rejection, and
  original-preserving migration without naming or implementing a product
  Indicator.

## Ownership And Exclusions

Both modules are immutable and side-effect free. They import no Chart adapter,
Bar Data runtime, Replay runtime, Workspace state runtime, ModuleHost,
persistence owner, UI, package executor, Worker, filesystem, network, timer,
DOM, or Canvas authority. No calculation formula, live instance owner,
projection, native Series/Scale/region mutation, SDK execution capability,
MA/SMA, Community adapter, or MCP work was added.

P0a/P0b/P1a/P1b schemas and catalogs are pinned by hash in H118. Installed
packages remain inactive. The complete H117 rule record retains its previous
semantic hash, `state: executable`, `humanReviewRequired: true`, and
`acceptanceEvidence: null`.

Because the Developer Kit conformance identity includes the global Harness
registry and its own audit files, advancing `currentStep` to P1c.1 made the
content-addressed P1b browser release identity stale. The existing deterministic
refresh command regenerated that identity and the local lifecycle example's
toolchain digest. The conformance guard now accepts any monotonic current step
at or after P1b.3 while continuing to lock every H116/H117 field. No SDK schema,
catalog, operation, Profile, availability, receipt meaning, or Installed
behavior changed.

## Evidence

H118 runs through `tests/calculated-series-pure-contract-harness.js`. It covers
seven canonical contract round trips, five Plot kinds, a six-by-six Scale
compatibility matrix, all seven declarative migration operations, complete
eligible-timeline/whitespace closure, exact frame currency, 54 declarative
negative controls, structural/byte ceiling evidence, executable-value rejection,
forbidden-owner scans, and legacy contract/H117 hashes.

The refreshed production source baseline contains 516 files, 46,189 effective
lines, 4,794 functions, and 507 public exports with no source-size/function or
documentation exception. The architecture baseline contains 70 modules, 155
dependency edges, 133 construction sites, 27 writer sites, and zero findings.

The complete 119-Harness serial sweep was executed. Its first pass produced
105 successes. Two P1c.1 inventory assertions (`architecture-boundary` owner
registration and `production-module-assembly` module count) were corrected and
then passed; an isolated rerun also showed the database-import browser failure
was transient. H116 and H117 each pass serially in their complete form.

Ten real-app/browser Harnesses remain environmentally blocked because the
current process on `127.0.0.1:8766` is a legacy Python BaseHTTP service which
returns HTTP 404 `Unknown endpoint` for `/v7/market-data/health`, rather than a
V7 service backed by an acceptance DuckDB. The remaining nonzero result is the
pre-existing `date-time-picker-open` visual baseline finding in
`session-browser-browser-harness`; P1c.1 changes no UI pixels. No failing result
touches either new pure module. At implementation time these external/known
follow-ups did not themselves supply acceptance evidence; explicit human
approval remained required.

## Human Acceptance — 2026-08-13

After the focused contract/evidence checklist and a passing H118 rerun, the
product owner stated:

> H118 人工验收通过；授权记录 H118 acceptanceEvidence，并将 H118 从 executable
> 更新为 accepted，仅关闭 P1c.1；不启动 Chart-owned projection、MA/SMA、
> Community/Worker、P1b.4，不变更 H117。

This session is therefore H118's durable `acceptanceEvidence`. H118 advances
from `executable` to `accepted`, and P1c.1 is closed. The review accepts only
the pure Profile-registry/calculated-series contracts and their headless
evidence; it is not visual or Chart projection acceptance.

H117 remains `executable`, `humanReviewRequired: true`, and
`acceptanceEvidence: null`. Chart-owned projection, a calculation executor,
live instance/persistence ownership, SDK execution availability, MA/SMA,
Community/Worker execution, and P1b.4 remain unauthorized.

## Closure Verification

After recording the acceptance, H118 passes all seven contract round trips and
54 negative controls while continuing to prove the complete H117 rule record
unchanged. Architecture hardening, architecture boundary, production
architecture, production module assembly, source quality, and H116 also pass.
The complete H117 Harness passes with its 54 negative groups and existing
visible-review requirement unchanged.

Changing the Harness registry legitimately changed the content-addressed
Developer Kit identity. Its deterministic refresh updated only the generated
browser release identity and local lifecycle example's toolchain digest; it did
not alter SDK availability or package behavior. `git diff --check` passes.
