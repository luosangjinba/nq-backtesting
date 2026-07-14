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
        diagnostics: JSON.parse(document.querySelector('[data-v6-status-bar]')?.getAttribute('data-v6-replay-diagnostics')),
        pricePresent: Boolean(document.querySelector('[data-v6-status-price]')),
        protection: document.querySelector('[data-v6-replay-protection]')?.textContent,
        protectionHidden: document.querySelector('[data-v6-replay-protection]')?.hidden,
        status: document.querySelector('[data-v6-replay-status]')?.textContent,
      };

      await commands.dispatchCommand(contracts.DEFAULT_WALL_COMMANDS.NEXT);
      const afterNext = {
        close: document.querySelector('[data-v6-status-close]')?.textContent,
        diagnostics: JSON.parse(document.querySelector('[data-v6-status-bar]')?.getAttribute('data-v6-replay-diagnostics')),
        pricePresent: Boolean(document.querySelector('[data-v6-status-price]')),
        status: document.querySelector('[data-v6-replay-status]')?.textContent,
      };

      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.PLAY);
      const afterPlay = document.querySelector('[data-v6-replay-status]')?.textContent;
      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.PAUSE);
      const afterPause = document.querySelector('[data-v6-replay-status]')?.textContent;

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
  assert.equal(value.afterLoad.status, 'Replay ready');
  assert.equal(value.afterLoad.protection, 'Future data hidden');
  assert.equal(value.afterLoad.protectionHidden, false);
  assert.equal(value.afterLoad.diagnostics.sessionId, 'status-browser-session');
  assert.equal(value.afterLoad.diagnostics.revealedCount, 1);
  assert.equal(value.afterLoad.diagnostics.hiddenCount, 3);
  assert.equal(value.afterLoad.close, 'C --');
  assert.equal(value.afterLoad.pricePresent, false);
  assert.equal(value.afterNext.status, 'Replay ready');
  assert.equal(value.afterNext.diagnostics.revealedCount, 2);
  assert.equal(value.afterNext.diagnostics.hiddenCount, 2);
  assert.equal(value.afterNext.close, 'C --');
  assert.equal(value.afterNext.pricePresent, false);
  assert.equal(value.afterPlay, 'Replay ready');
  assert.equal(value.afterPause, 'Replay ready');
} finally {
  await page.cleanup();
}

console.log('v6 status readout browser smoke passed');
