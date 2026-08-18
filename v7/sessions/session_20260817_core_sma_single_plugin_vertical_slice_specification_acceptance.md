# Session — Core SMA Single-Plugin Vertical Slice Specification Acceptance

Date: 2026-08-17

Branch: `feature/v7-drawing-semantic-annotation`

Scope: accept all ten material decisions without amendment; documentation only

## Product-Owner Decision

After reviewing the focused ten-item checklist, the product owner stated:

> 1–10 全部接受。

This accepts the ten material decisions in
`../docs/V7_CORE_SMA_SINGLE_PLUGIN_VERTICAL_SLICE_SPEC.md` without amendment.
Accepted decision 10 explicitly withholds implementation authority.

## Accepted Outcome

The accepted specification binds:

- one trusted-build Core `first-party.moving-averages@1.0.0` package containing
  exactly one `moving-averages.sma.close@1.0.0` Definition before any other
  plugin or Moving Average algorithm;
- exact host-owned P0a Contribution to P1c.1 Profile/Definition binding without
  Community, local-package, SDK, Worker, or inferred execution authority;
- deterministic `SMA(close, length)` semantics with integer length `2..500`,
  default `20`, a 499-Bar safe warmup boundary, leading whitespace, the first
  value on the length-th accepted Bar, full-only calculation, and one price
  line;
- package-neutral instance/document ownership, trusted execution, sole Chart-
  owner projection, reversible persistence, and host-rendered UI boundaries;
- Add, multiple instances, scoped Inputs/Style/Visibility, Apply/Cancel/Reset,
  legend, hide/show, and remove, with recalculation only for length changes;
- current-Pane-only Bar input, Replay no-future truth, honest pending state,
  exact identity admission, and stale-result rejection;
- Main to one new dedicated internal region and back, with generic sharing,
  reorder, resize, and collapse deferred;
- Session-keyed persistence and existing state-sync inclusion, exact unresolved
  survival across restart-bound package disable, and fresh recalculation after
  exact re-enable;
- a future independent H120 automated and focused-human closure before another
  plugin or algorithm may start.

## Preserved Non-Authorization Boundary

This acceptance:

- does not allocate P1c.3 or register H120;
- changes no production, SDK, manifest, schema, catalog, fixture, test,
  Harness-registry, runtime, adapter, persistence, route, UI, package, lockfile,
  or dependency file;
- implements no formula, executable Profile, package module, instance owner,
  state-sync prefix, production projection, or UI;
- starts no EMA/WMA/other algorithm, another Core/Community plugin, generic
  layout, Worker, formula language, or Community/local execution;
- leaves P1b.4 paused and H117 `executable`, human-review-required, unaccepted,
  and with `acceptanceEvidence: null`;
- does not refresh or hide the pre-existing H117 Developer Kit fixture/toolchain
  digest mismatch recorded by the candidate-drafting session.

## Documentation Updated

- accepted Core SMA single-plugin specification;
- TODO, INDEX, execution roadmap, task numbering, restart handoff, and the
  three upstream calculated-series status records;
- candidate-drafting record with a link to this subsequent acceptance;
- this durable specification-acceptance record.

## Verification

The bounded documentation acceptance passed:

- `node v7/tests/source-quality-harness.js` — 534 production files, 519 public
  exports, and 22 negative controls;
- `node v7/tests/production-architecture-harness.js` — 71 modules, 162 edges,
  134 construction sites, 28 writer sites, and zero blocking findings;
- `node v7/tests/architecture-hardening-harness.js` — 119 rules and 15
  negative controls;
- `node v7/tests/production-module-assembly-harness.js`;
- `node v7/tests/production-writer-closure-harness.js`;
- `node v7/tests/deployed-runtime-architecture-harness.js`;
- `node v7/tests/calculated-series-pure-contract-harness.js` — H118 passed and
  reported H117 unchanged;
- `node v7/tests/calculated-series-chart-projection-harness.js` — H119 passed
  with its corrected Main/internal whitespace evidence;
- `node v7/tests/plugin-contract-substrate-harness.js` — P0a passed;
- `node v7/tests/core-plugin-center-harness.js` — P0b passed;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed while
  calculated-series authoring/execution remained unavailable;
- `node v7/tests/server-state-sync-harness.js`.

The direct `node v7/tests/local-plugin-package-harness.js` check again stopped
during initial local baseline preparation, before exercising H117's 54 frozen
negative groups, with `V7DK_STALE_OUTPUT`. The checked-in local-lifecycle
manifest still records toolchain digest
`sha256:cff096e2c0a01f4c05120294425ddccc7a152dfde81b79a0458775ca87083c97`,
while the current checked-in release catalog derives
`sha256:a6c653c3334fc50da8bcb2b2bdaf381151f5dab9f34174101e764faf69b8cd61`.
This is the same pre-existing condition recorded during candidate drafting.
The acceptance changes only documentation/TODO/session paths, refreshes no
Developer Kit or Harness baseline, and leaves H117's registry record unchanged.

`git diff --check` passed. No Harness registry or architecture baseline was
refreshed.

## Exact Next Boundary

No repository-changing next step is authorized by this acceptance. A future
explicit implementation instruction may allocate P1c.3, register H120, and
implement only this one Moving Averages/SMA vertical slice. H120 must then pass
its complete automated evidence and focused product-owner human gate before a
second plugin, second Moving Average algorithm, or generic Indicator layout
slice may begin.
