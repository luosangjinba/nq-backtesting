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
      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_SYNC, { key: 'dateRange', value: true });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const bridge = root.__v6LayoutSyncSurfaceBridge;
      const disabledBeforeSync = bridge.getState().enabled;
      const records = bridge.syncVisibleRange({ paneId: 'main', from: 7, to: 37 });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const state = root.__v6WorkstationChartSurface.getState();

      return {
        disabledBeforeSync,
        records,
        bridgeState: bridge.getState(),
        appliedViewport: state.appliedViewport,
        visiblePaneIds: state.layout.visiblePaneIds,
      };
    })()))()
  `));

  assert.equal(value.disabledBeforeSync, true);
  assert.deepEqual(value.visiblePaneIds, ['main', 'secondary']);
  assert.deepEqual(value.records.map((record) => record.paneId), ['secondary']);
  assert.equal(value.records[0].projection.origin, 'layout-sync');
  assert.equal(value.records[0].projection.from, 7);
  assert.equal(value.records[0].projection.to, 37);
  assert.deepEqual(value.appliedViewport.map((record) => record.paneId), ['secondary']);
  assert.equal(value.appliedViewport[0].origin, 'layout-sync');
  assert.equal(value.bridgeState.appliedRecords[0].sourcePaneId, 'main');
} finally {
  await page.cleanup();
}

console.log('v6 layout sync visible range browser step 166 smoke passed');
