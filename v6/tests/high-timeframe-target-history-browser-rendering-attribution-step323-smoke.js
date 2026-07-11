import assert from 'node:assert/strict';
import { attributeHighTimeframeTargetHistoryBrowserRenderingVisibility } from '../src/chart-history/high-timeframe-target-history-browser-rendering-attribution.js';

const triggerCoordination = attributeHighTimeframeTargetHistoryBrowserRenderingVisibility({
  records: [
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 0,
      postLeftExtensionSecondFrameMs: 10,
      preLeftExtensionMs: 510,
      visualLatencyMs: 520,
    },
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 0,
      postLeftExtensionSecondFrameMs: 12,
      preLeftExtensionMs: 520,
      visualLatencyMs: 532,
    },
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 0,
      postLeftExtensionSecondFrameMs: 11,
      preLeftExtensionMs: 500,
      visualLatencyMs: 511,
    },
  ],
});
assert.equal(triggerCoordination.status, 'trigger-coordination-attribution-needed');
assert.equal(triggerCoordination.ownerBoundary, 'target-history-trigger-or-coordination-boundary');
assert.equal(triggerCoordination.nextSlice, 'target-history-trigger-coordination-latency-attribution');
assert.equal(triggerCoordination.reason, 'pre-left-extension-window-dominates-visual-latency');

const browserRendering = attributeHighTimeframeTargetHistoryBrowserRenderingVisibility({
  records: [
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 20,
      postLeftExtensionSecondFrameMs: 430,
      preLeftExtensionMs: 80,
      visualLatencyMs: 510,
    },
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 24,
      postLeftExtensionSecondFrameMs: 440,
      preLeftExtensionMs: 90,
      visualLatencyMs: 530,
    },
    {
      browserVisible: true,
      path: 'target-history',
      postLeftExtensionReadoutMs: 18,
      postLeftExtensionSecondFrameMs: 420,
      preLeftExtensionMs: 95,
      visualLatencyMs: 515,
    },
  ],
});
assert.equal(browserRendering.status, 'browser-rendering-visibility-attribution-needed');
assert.equal(browserRendering.ownerBoundary, 'browser-rendering-or-chart-engine-paint-boundary');
assert.equal(browserRendering.nextSlice, 'target-history-browser-rendering-paint-visibility-plan');

const ready = attributeHighTimeframeTargetHistoryBrowserRenderingVisibility({
  records: [
    { browserVisible: true, path: 'target-history', postLeftExtensionSecondFrameMs: 8, preLeftExtensionMs: 100, visualLatencyMs: 108 },
    { browserVisible: true, path: 'target-history', postLeftExtensionSecondFrameMs: 9, preLeftExtensionMs: 110, visualLatencyMs: 119 },
    { browserVisible: true, path: 'target-history', postLeftExtensionSecondFrameMs: 7, preLeftExtensionMs: 90, visualLatencyMs: 97 },
  ],
});
assert.equal(ready.status, 'materialization-ready');
assert.equal(ready.nextSlice, 'replay-coordination-materialization-transition');

const incomplete = attributeHighTimeframeTargetHistoryBrowserRenderingVisibility({
  records: [{ browserVisible: false, path: 'target-history' }],
});
assert.equal(incomplete.status, 'measurement-incomplete');
assert.equal(incomplete.nextSlice, 'target-history-browser-rendering-visibility-attribution');

console.log('v6 high timeframe target history browser rendering attribution step323 smoke passed');
