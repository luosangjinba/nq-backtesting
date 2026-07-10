import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const previousButton = document.querySelector('[data-v6-transport-step-back]');

      const waitForReady = async () => {
        const deadline = performance.now() + 5000;
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        let chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        let viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        while (
          (!replay || replay.cursorIndex !== 0 || replay.status !== 'ready' || !chart.bars?.length || !viewport) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 25));
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
          chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
          viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { chart, replay, viewport };
      };

      const next = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
        { paneId: 'main' },
      );
      const previous = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS,
        { paneId: 'main' },
      );
      const paneViewport = () => commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId: 'main' },
      );
      const replayState = () => commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const chartBars = () => commands.dispatchCommand(
        contracts.CHART_DATA_COMMANDS.GET_BARS,
        { paneId: 'main' },
      );
      const cursorTimestamp = (state) => Date.parse(state.cursorTime) / 1000;

      await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-01T09:36:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForReady();

      await next();
      await next();
      const defaultBeforeReplay = await replayState();
      const defaultBefore = await paneViewport();
      const defaultPrevious = await previous();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const defaultAfterReplay = await replayState();
      const defaultAfter = await paneViewport();
      const defaultAfterChart = await chartBars();

      await next();
      await next();
      const manualBeforeReplay = await replayState();
      const manualChart = await chartBars();
      const manualSet = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 6,
        paneId: 'main',
        spanBars: 24,
      });
      const manualProjection = await commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION,
        {
          chartBarsRevision: manualChart.revision,
          latestLogicalIndex: manualChart.bars.length - 1,
          paneId: 'main',
        },
      );
      const manualBefore = await paneViewport();
      const manualPrevious = await previous();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const manualAfterReplay = await replayState();
      const manualAfter = await paneViewport();
      const manualAfterChart = await chartBars();

      const maxTimestamp = (record) => Math.max(...(record.bars || []).map((bar) => Number(bar.timestamp ?? bar.time)));

      return {
        defaultAfter,
        defaultAfterChartMaxTimestamp: maxTimestamp(defaultAfterChart),
        defaultAfterCursorTimestamp: cursorTimestamp(defaultAfterReplay),
        defaultAfterReplay,
        defaultBefore,
        defaultBeforeReplay,
        defaultPrevious,
        initial,
        manualAfter,
        manualAfterChartMaxTimestamp: maxTimestamp(manualAfterChart),
        manualAfterCursorTimestamp: cursorTimestamp(manualAfterReplay),
        manualAfterReplay,
        manualBefore,
        manualBeforeReplay,
        manualPrevious,
        manualProjection,
        manualSet,
        previousButton: {
          action: previousButton.dataset.v6TransportAction || null,
          disabled: previousButton.disabled,
        },
      };
    })()))()
  `));

  assert.equal(value.previousButton.disabled, true);
  assert.equal(value.previousButton.action, null);

  assert.equal(value.initial.replay.cursorIndex, 0);
  assert.equal(value.initial.viewport.intent.origin, 'default');
  assert.equal(value.defaultBeforeReplay.cursorIndex, 2);
  assert.equal(value.defaultPrevious.status, 'rewound', value.defaultPrevious.error || 'default previous should rewind');
  assert.equal(value.defaultAfterReplay.cursorIndex, 1);
  assert.equal(value.defaultAfter.intent.origin, value.defaultBefore.intent.origin);
  assert.equal(value.defaultAfter.intent.span, value.defaultBefore.intent.span);
  assert.equal(value.defaultAfter.intent.latestOffsetBars, value.defaultBefore.intent.latestOffsetBars);
  assert.equal(value.defaultAfter.intent.cursorTimestamp, value.defaultAfterCursorTimestamp);
  assert.equal(value.defaultAfter.intent.cursorTimestamp < value.defaultBefore.intent.cursorTimestamp, true);
  assert.equal(value.defaultAfterChartMaxTimestamp <= value.defaultAfterCursorTimestamp, true);

  assert.equal(value.manualBeforeReplay.cursorIndex, 3);
  assert.equal(value.manualSet.intent.origin, 'manual');
  assert.equal(value.manualProjection.projection.origin, 'manual');
  assert.equal(value.manualPrevious.status, 'rewound', value.manualPrevious.error || 'manual previous should rewind');
  assert.equal(value.manualAfterReplay.cursorIndex, 2);
  assert.equal(value.manualAfter.intent.origin, 'manual');
  assert.equal(value.manualAfter.intent.span, value.manualBefore.intent.span);
  assert.equal(value.manualAfter.intent.latestOffsetBars, value.manualBefore.intent.latestOffsetBars);
  assert.equal(value.manualAfter.intent.cursorTimestamp, value.manualAfterCursorTimestamp);
  assert.equal(value.manualAfter.intent.cursorTimestamp < value.manualBefore.intent.cursorTimestamp, true);
  assert.equal(value.manualAfter.projection.origin, 'manual');
  assert.equal(value.manualAfter.projection.latestOffsetBars, value.manualBefore.projection.latestOffsetBars);
  assert.equal(value.manualAfterChartMaxTimestamp <= value.manualAfterCursorTimestamp, true);
} finally {
  await page.cleanup();
}

console.log('v6 manual previous viewport preservation step 240 smoke passed');
