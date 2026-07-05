import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 760, width: 1200 });
try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const bars = Array.from({ length: 4 }, (_, index) => ({
        close: 100 + index + 0.5,
        high: 101 + index,
        low: 99 + index,
        open: 100 + index,
        timestamp: 1780306200 + (index * 60),
      }));
      const session = {
        endTime: '2026-06-01T09:33:00.000Z',
        id: 'transport-browser-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };
      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'transport-pane',
        prefixBars: 0,
        session,
        spanBars: 120,
      });

      const root = document.querySelector('[data-v6-root]');
      const transport = root.__v6ReplayTransport;
      const nextButton = document.querySelector('[data-v6-transport-action="next"]');
      const playButton = document.querySelector('[data-v6-transport-action="play-toggle"]');
      const speedButton = document.querySelector('[data-v6-transport-speed="2"]');

      nextButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterClickNext = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.GET_STATE);

      speedButton.click();
      const speedState = transport.getState();
      const replayAfterSpeed = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      document.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        code: 'Space',
        key: ' ',
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterSpacePlay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      playButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterClickPause = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      document.dispatchEvent(new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'ArrowRight',
      }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterKeyboardNext = await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.GET_STATE);

      return {
        afterClickNext,
        afterClickPause,
        afterKeyboardNext,
        afterSpacePlay,
        speedButtonPressed: speedButton.getAttribute('aria-pressed'),
        speedState,
        replayAfterSpeed,
        transportDataset: {
          playback: document.querySelector('[data-v6-transport]').dataset.playback,
          speed: document.querySelector('[data-v6-transport]').dataset.speed,
        },
      };
    })()))()
  `));

  assert.equal(value.afterClickNext.cursorIndex, 1);
  assert.equal(value.replayAfterSpeed.cursorIndex, 1);
  assert.equal(value.speedState.speed, 2);
  assert.equal(value.speedButtonPressed, 'true');
  assert.equal(value.transportDataset.speed, '2');
  assert.equal(value.afterSpacePlay.status, 'playing');
  assert.equal(value.afterClickPause.status, 'paused');
  assert.equal(value.afterKeyboardNext.cursorIndex, 2);
} finally {
  await page.cleanup();
}

console.log('v6 replay transport browser smoke passed');
