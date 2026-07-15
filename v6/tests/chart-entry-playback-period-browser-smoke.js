import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      const waitForApplied = async () => {
        const deadline = performance.now() + 5000;
        let state = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        while (state.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          state = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return state;
      };

      const waitForBars = async (targetCount) => {
        const deadline = performance.now() + 5000;
        let chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        let replay = await commands.dispatchCommand('replay.getState');
        while ((chart.bars?.length || 0) < targetCount && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
          replay = await commands.dispatchCommand('replay.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { chart, replay };
      };

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const before = await waitForBars(1);

      await commands.dispatchCommand('playbackPeriod.setPeriod', { period: '3m' });
      document.querySelector('[data-v6-transport-action="next"]').click();
      const afterManual = await waitForBars((before.chart.bars?.length || 0) + 3);
      const manualState = await commands.dispatchCommand('chartEntryManualNext.getState');

      await commands.dispatchCommand('playbackPeriod.setSync', { sync: true });
      const activePane = await commands.dispatchCommand('pane.getActive');
      await commands.dispatchCommand('pane.setDisplayTimeframe', {
        displayTimeframe: 5,
        paneId: activePane.id,
      });
      const syncedPeriod = await commands.dispatchCommand('playbackPeriod.getState');
      document.querySelector('[data-v6-transport-action="next"]').click();
      const afterSynced = await waitForBars((afterManual.chart.bars?.length || 0) + 2);
      const syncedState = await commands.dispatchCommand('chartEntryManualNext.getState');
      const surface = root.__v6WorkstationChartSurface.getState();

      return {
        afterManualBarCount: afterManual.chart.bars?.length || 0,
        afterManualReplay: afterManual.replay,
        afterSyncedBarCount: afterSynced.chart.bars?.length || 0,
        afterSyncedReplay: afterSynced.replay,
        appliedBefore: applyState.status,
        beforeBarCount: before.chart.bars?.length || 0,
        beforeReplay: before.replay,
        manualState,
        surfaceDataLength: surface.panes[0]?.snapshot?.dataLength || 0,
        syncedPeriod,
        syncedState,
      };
    })()))()
  `));

  assert.equal(value.appliedBefore, 'applied');
  assert.equal(value.manualState.status, 'advanced', value.manualState.error || 'manual period should advance');
  assert.equal(value.manualState.advanced.playbackPeriod, '3m');
  assert.equal(value.manualState.advanced.stepCount, 3);
  assert.equal(value.manualState.advanced.appendedBarCount, 3);
  assert.equal(value.afterManualReplay.cursorIndex, value.beforeReplay.cursorIndex + 3);
  assert.equal(value.afterManualReplay.revealedCount, value.beforeReplay.revealedCount + 3);
  assert.equal(value.afterManualBarCount, value.beforeBarCount + 3);
  assert.equal(value.syncedPeriod.period, '5m');
  assert.equal(value.syncedPeriod.sync, true);
  assert.equal(value.syncedState.status, 'advanced', value.syncedState.error || 'synced period should advance');
  assert.equal(value.syncedState.advanced.playbackPeriod, '5m');
  assert.equal(value.syncedState.advanced.stepCount, 2);
  assert.equal(value.syncedState.advanced.appendedBarCount, 2);
  assert.equal(value.afterSyncedReplay.cursorIndex, value.afterManualReplay.cursorIndex + 2);
  assert.equal(value.afterSyncedReplay.revealedCount, value.afterManualReplay.revealedCount + 2);
  assert.equal(value.afterSyncedBarCount > 0, true);
  assert.equal(value.surfaceDataLength, value.afterSyncedBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry playback period browser smoke passed');
