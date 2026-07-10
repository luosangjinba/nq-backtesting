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
      const previousButton = document.querySelector('[data-v6-transport-step-back]');

      const waitForInitialApply = async () => {
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

      await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-01T09:35:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForInitialApply();

      const commandList = commands.listCommands();
      const registrySnapshot = root.__v6RuntimeRegistry.snapshot();
      const previousButtonBefore = {
        disabled: previousButton.disabled,
        label: previousButton.getAttribute('aria-label'),
        action: previousButton.dataset.v6TransportAction || null,
      };

      await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });
      await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });
      const afterNextReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterNextChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const beforePreviousViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Backspace' }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterKeyboardReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterKeyboardChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });

      const previousResult = await commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS,
        { paneId: 'main' },
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const afterPreviousReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const afterPreviousChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const afterPreviousViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const previousRuntimeState = await commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.GET_STATE,
      );

      const maxTimestamp = (record) => Math.max(...(record.bars || []).map((bar) => Number(bar.timestamp ?? bar.time)));
      const cursorTimestamp = Date.parse(afterPreviousReplay.cursorTime) / 1000;

      return {
        afterKeyboardChartBarCount: afterKeyboardChart.bars.length,
        afterKeyboardReplay,
        afterNextChartBarCount: afterNextChart.bars.length,
        afterNextReplay,
        afterPreviousChartBarCount: afterPreviousChart.bars.length,
        afterPreviousChartMaxTimestamp: maxTimestamp(afterPreviousChart),
        afterPreviousReplay,
        afterPreviousViewport,
        beforePreviousViewport,
        commandList,
        cursorTimestamp,
        initial,
        previousButtonBefore,
        previousResult,
        previousRuntimeState,
        registrySnapshot,
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryManualPrevious'), true);
  assert.equal(value.commandList.includes('chartEntryManualPrevious.getState'), true);
  assert.equal(value.commandList.includes('chartEntryManualPrevious.previous'), true);

  assert.equal(value.previousButtonBefore.disabled, true);
  assert.equal(value.previousButtonBefore.label, 'Previous replay bar');
  assert.equal(value.previousButtonBefore.action, null);

  assert.equal(value.initial.replay.cursorIndex, 0);
  assert.equal(value.afterNextReplay.cursorIndex, 2);
  assert.equal(value.afterNextReplay.status, 'ready');

  assert.equal(value.afterKeyboardReplay.cursorIndex, value.afterNextReplay.cursorIndex);
  assert.equal(value.afterKeyboardReplay.cursorTime, value.afterNextReplay.cursorTime);
  assert.equal(value.afterKeyboardChartBarCount, value.afterNextChartBarCount);

  assert.equal(value.previousResult.status, 'rewound', value.previousResult.error || 'manual previous should rewind');
  assert.equal(value.afterPreviousReplay.cursorIndex, 1);
  assert.equal(value.previousResult.rewound.replayState.cursorIndex, 1);
  assert.equal(value.previousRuntimeState.status, 'rewound');
  assert.equal(value.afterPreviousChartMaxTimestamp <= value.cursorTimestamp, true);
  assert.equal(value.afterPreviousChartBarCount < value.afterKeyboardChartBarCount, true);

  assert.equal(value.beforePreviousViewport.paneId, 'main');
  assert.equal(value.afterPreviousViewport.paneId, 'main');
  assert.equal(value.afterPreviousViewport.intent.origin, value.beforePreviousViewport.intent.origin);
  assert.equal(value.afterPreviousViewport.intent.span, value.beforePreviousViewport.intent.span);
} finally {
  await page.cleanup();
}

console.log('v6 manual previous browser wiring guard step 239 smoke passed');
