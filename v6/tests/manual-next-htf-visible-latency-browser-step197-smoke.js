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
        const paneSnapshot = surfaceState.panes[0]?.snapshot || {};
        const latestLogicalIndex = Math.max(0, (chartRecord.bars?.length || 0) - 1);
        const visibleRange = paneSnapshot.visibleLogicalRange;
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
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return applyState;
      }

      async function waitForRevision({ initialProjectionRevision, initialRevision }) {
        const startedAt = performance.now();
        const deadline = startedAt + 5000;
        let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        let projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        let surfaceState = root.__v6WorkstationChartSurface.getState();
        let applied = surfaceState.appliedChartData.find((record) => record.paneId === 'main') || null;
        while (
          (
            Number(chartRecord.revision) <= initialRevision ||
            Number(projectionState.projectionRevision) <= initialProjectionRevision ||
            Number(applied?.revision || 0) <= initialRevision ||
            !latestVisible(chartRecord, surfaceState)
          ) &&
          performance.now() < deadline
        ) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
          projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
          surfaceState = root.__v6WorkstationChartSurface.getState();
          applied = surfaceState.appliedChartData.find((record) => record.paneId === 'main') || null;
        }
        return {
          applied,
          chartRecord,
          latencyMs: performance.now() - startedAt,
          projectionState,
          surfaceState,
        };
      }

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'main',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const beforeChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const beforeProjection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
      const beforeReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const beforeSurface = root.__v6WorkstationChartSurface.getState();

      const startedAt = performance.now();
      const nextState = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });
      const after = await waitForRevision({
        initialProjectionRevision: beforeProjection.projectionRevision,
        initialRevision: beforeChart.revision,
      });
      const afterReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);

      return {
        after: {
          applied: after.applied,
          barCount: after.chartRecord.bars?.length || 0,
          latestBar: after.chartRecord.bars?.at(-1) || null,
          projectionState: after.projectionState,
          visible: latestVisible(after.chartRecord, after.surfaceState),
          visibleLatencyMs: after.latencyMs,
        },
        afterReplay,
        applyState,
        before: {
          barCount: beforeChart.bars?.length || 0,
          latestBar: beforeChart.bars?.at(-1) || null,
          projectionRevision: beforeProjection.projectionRevision,
          replayCursorTime: beforeReplay.cursorTime,
          revision: beforeChart.revision,
          visible: latestVisible(beforeChart, beforeSurface),
        },
        nextCommandLatencyMs: performance.now() - startedAt,
        nextState,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.chart-data-projection'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.before.barCount > 0, true);
  assert.equal(value.before.visible, true);
  assert.equal(value.nextState.status, 'advanced', value.nextState.error || 'manual next should advance');
  assert.equal(value.nextState.advanced.loadedWindow.projectionSource.owner, 'runtime.chart-data-projection');
  assert.equal(value.nextState.advanced.loadedWindow.projectionSource.sourceTimeframe, 1);
  assert.equal(value.nextState.advanced.loadedWindow.projectionSource.targetTimeframe, 5);
  assert.equal(value.after.projectionState.projectionRevision > value.before.projectionRevision, true);
  assert.equal(value.after.projectionState.lastProjection.paneId, 'main');
  assert.equal(value.after.projectionState.lastProjection.targetTimeframe, 5);
  assert.equal(value.after.barCount >= value.before.barCount, true);
  assert.equal(value.after.applied.revision > value.before.revision, true);
  assert.equal(value.after.visible, true);
  assert.equal(value.afterReplay.cursorTime > value.before.replayCursorTime, true);
  assert.equal(value.after.visibleLatencyMs < 160, true);
} finally {
  await page.cleanup();
}

console.log('v6 manual next HTF visible latency browser step 197 smoke passed');
