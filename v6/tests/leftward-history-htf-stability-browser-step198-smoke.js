import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

function rangesNear(left = {}, right = {}, epsilon = 2) {
  return (
    Math.abs(Number(left.from) - Number(right.from)) <= epsilon &&
    Math.abs(Number(left.to) - Number(right.to)) <= epsilon
  );
}

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function animationFrames(count = 2) {
        for (let index = 0; index < count; index += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      async function waitForApplied() {
        const deadline = performance.now() + 5000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await sleep(40);
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        await animationFrames(2);
        return applyState;
      }

      async function readChartState() {
        const chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const surface = root.__v6WorkstationChartSurface.getState();
        const applied = surface.appliedChartData.find((record) => record.paneId === 'main') || null;
        const visibleRange = surface.panes[0]?.snapshot?.visibleLogicalRange || null;
        return {
          applied,
          barCount: chartRecord.bars?.length || 0,
          firstBars: (chartRecord.bars || []).slice(0, 3),
          history,
          latestTimestamp: chartRecord.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: chartRecord.bars?.[0]?.timestamp || null,
          projection,
          replay,
          revision: chartRecord.revision,
          visibleRange,
        };
      }

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'pane-default',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'main',
      }).catch(() => null);
      const initial = await readChartState();

      const startedAt = performance.now();
      const extension = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
        paneId: 'main',
        visibleRange: { from: -8, to: 30 },
      });
      let after = await readChartState();
      const deadline = performance.now() + 5000;
      while (
        (
          after.revision <= initial.revision ||
          Number(after.applied?.revision || 0) <= initial.revision ||
          after.projection.projectionRevision <= initial.projection.projectionRevision
        ) &&
        performance.now() < deadline
      ) {
        await animationFrames(1);
        after = await readChartState();
      }

      return {
        after,
        applyState,
        extension,
        initial,
        latencyMs: performance.now() - startedAt,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.chart-data-projection'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.extension.status, 'loaded', value.extension.error || 'HTF leftward history should load');
  assert.equal(value.extension.extension.projectionSource.owner, 'runtime.chart-data-projection');
  assert.equal(value.extension.extension.projectionSource.sourceTimeframe, 1);
  assert.equal(value.extension.extension.projectionSource.targetTimeframe, 5);
  assert.equal(value.extension.extension.prependedBarCount > 0, true);
  assert.equal(value.extension.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(value.extension.extension.plannedWindow.historyRequest, 'older-window');
  assert.equal(value.after.projection.projectionRevision > value.initial.projection.projectionRevision, true);
  assert.equal(value.after.projection.lastProjection.paneId, 'main');
  assert.equal(value.after.projection.lastProjection.targetTimeframe, 5);
  assert.equal(value.after.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(value.after.latestTimestamp, value.initial.latestTimestamp);
  assert.deepEqual(value.after.replay, value.initial.replay);
  assert.equal(value.after.barCount - value.initial.barCount, value.extension.extension.prependedBarCount);
  assert.equal(value.after.applied.revision > value.initial.revision, true);
  assert.equal(rangesNear(value.after.visibleRange, {
    from: value.initial.visibleRange.from + value.extension.extension.prependedBarCount,
    to: value.initial.visibleRange.to + value.extension.extension.prependedBarCount,
  }), true);
  assert.equal(value.latencyMs < 600, true);
} finally {
  await page.cleanup();
}

console.log('v6 leftward history HTF stability browser step 198 smoke passed');
