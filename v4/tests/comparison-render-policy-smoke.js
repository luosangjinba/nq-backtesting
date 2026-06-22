import assert from 'node:assert/strict';
import {
  setComparisonInstrument,
  setComparisonOverlaySyncMode,
  setComparisonTimeframe,
  setComparisonWindowEnabled,
} from '../src/comparison/comparison-window-store.js';
import { setBars } from '../src/data/bar-store.js';
import { canRenderPdaInComparison } from '../src/pda/comparison-pda-renderer.js';
import { canRenderSegmentInComparison } from '../src/segment/comparison-segment-renderer.js';

setBars([], '2026-06-01', '2026-06-02', 1, null, { instrument: 'NQ' });
setComparisonWindowEnabled(true);
setComparisonInstrument('NQ');
setComparisonTimeframe(1);

const comparisonPda = {
  id: 'comparison-pda',
  sourceChartId: 'comparison-window',
  sourceInstrument: 'NQ',
  sourceTimeframe: 1,
};
const comparisonSegment = {
  id: 'comparison-segment',
  sourceChartId: 'comparison-window',
  sourceInstrument: 'NQ',
  sourceTimeframe: 1,
};

setComparisonOverlaySyncMode('no-sync');
assert.equal(canRenderPdaInComparison(comparisonPda), false);
assert.equal(canRenderSegmentInComparison(comparisonSegment), false);

setComparisonOverlaySyncMode('sync');
assert.equal(canRenderPdaInComparison(comparisonPda), true);
assert.equal(canRenderSegmentInComparison(comparisonSegment), true);

setComparisonTimeframe(60);
assert.equal(canRenderPdaInComparison(comparisonPda), false);
assert.equal(canRenderSegmentInComparison(comparisonSegment), false);

setComparisonWindowEnabled(false);

console.log('comparison-render-policy-smoke passed');
