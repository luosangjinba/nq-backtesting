import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const module = await import('/v6/src/chart-engine/lightweight-chart-adapter.js');
      const host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '0';
      host.style.top = '0';
      host.style.width = '640px';
      host.style.height = '360px';
      host.style.zIndex = '-1';
      document.body.appendChild(host);

      const adapter = module.createLightweightChartAdapter({
        chartOptions: {
          height: 360,
          layout: {
            background: { color: '#101722', type: 'solid' },
            textColor: '#dce5eb',
          },
          width: 640,
        },
        seriesOptions: {
          borderVisible: false,
        },
      });
      adapter.mount(host);
      adapter.setData([
        { timestamp: 1780306200, open: 100, high: 101, low: 99, close: 100.5 },
        { timestamp: 1780306260, open: 100.5, high: 102, low: 100, close: 101.5 },
        { timestamp: 1780306320, open: 101.5, high: 103, low: 101, close: 102.5 },
      ]);
      adapter.update({ timestamp: 1780306380, open: 102.5, high: 104, low: 102, close: 103.5 });
      adapter.setVisibleLogicalRange({ from: -10, to: 8 });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const measured = adapter.measureVisibleLogicalRange();
      const snapshot = adapter.snapshot();
      adapter.destroy();
      host.remove();
      return {
        hasLibrary: Boolean(window.LightweightCharts?.createChart),
        measured,
        snapshot,
      };
    })()))()
  `));

  assert.equal(value.hasLibrary, true);
  assert.equal(value.snapshot.mounted, true);
  assert.equal(value.snapshot.dataLength, 4);
  assert.equal(Number.isFinite(value.measured.from), true);
  assert.equal(Number.isFinite(value.measured.to), true);
  assert.equal(value.measured.to > value.measured.from, true);
} finally {
  await page.cleanup();
}

console.log('v6 chart engine browser smoke passed');
