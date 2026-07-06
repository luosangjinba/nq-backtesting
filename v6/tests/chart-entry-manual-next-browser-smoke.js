import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commandsModule = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const beforeReplay = await commandsModule.dispatchCommand('replay.getState');
      const beforeSurface = root.__v6WorkstationChartSurface.getState();

      document.querySelector('[data-v6-transport-action="next"]').click();
      let nextState = await commandsModule.dispatchCommand('chartEntryManualNext.getState');
      while (nextState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        nextState = await commandsModule.dispatchCommand('chartEntryManualNext.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const afterReplay = await commandsModule.dispatchCommand('replay.getState');
      const defaultWallState = await commandsModule.dispatchCommand('defaultWall.getState');
      const afterSurface = root.__v6WorkstationChartSurface.getState();
      const paneSnapshot = afterSurface.panes[0]?.snapshot || {};
      const visibleRange = paneSnapshot.visibleLogicalRange;
      const latestLogicalIndex = Math.max(0, (afterChart.bars?.length || 0) - 1);
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );

      return {
        afterBarCount: afterChart.bars?.length || 0,
        afterLastTimestamp: afterChart.bars?.at(-1)?.timestamp || null,
        afterReplay,
        afterSurfaceDataLength: paneSnapshot.dataLength || 0,
        appliedBefore: applyState.status,
        beforeBarCount: beforeChart.bars?.length || 0,
        beforeLastTimestamp: beforeChart.bars?.at(-1)?.timestamp || null,
        beforeReplay,
        beforeSurfaceDataLength: beforeSurface.panes[0]?.snapshot?.dataLength || 0,
        defaultWallState,
        latestVisible,
        nextState,
        nextTimestamp: nextState.advanced?.chartRecord?.bars?.at(-1)?.timestamp || null,
        surfaceAppliedChartData: afterSurface.appliedChartData,
        surfaceVisibleRange: visibleRange,
      };
    })()))()
  `));

  assert.equal(value.appliedBefore, 'applied');
  assert.equal(value.nextState.status, 'advanced', value.nextState.error || 'manual next should advance');
  assert.equal(value.defaultWallState, null);
  assert.equal(value.afterReplay.cursorIndex, value.beforeReplay.cursorIndex + 1);
  assert.equal(value.afterReplay.revealedCount, value.beforeReplay.revealedCount + 1);
  assert.equal(value.afterBarCount, value.beforeBarCount + 1, JSON.stringify({
    afterLastTimestamp: value.afterLastTimestamp,
    beforeLastTimestamp: value.beforeLastTimestamp,
    nextState: value.nextState,
    nextTimestamp: value.nextTimestamp,
  }));
  assert.equal(value.afterSurfaceDataLength, value.afterBarCount);
  assert.equal(value.beforeSurfaceDataLength, value.beforeBarCount);
  assert.equal(value.surfaceAppliedChartData[0].barCount, value.afterBarCount);
  assert.equal(value.latestVisible, true);
  assert.equal(Boolean(value.surfaceVisibleRange), true);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry manual next browser smoke passed');
