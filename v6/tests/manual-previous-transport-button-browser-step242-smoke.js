import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

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

      const snapshotButton = () => {
        const button = document.querySelector('[data-v6-transport-step-back]');
        const root = document.querySelector('[data-v6-transport]');
        return {
          action: button.dataset.v6TransportAction || null,
          ariaDisabled: button.getAttribute('aria-disabled'),
          available: button.dataset.v6TransportPreviousAvailable,
          disabled: button.disabled,
          rootAvailable: root.dataset.previousAvailable,
          title: button.getAttribute('title'),
        };
      };

      const next = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
        { paneId: 'main' },
      );
      const replayState = () => commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const chartBars = () => commands.dispatchCommand(
        contracts.CHART_DATA_COMMANDS.GET_BARS,
        { paneId: 'main' },
      );
      const paneViewport = () => commands.dispatchCommand(
        contracts.CHART_VIEWPORT_COMMANDS.GET_PANE,
        { paneId: 'main' },
      );
      const maxTimestamp = (record) => Math.max(...(record.bars || []).map((bar) => Number(bar.timestamp ?? bar.time)));
      const cursorTimestamp = (state) => Date.parse(state.cursorTime) / 1000;

      await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-01T09:36:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForReady();
      const atStartButton = snapshotButton();
      const atStartChart = await chartBars();
      document.querySelector('[data-v6-transport-step-back]').click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterStartClickReplay = await replayState();
      const afterStartClickChart = await chartBars();

      await next();
      await next();
      const afterTwoNextReplay = await replayState();
      const afterTwoNextChart = await chartBars();
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
        latestOffsetBars: 5,
        paneId: 'main',
        spanBars: 24,
      });
      await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
        chartBarsRevision: afterTwoNextChart.revision,
        latestLogicalIndex: afterTwoNextChart.bars.length - 1,
        paneId: 'main',
      });
      const beforeButtonClickViewport = await paneViewport();
      const beforeButtonClickButton = snapshotButton();

      document.querySelector('[data-v6-transport-step-back]').click();
      const afterFirstClickReplay = await waitForCursor(1);
      const afterFirstClickChart = await chartBars();
      const afterFirstClickViewport = await paneViewport();
      const afterFirstClickButton = snapshotButton();

      document.querySelector('[data-v6-transport-step-back]').click();
      const afterSecondClickReplay = await waitForCursor(0);
      const afterSecondClickChart = await chartBars();
      const afterSecondClickViewport = await paneViewport();
      const afterSecondClickButton = snapshotButton();

      return {
        afterFirstClickButton,
        afterFirstClickChartBarCount: afterFirstClickChart.bars.length,
        afterFirstClickChartMaxTimestamp: maxTimestamp(afterFirstClickChart),
        afterFirstClickCursorTimestamp: cursorTimestamp(afterFirstClickReplay),
        afterFirstClickReplay,
        afterFirstClickViewport,
        afterSecondClickButton,
        afterSecondClickChartBarCount: afterSecondClickChart.bars.length,
        afterSecondClickChartMaxTimestamp: maxTimestamp(afterSecondClickChart),
        afterSecondClickCursorTimestamp: cursorTimestamp(afterSecondClickReplay),
        afterSecondClickReplay,
        afterSecondClickViewport,
        afterStartClickChartBarCount: afterStartClickChart.bars.length,
        afterStartClickReplay,
        afterTwoNextChartBarCount: afterTwoNextChart.bars.length,
        afterTwoNextReplay,
        atStartButton,
        atStartChartBarCount: atStartChart.bars.length,
        beforeButtonClickButton,
        beforeButtonClickViewport,
        initial,
      };
    })()))()
  `));

  assert.equal(value.initial.replay.cursorIndex, 0);
  assert.equal(value.atStartButton.available, 'false');
  assert.equal(value.atStartButton.action, null);
  assert.equal(value.atStartButton.disabled, true);
  assert.equal(value.afterStartClickReplay.cursorIndex, 0);
  assert.equal(value.afterStartClickChartBarCount, value.atStartChartBarCount);

  assert.equal(value.afterTwoNextReplay.cursorIndex, 2);
  assert.equal(value.beforeButtonClickButton.available, 'true');
  assert.equal(value.beforeButtonClickButton.action, 'previous');
  assert.equal(value.beforeButtonClickButton.disabled, false);
  assert.equal(value.beforeButtonClickViewport.intent.origin, 'manual');

  assert.equal(value.afterFirstClickReplay.cursorIndex, 1);
  assert.equal(value.afterFirstClickChartBarCount < value.afterTwoNextChartBarCount, true);
  assert.equal(value.afterFirstClickChartMaxTimestamp <= value.afterFirstClickCursorTimestamp, true);
  assert.equal(value.afterFirstClickViewport.intent.origin, 'manual');
  assert.equal(value.afterFirstClickViewport.intent.span, value.beforeButtonClickViewport.intent.span);
  assert.equal(value.afterFirstClickViewport.intent.latestOffsetBars, value.beforeButtonClickViewport.intent.latestOffsetBars);
  assert.equal(value.afterFirstClickViewport.intent.cursorTimestamp, value.afterFirstClickCursorTimestamp);
  assert.equal(value.afterFirstClickButton.available, 'true');
  assert.equal(value.afterFirstClickButton.action, 'previous');
  assert.equal(value.afterFirstClickButton.disabled, false);

  assert.equal(value.afterSecondClickReplay.cursorIndex, 0);
  assert.equal(value.afterSecondClickChartBarCount < value.afterFirstClickChartBarCount, true);
  assert.equal(value.afterSecondClickChartMaxTimestamp <= value.afterSecondClickCursorTimestamp, true);
  assert.equal(value.afterSecondClickViewport.intent.origin, 'manual');
  assert.equal(value.afterSecondClickViewport.intent.span, value.beforeButtonClickViewport.intent.span);
  assert.equal(value.afterSecondClickViewport.intent.latestOffsetBars, value.beforeButtonClickViewport.intent.latestOffsetBars);
  assert.equal(value.afterSecondClickViewport.intent.cursorTimestamp, value.afterSecondClickCursorTimestamp);
  assert.equal(value.afterSecondClickButton.available, 'false');
  assert.equal(value.afterSecondClickButton.action, null);
  assert.equal(value.afterSecondClickButton.disabled, true);
} finally {
  await page.cleanup();
}

console.log('v6 manual previous transport button step 242 smoke passed');
