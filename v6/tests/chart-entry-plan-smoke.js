import assert from 'node:assert/strict';
import {
  createChartEntryInitializationPlan,
  getDefaultChartEntryPlanSteps,
} from '../src/chart-entry/chart-entry-plan.js';

assert.deepEqual(getDefaultChartEntryPlanSteps(), [
  'resolve-start-bar',
  'load-bounded-replay-context',
  'load-replay-state',
  'project-default-wall',
  'apply-chart-data-and-viewport',
]);

const plan = createChartEntryInitializationPlan({
  sessionId: 'v6-session-0001',
  source: 'session.created',
});

assert.deepEqual(plan, {
  owner: 'runtime.chartEntry',
  sessionId: 'v6-session-0001',
  source: 'session.created',
  status: 'planned',
  steps: [
    'resolve-start-bar',
    'load-bounded-replay-context',
    'load-replay-state',
    'project-default-wall',
    'apply-chart-data-and-viewport',
  ],
});
assert.throws(
  () => createChartEntryInitializationPlan({ sessionId: '' }),
  /requires a session id/
);
assert.throws(
  () => createChartEntryInitializationPlan({ sessionId: 'v6-session-0001', steps: [] }),
  /requires at least one step/
);

console.log('v6 chart entry plan smoke passed');
