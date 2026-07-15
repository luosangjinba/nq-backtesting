import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Rail regression audit';
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
      return {
        chart: rectOf('[data-v6-chart-surface]'),
        chartButtonLabels: labelsOf('[data-v6-chart-surface] button'),
        chartToolbarExists: Boolean(document.querySelector('.chart-toolbar')),
        host: rectOf('[data-v6-chart-engine-host]'),
        main: rectOf('[data-v6-workstation-main]'),
        reset: rectOf('[data-v6-reset-view]'),
        goTo: rectOf('[data-v6-rail-goto]'),
        status: rectOf('[data-v6-status-readout]'),
        topBar: rectOf('[data-v6-workstation-header]'),
        transport: rectOf('[data-v6-transport]'),
        transportLabel: document.querySelector('[data-v6-transport]')?.getAttribute('aria-label') || '',
        viewportWidth: window.innerWidth,
      };
    })()))()
  `));

  assert.equal(value.chartToolbarExists, false);
  assert.equal(value.chartButtonLabels.length > 0, true);
  assert.equal(value.chartButtonLabels.every((label) => /^(Maximize chart|Reset .+ pane view)$/.test(label)), true);
  assert.equal(value.chartButtonLabels.some((label) => /Cursor|Trend|Horizontal|Rectangle|Measure|Text/.test(label)), false);
  assert.equal(value.chart.left <= value.main.left + 2, true);
  assert.equal(value.chart.right >= value.main.right - 2, true);
  assert.equal(value.host.left, value.chart.left);
  assert.equal(value.host.top, value.chart.top);
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(Math.abs(value.topBar.bottom - value.main.top) <= 1, true);
  assert.equal(value.goTo.top >= value.topBar.top, true);
  assert.equal(value.goTo.bottom <= value.topBar.bottom, true);
  assert.equal(value.status.left >= value.chart.left, true);
  assert.equal(value.status.top >= value.chart.top, true);
  assert.equal(value.status.right < value.reset.left, true);
  assert.equal(value.reset.right <= value.chart.right, true);
  assert.equal(value.reset.top >= value.chart.top, true);
  assert.equal(value.transportLabel, 'Replay transport');
  assert.equal(value.transport.width > 0, true);
  assert.equal(value.transport.height > 0, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
} finally {
  await page.cleanup();
}

console.log('v6 workstation side layout browser smoke passed');
