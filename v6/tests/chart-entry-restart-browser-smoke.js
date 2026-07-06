import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      const waitForInitialApply = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand('replay.getState');
        let chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        while (
          (!replay || replay.cursorIndex !== 0 || replay.status !== 'ready' || !chart.bars?.length) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand('replay.getState');
          chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { chart, replay };
      };

      await commands.dispatchCommand('session.create', {
        endTime: '2026-06-01T09:34:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForInitialApply();
      const initialViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });

      await commands.dispatchCommand('playbackPeriod.setPeriod', { period: '15m' });
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      const endDeadline = performance.now() + 5000;
      let endedReplay = await commands.dispatchCommand('replay.getState');
      while (endedReplay.status !== 'ended' && performance.now() < endDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        endedReplay = await commands.dispatchCommand('replay.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const endedChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const restartButton = document.querySelector('[data-v6-transport-action="restart"]');
      const playButton = document.querySelector('[data-v6-transport-action="play-toggle"]');
      const resetBeforeRestart = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const restartBefore = {
        ended: document.querySelector('[data-v6-transport]').dataset.ended,
        playDisabled: playButton.disabled,
        restartButtonMarked: restartButton.hasAttribute('data-v6-transport-restart'),
        restartDisabled: restartButton.disabled,
        restartLabel: restartButton.getAttribute('aria-label'),
        restartTitle: restartButton.getAttribute('title'),
        restartSvg: restartButton.querySelector('svg')?.innerHTML || '',
      };

      restartButton.click();
      const restartDeadline = performance.now() + 5000;
      let restartState = await commands.dispatchCommand('chartEntryRestart.getState');
      let restarted = await commands.dispatchCommand('replay.getState');
      let restartedChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      let transportEnded = document.querySelector('[data-v6-transport]').dataset.ended;
      while (
        (
          restartState.status !== 'restarted' ||
          !restarted ||
          restarted.cursorIndex !== 0 ||
          restarted.status !== 'ready' ||
          (restartedChart.bars?.length || 0) >= (endedChart.bars?.length || 0) ||
          transportEnded !== 'false'
        ) &&
        performance.now() < restartDeadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        restartState = await commands.dispatchCommand('chartEntryRestart.getState');
        restarted = await commands.dispatchCommand('replay.getState');
        restartedChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
        transportEnded = document.querySelector('[data-v6-transport]').dataset.ended;
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const restartedViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const surface = root.__v6WorkstationChartSurface.getState();
      const paneSnapshot = surface.panes[0]?.snapshot || {};
      const visibleRange = paneSnapshot.visibleLogicalRange;
      const latestLogicalIndex = Math.max(0, (restartedChart.bars?.length || 0) - 1);
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );

      return {
        endedBarCount: endedChart.bars?.length || 0,
        endedReplay,
        initialBarCount: initial.chart.bars?.length || 0,
        initialReplay: initial.replay,
        initialViewportIntent: initialViewport.intent,
        latestVisible,
        resetBeforeRestartIntent: resetBeforeRestart.intent,
        restartBefore,
        restartState,
        restartedBarCount: restartedChart.bars?.length || 0,
        restartedReplay: restarted,
        restartedTransport: {
          ended: document.querySelector('[data-v6-transport]').dataset.ended,
          playDisabled: playButton.disabled,
          restartDisabled: restartButton.disabled,
        },
        restartedViewportIntent: restartedViewport.intent,
        surfaceDataLength: paneSnapshot.dataLength || 0,
      };
    })()))()
  `));

  assert.equal(value.initialReplay.cursorIndex, 0);
  assert.equal(value.initialReplay.status, 'ready');
  assert.equal(value.endedReplay.status, 'ended');
  assert.equal(value.endedReplay.cursorIndex, 4);
  assert.equal(value.endedBarCount > value.initialBarCount, true);
  assert.equal(value.restartBefore.ended, 'true');
  assert.equal(value.restartBefore.playDisabled, true);
  assert.equal(value.restartBefore.restartButtonMarked, true);
  assert.equal(value.restartBefore.restartDisabled, false);
  assert.equal(value.restartBefore.restartLabel, 'Restart replay');
  assert.equal(value.restartBefore.restartTitle, 'Restart replay');
  assert.equal(value.restartBefore.restartSvg.includes('M3 12a9 9'), true);
  assert.equal(value.restartBefore.restartSvg.includes('M19 5v14'), false);
  assert.equal(value.restartState.status, 'restarted');
  assert.equal(value.restartState.restarted.sessionId, value.initialReplay.sessionId);
  assert.equal(value.restartedReplay.cursorIndex, 0);
  assert.equal(value.restartedReplay.status, 'ready');
  assert.equal(value.restartedBarCount < value.endedBarCount, true);
  assert.equal(value.surfaceDataLength, value.restartedBarCount);
  assert.equal(value.latestVisible, true);
  assert.equal(value.restartedTransport.ended, 'false');
  assert.equal(value.restartedTransport.playDisabled, false);
  assert.equal(value.restartedTransport.restartDisabled, true);
  assert.equal(value.resetBeforeRestartIntent.origin, 'default');
  assert.equal(value.restartedViewportIntent.origin, 'default');
  assert.equal(value.restartedViewportIntent.latestOffsetBars, value.initialViewportIntent.latestOffsetBars);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry restart browser smoke passed');
