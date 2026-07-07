import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const fallback = document.querySelector('[data-v6-chart-fallback]');
      const state = root.__v6WorkstationChartSurface.getState();
      const canvasCount = host.querySelectorAll('canvas').length;
      return {
        canvasCount,
        fallbackOpacity: Number.parseFloat(getComputedStyle(fallback).opacity),
        hostChildCount: host.childElementCount,
        hostPaneId: host.dataset.v6PaneId || '',
        state,
      };
    })()))()
  `));

  assert.equal(value.hostPaneId, 'main');
  assert.equal(value.state.hostConnected, true);
  assert.equal(value.state.hostSelector, '[data-v6-chart-engine-host]');
  assert.equal(value.state.panes.length, 1);
  assert.equal(value.state.panes[0].paneId, 'main');
  assert.equal(value.state.panes[0].snapshot.mounted, true);
  assert.equal(value.state.panes[0].snapshot.dataLength, 0);
  assert.equal(value.state.panes[0].snapshot.visibleLogicalRange, null);
  assert.equal(value.canvasCount > 0, true);
  assert.equal(value.hostChildCount > 0, true);
  assert.equal(value.fallbackOpacity <= 0.25, true);
} finally {
  await page.cleanup();
}

console.log('v6 workstation chart adapter browser smoke passed');
