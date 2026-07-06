import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commandsModule = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      const playButton = document.querySelector('[data-v6-transport-action="play-toggle"]');

      await root.__v6SessionDashboard.createSession({
        endTime: '2026-06-01T09:34:00.000Z',
        id: 'policy-browser-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });

      const applyDeadline = performance.now() + 5000;
      let applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < applyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commandsModule.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const beforeChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const beforeReplay = await commandsModule.dispatchCommand('replay.getState');

      speedSlider.value = '1';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
      playButton.click();

      const firstTickDeadline = performance.now() + 5000;
      let afterFirstTickChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
      let autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      while (
        (afterFirstTickChart.bars?.length || 0) < (beforeChart.bars?.length || 0) + 1 &&
        autoState.status !== 'error' &&
        performance.now() < firstTickDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        afterFirstTickChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
        autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      }

      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
      const speedDeadline = performance.now() + 1000;
      let speedChangedState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      while (speedChangedState.speed !== 4 && performance.now() < speedDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        speedChangedState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      }

      const endDeadline = performance.now() + 5000;
      let endedReplay = await commandsModule.dispatchCommand('replay.getState');
      autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      while (
        endedReplay.status !== 'ended' &&
        autoState.status !== 'error' &&
        performance.now() < endDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        endedReplay = await commandsModule.dispatchCommand('replay.getState');
        autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      }
      while (
        endedReplay.status === 'ended' &&
        autoState.status === 'playing' &&
        performance.now() < endDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        autoState = await commandsModule.dispatchCommand('chartEntryAutoPlay.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const afterChart = await commandsModule.dispatchCommand('chartData.getBars', { paneId: 'main' });
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
        afterFirstTickBarCount: afterFirstTickChart.bars?.length || 0,
        afterSurfaceDataLength: paneSnapshot.dataLength || 0,
        appliedBefore: applyState.status,
        autoState,
        beforeBarCount: beforeChart.bars?.length || 0,
        beforeReplay,
        endedReplay,
        latestVisible,
        speedChangedState,
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
  assert.equal(value.afterFirstTickBarCount >= value.beforeBarCount + 1, true, JSON.stringify(value));
  assert.equal(value.speedChangedState.playing, true);
  assert.equal(value.speedChangedState.speed, 4);
  assert.equal(value.endedReplay.status, 'ended');
  assert.equal(value.autoState.error, null);
  assert.equal(value.autoState.status, 'ended');
  assert.equal(value.autoState.playing, false);
  assert.equal(value.autoState.speed, 4);
  assert.equal(value.transportState.playing, false);
  assert.equal(value.transportState.speed, 4);
  assert.equal(value.transportDataset.playback, 'paused');
  assert.equal(value.transportDataset.speed, '4');
  assert.equal(value.afterBarCount, value.beforeBarCount + 4);
  assert.equal(value.endedReplay.cursorIndex, value.beforeReplay.cursorIndex + 4);
  assert.equal(value.afterSurfaceDataLength, value.afterBarCount);
  assert.equal(value.surfaceAppliedChartData[0].barCount, value.afterBarCount);
  assert.equal(value.latestVisible, true);
  assert.equal(Boolean(value.surfaceVisibleRange), true);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry playback policy browser smoke passed');
