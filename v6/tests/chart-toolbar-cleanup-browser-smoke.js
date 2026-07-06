import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    JSON.stringify((() => {
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      return {
        backLabel: document.querySelector('[data-v6-top-back]')?.getAttribute('aria-label') || '',
        chartSurfaceButtonTexts: [...chartSurface.querySelectorAll('button')].map((button) => button.textContent.trim()),
        chartToolbarExists: Boolean(document.querySelector('.chart-toolbar')),
        forwardExists: Boolean(document.querySelector('[data-v6-top-session-forward]')),
        gotoRailExists: Boolean(document.querySelector('[data-v6-rail-goto]')),
        layoutTopExists: Boolean(document.querySelector('[data-v6-top-page-layout]')),
        statusReadoutInChart: Boolean(document.querySelector('[data-v6-chart-surface] [data-v6-status-readout]')),
      };
    })())
  `));

  assert.equal(value.backLabel, 'Back to session dashboard');
  assert.equal(value.forwardExists, false);
  assert.equal(value.chartToolbarExists, false);
  assert.equal(value.statusReadoutInChart, true);
  assert.equal(value.layoutTopExists, true);
  assert.equal(value.gotoRailExists, true);
  assert.deepEqual(value.chartSurfaceButtonTexts, []);
} finally {
  await page.cleanup();
}

console.log('v6 chart toolbar cleanup browser smoke passed');
