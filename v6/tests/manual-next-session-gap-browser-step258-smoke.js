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

      document.querySelector('[data-v6-session-setup-name]').value = 'session-gap-browser-${displayTimeframe}';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T15:34';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
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

      let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      let manualNext = null;
      for (let index = 0; index < 100; index += 1) {
        if (Date.parse(replay.cursorTime) >= Date.parse('2026-06-01T18:00:00.000Z')) break;
        manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
          paneId: 'main',
        });
        replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      }

      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const latest = chart.bars?.at(-1) || null;
      const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
      return {
        applyState,
        barCount: chart.bars?.length || 0,
        displayTimeframe: ${displayTimeframe},
        latestIso: latest ? new Date(Number(latest.timestamp ?? latest.time) * 1000).toISOString() : null,
        manualNext,
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
  await runCase(15),
];

for (const item of cases) {
  assert.equal(item.applyState.status, 'applied', `apply should complete for ${item.displayTimeframe}m`);
  assert.notEqual(item.manualNext, null, `manual next should run for ${item.displayTimeframe}m`);
  assert.equal(item.manualNext.status, 'advanced', item.manualNext.error || `manual next should advance for ${item.displayTimeframe}m`);
  assert.equal(item.replay.cursorTime, '2026-06-01T18:00:00.000Z', `${item.displayTimeframe}m replay should skip to next session bar`);
  if (item.displayTimeframe === 1) {
    assert.equal(item.latestIso, '2026-06-01T18:00:00.000Z', '1m chart should append the next session bar');
  } else {
    assert.equal(
      item.projectedBucket.lastSourceTimestamp,
      Math.floor(Date.parse('2026-06-01T18:00:00.000Z') / 1000),
      `${item.displayTimeframe}m projected bucket should include the next session source bar`,
    );
  }
  assert.equal(item.barCount > 0, true, `${item.displayTimeframe}m chart should keep bars`);
}

console.log('v6 manual next session gap browser step 258 smoke passed');
