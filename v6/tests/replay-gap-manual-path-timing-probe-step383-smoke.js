import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const FINAL_SOURCE_TIMESTAMP = Math.floor(Date.parse('2026-06-01T18:01:00.000Z') / 1000);

function roundMs(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function summarizeCase({ item, pageSetupMs, cleanupMs }) {
  return {
    displayTimeframe: item.displayTimeframe,
    kind: item.kind,
    manualNextCount: item.manualNextCount,
    timings: {
      assertionReadoutMs: roundMs(item.timings.assertionReadoutMs),
      cleanupMs: roundMs(cleanupMs),
      finalNextMs: roundMs(item.timings.finalNextMs),
      manualLoopMs: roundMs(item.timings.manualLoopMs),
      pageSetupMs: roundMs(pageSetupMs),
      sessionApplyMs: roundMs(item.timings.sessionApplyMs),
      timeframeApplyMs: roundMs(item.timings.timeframeApplyMs),
      totalInnerMs: roundMs(item.timings.totalInnerMs),
    },
  };
}

async function runManualGapCase({ displayTimeframe, kind }) {
  const pageSetupStartedAt = performance.now();
  const page = await openV6Page({ height: 900, width: 1440 });
  const pageSetupMs = performance.now() - pageSetupStartedAt;
  let value;
  let cleanupMs = 0;
  try {
    value = JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const displayTimeframe = ${JSON.stringify(displayTimeframe)};
        const kind = ${JSON.stringify(kind)};
        const targetIso = '2026-06-01T18:00:00.000Z';
        const finalIso = '2026-06-01T18:01:00.000Z';
        const startedAt = performance.now();
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

        const sessionStartedAt = performance.now();
        document.querySelector('[data-v6-session-setup-name]').value = \`manual-gap-timing-\${kind}-\${displayTimeframe}\`;
        document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T15:34';
        document.querySelector('[data-v6-session-setup-end]').value = '2026-06-05T16:00';
        document.querySelector('[data-v6-session-auto-end]').checked = false;
        document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-v6-dashboard-create-session]').click();
        const applyState = await waitForApplied();
        const sessionApplyMs = performance.now() - sessionStartedAt;

        const timeframeStartedAt = performance.now();
        if (displayTimeframe !== 1) {
          await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe,
            paneId: 'main',
          });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        const timeframeApplyMs = performance.now() - timeframeStartedAt;

        const manualLoopStartedAt = performance.now();
        let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        let manualNext = null;
        let manualNextCount = 0;
        for (let index = 0; index < 100; index += 1) {
          if (Date.parse(replay.cursorTime) >= Date.parse(targetIso)) break;
          manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
            paneId: 'main',
          });
          manualNextCount += 1;
          replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        }
        const crossedReplay = replay;
        const manualLoopMs = performance.now() - manualLoopStartedAt;

        const finalNextStartedAt = performance.now();
        const nextAfterGap = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
          paneId: 'main',
        });
        const finalNextMs = performance.now() - finalNextStartedAt;

        const readoutStartedAt = performance.now();
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        const latest = chart.bars?.at(-1) || null;
        const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
        const footerCursor = document.querySelector('[data-v6-footer-cursor]')?.textContent.trim() || '';
        const assertionReadoutMs = performance.now() - readoutStartedAt;

        return {
          applyState,
          barCount: chart.bars?.length || 0,
          crossedReplay,
          displayTimeframe: kind === 'htf' ? pane.displayTimeframe : displayTimeframe,
          footerCursor,
          kind,
          latestIso: latest ? new Date(Number(latest.timestamp ?? latest.time) * 1000).toISOString() : null,
          manualNext,
          manualNextCount,
          nextAfterGap,
          projectedBucket,
          projection: projection.lastProjection,
          requestedDisplayTimeframe: displayTimeframe,
          replay,
          timings: {
            assertionReadoutMs,
            finalNextMs,
            manualLoopMs,
            sessionApplyMs,
            timeframeApplyMs,
            totalInnerMs: performance.now() - startedAt,
          },
        };
      })()))()
    `));
  } finally {
    const cleanupStartedAt = performance.now();
    await page.cleanup();
    cleanupMs = performance.now() - cleanupStartedAt;
  }
  return { item: value, pageSetupMs, cleanupMs };
}

const cases = [];
for (const displayTimeframe of [1, 5, 15]) {
  cases.push(await runManualGapCase({ displayTimeframe, kind: 'low-tf' }));
}
for (const displayTimeframe of ['1D', '1W', '1M']) {
  cases.push(await runManualGapCase({ displayTimeframe, kind: 'htf' }));
}

const summaries = cases.map(summarizeCase);

for (const { item } of cases) {
  assert.equal(item.applyState.status, 'applied', `${item.kind} ${item.requestedDisplayTimeframe} apply should complete`);
  assert.equal(item.manualNext?.status, 'advanced', item.manualNext?.error || `${item.kind} ${item.requestedDisplayTimeframe} manual next should advance`);
  assert.equal(item.crossedReplay.cursorTime, '2026-06-01T18:00:00.000Z', `${item.kind} ${item.requestedDisplayTimeframe} should cross to next session bar`);
  assert.equal(item.crossedReplay.cursorIndex, 146, `${item.kind} ${item.requestedDisplayTimeframe} crossed cursor index should align`);
  assert.equal(item.crossedReplay.revealedCount, 147, `${item.kind} ${item.requestedDisplayTimeframe} crossed revealed count should align`);
  assert.equal(item.nextAfterGap.status, 'advanced', item.nextAfterGap.error || `${item.kind} ${item.requestedDisplayTimeframe} final next should advance`);
  assert.equal(item.replay.cursorTime, '2026-06-01T18:01:00.000Z', `${item.kind} ${item.requestedDisplayTimeframe} should continue after gap`);
  assert.equal(item.replay.cursorIndex, 147, `${item.kind} ${item.requestedDisplayTimeframe} final cursor index should align`);
  assert.equal(item.replay.revealedCount, 148, `${item.kind} ${item.requestedDisplayTimeframe} final revealed count should align`);
  assert.equal(item.barCount > 0, true, `${item.kind} ${item.requestedDisplayTimeframe} chart should keep bars`);
  assert.equal(item.manualNextCount > 0, true, `${item.kind} ${item.requestedDisplayTimeframe} should record manual next count`);
  if (item.kind === 'low-tf' && item.displayTimeframe === 1) {
    assert.equal(item.latestIso, '2026-06-01T18:01:00.000Z', '1m chart should append the bar after the session gap');
  } else {
    assert.equal(
      item.projectedBucket.lastSourceTimestamp,
      FINAL_SOURCE_TIMESTAMP,
      `${item.kind} ${item.requestedDisplayTimeframe} projected bucket should continue after the gap`,
    );
  }
  if (item.kind === 'htf') {
    assert.equal(item.displayTimeframe, item.requestedDisplayTimeframe);
    assert.equal(item.projection.targetTimeframe, item.requestedDisplayTimeframe);
    assert.equal(item.projectedBucket.cursorCapped, true);
    assert.equal(item.footerCursor, 'Cursor 18:01');
  }
}

console.log(JSON.stringify({
  cases: summaries,
  step: 383,
}, null, 2));
console.log('v6 replay gap manual path timing probe step383 smoke passed');
