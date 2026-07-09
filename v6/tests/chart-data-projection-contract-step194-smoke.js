import assert from 'node:assert/strict';
import {
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_DATA_PROJECTION_EVENTS,
} from '../src/contracts/app-contracts.js';

assert.deepEqual(CHART_DATA_PROJECTION_COMMANDS, Object.freeze({
  GET_STATE: 'chartDataProjection.getState',
  PROJECT: 'chartDataProjection.project',
}));

assert.deepEqual(CHART_DATA_PROJECTION_EVENTS, Object.freeze({
  PROJECTED: 'chartDataProjection:projected',
}));

assert.match(CHART_DATA_PROJECTION_COMMANDS.GET_STATE, /^chartDataProjection\./);
assert.match(CHART_DATA_PROJECTION_COMMANDS.PROJECT, /^chartDataProjection\./);
assert.match(CHART_DATA_PROJECTION_EVENTS.PROJECTED, /^chartDataProjection:/);

console.log('v6 chart data projection contract step 194 smoke passed');
