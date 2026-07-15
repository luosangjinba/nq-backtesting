import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const FINAL_SOURCE_TIMESTAMP = Math.floor(Date.parse('2026-06-01T18:01:00.000Z') / 1000);

async function runNearGapCase({ displayTimeframe, kind }) {
  const page = await openV6Page({ height: 900, width: 1440 });
  try {
    return JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const displayTimeframe = ${JSON.stringify(displayTimeframe)};
        const kind = ${JSON.stringify(kind)};
        const targetIso = '2026-06-01T18:00:00.000Z';
        const seedIso = '2026-06-01T16:58:00.000Z';
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

        document.querySelector('[data-v6-session-setup-name]').value = \`near-gap-manual-\${kind}-\${displayTimeframe}\`;
        document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
        document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T18:10';
        document.querySelector('[data-v6-session-auto-end]').checked = false;
        document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-v6-dashboard-create-session]').click();
        const applyState = await waitForApplied();

        await commands.dispatchCommand(contracts.REPLAY_COMMANDS.SET_CURSOR_TIME, {
          cursorTime: seedIso,
        });
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const seededReplay = replay;

        if (displayTimeframe !== 1) {
          await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe,
            paneId: 'main',
          });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }

        const path = [replay.cursorTime];
        const manualResults = [];
        let preGapManualNextCount = 0;
        for (let index = 0; index < 10; index += 1) {
          if (Date.parse(replay.cursorTime) >= Date.parse(targetIso)) break;
          const result = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
            paneId: 'main',
          });
          manualResults.push(result);
          preGapManualNextCount += 1;
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
          path.push(replay.cursorTime);
        }
        const crossedReplay = replay;
        const nextAfterGap = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
          paneId: 'main',
        });
        replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        path.push(replay.cursorTime);

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        const latest = chart.bars?.at(-1) || null;
        const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
        const footerCursor = JSON.parse(
          document.querySelector('[data-v6-status-bar]')?.getAttribute('data-v6-replay-diagnostics') || '{}',
        ).cursorTime || null;

        return {
          applyState,
          barCount: chart.bars?.length || 0,
          crossedReplay,
          displayTimeframe: kind === 'htf' ? pane.displayTimeframe : displayTimeframe,
          footerCursor,
          kind,
          latestIso: latest ? new Date(Number(latest.timestamp ?? latest.time) * 1000).toISOString() : null,
          manualResults,
          nextAfterGap,
          path,
          preGapManualNextCount,
          projectedBucket,
          projection: projection.lastProjection,
          replay,
          requestedDisplayTimeframe: displayTimeframe,
          seededReplay,
        };
      })()))()
    `));
  } finally {
    await page.cleanup();
  }
}

const cases = [];
for (const displayTimeframe of [1, 5, 15]) {
  cases.push(await runNearGapCase({ displayTimeframe, kind: 'low-tf' }));
}
for (const displayTimeframe of ['1D', '1W', '1M']) {
  cases.push(await runNearGapCase({ displayTimeframe, kind: 'htf' }));
}

for (const item of cases) {
  const label = `${item.kind} ${item.requestedDisplayTimeframe}`;
  const expectedSeedCursorIndex = Math.floor(
    (Date.parse(item.seededReplay.cursorTime) - Date.parse(item.seededReplay.startTime)) / 60000,
  );
  const expectedCrossedCursorIndex = Math.floor(
    (Date.parse(item.crossedReplay.cursorTime) - Date.parse(item.seededReplay.startTime)) / 60000,
  );
  const expectedFinalCursorIndex = Math.floor(
    (Date.parse(item.replay.cursorTime) - Date.parse(item.seededReplay.startTime)) / 60000,
  );
  assert.equal(item.applyState.status, 'applied', `${label} apply should complete`);
  assert.deepEqual(item.path, [
    '2026-06-01T16:58:00.000Z',
    '2026-06-01T16:59:00.000Z',
    '2026-06-01T18:00:00.000Z',
    '2026-06-01T18:01:00.000Z',
  ], `${label} should follow the near-gap manual path`);
  assert.equal(item.preGapManualNextCount, 2, `${label} should avoid the 86-step pre-gap loop`);
  assert.equal(item.manualResults.length, 2, `${label} should record two pre-gap manual results`);
  assert.equal(item.manualResults.every((result) => result.status === 'advanced'), true, `${label} pre-gap nexts should advance`);
  assert.equal(item.nextAfterGap.status, 'advanced', item.nextAfterGap.error || `${label} final next should advance`);
  assert.equal(item.seededReplay.cursorTime, '2026-06-01T16:58:00.000Z', `${label} seed cursor should apply`);
  assert.equal(item.crossedReplay.cursorTime, '2026-06-01T18:00:00.000Z', `${label} should cross to next session bar`);
  assert.equal(item.replay.cursorTime, '2026-06-01T18:01:00.000Z', `${label} should continue after gap`);
  assert.equal(item.seededReplay.cursorIndex, expectedSeedCursorIndex, `${label} seed cursor index should align`);
  assert.equal(item.seededReplay.revealedCount, expectedSeedCursorIndex + 1, `${label} seed revealed count should align`);
  assert.equal(item.crossedReplay.cursorIndex, expectedCrossedCursorIndex, `${label} crossed cursor index should align`);
  assert.equal(item.replay.cursorIndex, expectedFinalCursorIndex, `${label} final cursor index should align`);
  assert.equal(item.crossedReplay.revealedCount, expectedCrossedCursorIndex + 1, `${label} crossed revealed count should align`);
  assert.equal(item.replay.revealedCount, expectedFinalCursorIndex + 1, `${label} final revealed count should align`);
  assert.equal(item.barCount > 0, true, `${label} chart should keep bars`);
  if (item.kind === 'low-tf' && item.displayTimeframe === 1) {
    assert.equal(item.latestIso, '2026-06-01T18:01:00.000Z', '1m chart should append the final post-gap source bar');
  } else {
    assert.equal(
      item.projectedBucket.lastSourceTimestamp,
      FINAL_SOURCE_TIMESTAMP,
      `${label} projected bucket should include the final post-gap source bar`,
    );
  }
  if (item.kind === 'htf') {
    assert.equal(item.displayTimeframe, item.requestedDisplayTimeframe);
    assert.equal(item.projection.targetTimeframe, item.requestedDisplayTimeframe);
    assert.equal(item.projectedBucket.cursorCapped, true);
    assert.equal(item.footerCursor, '2026-06-01T18:01:00.000Z');
  }
}

console.log(JSON.stringify({
  cases: cases.map((item) => ({
    displayTimeframe: item.displayTimeframe,
    kind: item.kind,
    path: item.path,
    preGapManualNextCount: item.preGapManualNextCount,
    seededCursorIndex: item.seededReplay.cursorIndex,
    finalCursorIndex: item.replay.cursorIndex,
  })),
  step: 385,
}, null, 2));
console.log('v6 replay gap near-gap manual fixture step385 smoke passed');
