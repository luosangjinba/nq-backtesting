# V6 Documentation Index

Read this index before working on V6. It is intentionally a current-state
router, not a chronological ledger.

## Required First Reads

1. `v6/docs/V6_PRODUCT_DIRECTION.md`
2. `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`
3. `v6/docs/V6_ARCHITECTURE.md`
4. `v6/docs/V6_EXECUTION_ROADMAP.md`
5. `v6/TODO.md`

## Current Foundation

- `v6/docs/V6_MILESTONE_STABILIZATION_PLAN_STEP438.md`: binding Step 438-454
  audit baseline, scope freeze, order, and stop conditions.
- `v6/docs/V6_SETTINGS_CATALOG_ARCHITECTURE_STEP409_5.md`: accepted Settings
  ownership/catalog decision.
- `v6/docs/V6_GLOBAL_TIME_FORMAT_SETTINGS_CONTRACT.md`: canonical time display
  and stored-value contract.
- `v6/docs/V6_WORKSPACE_PLACEHOLDER_CLEANUP_DECISION_STEP418.md`: current
  workstation chrome keep/remove decision.
- `v6/docs/V6_WORKSPACE_PLACEHOLDER_CLEANUP_PLAN_STEP418.md`: completed cleanup
  sequence and survival gates.
- `v6/docs/V6_UNIFIED_TARGET_HISTORY_FULL_TIMEFRAME_STEP400.md`: current shared
  historical-extension behavior across timeframes.
- `v6/docs/V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md`: accepted Go-to semantics
  and ownership.

## Product Decisions And Drafts

- `v6/docs/V6_PRODUCT_DIRECTION.md`: target user and foundation priorities.
- `v6/docs/V6_REPLAY_VALIDATION_PRODUCT_DECISION.md`: validation outcome and
  Replay role.
- `v6/docs/V6_SEMANTIC_DRAWING_PLUGIN_SPEC_DRAFT.md`: product-owner review draft;
  it does not authorize implementation.

## Architecture And Testing

- `v6/docs/V6_ARCHITECTURE.md`: hard ownership and composition boundaries.
- `v6/docs/V6_EXECUTION_ROADMAP.md`: execution gates and sequencing rules.
- `v6/tests/canonical-test-manifest.js`: named milestone suites.
- `v6/tests/canonical-test-runner.js`: executable runner for every named
  manifest gate; use `--list` or `--environment=<name>` for audit/scope.
- `v6/tests/test-catalog-domain.js`: exhaustive environment/role classification.
- `v6/docs/V6_TEST_TRIAGE_STEP456.md`: explicit disposition rules and closeout
  gate for the post-stabilization failing Node tests.

## Historical Lookup

- `v6/archive/TODO_THROUGH_STEP453.md`: full Step ledger through 453.
- `v6/archive/DOCS_INDEX_THROUGH_STEP453.md`: full historical docs index.
- `v6/sessions/`: step-level evidence; load only for targeted lookup.

Historical documents describe the state at their Step. They do not override
the required current direction, architecture, product decisions, or current
TODO.
