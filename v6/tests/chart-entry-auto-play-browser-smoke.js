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
      const applyDeadline = performance.now() + 5000;
      let applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < applyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));

      const beforeChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const beforeReplay = await commandsModule.dispatchCommand('replay.getState');

      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      const deadline = performance.now() + 5000;
      let afterChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      let autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      while (
        (afterChart.bars?.length || 0) < (beforeChart.bars?.length || 0) + 2 &&
        autoState.status !== 'error' &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        afterChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
        autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      }

      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      afterChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const afterReplay = await commandsModule.dispatchCommand('replay.getState');
      autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      const transportState = root.__v6ReplayTransport.getState();
      const surface = root.__v6WorkstationChartSurface.getState();
      const paneSnapshot = surface.panes[0]?.snapshot || {};
      const visibleRange = paneSnapshot.visibleLogicalRange;
      const latestLogicalIndex = Math.max(0, (afterChart.bars?.length || 0) - 1);
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );

      return {
        afterBarCount: afterChart.bars?.length || 0,
        afterReplay,
        afterSurfaceDataLength: paneSnapshot.dataLength || 0,
        appliedBefore: applyState.status,
        autoState,
        beforeBarCount: beforeChart.bars?.length || 0,
        beforeReplay,
        latestVisible,
        surfaceAppliedChartData: surface.appliedChartData,
        surfaceVisibleRange: visibleRange,
        transportDataset: {
          playback: document.querySelector('[data-v6-transport]').dataset.playback,
          speed: document.querySelector('[data-v6-transport]').dataset.speed,
        },
        transportState,
      };
    })()))()
  `));

  assert.equal(value.appliedBefore, 'applied');
  assert.equal(value.autoState.error, null);
  assert.equal(value.autoState.playing, false);
  assert.equal(value.autoState.speed, 4);
  assert.equal(value.transportState.playing, false);
  assert.equal(value.transportState.speed, 4);
  assert.equal(value.transportDataset.playback, 'paused');
  assert.equal(value.transportDataset.speed, '4');
  assert.equal(value.afterBarCount >= value.beforeBarCount + 2, true, JSON.stringify(value));
  assert.equal(value.afterReplay.cursorIndex >= value.beforeReplay.cursorIndex + 2, true);
  assert.equal(value.afterReplay.revealedCount >= value.beforeReplay.revealedCount + 2, true);
  assert.equal(value.afterSurfaceDataLength, value.afterBarCount);
  assert.equal(value.surfaceAppliedChartData[0].barCount, value.afterBarCount);
  assert.equal(value.latestVisible, true);
  assert.equal(Boolean(value.surfaceVisibleRange), true);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry auto play browser smoke passed');
