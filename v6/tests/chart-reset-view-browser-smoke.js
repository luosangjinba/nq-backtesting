import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        applyState = await commands.dispatchCommand('chartEntryProjectionApply.getState');
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      const initialViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const initialChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const initialReplay = await commands.dispatchCommand('replay.getState');

      return {
        bridgeMounted: Boolean(root.__v6ResetViewControl?.resetView),
        hostRect: {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
        initialBarCount: initialChart.bars?.length || 0,
        initialIntent: initialViewport.intent,
        initialProjection: initialViewport.projection,
        initialReplay,
        resetButtonExists: Boolean(document.querySelector('[data-v6-reset-view]')),
      };
    })()))()
  `));

  assert.equal(setup.bridgeMounted, true);
  assert.equal(setup.resetButtonExists, true);
  assert.equal(setup.initialIntent.origin, 'default');
  assert.equal(setup.initialIntent.latestOffsetBars, 12);

  const startX = setup.hostRect.left + (setup.hostRect.width * 0.58);
  const startY = setup.hostRect.top + (setup.hostRect.height * 0.52);
  await page.client.send('Input.dispatchMouseEvent', {
    deltaX: 0,
    deltaY: -520,
    type: 'mouseWheel',
    x: startX,
    y: startY,
  });
  await page.client.send('Input.dispatchMouseEvent', {
    deltaX: 180,
    deltaY: 0,
    type: 'mouseWheel',
    x: startX,
    y: startY,
  });

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const root = document.querySelector('[data-v6-root]');

      const waitForManual = async () => {
        for (let attempt = 0; attempt < 50; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          const viewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
          if (viewport.intent.origin === 'manual') return viewport;
        }
        return commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      };

      const manualViewport = await waitForManual();
      const manualSurface = root.__v6WorkstationChartSurface.getState();
      const manualVisibleRange = manualSurface.panes[0]?.snapshot?.visibleLogicalRange;
      const chartBeforeReset = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const replayBeforeReset = await commands.dispatchCommand('replay.getState');

      document.querySelector('[data-v6-reset-view]').click();
      let resetViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const deadline = performance.now() + 5000;
      while (resetViewport.intent.origin !== 'default' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        resetViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      resetViewport = await commands.dispatchCommand('chartViewport.getPane', { paneId: 'main' });
      const chartAfterReset = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const replayAfterReset = await commands.dispatchCommand('replay.getState');
      const resetSurface = root.__v6WorkstationChartSurface.getState();
      const resetVisibleRange = resetSurface.panes[0]?.snapshot?.visibleLogicalRange;
      const latestLogicalIndex = Math.max(0, (chartAfterReset.bars?.length || 0) - 1);

      return {
        chartAfterResetCount: chartAfterReset.bars?.length || 0,
        chartBeforeResetCount: chartBeforeReset.bars?.length || 0,
        latestLogicalIndex,
        manual: {
          appliedViewport: manualSurface.appliedViewport[0],
          intent: manualViewport.intent,
          projection: manualViewport.projection,
          visibleRange: manualVisibleRange,
        },
        replayAfterReset,
        replayBeforeReset,
        reset: {
          appliedViewport: resetSurface.appliedViewport[0],
          intent: resetViewport.intent,
          projection: resetViewport.projection,
          visibleRange: resetVisibleRange,
        },
      };
    })()))()
  `));

  assert.equal(value.manual.intent.origin, 'manual');
  assert.equal(Number.isFinite(value.manual.intent.latestOffsetBars), true);
  assert.equal(value.manual.intent.latestOffsetBars !== setup.initialIntent.latestOffsetBars, true);
  assert.equal(value.reset.intent.origin, 'default');
  assert.equal(value.reset.intent.latestOffsetBars, setup.initialIntent.latestOffsetBars);
  assert.equal(value.reset.intent.spanBars, null);
  assert.equal(value.reset.projection.origin, 'default');
  assert.equal(value.reset.projection.latestOffsetBars, setup.initialProjection.latestOffsetBars);
  assert.equal(value.reset.projection.to - value.latestLogicalIndex, setup.initialProjection.latestOffsetBars);
  assert.equal(value.reset.appliedViewport.origin, 'default');
  assert.equal(value.reset.visibleRange.to - value.latestLogicalIndex, setup.initialProjection.latestOffsetBars);
  assert.equal(value.chartAfterResetCount, value.chartBeforeResetCount);
  assert.deepEqual(value.replayAfterReset, value.replayBeforeReset);
  assert.equal(value.replayAfterReset.cursorIndex, setup.initialReplay.cursorIndex);
  assert.notDeepEqual(value.manual.projection, value.reset.projection);
} finally {
  await page.cleanup();
}

console.log('v6 chart reset view browser smoke passed');
