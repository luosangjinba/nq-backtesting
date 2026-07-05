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
        id: 'status-browser-session',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.LOAD, {
        bars,
        latestOffsetBars: 8,
        paneId: 'status-pane',
        prefixBars: 0,
        session,
        spanBars: 120,
      });
      const afterLoad = {
        close: document.querySelector('[data-v6-status-close]')?.textContent,
        cursor: document.querySelector('[data-v6-footer-cursor]')?.textContent,
        noFuture: document.querySelector('[data-v6-footer-no-future]')?.textContent,
        playback: document.querySelector('[data-v6-footer-playback]')?.textContent,
        price: document.querySelector('[data-v6-status-price]')?.textContent,
        revealed: document.querySelector('[data-v6-footer-revealed]')?.textContent,
        session: document.querySelector('[data-v6-footer-session]')?.textContent,
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      const afterNext = {
        close: document.querySelector('[data-v6-status-close]')?.textContent,
        cursor: document.querySelector('[data-v6-footer-cursor]')?.textContent,
        noFuture: document.querySelector('[data-v6-footer-no-future]')?.textContent,
        price: document.querySelector('[data-v6-status-price]')?.textContent,
        revealed: document.querySelector('[data-v6-footer-revealed]')?.textContent,
      };

      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.PLAY);
      const afterPlay = document.querySelector('[data-v6-footer-playback]')?.textContent;
      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.PAUSE);
      const afterPause = document.querySelector('[data-v6-footer-playback]')?.textContent;

      const statusBar = document.querySelector('[data-v6-status-bar]');
      return {
        afterLoad,
        afterNext,
        afterPause,
        afterPlay,
        mounted: Boolean(document.querySelector('[data-v6-root]')?.__v6StatusReadout?.getState),
        statusInteractiveCount: statusBar.querySelectorAll('button,input,select,textarea,a[href]').length,
      };
    })()))()
  `));

  assert.equal(value.mounted, true);
  assert.equal(value.statusInteractiveCount, 0);
  assert.equal(value.afterLoad.session, 'Session status-browser-session');
  assert.equal(value.afterLoad.cursor, 'Cursor 09:30');
  assert.equal(value.afterLoad.revealed, 'Revealed 1/4');
  assert.equal(value.afterLoad.noFuture, 'No future 3 hidden');
  assert.equal(value.afterLoad.close, 'C 100.50');
  assert.equal(value.afterLoad.price, '100.50');
  assert.equal(value.afterNext.cursor, 'Cursor 09:31');
  assert.equal(value.afterNext.revealed, 'Revealed 2/4');
  assert.equal(value.afterNext.noFuture, 'No future 2 hidden');
  assert.equal(value.afterNext.close, 'C 101.50');
  assert.equal(value.afterNext.price, '101.50');
  assert.equal(value.afterPlay, 'Playback playing');
  assert.equal(value.afterPause, 'Playback paused');
} finally {
  await page.cleanup();
}

console.log('v6 status readout browser smoke passed');
