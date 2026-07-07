import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { getVisibleRecentSessionRowActions } from '../src/shell/session-row-action-boundaries.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const auditDoc = await readFile('v6/docs/V6_BOTTOM_CHROME_REGRESSION_AUDIT.md', 'utf8');
const indexDoc = await readFile('v6/docs/INDEX.md', 'utf8');
const reservationDoc = await readFile('v6/docs/V6_BOTTOM_ACCOUNT_CHROME_RESERVATION.md', 'utf8');
const selectionDoc = await readFile('v6/docs/V6_WORKSTATION_CHART_SLICE_SELECTION_STEP122.md', 'utf8');
const guardrailsDoc = await readFile('v6/docs/V6_FXREPLAY_UI_GUARDRAILS.md', 'utf8');
const shellSource = await readFile('v6/src/shell/workstation-shell.js', 'utf8');
const bottomChromeSource = shellSource.slice(
  shellSource.indexOf('data-v6-bottom-account-chrome'),
  shellSource.indexOf('<div class="transport-placeholder"'),
);

assert.equal(indexDoc.includes('V6_BOTTOM_CHROME_REGRESSION_AUDIT.md'), true);
assert.match(auditDoc, /floating replay transport remains a separate shell transport surface/);
assert.match(auditDoc, /dashboard visible row actions remain Summary, Stats, Copy, and Journal/);
assert.match(reservationDoc, /floating replay transport remains\s+a separate shell transport surface/);
assert.match(selectionDoc, /Bottom Account\/Trading Chrome Reservation/);
assert.match(guardrailsDoc, /Trading\/account chrome stays along the bottom edge/);

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

async function inspectChrome({ height, label, width }) {
  const page = await openV6Page({ height, width });
  try {
    return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        localStorage.removeItem('v6.sessions.metadata');
        document.querySelector('[data-v6-session-setup-name]').value = '${label}';
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
        const bottom = document.querySelector('[data-v6-bottom-account-chrome]');
        return {
          accountReadouts: [...bottom.querySelectorAll('.bottom-account-readouts span')].map((span) => span.textContent.trim()),
          bottom: rectOf('[data-v6-bottom-account-chrome]'),
          bottomButtonDisabled: [...bottom.querySelectorAll('button')].map((button) => button.disabled),
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
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        };
      })()))()
    `));
  } finally {
    await page.cleanup();
  }
}

for (const value of [
  await inspectChrome({ height: 860, label: 'Bottom chrome desktop audit', width: 1440 }),
  await inspectChrome({ height: 760, label: 'Bottom chrome compact audit', width: 920 }),
]) {
  assert.deepEqual(value.bottomButtonDisabled, [true, true, true]);
  assert.equal(value.quantityDisabled, true);
  assert.deepEqual(value.accountReadouts, ['Balance --', 'Realized --', 'Unrealized --']);
  assert.equal(value.leftRail.right <= value.chart.left + 1, true);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.host.left, value.chart.left);
  assert.equal(value.host.top, value.chart.top);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.main.bottom <= value.bottom.top, true);
  assert.equal(value.bottom.bottom <= value.statusBar.top, true);
  assert.equal(value.transport.bottom <= value.bottom.top, true);
  assert.equal(value.bottom.left >= 0, true);
  assert.equal(value.bottom.right <= value.viewportWidth, true);
  assert.equal(value.statusBar.bottom <= value.viewportHeight, true);
  assert.equal(value.status.right < value.reset.left, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
}

console.log('v6 bottom chrome regression audit browser smoke passed');
