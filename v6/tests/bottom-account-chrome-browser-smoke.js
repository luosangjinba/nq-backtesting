import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const bottomChromeSource = shellSource.slice(
  shellSource.indexOf('data-v6-bottom-account-chrome'),
  shellSource.indexOf('<div class="transport-placeholder"'),
);

assert.match(selectionDoc, /Bottom Account\/Trading Chrome Reservation/);
assert.match(guardrailsDoc, /Trading\/account chrome stays along the bottom edge/);
assert.equal(bottomChromeSource.includes('data-v6-bottom-account-chrome'), true);

for (const forbiddenToken of [
  'ORDERS_COMMANDS',
  'CHART_DATA_COMMANDS',
  'CHART_VIEWPORT_COMMANDS',
  'REPLAY_COMMANDS',
  'BAR_DATA_COMMANDS',
  'DEFAULT_WALL_COMMANDS',
  'DISPLAY_TIMEFRAME_COMMANDS',
  'dispatch',
  'data-v6-rail-order',
  'Order',
  'Calendar',
]) {
  assert.equal(bottomChromeSource.includes(forbiddenToken), false, `bottom chrome must not expose ${forbiddenToken}`);
}

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy', 'journal'],
);

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Bottom chrome layout';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T10:30';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      while (document.querySelector('[data-v6-root]')?.dataset.v6Surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const rectOf = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      const labelsOf = (selector) => [...document.querySelectorAll(selector)].map((element) => (
        element.getAttribute('aria-label') || element.textContent.trim()
      ));
      const bottom = document.querySelector('[data-v6-bottom-account-chrome]');
      const beforeChart = rectOf('[data-v6-chart-surface]');
      const beforeHost = rectOf('[data-v6-chart-engine-host]');
      for (const control of bottom.querySelectorAll('button, input')) {
        control.click();
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        accountReadouts: [...bottom.querySelectorAll('.bottom-account-readouts span')].map((span) => span.textContent.trim()),
        afterChart: rectOf('[data-v6-chart-surface]'),
        afterHost: rectOf('[data-v6-chart-engine-host]'),
        beforeChart,
        beforeHost,
        bottom: rectOf('[data-v6-bottom-account-chrome]'),
        buttonDisabled: [...bottom.querySelectorAll('button')].map((button) => button.disabled),
        buttonLabels: labelsOf('[data-v6-bottom-account-chrome] button'),
        chart: rectOf('[data-v6-chart-surface]'),
        host: rectOf('[data-v6-chart-engine-host]'),
        leftRail: rectOf('[data-v6-left-drawing-rail]'),
        main: rectOf('[data-v6-workstation-main]'),
        quantityDisabled: document.querySelector('[data-v6-bottom-quantity]').disabled,
        reset: rectOf('[data-v6-reset-view]'),
        rightRail: rectOf('[data-v6-right-utility-rail]'),
        status: rectOf('[data-v6-status-readout]'),
        statusBar: rectOf('[data-v6-status-bar]'),
        transport: rectOf('[data-v6-transport]'),
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.deepEqual(value.buttonLabels, [
    'Buy placeholder',
    'Sell placeholder',
    'Analytics placeholder',
  ]);
  assert.deepEqual(value.buttonDisabled, [true, true, true]);
  assert.equal(value.quantityDisabled, true);
  assert.deepEqual(value.accountReadouts, ['Balance --', 'Realized --', 'Unrealized --']);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.leftRail.right <= value.chart.left + 1, true);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.main.bottom <= value.bottom.top, true);
  assert.equal(value.bottom.bottom <= value.statusBar.top, true);
  assert.equal(value.transport.bottom <= value.bottom.top, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
  assert.equal(value.status.right < value.reset.left, true);
  assert.deepEqual(value.beforeChart, value.afterChart);
  assert.deepEqual(value.beforeHost, value.afterHost);
} finally {
  await page.cleanup();
}

console.log('v6 bottom account chrome browser smoke passed');
