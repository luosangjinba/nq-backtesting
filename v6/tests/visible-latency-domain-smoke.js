import assert from 'node:assert/strict';
import {
  VISIBLE_LATENCY_CAUSES,
  assertCacheHitVisiblePath,
  createVisibleLatencyTrace,
  summarizeVisibleLatencyTrace,
} from '../src/latency/visible-latency-timeline.js';

let clock = 1000;
const trace = createVisibleLatencyTrace({
  cacheHit: true,
  id: 'cache-hit-next',
  now: () => clock,
  thresholdMs: 120,
});

trace.mark('input', { source: 'next-button' });
clock += 3;
trace.mark('commandReceived');
clock += 1;
trace.mark('barAvailable', { source: 'forward-buffer' });
clock += 4;
trace.mark('chartUpdateRequested', { path: 'series.update' });
clock += 12;
trace.mark('candleVisible', { observer: 'chart-metadata' });

const summary = summarizeVisibleLatencyTrace(trace.snapshot());
assert.equal(summary.cacheHit, true);
assert.equal(summary.dataFetchRequested, false);
assert.equal(summary.totalMs, 20);
assert.equal(summary.withinThreshold, true);
assert.equal(summary.failureCause, VISIBLE_LATENCY_CAUSES.none);
assert.deepEqual(summary.missingPhases, []);
assert.equal(summary.phaseDurations['input->commandReceived'], 3);
assert.equal(summary.phaseDurations['commandReceived->barAvailable'], 1);
assert.equal(summary.phaseDurations['barAvailable->chartUpdateRequested'], 4);
assert.equal(summary.phaseDurations['chartUpdateRequested->candleVisible'], 12);
assert.equal(assertCacheHitVisiblePath(summary), summary);

let slowClock = 2000;
const dataMissTrace = createVisibleLatencyTrace({
  cacheHit: false,
  now: () => slowClock,
  thresholdMs: 120,
});
dataMissTrace.mark('input');
slowClock += 1;
dataMissTrace.mark('commandReceived');
slowClock += 130;
dataMissTrace.recordDataFetch();
dataMissTrace.mark('barAvailable');
slowClock += 1;
dataMissTrace.mark('chartUpdateRequested');
slowClock += 1;
dataMissTrace.mark('candleVisible');

const dataMissSummary = summarizeVisibleLatencyTrace(dataMissTrace.snapshot());
assert.equal(dataMissSummary.withinThreshold, false);
assert.equal(dataMissSummary.failureCause, VISIBLE_LATENCY_CAUSES.data);

const incompleteTrace = createVisibleLatencyTrace({ now: () => 0 });
incompleteTrace.mark('input');
const incompleteSummary = summarizeVisibleLatencyTrace(incompleteTrace.snapshot());
assert.equal(incompleteSummary.failureCause, VISIBLE_LATENCY_CAUSES.incomplete);
assert.deepEqual(incompleteSummary.missingPhases, [
  'commandReceived',
  'barAvailable',
  'chartUpdateRequested',
  'candleVisible',
]);

console.log('v6 visible latency domain smoke passed');
