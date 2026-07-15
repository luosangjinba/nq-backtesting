import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function inspectChrome({ height, width }) {
  const page = await openV6Page({ height, width });
  try {
    return JSON.parse(await evaluate(page.client, `(async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-name]').value = 'Bottom removal geometry';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T10:30';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      while (document.querySelector('[data-v6-root]')?.dataset.v6Surface !== 'workstation' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      const rectOf = (selector) => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      return {
        chart: rectOf('[data-v6-chart-surface]'),
        host: rectOf('[data-v6-chart-engine-host]'),
        statusGridRow: getComputedStyle(document.querySelector('[data-v6-status-bar]')).gridRowStart,
        rightRail: rectOf('[data-v6-right-utility-rail]'),
        statusBar: rectOf('[data-v6-status-bar]'),
        transport: rectOf('[data-v6-transport]'),
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    })()))()`));
  } finally {
    await page.cleanup();
  }
}

for (const value of [
  await inspectChrome({ height: 860, width: 1440 }),
  await inspectChrome({ height: 760, width: 920 }),
]) {
  assert.equal(value.statusGridRow, '7');
  assert.equal(value.host.width, value.chart.width);
  assert.equal(value.host.height, value.chart.height);
  assert.equal(value.chart.right <= value.rightRail.left + 1, true);
  assert.equal(value.transport.width > 0, true);
  assert.equal(value.transport.height > 0, true);
  assert.equal(value.transport.bottom <= value.statusBar.top, true);
  assert.equal(value.statusBar.bottom <= value.viewportHeight, true);
  assert.equal(Math.abs((value.transport.left + value.transport.width / 2) - value.viewportWidth / 2) <= 2, true);
}

console.log('v6 bottom placeholder removal regression browser smoke passed');
