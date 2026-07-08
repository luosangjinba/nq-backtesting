import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      function latestVisible(chartRecord, surfaceState) {
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        const visibleRange = surfaceState.panes[0]?.snapshot?.visibleLogicalRange;
        return Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        );
      }

      async function waitForApplied() {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        return applyState;
      }

      async function readSnapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const cache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const surface = root.__v6WorkstationChartSurface.getState();
        return {
          barCount: chart.bars?.length || 0,
          cache,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          replay,
          visibleLatest: latestVisible(chart, surface),
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initial = await readSnapshot();
      const historyExtensions = [];
      for (let index = 0; index < 3; index += 1) {
        const extension = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
          paneId: 'main',
          visibleRange: { from: -4, to: 20 },
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        historyExtensions.push(extension);
      }

      const afterHistory = await readSnapshot();
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));

      const playStartedAt = performance.now();
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      let afterAuto = await readSnapshot();
      let autoState = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      const deadline = playStartedAt + 5000;
      while (
        (afterAuto.barCount < afterHistory.barCount + 2 || !afterAuto.visibleLatest) &&
        autoState.status !== 'error' &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        afterAuto = await readSnapshot();
        autoState = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      }

      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      autoState = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      const transportState = root.__v6ReplayTransport.getState();

      return {
        afterAuto,
        afterHistory,
        applyState,
        autoState,
        historyExtensions,
        initial,
        transportDataset: {
          playback: document.querySelector('[data-v6-transport]').dataset.playback,
          speed: document.querySelector('[data-v6-transport]').dataset.speed,
        },
        transportState,
        visibleLatencyMs: performance.now() - playStartedAt,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.historyExtensions.length, 3);
  for (const extension of value.historyExtensions) {
    assert.equal(extension.status, 'loaded');
    assert.equal(extension.extension.plannedWindow.requestCap, 'canvas-left');
    assert.equal(extension.extension.plannedWindow.historyRequest, 'older-window');
  }
  assert.equal(value.afterHistory.barCount > value.initial.barCount, true);
  assert.equal(value.afterHistory.cache.windowCount > value.initial.cache.windowCount, true);
  assert.deepEqual(value.afterHistory.replay, value.initial.replay);

  assert.equal(value.autoState.error, null);
  assert.equal(value.autoState.playing, false);
  assert.equal(value.autoState.speed, 4);
  assert.equal(value.transportState.playing, false);
  assert.equal(value.transportState.speed, 4);
  assert.equal(value.transportDataset.playback, 'paused');
  assert.equal(value.transportDataset.speed, '4');
  assert.equal(value.afterAuto.barCount >= value.afterHistory.barCount + 2, true, JSON.stringify(value));
  assert.equal(value.afterAuto.latestTimestamp > value.afterHistory.latestTimestamp, true);
  assert.equal(value.afterAuto.replay.cursorIndex >= value.afterHistory.replay.cursorIndex + 2, true);
  assert.equal(value.afterAuto.replay.revealedCount >= value.afterHistory.replay.revealedCount + 2, true);
  assert.equal(value.afterAuto.cache.windowCount >= value.afterHistory.cache.windowCount, true);
  assert.equal(value.afterAuto.visibleLatest, true);
  assert.equal(value.visibleLatencyMs < 1800, true);
} finally {
  await page.cleanup();
}

console.log('v6 auto play continuous history browser step 152 smoke passed');
