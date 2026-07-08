import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

async function readValue() {
  return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      function text(selector) {
        return document.querySelector(selector)?.textContent?.trim() || '';
      }
      const surface = document.querySelector('[data-step154-surface-root]')?.__surface;
      return {
        crosshair: surface?.getState().crosshair || [],
        header: {
          close: text('[data-v6-status-close]'),
          high: text('[data-v6-status-high]'),
          low: text('[data-v6-status-low]'),
          open: text('[data-v6-status-open]'),
        },
        readoutDataset: {
          direction: document.querySelector('[data-v6-status-readout]')?.dataset.statusCandleDirection,
          ohlc: document.querySelector('[data-v6-status-readout]')?.dataset.statusOhlc,
        },
      };
    })()))()
  `));
}

async function waitForPane(paneId) {
  const deadline = Date.now() + 3000;
  let value = await readValue();
  while (!value.crosshair.find((record) => record.paneId === paneId && record.bar) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    value = await readValue();
  }
  return value;
}

async function moveUntilPane(rect, paneId) {
  const xFractions = [0.35, 0.5, 0.65, 0.8];
  const yOffsets = [70, 120, 170];
  let value = null;
  for (const yOffset of yOffsets) {
    for (const xFraction of xFractions) {
      await page.client.send('Input.dispatchMouseEvent', {
        button: 'none',
        type: 'mouseMoved',
        x: Math.round(rect.left + rect.width * xFraction),
        y: Math.round(rect.top + yOffset),
      });
      value = await waitForPane(paneId);
      if (value.crosshair.find((record) => record.paneId === paneId && record.bar)) {
        return value;
      }
    }
  }
  return value;
}

try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const { mountWorkstationChartSurface } = await import('/v6/src/chart-engine/workstation-chart-surface.js');
      const { emitEvent } = await import('/v6/src/runtime/events.js');
      const root = document.createElement('section');
      root.dataset.step154SurfaceRoot = '';
      root.style.cssText = 'position:absolute;left:72px;top:96px;width:760px;height:520px;z-index:20;background:#0f1721;';
      root.innerHTML = [
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-a" style="height:250px;width:760px;"></div>',
        '<div data-v6-chart-engine-host data-v6-pane-id="pane-b" style="height:250px;width:760px;margin-top:20px;"></div>',
      ].join('');
      document.body.append(root);

      const surface = mountWorkstationChartSurface(root, { emitEvent });
      root.__surface = surface;
      surface.applyChartDataRecord({
        bars: [
          { close: 101, high: 102, low: 99, open: 100, timestamp: 1780306200 },
          { close: 103, high: 104, low: 100, open: 101, timestamp: 1780306260 },
          { close: 105, high: 106, low: 102, open: 103, timestamp: 1780306320 },
        ],
        paneId: 'pane-a',
        revision: 1,
      });
      surface.applyChartDataRecord({
        bars: [
          { close: 209, high: 212, low: 208, open: 211, timestamp: 1780306200 },
          { close: 207, high: 210, low: 206, open: 209, timestamp: 1780306260 },
          { close: 205, high: 208, low: 204, open: 207, timestamp: 1780306320 },
        ],
        paneId: 'pane-b',
        revision: 1,
      });
      surface.applyViewportProjection({
        chartBarsRevision: 1,
        paneId: 'pane-a',
        projection: { from: -1, origin: 'test', revision: 1, to: 4 },
      });
      surface.applyViewportProjection({
        chartBarsRevision: 1,
        paneId: 'pane-b',
        projection: { from: -1, origin: 'test', revision: 1, to: 4 },
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      function rectFor(paneId) {
        const box = root.querySelector('[data-v6-pane-id="' + paneId + '"]').getBoundingClientRect();
        return { bottom: box.bottom, left: box.left, right: box.right, top: box.top, width: box.width };
      }

      return {
        a: rectFor('pane-a'),
        b: rectFor('pane-b'),
        canvasCount: root.querySelectorAll('canvas').length,
        state: surface.getState(),
      };
    })()))()
  `));

  assert.equal(setup.canvasCount > 0, true);
  assert.deepEqual(setup.state.panes.map((pane) => pane.paneId), ['pane-a', 'pane-b']);

  const afterA = await moveUntilPane(setup.a, 'pane-a');
  const paneA = afterA.crosshair.find((record) => record.paneId === 'pane-a');
  assert.notEqual(paneA?.bar, null);
  assert.equal(paneA.displayReadout, true);
  assert.equal(afterA.header.close, `C ${Number(paneA.bar.close).toFixed(2)}`);
  assert.equal(afterA.readoutDataset.ohlc, 'selected');
  const paneAClose = afterA.header.close;

  const afterB = await moveUntilPane(setup.b, 'pane-b');
  const paneB = afterB.crosshair.find((record) => record.paneId === 'pane-b');
  const storedPaneA = afterB.crosshair.find((record) => record.paneId === 'pane-a');
  assert.notEqual(paneB?.bar, null);
  assert.notEqual(storedPaneA, null);
  assert.equal(paneB.displayReadout, true);
  assert.equal(afterB.header.close, `C ${Number(paneB.bar.close).toFixed(2)}`);
  assert.notEqual(afterB.header.close, paneAClose);
  assert.equal(afterB.readoutDataset.direction, 'down');
} finally {
  await evaluate(page.client, `
    (() => {
      const root = document.querySelector('[data-step154-surface-root]');
      root?.__surface?.destroy?.();
      root?.remove?.();
    })()
  `).catch(() => {});
  await page.cleanup();
}

console.log('v6 multi-pane crosshair readout browser step 154 smoke passed');
