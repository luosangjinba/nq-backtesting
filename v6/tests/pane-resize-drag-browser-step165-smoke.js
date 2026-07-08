import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function normalizeTemplate(template = '') {
  return String(template).replaceAll('0px', '0');
}

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSurfaceBridge.ready;
      const surface = root.__v6WorkstationChartSurface;
      const paneLayer = document.querySelector('[data-v6-chart-pane-layer]');
      paneLayer.getBoundingClientRect = () => ({
        bottom: 650,
        height: 600,
        left: 100,
        right: 1000,
        top: 50,
        width: 900,
        x: 100,
        y: 50,
      });
      const read = () => ({
        columns: paneLayer.style.gridTemplateColumns,
        handles: [...document.querySelectorAll('[data-v6-pane-resize-handle]')].map((handle) => ({
          axis: handle.dataset.v6PaneResizeAxis,
          handle: handle.dataset.v6PaneResizeHandle,
          left: handle.style.left,
          region: handle.dataset.v6PaneResizeRegion,
          right: handle.style.right,
          top: handle.style.top,
          variant: handle.dataset.v6PaneResizeVariant,
        })),
        rows: paneLayer.style.gridTemplateRows,
        state: surface.getState().paneResize,
        variant: document.querySelector('[data-v6-chart-surface]').dataset.v6ChartLayoutVariant,
      });

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice', variant: 'twice-horizontal' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const horizontalBefore = read();
      surface.resizePaneByHandle('rows:0', { clientY: 500 });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const horizontalAfter = read();

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'triple', variant: 'triple-right-stack' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const stackBefore = read();
      surface.resizePaneByHandle('columns:0', { clientX: 370 });
      surface.resizePaneByHandle('rows:0', { clientY: 410 });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const stackAfter = read();

      return { horizontalAfter, horizontalBefore, stackAfter, stackBefore };
    })()))()
  `));

  assert.equal(value.horizontalBefore.variant, 'twice-horizontal');
  assert.deepEqual(value.horizontalBefore.handles.map((handle) => [handle.handle, handle.axis]), [
    ['rows:0', 'rows'],
  ]);
  assert.equal(normalizeTemplate(value.horizontalBefore.rows), 'minmax(0, 50fr) minmax(0, 50fr)');
  assert.equal(normalizeTemplate(value.horizontalAfter.rows), 'minmax(0, 75fr) minmax(0, 25fr)');
  assert.deepEqual(value.horizontalAfter.state.ratios.rows.map(Math.round), [75, 25]);

  assert.equal(value.stackBefore.variant, 'triple-right-stack');
  assert.deepEqual(value.stackBefore.handles.map((handle) => [handle.handle, handle.region]), [
    ['rows:0', 'right'],
    ['columns:0', 'full'],
  ]);
  assert.equal(normalizeTemplate(value.stackAfter.columns), 'minmax(0, 30fr) minmax(0, 70fr)');
  assert.equal(normalizeTemplate(value.stackAfter.rows), 'minmax(0, 60fr) minmax(0, 40fr)');
  assert.deepEqual(value.stackAfter.state.ratios.columns.map(Math.round), [30, 70]);
  assert.deepEqual(value.stackAfter.state.ratios.rows.map(Math.round), [60, 40]);
} finally {
  await page.cleanup();
}

console.log('v6 pane resize drag browser step 165 smoke passed');
