import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });
try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      await commands.dispatchCommand('session.create', {
        endTime: '2026-06-01T09:39:00.000Z',
        startTime: '2026-06-01T09:30:00.000Z',
        symbol: 'NQ',
        timeframe: '1m',
      });
      const replayDeadline = performance.now() + 5000;
      let loadedReplay = await commands.dispatchCommand('replay.getState');
      while (!loadedReplay?.sessionId && performance.now() < replayDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        loadedReplay = await commands.dispatchCommand('replay.getState');
      }
      for (let index = 0; index < 8; index += 1) {
        await commands.dispatchCommand('chartEntryManualNext.next', { paneId: 'main' });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const before = await commands.dispatchCommand('replay.getState');
      const beforeChart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      const button = document.querySelector('[data-v6-transport-action="restart"]');
      const buttonDeadline = performance.now() + 2000;
      while (button.disabled && performance.now() < buttonDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      button.click();
      const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const rect = host.getBoundingClientRect();
      return {
        before,
        beforeBarCount: beforeChart.bars.length,
        buttonDisabled: button.disabled,
        buttonLabel: button.getAttribute('aria-label'),
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        selecting: document.querySelector('[data-v6-chart-surface]').dataset.v6ReplayRestartSelecting,
      };
    })()))()
  `));

  assert.equal(setup.buttonDisabled, false);
  assert.equal(setup.buttonLabel, 'Select Bar Replay restart point');
  assert.equal(setup.selecting, 'true');

  const candidate = JSON.parse(await evaluate(page.client, `JSON.stringify((() => {
    const root = document.querySelector('[data-v6-root]');
    root.__v6ReplayRestartSelection.preview({
      paneId: 'main',
      point: { x: 420, y: 180 },
      time: ${Math.floor(new Date(setup.before.cursorTime).getTime() / 1000) - 120},
    });
    return { lineHidden: document.querySelector('[data-v6-replay-restart-selection-line]').hidden };
  })())`));
  assert.equal(candidate.lineHidden, false);

  await evaluate(page.client, `document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]').click()`);
  await new Promise((resolve) => setTimeout(resolve, 250));

  const result = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const restart = await commands.dispatchCommand('chartEntryRestart.getState');
      const replay = await commands.dispatchCommand('replay.getState');
      const chart = await commands.dispatchCommand('chartData.getBars', { paneId: 'main' });
      return {
        barCount: chart.bars.length,
        errorDialogHidden: document.querySelector('[data-v6-replay-restart-error-dialog]').hidden,
        replay,
        restart,
        selecting: document.querySelector('[data-v6-chart-surface]').dataset.v6ReplayRestartSelecting,
      };
    })()))()
  `));
  assert.equal(result.restart.status, 'restarted', JSON.stringify(result.restart));
  assert.equal(result.selecting, 'false');
  assert.equal(result.barCount < setup.beforeBarCount, true);
  assert.equal(new Date(result.replay.cursorTime).getTime() < new Date(setup.before.cursorTime).getTime(), true);
  assert.equal(result.errorDialogHidden, true);
} finally {
  await page.cleanup();
}

console.log('v6 chart entry restart browser smoke passed');
