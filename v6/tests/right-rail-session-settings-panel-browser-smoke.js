import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    JSON.stringify({
      chartSettingsExists: Boolean(document.querySelector('[data-v6-settings-toggle]')),
      goToExists: Boolean(document.querySelector('[data-v6-rail-goto]')),
      panelExists: Boolean(document.querySelector('[data-v6-session-settings-panel]')),
      triggerExists: Boolean(document.querySelector('[data-v6-rail-session-settings]')),
    })
  `));

  assert.deepEqual(value, {
    chartSettingsExists: true,
    goToExists: true,
    panelExists: false,
    triggerExists: false,
  });
} finally {
  await page.cleanup();
}

console.log('v6 right rail session settings panel removal browser smoke passed');
