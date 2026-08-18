# Session — Core SMA Single-Plugin Vertical Slice Candidate Specification

Date: 2026-08-17

Branch: `feature/v7-drawing-semantic-annotation`

Status: documentation-only candidate awaiting product-owner review; proposed
P1c.3/H120 are unallocated and unregistered; no implementation authorized

## Product-Owner Direction

> 授权起草 P1c.3/H120 Core SMA 单插件完整垂直切片候选规格；先完整闭环一个插件，不实施其他插件。

## Inputs Reviewed

- accepted Core/Community Plugin classification and the rule that Moving
  Averages is one package while SMA is one versioned definition inside it;
- accepted Contribution Profile/composition and generic calculated-series
  architecture decisions;
- accepted P0a/P0b manifest, host-rendered settings, Core Plugin Center, and
  restart-bound generation behavior;
- accepted P1c.1/H118 pure Profile/Definition/Plot/Scale/document/result
  contracts;
- accepted P1c.2/H119 Chart-owned complete-surface projection, including the
  corrected contiguous-run whitespace rendering and pixel evidence;
- existing Workspace, Bar Data, Replay, Chart Snapshot Application, Session
  persistence, state-sync, ModuleHost, and UI ownership boundaries;
- current official Lightweight Charts analysis-Indicator guide, direct SMA
  example, moving-average calculation source, and auto-attached helper source;
- current awesome-tradingview inventory and its listed
  `lightweight-charts-indicators` project/package metadata.

## Candidate Produced

`../docs/V7_CORE_SMA_SINGLE_PLUGIN_VERTICAL_SLICE_SPEC.md` proposes one complete
product loop with:

- one `first-party.moving-averages@1.0.0` built-in Core package;
- exactly one `moving-averages.sma.close@1.0.0` Definition bound to
  `analysis.calculated-series@1.0.0` through the existing exact host-owned
  binding rather than manifest-kind inference;
- exact `SMA(close, length)` semantics, length `2..500`/default `20`, static
  499-Bar safe warmup, first value on the length-th accepted Bar, leading
  whitespace, full-only deterministic execution, and one standard price line;
- a package-neutral sole instance/document runtime, trusted execution adapter,
  existing Chart owner/P1c.2 child, reversible Session-keyed sidecar, and
  host-owned UI;
- Add, multiple instances, scoped Inputs/Style/Visibility, legend,
  hide/show/remove, Main ↔ one new dedicated region, and exact transaction
  rollback;
- current-Pane-only immutable Bar input, Replay no-future/stale cancellation,
  bounded synchronous inclusion with honest pending settlement, and no package
  data request;
- hard reload, existing state-sync inclusion, restart-bound disable to exact
  unresolved state, and fresh recalculation after exact re-enable;
- deterministic/golden, transactional, persistence, real-Chromium pixel,
  native-interaction, one/four-Pane, removal, regression, and focused-human
  evidence proposed for a later H120;
- ten material decisions for explicit product-owner review.

## Existing-Capability Decision

The official auto-attached helper was not selected. It subscribes to source
Series changes, creates its own Indicator Series, and calls `setData()`, which
would bypass V7's Bar Data/Replay/Chart owners and P1c.2 admission. The pure
calculation/whitespace shape is a useful reference, but the official examples
do not by themselves freeze one consistent first-value boundary, so the V7
candidate defines and tests its own exact length-th-Bar semantics.

The awesome-tradingview-listed community Indicator project was also not
selected. Its current package brings hundreds of Indicator/drawing definitions,
an `oakscriptjs` peer dependency, direct Chart Series writes, and second-chart
oscillator examples. Those are incompatible with the requested one-plugin
scope, same-chart regions, Profile separation, and sole-writer lifecycle. No
external dependency was added.

## Preserved Boundaries

- no production, SDK, manifest, schema, catalog, fixture, test, runtime,
  adapter, persistence, route, UI, package, or dependency file changed;
- `P1c.3` and H120 are proposed candidate labels, not allocated records;
- no H120 entry was added to the Harness registry;
- no SMA formula, package, instance owner, executable Profile availability,
  production projection, sidecar, state-sync prefix, or UI was implemented;
- no EMA/WMA/other algorithm, another Core/Community plugin, generic layout,
  Worker, formula language, or Community/local execution was started;
- P1b.4 remains paused;
- H117 remains `executable`, human-review-required, unaccepted, and retains
  `acceptanceEvidence: null`;
- H119 remains accepted and P1c.2 remains closed.

## Documentation Updated

- the new candidate specification;
- `../TODO.md`;
- `../docs/INDEX.md`;
- `../docs/V7_EXECUTION_ROADMAP.md`;
- `../docs/V7_TASK_NUMBERING.md`;
- `../docs/V7_RESTART_HANDOFF.md`;
- both accepted calculated-series dependency specifications and their parent
  architecture decision status.

## Verification

The bounded documentation change passed:

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
  with 22 negative controls and the corrected real Main/internal evidence;
- `node v7/tests/plugin-contract-substrate-harness.js`;
- `node v7/tests/core-plugin-center-harness.js`;
- `node v7/tests/plugin-developer-kit-harness.js` — H116 passed and calculated-
  series authoring/execution remained unavailable;
- `node v7/tests/server-state-sync-harness.js`.

The direct `node v7/tests/local-plugin-package-harness.js` regression did not
enter its H117 contract suite. The checked-in
`sdk/plugin/examples/local-lifecycle-v1/v7-package.json` records toolchain
digest
`sha256:cff096e2c0a01f4c05120294425ddccc7a152dfde81b79a0458775ca87083c97`,
while the current checked-in release catalog derives
`sha256:a6c653c3334fc50da8bcb2b2bdaf381151f5dab9f34174101e764faf69b8cd61`;
validation fails closed with `V7DK_STALE_OUTPUT`. This candidate changes no
SDK, Developer Kit, plugin-contract, package, or lockfile input to either
digest, and `git diff --quiet` confirms those paths are unchanged. The mismatch
is therefore a pre-existing baseline/toolchain fixture condition outside this
documentation-only scope. It was not refreshed or hidden. H117's registry
record remains `executable`, human-review-required, unaccepted, with
`acceptanceEvidence: null`.

`git diff --check` passed. No Harness registry or architecture baseline was
refreshed.

## Exact Next Step

Review the ten candidate material decisions and accept, amend, or reject them.
Acceptance alone would bind the candidate but still would not allocate or
implement P1c.3/H120. Only a later explicit implementation instruction may
register H120 and build this one Moving Averages/SMA loop; no other plugin or
algorithm starts first.
