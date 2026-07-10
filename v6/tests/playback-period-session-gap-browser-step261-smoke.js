import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

async function runCase({
  displayTimeframe,
  expectedCursorIndex,
  expectedCursorTime,
  expectedRevealedCount,
  initialCursorTime,
  period,
}) {
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

      document.querySelector('[data-v6-session-setup-name]').value = 'playback-gap-${period}-${displayTimeframe}';
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
      await commands.dispatchCommand(contracts.PLAYBACK_PERIOD_COMMANDS.SET_PERIOD, { period: '${period}' });
      const before = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: '${initialCursorTime}',
      });
      const manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneId: 'main',
      });
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const latest = chart.bars?.at(-1) || null;
      const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
      return {
        applyState,
        before,
        barCount: chart.bars?.length || 0,
        displayTimeframe: ${displayTimeframe},
        expectedCursorIndex: ${expectedCursorIndex},
        expectedCursorTime: '${expectedCursorTime}',
        expectedRevealedCount: ${expectedRevealedCount},
        latestIso: latest ? new Date(Number(latest.timestamp ?? latest.time) * 1000).toISOString() : null,
        manualNext,
        period: '${period}',
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
  await runCase({
    displayTimeframe: 1,
    expectedCursorIndex: 71,
    expectedCursorTime: '2026-06-01T18:01:00.000Z',
    expectedRevealedCount: 72,
    initialCursorTime: '2026-06-01T16:56:00.000Z',
    period: '5m',
  }),
  await runCase({
    displayTimeframe: 5,
    expectedCursorIndex: 75,
    expectedCursorTime: '2026-06-01T18:05:00.000Z',
    expectedRevealedCount: 76,
    initialCursorTime: '2026-06-01T16:50:00.000Z',
    period: '15m',
  }),
  await runCase({
    displayTimeframe: 15,
    expectedCursorIndex: 75,
    expectedCursorTime: '2026-06-01T18:05:00.000Z',
    expectedRevealedCount: 76,
    initialCursorTime: '2026-06-01T16:50:00.000Z',
    period: '15m',
  }),
];

for (const item of cases) {
  assert.equal(item.applyState.status, 'applied', `apply should complete for ${item.period}/${item.displayTimeframe}m`);
  assert.equal(item.manualNext.status, 'advanced', item.manualNext.error || `${item.period}/${item.displayTimeframe}m manual next should advance`);
  assert.equal(item.manualNext.advanced.playbackPeriod, item.period);
  assert.equal(item.manualNext.advanced.replayState.cursorTime, item.replay.cursorTime);
  assert.equal(item.replay.cursorTime, item.expectedCursorTime, `${item.period}/${item.displayTimeframe}m replay should continue past first post-gap bar`);
  assert.equal(item.replay.cursorIndex, item.expectedCursorIndex, `${item.period}/${item.displayTimeframe}m cursor index should align`);
  assert.equal(item.replay.revealedCount, item.expectedRevealedCount, `${item.period}/${item.displayTimeframe}m revealed count should align`);
  assert.equal(item.barCount > 0, true, `${item.period}/${item.displayTimeframe}m chart should keep bars`);
  if (item.displayTimeframe === 1) {
    assert.equal(item.latestIso, item.expectedCursorTime, '1m chart should append the final source bar');
  } else {
    assert.equal(
      item.projectedBucket.lastSourceTimestamp,
      Math.floor(Date.parse(item.expectedCursorTime) / 1000),
      `${item.period}/${item.displayTimeframe}m projected bucket should include the final source bar`,
    );
  }
}

console.log('v6 playback period session gap browser step 261 smoke passed');
