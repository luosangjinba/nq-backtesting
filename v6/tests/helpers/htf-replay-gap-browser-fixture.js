import assert from 'node:assert/strict';
import { evaluate } from '../../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './v6-browser-harness.js';

const HTF_TARGETS = Object.freeze(['1D', '1W', '1M']);
const FINAL_SOURCE_TIMESTAMP = Math.floor(Date.parse('2026-06-01T18:01:00.000Z') / 1000);

function assertCase(item, mode) {
  assert.equal(item.applyState.status, 'applied', `${mode} apply should complete for ${item.displayTimeframe}`);
  assert.equal(item.displayTimeframe, item.requestedDisplayTimeframe);
  assert.equal(item.replay.cursorTime, '2026-06-01T18:01:00.000Z', `${mode} ${item.displayTimeframe} should continue after gap`);
  assert.equal(item.replay.cursorIndex, item.expectedFinalCursorIndex, `${mode} ${item.displayTimeframe} cursor index should align`);
  assert.equal(item.replay.revealedCount, item.expectedFinalRevealedCount, `${mode} ${item.displayTimeframe} revealed count should align`);
  assert.equal(item.barCount > 0, true, `${mode} ${item.displayTimeframe} chart should keep bars`);
  assert.equal(item.projection.targetTimeframe, item.displayTimeframe);
  assert.equal(item.projectedBucket.lastSourceTimestamp, FINAL_SOURCE_TIMESTAMP);
  assert.equal(item.projectedBucket.cursorCapped, true);
  assert.equal(item.footerCursor, '2026-06-01T18:01:00.000Z', `${mode} ${item.displayTimeframe} diagnostics should preserve source cursor`);
}

async function runBrowserCase({ displayTimeframe, mode }) {
  const page = await openV6Page({ height: 900, width: 1440 });
  try {
    const value = JSON.parse(await evaluate(page.client, `
      (async () => JSON.stringify(await (async () => {
        const displayTimeframe = ${JSON.stringify(displayTimeframe)};
        const mode = ${JSON.stringify(mode)};
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

        document.querySelector('[data-v6-session-setup-name]').value = \`htf-\${mode}-gap-\${displayTimeframe}\`;
        document.querySelector('[data-v6-session-setup-start]').value = mode === 'auto' ? '2026-06-01T16:50' : '2026-06-01T15:34';
        document.querySelector('[data-v6-session-setup-end]').value = mode === 'auto' ? '2026-06-01T18:10' : '2026-06-05T16:00';
        document.querySelector('[data-v6-session-auto-end]').checked = false;
        document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
        document.querySelector('[data-v6-dashboard-create-session]').click();
        const applyState = await waitForApplied();

        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe,
          paneId: 'main',
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        if (mode === 'auto') {
          await commands.dispatchCommand(contracts.REPLAY_COMMANDS.SET_CURSOR_TIME, {
            cursorTime: '2026-06-01T16:58:00.000Z',
          });
          const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
          speedSlider.value = '4';
          speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
          await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
            paneId: 'main',
            speed: 4,
          });
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
        } else {
          let replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
          for (let index = 0; index < 100; index += 1) {
            if (Date.parse(replay.cursorTime) >= Date.parse('2026-06-01T18:00:00.000Z')) break;
            await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
              paneId: 'main',
            });
            replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
          }
          await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
            paneId: 'main',
          });
        }

        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_ACTIVE);
        const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
        const footerCursor = JSON.parse(
          document.querySelector('[data-v6-status-bar]')?.getAttribute('data-v6-replay-diagnostics') || '{}',
        ).cursorTime || null;
        return {
          applyState,
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          expectedFinalCursorIndex: mode === 'auto' ? 71 : 147,
          expectedFinalRevealedCount: mode === 'auto' ? 72 : 148,
          footerCursor,
          projectedBucket,
          projection: projection.lastProjection,
          replay,
          requestedDisplayTimeframe: displayTimeframe,
        };
      })()))()
    `));
    return value;
  } finally {
    await page.cleanup();
  }
}

export async function runHtfReplayGapBrowserPack({ mode }) {
  const results = [];
  for (const displayTimeframe of HTF_TARGETS) {
    const result = await runBrowserCase({ displayTimeframe, mode });
    assertCase(result, mode);
    results.push(result);
  }
  return results;
}
