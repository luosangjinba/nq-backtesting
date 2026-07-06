import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      const waitForApplied = async () => {
        const deadline = performance.now() + 5000;
        let state = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        while (state.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = await commands.dispatchCommand('chartEntryProjectionApply.getState');
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return state;
      };

      await commands.dispatchCommand('session.create', {
        endTime: '2026-06-01T09:34:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const applyState = await waitForApplied();
      await commands.dispatchCommand('playbackPeriod.setPeriod', { period: '15m' });

      const beforeChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const beforeReplay = await commands.dispatchCommand('replay.getState');
      const startedAt = performance.now();
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      const deadline = performance.now() + 5000;
      let autoState = await commands.dispatchCommand('chartEntryAutoPlay.getState');
      let afterChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      let afterReplay = await commands.dispatchCommand('replay.getState');
      while (
        autoState.status !== 'ended' &&
        autoState.status !== 'error' &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        autoState = await commands.dispatchCommand('chartEntryAutoPlay.getState');
        afterChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        afterReplay = await commands.dispatchCommand('replay.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const visibleAt = performance.now();
      const surface = root.__v6WorkstationChartSurface.getState();
      const paneSnapshot = surface.panes[0]?.snapshot || {};
      const visibleRange = paneSnapshot.visibleLogicalRange;
      const latestLogicalIndex = Math.max(0, (afterChart.bars?.length || 0) - 1);
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );
      const playButton = document.querySelector('[data-v6-transport-action="play-toggle"]');
      const nextButton = document.querySelector('[data-v6-transport-action="next"]');

      document.querySelector('[data-v6-transport-period-details]').open = true;
      document.querySelector('[data-v6-transport-period-option="3m"]').click();
      const waitForPeriod = async (predicate) => {
        const periodDeadline = performance.now() + 3000;
        let state = await commands.dispatchCommand('playbackPeriod.getState');
        while (!predicate(state) && performance.now() < periodDeadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = await commands.dispatchCommand('playbackPeriod.getState');
        }
        return state;
      };
      const periodAfterMenu = await waitForPeriod((state) => state.period === '3m' && !state.sync);
      const syncToggle = document.querySelector('[data-v6-transport-period-sync]');
      syncToggle.checked = true;
      syncToggle.dispatchEvent(new Event('change', { bubbles: true }));
      const periodAfterSync = await waitForPeriod((state) => state.sync === true);

      return {
        afterBarCount: afterChart.bars?.length || 0,
        afterReplay,
        appliedBefore: applyState.status,
        autoState,
        beforeBarCount: beforeChart.bars?.length || 0,
        beforeReplay,
        latestVisible,
        periodAfterMenu,
        periodAfterSync,
        playbackPeriod: await commands.dispatchCommand('playbackPeriod.getState'),
        surfaceDataLength: paneSnapshot.dataLength || 0,
        transport: {
          ended: document.querySelector('[data-v6-transport]').dataset.ended,
          nextDisabled: nextButton.disabled,
          nextLabel: nextButton.getAttribute('aria-label'),
          playbackStatus: document.querySelector('[data-v6-transport]').dataset.playbackStatus,
          playDisabled: playButton.disabled,
          playLabel: playButton.getAttribute('aria-label'),
        },
        visibleLatencyMs: visibleAt - startedAt,
        visibleRange,
      };
    })()))()
  `));

  assert.equal(setup.appliedBefore, 'applied');
  assert.equal(setup.beforeReplay.totalBars, 5);
  assert.equal(setup.afterReplay.status, 'ended');
  assert.equal(setup.afterReplay.cursorIndex, 4);
  assert.equal(setup.afterReplay.revealedCount, 5);
  assert.equal(setup.afterBarCount, setup.beforeBarCount + 4);
  assert.equal(setup.autoState.status, 'ended');
  assert.equal(setup.autoState.playing, false);
  assert.equal(setup.autoState.lastTick.replayState.status, 'ended');
  assert.equal(setup.transport.ended, 'true');
  assert.equal(setup.transport.playbackStatus, 'ended');
  assert.equal(setup.transport.playDisabled, true);
  assert.equal(setup.transport.playLabel, 'Replay ended');
  assert.equal(setup.transport.nextDisabled, true);
  assert.equal(setup.transport.nextLabel, 'Replay ended');
  assert.equal(setup.periodAfterMenu.period, '3m');
  assert.equal(setup.periodAfterMenu.sync, false);
  assert.equal(setup.periodAfterSync.sync, true);
  assert.equal(setup.playbackPeriod.sync, true);
  assert.equal(setup.surfaceDataLength, setup.afterBarCount);
  assert.equal(setup.latestVisible, true);
  assert.equal(Boolean(setup.visibleRange), true);
  assert.equal(setup.visibleLatencyMs < 5000, true);

  const resetValue = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');

      const periodBeforeReset = await commands.dispatchCommand('playbackPeriod.getState');
      const chartBeforeReset = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const replayBeforeReset = await commands.dispatchCommand('replay.getState');
      const manualViewport = await commands.dispatchCommand('chartViewport.setManualIntent', {
        latestOffsetBars: 3,
        paneId: 'main',
        spanBars: 48,
      });

      document.querySelector('[data-v6-reset-view]').click();
      const deadline = performance.now() + 3000;
      let resetViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      while (resetViewport.intent.origin !== 'default' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        resetViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const chartAfterReset = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const replayAfterReset = await commands.dispatchCommand('replay.getState');
      const periodAfterReset = await commands.dispatchCommand('playbackPeriod.getState');

      return {
        chartAfterResetCount: chartAfterReset.bars?.length || 0,
        chartBeforeResetCount: chartBeforeReset.bars?.length || 0,
        manualIntent: manualViewport.intent,
        periodAfterReset,
        periodBeforeReset,
        replayAfterReset,
        replayBeforeReset,
        resetIntent: resetViewport.intent,
      };
    })()))()
  `));

  assert.equal(resetValue.manualIntent.origin, 'manual');
  assert.equal(resetValue.resetIntent.origin, 'default');
  assert.deepEqual(resetValue.periodAfterReset, resetValue.periodBeforeReset);
  assert.deepEqual(resetValue.replayAfterReset, resetValue.replayBeforeReset);
  assert.equal(resetValue.chartAfterResetCount, resetValue.chartBeforeResetCount);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry playback period boundary browser smoke passed');
