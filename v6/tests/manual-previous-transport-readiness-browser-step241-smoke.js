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

      const waitForPreviousAvailable = async (expected) => {
        const root = document.querySelector('[data-v6-transport]');
        const deadline = performance.now() + 3000;
        while (root.dataset.previousAvailable !== String(expected) && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return snapshot();
      };

      const snapshot = () => {
        const root = document.querySelector('[data-v6-transport]');
        const previousButton = document.querySelector('[data-v6-transport-step-back]');
        return {
          previous: {
            action: previousButton.dataset.v6TransportAction || null,
            ariaDisabled: previousButton.getAttribute('aria-disabled'),
            available: previousButton.dataset.v6TransportPreviousAvailable,
            disabled: previousButton.disabled,
            label: previousButton.getAttribute('aria-label'),
            title: previousButton.getAttribute('title'),
          },
          root: {
            lastAction: root.dataset.lastAction || null,
            previousAvailable: root.dataset.previousAvailable,
          },
        };
      };

      const next = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT,
        { paneId: 'main' },
      );
      const previous = () => commands.dispatchCommand(
        contracts.CHART_ENTRY_MANUAL_PREVIOUS_COMMANDS.PREVIOUS,
        { paneId: 'main' },
      );
      const replayState = () => commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const chartBars = () => commands.dispatchCommand(
        contracts.CHART_DATA_COMMANDS.GET_BARS,
        { paneId: 'main' },
      );

      await commands.dispatchCommand(contracts.SESSION_COMMANDS.CREATE, {
        endTime: '2026-06-01T09:35:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const initial = await waitForReady();
      const atStart = snapshot();

      await next();
      const afterOneNextReplay = await replayState();
      const afterOneNext = await waitForPreviousAvailable(true);

      const previousToStart = await previous();
      const afterPreviousToStartReplay = await replayState();
      const afterPreviousToStart = await waitForPreviousAvailable(false);

      await next();
      await next();
      const afterTwoNextReplay = await replayState();
      const afterTwoNext = await waitForPreviousAvailable(true);
      const previousToOne = await previous();
      const afterPreviousToOneReplay = await replayState();
      const afterPreviousToOne = await waitForPreviousAvailable(true);

      return {
        afterOneNext,
        afterOneNextReplay,
        afterPreviousToOne,
        afterPreviousToOneReplay,
        afterPreviousToStart,
        afterPreviousToStartReplay,
        afterTwoNext,
        afterTwoNextReplay,
        atStart,
        initial,
        previousToOne,
        previousToStart,
      };
    })()))()
  `));

  assert.equal(value.initial.replay.cursorIndex, 0);
  assert.equal(value.atStart.root.previousAvailable, 'false');
  assert.equal(value.atStart.previous.available, 'false');
  assert.equal(value.atStart.previous.disabled, true);
  assert.equal(value.atStart.previous.ariaDisabled, 'true');
  assert.equal(value.atStart.previous.action, null);

  assert.equal(value.afterOneNextReplay.cursorIndex, 1);
  assert.equal(value.afterOneNext.root.previousAvailable, 'true');
  assert.equal(value.afterOneNext.previous.available, 'true');
  assert.equal(value.afterOneNext.previous.disabled, false);
  assert.equal(value.afterOneNext.previous.action, 'previous');

  assert.equal(value.previousToStart.status, 'rewound');
  assert.equal(value.afterPreviousToStartReplay.cursorIndex, 0);
  assert.equal(value.afterPreviousToStart.root.previousAvailable, 'false');
  assert.equal(value.afterPreviousToStart.previous.available, 'false');
  assert.equal(value.afterPreviousToStart.previous.disabled, true);

  assert.equal(value.afterTwoNextReplay.cursorIndex, 2);
  assert.equal(value.afterTwoNext.root.previousAvailable, 'true');
  assert.equal(value.previousToOne.status, 'rewound');
  assert.equal(value.afterPreviousToOneReplay.cursorIndex, 1);
  assert.equal(value.afterPreviousToOne.root.previousAvailable, 'true');
  assert.equal(value.afterPreviousToOne.previous.available, 'true');
  assert.equal(value.afterPreviousToOne.previous.disabled, false);
  assert.equal(value.afterPreviousToOne.previous.action, 'previous');
} finally {
  await page.cleanup();
}

console.log('v6 manual previous transport readiness step 241 smoke passed');
