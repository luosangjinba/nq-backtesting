import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const viewports = [
  { height: 720, width: 1024 },
  { height: 900, width: 1440 },
  { height: 1080, width: 1920 },
];

async function inspectViewport(page, viewport) {
  await page.client.send('Emulation.setDeviceMetricsOverride', {
    deviceScaleFactor: 1,
    height: viewport.height,
    mobile: false,
    width: viewport.width,
  });
  return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const commands = await import('/v6/src/runtime/commands.js');
        const contracts = await import('/v6/src/contracts/app-contracts.js');
        const root = document.querySelector('[data-v6-root]');
        if (!document.querySelector('[data-v6-session-dashboard]').hidden) {
          document.querySelector('[data-v6-dashboard-create-session]').click();
        }
        await root.__v6LayoutSurfaceBridge.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        const rect = (selector) => {
          const bounds = document.querySelector(selector).getBoundingClientRect();
          return {
            bottom: bounds.bottom,
            height: bounds.height,
            left: bounds.left,
            right: bounds.right,
            top: bounds.top,
            width: bounds.width,
          };
        };
        const snapshot = () => ({
          chart: rect('[data-v6-chart-surface]'),
          message: document.querySelector('[data-v6-replay-status]').textContent.trim(),
          primary: rect('[data-v6-replay-status]'),
          protection: rect('[data-v6-replay-protection]'),
          protectionHidden: document.querySelector('[data-v6-replay-protection]').hidden,
          status: rect('[data-v6-status-bar]'),
          transport: rect('[data-v6-transport]'),
          viewport: { height: innerHeight, width: innerWidth },
        });

        const states = {};
        for (const [name, mode, variant] of [
          ['single', 'single', 'single'],
          ['twice', 'twice', 'twice-vertical'],
          ['triple', 'triple', 'triple-columns'],
        ]) {
          await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode, variant });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          states[name] = snapshot();
        }
        return states;
      })()))()
    `));
}

const page = await openV6Page(viewports.at(-1));
try {
  const initialMessage = JSON.parse(await evaluate(page.client, `
    JSON.stringify(document.querySelector('[data-v6-replay-status]').textContent.trim())
  `));
  assert.equal(initialMessage, 'Preparing replay…');
  for (const viewport of viewports) {
    const states = await inspectViewport(page, viewport);
    for (const [layout, state] of Object.entries(states)) {
      const label = `${viewport.width}x${viewport.height} ${layout}`;
      assert.equal(['Preparing replay…', 'Replay ready'].includes(state.message), true, `${label} lifecycle copy`);
      assert.equal(state.status.height <= 32, true, `${label} compact status height ${state.status.height}`);
      assert.equal(state.status.top >= state.chart.bottom, true, `${label} status follows chart`);
      assert.equal(state.status.bottom <= state.viewport.height, true, `${label} status inside viewport`);
      assert.equal(state.primary.left >= state.status.left, true, `${label} primary left bound`);
      assert.equal(state.primary.right <= state.status.right, true, `${label} primary right bound`);
      assert.equal(state.transport.bottom <= state.status.top - 8, true, `${label} transport clearance`);
      if (!state.protectionHidden) {
        assert.equal(state.protection.right <= state.status.right, true, `${label} protection right bound`);
        assert.equal(state.protection.top, state.primary.top, `${label} compact badges stay on one line`);
      }
    }
  }
} finally {
  await page.cleanup();
}

console.log('v6 compact Replay status layout browser Step 432 smoke passed');
