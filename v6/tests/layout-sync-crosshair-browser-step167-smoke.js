import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1280 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSyncSurfaceBridge.ready;

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, { mode: 'twice' });
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_SYNC, { key: 'crosshair', value: true });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const bridge = root.__v6LayoutSyncSurfaceBridge;
      const records = bridge.syncCrosshair({
        bar: { close: 30542, high: 30545, low: 30539, open: 30540, timestamp: 100 },
        paneId: 'main',
        point: { x: 20, y: 30 },
        time: 100,
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const clearRecords = bridge.syncCrosshair({
        bar: null,
        paneId: 'main',
        point: null,
        time: null,
      });

      return {
        bridgeState: bridge.getState(),
        clearRecords,
        records,
        surfaceHasProjectionApi: typeof root.__v6WorkstationChartSurface.applyCrosshairProjection === 'function',
        visiblePaneIds: root.__v6WorkstationChartSurface.getState().layout.visiblePaneIds,
      };
    })()))()
  `));

  assert.equal(value.surfaceHasProjectionApi, true);
  assert.deepEqual(value.visiblePaneIds, ['main', 'secondary']);
  assert.equal(value.bridgeState.crosshairEnabled, true);
  assert.deepEqual(value.records.map((record) => record.paneId), ['secondary']);
  assert.equal(value.records[0].price, 30542);
  assert.equal(value.records[0].time, 100);
  assert.equal(value.records[0].origin, 'layout-sync');
  assert.deepEqual(value.clearRecords.map((record) => [record.paneId, record.clear]), [
    ['secondary', true],
  ]);
} finally {
  await page.cleanup();
}

console.log('v6 layout sync crosshair browser step 167 smoke passed');
