import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'pane-default',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();

      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'main',
      }).catch(() => null);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const cache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const surface = root.__v6WorkstationChartSurface.getState();
      return {
        applyState,
        bridgeMounted: Boolean(root.__v6ResetViewControl?.resetView),
        cache,
        chart,
        hostRect: {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
        projectionState,
        replay,
        surface,
        viewport,
      };
    })()))()
  `));

  assert.equal(setup.applyState.status, 'applied');
  assert.equal(setup.bridgeMounted, true);
  assert.equal(setup.projectionState.lastProjection.targetTimeframe, 5);
  assert.equal(setup.chart.bars.length > 0, true);
  assert.equal(setup.viewport.intent.origin, 'default');

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
    deltaX: 260,
    deltaY: 0,
    type: 'mouseWheel',
    x: startX,
    y: startY,
  });

  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      async function waitForViewport(predicate) {
        const deadline = performance.now() + 5000;
        let viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        while (!predicate(viewport) && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        }
        return viewport;
      }

      const manualViewport = await waitForViewport((viewport) => viewport.intent.origin === 'manual');
      const manualSurface = root.__v6WorkstationChartSurface.getState();
      const chartBeforeReset = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const cacheBeforeReset = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const projectionBeforeReset = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const replayBeforeReset = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      document.querySelector('[data-v6-reset-view][data-v6-reset-pane-id="main"]').click();
      const resetViewport = await waitForViewport((viewport) => viewport.intent.origin === 'default');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const chartAfterReset = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const cacheAfterReset = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const projectionAfterReset = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const replayAfterReset = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const resetSurface = root.__v6WorkstationChartSurface.getState();
      const appliedChartData = resetSurface.appliedChartData.find((record) => record.paneId === 'main') || null;
      const appliedViewport = resetSurface.appliedViewport.find((record) => record.paneId === 'main') || null;
      const paneSnapshot = resetSurface.panes.find((pane) => pane.paneId === 'main')?.snapshot || null;
      const visibleLogicalRange = paneSnapshot?.visibleLogicalRange || null;

      return {
        appliedChartData,
        appliedViewport,
        cacheAfterReset,
        cacheBeforeReset,
        chartAfterReset,
        chartBeforeReset,
        manualSurface,
        manualViewport,
        paneSnapshot,
        projectionAfterReset,
        projectionBeforeReset,
        replayAfterReset,
        replayBeforeReset,
        resetSurface,
        resetViewport,
        visibleLogicalRange,
      };
    })()))()
  `));

  assert.equal(value.manualViewport.intent.origin, 'manual');
  assert.equal(value.resetViewport.intent.origin, 'default');
  assert.equal(value.resetViewport.intent.spanBars, null);
  assert.equal(value.resetViewport.projection.origin, 'default');
  assert.equal(value.resetViewport.projection.latestLogicalIndex, setup.chart.bars.length - 1);
  assert.equal(value.resetViewport.projection.to - value.resetViewport.projection.latestLogicalIndex, setup.viewport.intent.latestOffsetBars);
  assert.equal(value.appliedViewport.origin, 'default');
  assert.equal(value.visibleLogicalRange.to, value.resetViewport.projection.to);
  assert.equal(value.visibleLogicalRange.from, value.resetViewport.projection.from);
  assert.equal(value.appliedChartData.barCount, setup.chart.bars.length);
  assert.equal(value.paneSnapshot.dataLength, setup.chart.bars.length);
  assert.deepEqual(value.chartAfterReset.bars, value.chartBeforeReset.bars);
  assert.equal(value.chartAfterReset.revision, value.chartBeforeReset.revision);
  assert.deepEqual(value.replayAfterReset, value.replayBeforeReset);
  assert.deepEqual(value.cacheAfterReset, value.cacheBeforeReset);
  assert.deepEqual(value.projectionAfterReset, value.projectionBeforeReset);
  assert.notDeepEqual(value.manualViewport.projection, value.resetViewport.projection);
} finally {
  await page.cleanup();
}

console.log('v6 reset view HTF browser step 200 smoke passed');
