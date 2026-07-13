import assert from 'node:assert/strict';
import {
  auditTargetHistoryPhaseDCoverage,
  selectTargetHistoryPhaseDPostCoverageSlice,
} from './governance/helpers/chart-history/target-history-phase-d-selection.js';

const completeCoverage = Object.freeze({
  dailyFallback: true,
  dailySuccess: true,
  fixedFallback: true,
  fixedSuccess: true,
  monthlyFallback: true,
  monthlySuccess: true,
  weeklyFallback: true,
  weeklySuccess: true,
});

const audit = auditTargetHistoryPhaseDCoverage(completeCoverage);
assert.deepEqual(audit, {
  complete: true,
  covered: [
    'fixedSuccess',
    'fixedFallback',
    'dailySuccess',
    'dailyFallback',
    'weeklySuccess',
    'weeklyFallback',
    'monthlySuccess',
    'monthlyFallback',
  ],
  coveredCount: 8,
  expectedCount: 8,
  missing: [],
});

const selected = selectTargetHistoryPhaseDPostCoverageSlice({
  coverage: completeCoverage,
});
assert.equal(selected.reason, 'target-history-browser-pack-complete-cost-control-next');
assert.equal(selected.slice, 'target-history-browser-pack-cost-control');
assert.equal(selected.audit.complete, true);
assert.equal(selected.audit.coveredCount, 8);

const incomplete = selectTargetHistoryPhaseDPostCoverageSlice({
  coverage: {
    ...completeCoverage,
    monthlyFallback: false,
  },
});
assert.equal(incomplete.reason, 'target-history-phase-d-coverage-incomplete');
assert.equal(incomplete.slice, null);
assert.deepEqual(incomplete.audit.missing, ['monthlyFallback']);

const responsivenessFallback = selectTargetHistoryPhaseDPostCoverageSlice({
  candidates: ['high-timeframe-history-responsiveness-audit'],
  coverage: completeCoverage,
});
assert.equal(responsivenessFallback.reason, 'target-history-browser-coverage-complete-responsiveness-next');
assert.equal(responsivenessFallback.slice, 'high-timeframe-history-responsiveness-audit');

const transitionFallback = selectTargetHistoryPhaseDPostCoverageSlice({
  candidates: ['replay-coordination-materialization-transition'],
  coverage: completeCoverage,
});
assert.equal(transitionFallback.reason, 'target-history-browser-coverage-complete-transition-next');
assert.equal(transitionFallback.slice, 'replay-coordination-materialization-transition');

const none = selectTargetHistoryPhaseDPostCoverageSlice({
  candidates: [],
  coverage: completeCoverage,
});
assert.equal(none.reason, 'no-target-history-post-coverage-candidate');
assert.equal(none.slice, null);

console.log('v6 target history phase d reaudit step308 smoke passed');
