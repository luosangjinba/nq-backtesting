import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

function normalizeTemplate(template = '') {
  return String(template).replaceAll('0px', '0');
}

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      await window.document.querySelector('[data-v6-root]').__v6LayoutSurfaceBridge.ready;
      const chartSurface = document.querySelector('[data-v6-chart-surface]');
      const chartPaneLayer = document.querySelector('[data-v6-chart-pane-layer]');
      const hosts = () => [...document.querySelectorAll('[data-v6-chart-engine-host]')].map((host) => {
        const rect = host.getBoundingClientRect();
        return {
          display: getComputedStyle(host).display,
          hidden: host.hidden,
          paneId: host.dataset.v6PaneId,
          visible: host.dataset.v6ChartPaneVisible,
          height: Math.round(rect.height),
          width: Math.round(rect.width),
        };
      });
      const initial = {
        gridTemplateColumns: getComputedStyle(chartPaneLayer).gridTemplateColumns,
        mode: chartSurface.dataset.v6ChartLayoutMode,
        paneCount: chartSurface.dataset.v6ChartLayoutPaneCount,
        hosts: hosts(),
        surfaceState: window.document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState(),
      };

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const twice = {
        gridTemplateColumns: getComputedStyle(chartPaneLayer).gridTemplateColumns,
        mode: chartSurface.dataset.v6ChartLayoutMode,
        paneCount: chartSurface.dataset.v6ChartLayoutPaneCount,
        hosts: hosts(),
        surfaceState: window.document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState(),
      };

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const triple = {
        gridTemplateColumns: getComputedStyle(chartPaneLayer).gridTemplateColumns,
        mode: chartSurface.dataset.v6ChartLayoutMode,
        paneCount: chartSurface.dataset.v6ChartLayoutPaneCount,
        hosts: hosts(),
        surfaceState: window.document.querySelector('[data-v6-root]').__v6WorkstationChartSurface.getState(),
      };

      return { initial, twice, triple };
    })()))()
  `));

  assert.equal(value.initial.mode, 'single');
  assert.equal(value.initial.paneCount, '1');
  assert.deepEqual(value.initial.hosts.map((host) => [host.paneId, host.hidden, host.visible]), [
    ['main', false, 'true'],
    ['secondary', true, 'false'],
    ['tertiary', true, 'false'],
  ]);
  assert.deepEqual(value.initial.surfaceState.layout.visiblePaneIds, ['main']);

  assert.equal(value.twice.mode, 'twice');
  assert.equal(value.twice.paneCount, '2');
  assert.deepEqual(value.twice.hosts.map((host) => [host.paneId, host.hidden, host.visible]), [
    ['main', false, 'true'],
    ['secondary', false, 'true'],
    ['tertiary', true, 'false'],
  ]);
  assert.deepEqual(value.twice.surfaceState.layout.visiblePaneIds, ['main', 'secondary']);
  assert.equal(normalizeTemplate(value.twice.gridTemplateColumns), 'minmax(0, 50fr) minmax(0, 50fr)');
  assert.equal(value.twice.hosts[0].display, 'block');
  assert.equal(value.twice.hosts[1].display, 'block');
  assert.equal(value.twice.hosts[2].display, 'none');

  assert.equal(value.triple.mode, 'triple');
  assert.equal(value.triple.paneCount, '3');
  assert.deepEqual(value.triple.hosts.map((host) => [host.paneId, host.hidden, host.visible]), [
    ['main', false, 'true'],
    ['secondary', false, 'true'],
    ['tertiary', false, 'true'],
  ]);
  assert.deepEqual(value.triple.surfaceState.layout.visiblePaneIds, ['main', 'secondary', 'tertiary']);
  assert.equal(normalizeTemplate(value.triple.gridTemplateColumns), 'minmax(0, 33.333fr) minmax(0, 33.334fr) minmax(0, 33.333fr)');
  assert.deepEqual(value.triple.hosts.map((host) => host.display), ['block', 'block', 'block']);
} finally {
  await page.cleanup();
}

console.log('v6 layout pane surface reflow browser step 161 smoke passed');
