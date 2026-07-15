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
- `v6/docs/V6_MULTI_INSTRUMENT_PANE_PHASE_PLAN.md`: accepted phase-level plan
  for pane-local Session instruments over one shared Replay clock; sequencing
  remains behind the active Step 469/470 milestone gates.
- `v6/docs/V6_SEMANTIC_DRAWING_PLUGIN_SPEC_DRAFT.md`: product-owner review draft;
  Step 461 accepted its direction with changes, but it does not authorize
  implementation.
- `v6/docs/V6_POST_STABILIZATION_FOUNDATION_REAUDIT_STEP461.md`: current
  foundation readiness and remaining-debt assessment.
- `v6/docs/V6_THREE_MODE_SHARED_FOUNDATION_DECISION_STEP461.md`: binding rule
  that the three operating perspectives are policies over shared owners.
- `v6/docs/V6_FIRST_VALIDATION_VERTICAL_SLICE_PLAN_STEP461.md`: selected thin-
  loop delivery order, Step 462 latency entry gate, and exclusions.
- `v6/docs/V6_VALIDATION_DOMAIN_SPINE_STEP463.md`: completed validation-domain
  artifacts, lifecycle invariants, repository ownership, and IndexedDB
  persistence boundary.
- `v6/docs/V6_BLIND_TRIAL_COORDINATOR_STEP464.md`: completed blind trial
  commands/events, Replay provenance, resume integrity, and ownership boundary.
- `v6/docs/V6_GENERIC_OBSERVATION_EVIDENCE_STEP465.md`: generic prospective
  observation/evidence artifacts, provenance, and IndexedDB v2 boundary.
- `v6/docs/V6_PROSPECTIVE_TRADE_PLAN_STEP466.md`: immutable prospective plan
  revision, price geometry, references, and IndexedDB v3 boundary.
- `v6/docs/V6_SIMULATED_OUTCOME_R_STEP467.md`: separate simulated execution and
  outcome facts, bounded R, ambiguity disclosure, and IndexedDB v4 boundary.
- `v6/docs/V6_CAMPAIGN_SUMMARY_DRILLBACK_STEP468.md`: read-only campaign metrics,
  raw-source rows, drillback descriptor, and remaining navigation constraint.
- `v6/docs/V6_TRIAL_ACCEPTANCE_STEP469.md`: owner-safe backward evidence
  navigation, full-chain IndexedDB/statistical acceptance, and the remaining
  human recording-friction gate.

## Architecture And Testing

- `v6/docs/V6_ARCHITECTURE.md`: hard ownership and composition boundaries.
- `v6/docs/V6_EXECUTION_ROADMAP.md`: execution gates and sequencing rules.
- `v6/tests/canonical-test-manifest.js`: named milestone suites.
- `v6/tests/canonical-test-runner.js`: executable runner for every named
  manifest gate; use `--list` or `--environment=<name>` for audit/scope.
- `v6/tests/exhaustive-test-runner.js`: exhaustive catalog gate runner; defaults
  to offline Node and supports explicit environment/list selection.
- `v6/tests/test-catalog-domain.js`: exhaustive environment/role classification.
- `v6/docs/V6_TEST_TRIAGE_STEP456.md`: explicit disposition rules and closeout
  gate for the post-stabilization failing Node tests.
- `v6/docs/V6_EXPLICIT_TEST_ROLES_STEP457.md`: binding explicit-role policy and
  migration closeout for the exhaustive test catalog.
- `v6/docs/V6_HISTORICAL_LEDGER_TEST_AUDIT_STEP457.md`: audited disposition of
  the 155 tests previously hidden by TODO/INDEX source inference.
- `v6/docs/V6_EXPLICIT_TEST_RUNNERS_STEP458.md`: explicit runner inventory and
  closeout of filename-based runner inference.
- `v6/docs/V6_EXPLICIT_TEST_ENVIRONMENTS_STEP459.md`: explicit execution
  environment inventory, service dependency contract, and migration closeout.
- `v6/docs/V6_EXHAUSTIVE_TEST_RUNNER_STEP460.md`: two-runner decision,
  exhaustive CLI contract, and verification closeout.
- `v6/docs/V6_REPLAY_HISTORY_LATENCY_REPAIR_STEP462.md`: Manual Next phase
  attribution, exact cursor-window cache repair, and restored 160 ms gate.

## Historical Lookup

- `v6/archive/TODO_THROUGH_STEP453.md`: full Step ledger through 453.
- `v6/archive/DOCS_INDEX_THROUGH_STEP453.md`: full historical docs index.
- `v6/sessions/`: step-level evidence; load only for targeted lookup.

Historical documents describe the state at their Step. They do not override
the required current direction, architecture, product decisions, or current
TODO.
