import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Right rail layout';
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
      const chart = rectOf('[data-v6-chart-surface]');
      const host = rectOf('[data-v6-chart-engine-host]');
      const main = rectOf('[data-v6-workstation-main]');
      const topBar = rectOf('[data-v6-workstation-header]');
      const beforeChart = rectOf('[data-v6-chart-surface]');
      const beforeHost = rectOf('[data-v6-chart-engine-host]');
      const gotoDetails = document.querySelector('[data-v6-rail-goto-details]');
      const gotoSummary = document.querySelector('[data-v6-rail-goto]');
      const gotoRect = rectOf('[data-v6-rail-goto]');
      gotoSummary.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterChart = rectOf('[data-v6-chart-surface]');
      const afterHost = rectOf('[data-v6-chart-engine-host]');
      const menu = document.querySelector('[data-v6-rail-goto-menu]');
      const menuRect = rectOf('[data-v6-rail-goto-menu]');
      const firstActionRect = menu.querySelector('button').getBoundingClientRect();
      const menuHit = document.elementFromPoint(
        firstActionRect.left + firstActionRect.width / 2,
        firstActionRect.top + firstActionRect.height / 2,
      );
      return {
        afterChart,
        afterHost,
        beforeChart,
        beforeHost,
        chart,
        gotoOpen: gotoDetails.open,
        gotoRect,
        host,
        main,
        menuOptionLabels: [...menu.querySelectorAll('button')].map((button) => button.textContent.trim()),
        menuOptionsDisabled: [...menu.querySelectorAll('button')].map((button) => button.disabled),
        menuHitInside: Boolean(menuHit?.closest('[data-v6-rail-goto-menu]')),
        menuRect,
        topBar,
        chartToolbarExists: Boolean(document.querySelector('.chart-toolbar')),
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.chartToolbarExists, false);
  assert.equal(Math.abs(value.chart.width - value.main.width) <= 2, true);
  assert.equal(value.gotoRect.top >= value.topBar.top, true);
  assert.equal(value.gotoRect.bottom <= value.topBar.bottom, true);
  assert.equal(value.gotoOpen, true);
  assert.equal(value.menuRect.top >= value.gotoRect.bottom, true);
  assert.equal(value.menuRect.right <= value.viewportWidth, true);
  assert.equal(value.menuHitInside, true);
  assert.deepEqual(value.menuOptionLabels, [
    'Next Day Open Y',
    'Next Session Z',
    'Asian Session I',
    'London Session L',
    'New York Session N',
    'Custom Settings',
  ]);
  assert.deepEqual(value.menuOptionsDisabled, [false, false, false, false, false, false]);
  assert.deepEqual(value.beforeChart, value.afterChart);
  assert.deepEqual(value.beforeHost, value.afterHost);
} finally {
  await page.cleanup();
}

console.log('v6 right utility rail browser smoke passed');
