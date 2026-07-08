import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      function latestVisible(chartRecord, surfaceState) {
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        const visibleRange = surfaceState.panes[0]?.snapshot?.visibleLogicalRange;
        return Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        );
      }

      async function waitForApplied() {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        return applyState;
      }

      async function readSnapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const cache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const surface = root.__v6WorkstationChartSurface.getState();
        return {
          barCount: chart.bars?.length || 0,
          cache,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          replay,
          visibleLatest: latestVisible(chart, surface),
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initial = await readSnapshot();
      const extensions = [];
      let previous = initial;

      for (let index = 0; index < 3; index += 1) {
        const startedAt = performance.now();
        const state = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
          paneId: 'main',
          visibleRange: { from: -4, to: 20 },
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const snapshot = await readSnapshot();
        extensions.push({
          latencyMs: performance.now() - startedAt,
          snapshot,
          state,
        });
        previous = snapshot;
      }

      const nextStartedAt = performance.now();
      const nextState = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
      const afterNext = await readSnapshot();

      return {
        afterNext,
        applyState,
        extensions,
        initial,
        nextCommandLatencyMs: performance.now() - nextStartedAt,
        nextState,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.initial.visibleLatest, true);
  assert.equal(value.extensions.length, 3);

  let previous = value.initial;
  for (const extension of value.extensions) {
    assert.equal(extension.state.status, 'loaded');
    assert.equal(extension.state.extension.plannedWindow.requestCap, 'canvas-left');
    assert.equal(extension.state.extension.plannedWindow.historyRequest, 'older-window');
    assert.equal(extension.state.extension.prependedBarCount > 0, true);
    assert.equal(extension.snapshot.barCount > previous.barCount, true);
    assert.equal(extension.snapshot.oldestTimestamp < previous.oldestTimestamp, true);
    assert.equal(extension.snapshot.cache.windowCount > previous.cache.windowCount, true);
    assert.deepEqual(extension.snapshot.replay, value.initial.replay);
    assert.equal(extension.snapshot.visibleLatest, true);
    assert.equal(extension.latencyMs < 1800, true);
    previous = extension.snapshot;
  }

  assert.equal(value.nextState.status, 'advanced', value.nextState.error || 'manual next should advance');
  assert.equal(value.afterNext.barCount, previous.barCount + 1);
  assert.equal(value.afterNext.latestTimestamp > previous.latestTimestamp, true);
  assert.equal(value.afterNext.replay.cursorIndex, value.initial.replay.cursorIndex + 1);
  assert.equal(value.afterNext.replay.revealedCount, value.initial.replay.revealedCount + 1);
  assert.equal(value.afterNext.visibleLatest, true);
  assert.equal(value.nextCommandLatencyMs < 160, true);
} finally {
  await page.cleanup();
}

console.log('v6 continuous leftward history browser step 151 smoke passed');
