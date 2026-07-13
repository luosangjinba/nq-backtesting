import assert from 'node:assert/strict';
import { selectHighTimeframeTargetHistorySelectedPathSlice } from './governance/helpers/chart-history/high-timeframe-target-history-selected-path-slice-selection.js';

const applyLag = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [
    { budget: 80, phase: 'browser-visible-apply-lag', ratio: 7.33, value: 587.1 },
  ],
  selectedPhase: 'browser-visible-apply-lag',
  selectedSlice: 'target-history-browser-visible-apply-lag-optimization',
  status: 'optimize-phase',
});
assert.equal(applyLag.status, 'selected');
assert.equal(applyLag.path, 'phase-optimization');
assert.equal(applyLag.implementationSlice, 'target-history-browser-visible-apply-lag-optimization-plan');
assert.equal(applyLag.selectedFinding.phase, 'browser-visible-apply-lag');
assert.equal(applyLag.severity, 'high');

const fetch = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [
    { budget: 120, phase: 'fetch', ratio: 2.5, value: 300 },
  ],
  selectedPhase: 'fetch',
  selectedSlice: 'target-history-fetch-optimization',
  status: 'optimize-phase',
});
assert.equal(fetch.implementationSlice, 'target-history-fetch-optimization-plan');

const chartData = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [
    { budget: 120, phase: 'chart-data-replacement', ratio: 1.5, value: 180 },
  ],
  selectedPhase: 'chart-data-replacement',
  selectedSlice: 'target-history-chart-data-replacement-optimization',
  status: 'optimize-phase',
});
assert.equal(chartData.implementationSlice, 'target-history-chart-data-replacement-optimization-plan');
assert.equal(chartData.severity, 'normal');

const viewport = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [
    { budget: 80, phase: 'viewport-reapply', ratio: 2.25, value: 180 },
  ],
  selectedPhase: 'viewport-reapply',
  selectedSlice: 'target-history-viewport-reapply-optimization',
  status: 'optimize-phase',
});
assert.equal(viewport.implementationSlice, 'target-history-viewport-reapply-optimization-plan');

const materialization = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [],
  selectedPhase: null,
  selectedSlice: 'replay-coordination-materialization-transition',
  status: 'materialization-ready',
});
assert.equal(materialization.path, 'materialization-transition');
assert.equal(materialization.implementationSlice, 'replay-coordination-materialization-transition-plan');
assert.equal(materialization.selectedFinding, null);

const measurement = selectHighTimeframeTargetHistorySelectedPathSlice({
  phaseFindings: [],
  selectedPhase: null,
  selectedSlice: 'high-timeframe-target-history-responsiveness-harness',
  status: 'measurement-incomplete',
});
assert.equal(measurement.path, 'measurement-completion');
assert.equal(measurement.implementationSlice, 'high-timeframe-target-history-responsiveness-measurement-completion');

const unknown = selectHighTimeframeTargetHistorySelectedPathSlice({
  selectedSlice: 'unexpected-path',
});
assert.equal(unknown.status, 'measurement-needed');
assert.equal(unknown.implementationSlice, 'high-timeframe-target-history-selected-path-measurement-audit');

console.log('v6 high timeframe target history selected path slice selection step318 smoke passed');
