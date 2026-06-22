import assert from 'node:assert/strict';
import {
  hasComparisonPickPreviewCursor,
  hideComparisonPickPreviewCursor,
  showComparisonPickPreviewCursor,
} from '../src/chart/comparison-chart-manager.js';
import {
  PICK_CONTEXT_TARGETS,
  getPickContextById,
} from '../src/chart/pick-context-router.js';

hideComparisonPickPreviewCursor();
assert.equal(hasComparisonPickPreviewCursor(), false);

showComparisonPickPreviewCursor(100);
assert.equal(hasComparisonPickPreviewCursor(), false, 'without an initialized chart, preview cursor stays absent');

const context = getPickContextById(PICK_CONTEXT_TARGETS.COMPARISON);
assert.equal(context.chartId, PICK_CONTEXT_TARGETS.COMPARISON);
assert.equal(context.isEnabled(), false);

console.log('comparison-pick-preview-smoke passed');
