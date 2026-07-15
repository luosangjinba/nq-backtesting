import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 860, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      await root.__v6LayoutSurfaceBridge.ready;

      const waitForReady = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        let chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        while (
          (!replay || replay.cursorIndex !== 0 || replay.status !== 'ready' || !chart.bars?.length) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
          chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { chart, replay };
      };

      const waitForBootstrap = async () => {
        const deadline = performance.now() + 5000;
        let state = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
        while (state.status !== 'bootstrapped' && state.status !== 'skipped' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          state = await commands.dispatchCommand(contracts.LAYOUT_PANE_BOOTSTRAP_COMMANDS.GET_STATE);
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return state;
      };

      const waitForCursor = async (cursorIndex) => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        while (replay?.cursorIndex !== cursorIndex && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return replay;
      };

      const chartBars = (paneId) => commands.dispatchCommand(
        contracts.CHART_DATA_COMMANDS.GET_BARS,
        { paneId },
      );
      const paneViewport = (paneId) => commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId },
      );
      const nextVisible = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
        { paneIds: ['main', 'secondary'] },
      );
      const maxTimestamp = (record) => Math.max(...(record.bars || []).map((bar) => Number(bar.timestamp ?? bar.time)));
      const cursorTimestamp = (state) => Date.parse(state.cursorTime) / 1000;
      const buttonState = () => {
        const button = document.querySelector('[data-v6-transport-step-back]');
        return {
          action: button.dataset.v6TransportAction || null,
          available: button.dataset.v6TransportPreviousAvailable,
          disabled: button.disabled,
        };
      };
      const paneReadout = (paneId) => {
        const readout = document.querySelector('[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"]');
        const text = (selector) => readout?.querySelector(selector)?.textContent?.trim() || '';
        return {
          hiddenByHost: readout?.closest('[data-v6-chart-engine-host]')?.hidden || false,
          ohlc: readout?.dataset.statusOhlc || null,
          symbol: text('[data-v6-status-symbol]'),
          timeframe: text('[data-v6-status-timeframe]'),
        };
      };

      await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-01T09:36:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForReady();

      await commands.dispatchCommand(contracts.LAYOUT_COMMANDS.SET_MODE, {
        mode: 'twice',
        variant: 'twice-vertical',
      });
      const bootstrap = await waitForBootstrap();
      const layoutBefore = root.__v6WorkstationChartSurface.getState().layout;
      const bootMain = await chartBars('main');
      const bootSecondary = await chartBars('secondary');

      await nextVisible();
      await nextVisible();
      const afterTwoNextReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const beforeMainChart = await chartBars('main');
      const beforeSecondaryChart = await chartBars('secondary');

      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 5,
        paneId: 'main',
        spanBars: 24,
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: beforeMainChart.revision,
        latestLogicalIndex: beforeMainChart.bars.length - 1,
        paneId: 'main',
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 9,
        paneId: 'secondary',
        spanBars: 30,
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: beforeSecondaryChart.revision,
        latestLogicalIndex: beforeSecondaryChart.bars.length - 1,
        paneId: 'secondary',
      });
      const beforeMainViewport = await paneViewport('main');
      const beforeSecondaryViewport = await paneViewport('secondary');
      const beforeButton = buttonState();

      document.querySelector('[data-v6-transport-step-back]').click();
      const afterReplay = await waitForCursor(1);
      const afterMainChart = await chartBars('main');
      const afterSecondaryChart = await chartBars('secondary');
      const afterMainViewport = await paneViewport('main');
      const afterSecondaryViewport = await paneViewport('secondary');
      const afterButton = buttonState();
      const surface = root.__v6WorkstationChartSurface.getState();

      return {
        afterButton,
        afterCursorTimestamp: cursorTimestamp(afterReplay),
        afterMainChart: {
          barCount: afterMainChart.bars.length,
          maxTimestamp: maxTimestamp(afterMainChart),
          paneId: afterMainChart.paneId,
          revision: afterMainChart.revision,
        },
        afterMainViewport,
        afterReplay,
        afterSecondaryChart: {
          barCount: afterSecondaryChart.bars.length,
          maxTimestamp: maxTimestamp(afterSecondaryChart),
          paneId: afterSecondaryChart.paneId,
          revision: afterSecondaryChart.revision,
        },
        afterSecondaryViewport,
        afterTwoNextReplay,
        beforeButton,
        beforeMainChart: {
          barCount: beforeMainChart.bars.length,
          paneId: beforeMainChart.paneId,
        },
        beforeMainViewport,
        beforeSecondaryChart: {
          barCount: beforeSecondaryChart.bars.length,
          paneId: beforeSecondaryChart.paneId,
        },
        beforeSecondaryViewport,
        bootstrap,
        bootMain: { barCount: bootMain.bars.length, paneId: bootMain.paneId },
        bootSecondary: { barCount: bootSecondary.bars.length, paneId: bootSecondary.paneId },
        initial,
        layoutBefore,
        readouts: {
          main: paneReadout('main'),
          secondary: paneReadout('secondary'),
        },
        surfaceAppliedChartData: surface.appliedChartData.map((record) => ({
          barCount: record.barCount,
          paneId: record.paneId,
        })),
        surfaceAppliedViewport: surface.appliedViewport.map((record) => ({
          origin: record.origin,
          paneId: record.paneId,
        })),
        surfaceLayout: surface.layout,
      };
    })()))()
  `));

  assert.equal(value.initial.replay.cursorIndex, 0);
  assert.equal(value.bootstrap.status, 'bootstrapped');
  assert.deepEqual(value.layoutBefore.visiblePaneIds, ['main', 'secondary']);
  assert.deepEqual(value.surfaceLayout.visiblePaneIds, ['main', 'secondary']);
  assert.deepEqual([value.bootMain.paneId, value.bootSecondary.paneId], ['main', 'secondary']);
  assert.equal(value.bootMain.barCount > 0, true);
  assert.equal(value.bootSecondary.barCount, value.bootMain.barCount);

  assert.equal(value.afterTwoNextReplay.cursorIndex, 2);
  assert.equal(value.beforeButton.available, 'true');
  assert.equal(value.beforeButton.action, 'previous');
  assert.equal(value.beforeButton.disabled, false);
  assert.equal(value.beforeMainViewport.intent.origin, 'manual');
  assert.equal(value.beforeSecondaryViewport.intent.origin, 'manual');
  assert.equal(value.beforeMainViewport.intent.latestOffsetBars, 5);
  assert.equal(value.beforeSecondaryViewport.intent.latestOffsetBars, 9);

  assert.equal(value.afterReplay.cursorIndex, 1);
  assert.equal(value.afterMainChart.barCount < value.beforeMainChart.barCount, true);
  assert.equal(value.afterSecondaryChart.barCount < value.beforeSecondaryChart.barCount, true);
  assert.equal(value.afterMainChart.maxTimestamp <= value.afterCursorTimestamp, true);
  assert.equal(value.afterSecondaryChart.maxTimestamp <= value.afterCursorTimestamp, true);
  assert.equal(value.afterMainViewport.intent.origin, 'manual');
  assert.equal(value.afterSecondaryViewport.intent.origin, 'manual');
  assert.equal(value.afterMainViewport.intent.latestOffsetBars, value.beforeMainViewport.intent.latestOffsetBars);
  assert.equal(value.afterSecondaryViewport.intent.latestOffsetBars, value.beforeSecondaryViewport.intent.latestOffsetBars);
  assert.equal(value.afterMainViewport.intent.span, value.beforeMainViewport.intent.span);
  assert.equal(value.afterSecondaryViewport.intent.span, value.beforeSecondaryViewport.intent.span);
  assert.equal(value.afterMainViewport.intent.cursorTimestamp, value.afterCursorTimestamp);
  assert.equal(value.afterSecondaryViewport.intent.cursorTimestamp, value.afterCursorTimestamp);
  assert.equal(value.afterButton.available, 'true');
  assert.equal(value.afterButton.action, 'previous');
  assert.equal(value.afterButton.disabled, false);

  assert.deepEqual(value.surfaceAppliedChartData, [
    { barCount: value.afterMainChart.barCount, paneId: 'main' },
    { barCount: value.afterSecondaryChart.barCount, paneId: 'secondary' },
  ]);
  assert.deepEqual(value.surfaceAppliedViewport, [
    { origin: 'manual', paneId: 'main' },
    { origin: 'manual', paneId: 'secondary' },
  ]);
  assert.equal(value.readouts.main.hiddenByHost, false);
  assert.equal(value.readouts.secondary.hiddenByHost, false);
  assert.equal(value.readouts.main.symbol, 'NQ');
  assert.equal(value.readouts.secondary.symbol, 'NQ');
  assert.equal(value.readouts.main.timeframe, '1m');
  assert.equal(value.readouts.secondary.timeframe, '1m');
} finally {
  await page.cleanup();
}

console.log('v6 manual previous transport multi-pane step 243 smoke passed');
