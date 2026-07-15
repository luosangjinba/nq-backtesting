const refresh = (path, reason) => Object.freeze({
  disposition: 'refresh-current-contract',
  path,
  reason,
});

const quarantine = (path, reason, successor) => Object.freeze({
  disposition: 'quarantine-superseded',
  path,
  reason,
  successor,
});

export const STEP456_TEST_TRIAGE = Object.freeze([
  refresh('v6/tests/auto-play-htf-projection-audit-step199-smoke.js', 'Current scheduler ownership assertion follows extracted runtime composition.'),
  refresh('v6/tests/chart-data-projection-routing-scope-step195-smoke.js', 'Current projection ownership assertion follows runtime contribution extraction.'),
  refresh('v6/tests/chart-data-projection-routing-scope-step197-smoke.js', 'Current projection ownership assertion follows split manual-next runtimes.'),
  refresh('v6/tests/chart-data-projection-routing-scope-step198-smoke.js', 'Current history projection ownership assertion follows unified target history.'),
  refresh('v6/tests/chart-data-projection-routing-scope-step199-smoke.js', 'Current auto-play and projection ownership assertion follows split runtimes.'),
  quarantine(
    'v6/tests/display-target-history-fallback-step284-smoke.js',
    'Step 284 tested optional target history before automatic unified materialization.',
    'v6/tests/unified-target-history-real-api-browser-step400-smoke.js',
  ),
  quarantine(
    'v6/tests/display-target-history-opt-in-step284-smoke.js',
    'Step 284 opt-in ownership is obsolete after automatic unified materialization.',
    'v6/tests/unified-target-history-real-api-browser-step400-smoke.js',
  ),
  quarantine(
    'v6/tests/display-timeframe-no-wiring-step193-smoke.js',
    'The deliberate no-wiring phase ended when display-timeframe projection shipped.',
    'v6/tests/initial-htf-chart-entry-projection-step195-smoke.js',
  ),
  quarantine(
    'v6/tests/display-timeframe-readiness-audit-step192-smoke.js',
    'This freezes wording in a historical readiness document rather than current behavior.',
    'v6/tests/chart-data-projection-contract-step194-smoke.js',
  ),
  refresh('v6/tests/governance-helper-placement-smoke.js', 'Current test-only helper inventory changed during governance extraction.'),
  refresh('v6/tests/htf-projection-integration-review-step201-smoke.js', 'Current integration ownership review follows extracted runtime composition.'),
  refresh('v6/tests/next-chart-slice-selection-step211-smoke.js', 'Current shell assertion must follow the template facade boundary.'),
  refresh('v6/tests/pane-intent-reload-data-runtime-step176-smoke.js', 'Current reload plan includes later no-future and target-history metadata.'),
  refresh('v6/tests/pane-intent-reload-window-runtime-step175-smoke.js', 'Current reload plan includes later no-future and target-history metadata.'),
  refresh('v6/tests/pane-intent-sync-boundary-step170-smoke.js', 'Current ownership assertion must follow runtime contribution extraction.'),
  refresh('v6/tests/replay-navigation-step403-ownership-smoke.js', 'Current shell assertion must follow the template facade and Go-to relocation.'),
  refresh('v6/tests/replay-previous-domain-command-step236-smoke.js', 'Current shell assertion must follow the template facade boundary.'),
  refresh('v6/tests/reset-view-kxg-flow-step146-smoke.js', 'Current replay harness must include commands introduced after Step 146.'),
  refresh('v6/tests/runtime-core-smoke.js', 'Current command inventory must include later target-history and navigation commands.'),
  refresh('v6/tests/session-dashboard-readiness-audit-smoke.js', 'Current dashboard import allowlist must include extracted safe rendering helpers.'),
  refresh('v6/tests/settings-catalog-architecture-step409_5-smoke.js', 'Current Settings decision wording changed while its ownership remains binding.'),
  refresh('v6/tests/settings-chart-surface-bridge-step409-smoke.js', 'Current bridge payload requires global time-presentation settings.'),
  refresh('v6/tests/settings-panel-controller-smoke.js', 'Current fake DOM must implement the controller query surface.'),
  refresh('v6/tests/settings-scope-closeout-step417-smoke.js', 'Current shell assertion must follow the template facade boundary.'),
  refresh('v6/tests/status-readout-controller-smoke.js', 'Accepted behavior now displays the latest bar when crosshair is absent.'),
  refresh('v6/tests/target-history-pack-cost-control-step309-smoke.js', 'Current optional pack inventory contains later replay diagnostic members.'),
  quarantine(
    'v6/tests/ui-extraction-workflow-audit-step197_5-smoke.js',
    'The historical no-package-manifest constraint was intentionally superseded.',
    'v6/tests/app-shell-browser-smoke.js',
  ),
]);
