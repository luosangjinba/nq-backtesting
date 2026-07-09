import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function comparableBars(bars = []) {
  return bars.map(({ close, high, low, open, timestamp }) => ({
    close,
    high,
    low,
    open,
    timestamp,
  }));
}

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      const waitForApplied = async () => {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return applyState;
      };

      const activePane = await commands.dispatchCommand('pane.getActive');
      await commands.dispatchCommand('pane.setDisplayTimeframe', {
        displayTimeframe: 5,
        paneId: activePane.id,
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const preparationState = await commands.dispatchCommand('chartEntryProjectionPreparation.getState');
      const projectionState = await commands.dispatchCommand('chartDataProjection.getState');
      const chartRecord = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const viewportRecord = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const paneAfter = await commands.dispatchCommand('pane.getById', activePane.id);
      const surface = root.__v6WorkstationChartSurface.getState();

      return {
        applyState,
        chartRecord,
        paneAfter,
        preparationState,
        projectionState,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
        surfaceDataLength: surface.panes[0]?.snapshot?.dataLength || 0,
        viewportRecord,
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.chart-data-projection'), true);
  assert.equal(value.paneAfter.displayTimeframe, 5);
  assert.equal(value.preparationState.status, 'prepared');
  assert.equal(value.preparationState.prepared.projectionSource.owner, 'runtime.chart-data-projection');
  assert.equal(value.preparationState.prepared.projectionSource.sourceTimeframe, 1);
  assert.equal(value.preparationState.prepared.projectionSource.targetTimeframe, 5);
  assert.equal(value.projectionState.projectionRevision > 0, true);
  assert.equal(value.projectionState.lastProjection.paneId, 'main');
  assert.equal(value.projectionState.lastProjection.targetTimeframe, 5);
  assert.equal(value.projectionState.lastProjection.buckets.length, value.preparationState.prepared.projectionSource.bucketCount);
  assert.equal(value.chartRecord.paneId, 'main');
  assert.deepEqual(comparableBars(value.chartRecord.bars), value.projectionState.lastProjection.bars);
  assert.deepEqual(comparableBars(value.applyState.applied.chartRecord.bars), comparableBars(value.chartRecord.bars));
  assert.equal(value.viewportRecord.paneId, 'main');
  assert.equal(value.viewportRecord.intent.cursorTimestamp, value.preparationState.prepared.viewportIntentPayload.cursorTimestamp);
  assert.equal(value.surfaceDataLength, value.chartRecord.bars.length);
  assert.equal(value.projectionState.lastProjection.buckets.at(-1).cursorCapped, true);
} finally {
  await page.cleanup();
}

console.log('v6 initial HTF chart entry browser step 195 smoke passed');
