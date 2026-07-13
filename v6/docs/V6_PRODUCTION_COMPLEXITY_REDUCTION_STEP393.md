# Step 393 - Production Complexity Reduction

Status: completed on 2026-07-12.

## Outcome

Step 393 reduced production-file responsibility without changing chart or replay
behavior:

- chart pointer, wheel, and visible-range input ownership moved from the chart
  surface into `chart-range-input-controller.js`;
- target-history loading and source-window projection moved from the leftward
  history runtime into `leftward-history-data-orchestrator.js`;
- 18 planning, audit, and selection helpers moved from `v6/src` into the test
  governance boundary, with a placement guard preventing production imports;
- V6 now owns its pinned Lightweight Charts 5.2.0 browser asset instead of
  loading it through the V5 directory.

The chart surface and history runtime remain lifecycle/orchestration owners;
their extracted collaborators own coherent subdomains behind explicit APIs.

## Verification

- chart range controller, chart surface, multi-pane, manual-wall, wheel prepend,
  and boundary smokes passed;
- leftward source/target/fallback/continuous-history and boundary smokes passed;
- governance placement, helper behavior, and V6 boundary smokes passed;
- app-shell browser smoke passed against the V6-owned chart asset;
- Step 276 foundation browser pack passed `8/8` in `44914ms`;
- Step 293 target-history browser pack passed `8/8` in `18903ms`;
- `git diff --check` passed.

## Deferred concerns

- Licensing for the V6 project itself still requires an explicit owner choice;
  this step did not infer MIT, Apache-2.0, or AGPL intent.
- A number of historical static closeout tests assert superseded implementation
  locations or temporary non-wiring states. They should not drive production
  architecture back toward obsolete shapes.

## Next recommendation

Step 394 should consolidate historical static closeout tests into a smaller set
of current architectural invariant packs. Start by inventorying tests that fail
only because later accepted steps changed file placement or wiring, preserve
behavioral browser coverage, and remove or rewrite only demonstrably superseded
shape assertions. Commit inventory/selection, migration, and closeout separately.
