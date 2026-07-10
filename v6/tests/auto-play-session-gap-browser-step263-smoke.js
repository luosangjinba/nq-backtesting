import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function runCase(displayTimeframe) {
  const page = await openV6Page({ height: 900, width: 1440 });
  try {
    return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function waitForApplied() {
        const deadline = performance.now() + 8000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status !== 'applied' && performance.now() < deadline) {
          await sleep(40);
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return applyState;
      }

      document.querySelector('[data-v6-session-setup-name]').value = 'auto-play-gap-${displayTimeframe}';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T18:10';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      if (${displayTimeframe} !== 1) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: ${displayTimeframe},
          paneId: 'main',
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      }
      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: '2026-06-01T16:58:00.000Z',
      });
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();

      const deadline = performance.now() + 5000;
      let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      let autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      while (
        Date.parse(replay.cursorTime) < Date.parse('2026-06-01T18:01:00.000Z') &&
        autoPlay.status !== 'error' &&
        performance.now() < deadline
      ) {
        await sleep(40);
        replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      }
      await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const latest = chart.bars?.at(-1) || null;
      const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
      return {
        applyState,
        autoPlay,
        barCount: chart.bars?.length || 0,
        displayTimeframe: ${displayTimeframe},
        latestIso: latest ? new Date(Number(latest.timestamp ?? latest.time) * 1000).toISOString() : null,
        projectedBucket,
        replay,
      };
    })()))()
  `));
  } finally {
    await page.cleanup();
  }
}

const cases = [
  await runCase(1),
  await runCase(5),
];

for (const item of cases) {
  assert.equal(item.applyState.status, 'applied', `apply should complete for ${item.displayTimeframe}m`);
  assert.equal(item.autoPlay.error, null, item.autoPlay.error || `${item.displayTimeframe}m auto-play should not error`);
  assert.equal(item.autoPlay.playing, false, `${item.displayTimeframe}m auto-play should stop after test cleanup`);
  assert.equal(item.replay.cursorTime, '2026-06-01T18:01:00.000Z', `${item.displayTimeframe}m auto-play should continue past first post-gap bar`);
  assert.equal(item.replay.cursorIndex, 71, `${item.displayTimeframe}m cursor index should align`);
  assert.equal(item.replay.revealedCount, 72, `${item.displayTimeframe}m revealed count should align`);
  assert.equal(item.barCount > 0, true, `${item.displayTimeframe}m chart should keep bars`);
  if (item.displayTimeframe === 1) {
    assert.equal(item.latestIso, '2026-06-01T18:01:00.000Z', '1m chart should append the final auto-play source bar');
  } else {
    assert.equal(
      item.projectedBucket.lastSourceTimestamp,
      Math.floor(Date.parse('2026-06-01T18:01:00.000Z') / 1000),
      `${item.displayTimeframe}m projected bucket should include the final auto-play source bar`,
    );
  }
}

console.log('v6 auto-play session gap browser step 263 smoke passed');
