import assert from 'node:assert/strict';
import { evaluate, waitForExpression } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });
try {
  await waitForExpression(page.client, `document.querySelector('[data-v6-root]')?.dataset.booted === 'true'`, 8_000);
  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const root = document.querySelector('[data-v6-root]');
      await root.__v6SettingsChartSurfaceBridge.ready;
      const surface = document.querySelector('[data-v6-chart-surface]');
      const before = JSON.parse(surface.dataset.v6TimePresentation);
      document.querySelector('[data-v6-settings-toggle]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const field = document.querySelector('[data-v6-settings-field="timeFormat"]');
      field.value = '12h';
      field.dispatchEvent(new Event('change', { bubbles: true }));
      const preview = JSON.parse(surface.dataset.v6TimePresentation);
      document.querySelector('[data-v6-settings-close-secondary]').click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return { before, preview, restored: JSON.parse(surface.dataset.v6TimePresentation) };
    })()))()
  `));
  assert.equal(result.before.timeFormat, '24h');
  assert.equal(result.preview.timeFormat, '12h');
  assert.deepEqual(result.restored, result.before);
} finally {
  await page.cleanup();
}

console.log('V6 Time Presentation browser Step 416 smoke passed.');
