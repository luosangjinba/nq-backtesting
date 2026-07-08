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
        return {
          latestLogicalIndex,
          visible: Boolean(
            visibleRange &&
            Number(visibleRange.from) <= latestLogicalIndex &&
            Number(visibleRange.to) >= latestLogicalIndex
          ),
          visibleRange,
        };
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

      async function waitForViewport(predicate) {
        const deadline = performance.now() + 5000;
        let viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        while (!predicate(viewport) && performance.now() < deadline) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        }
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return viewport;
      }

      async function waitForBarCountGreaterThan(previousCount) {
        const deadline = performance.now() + 5000;
        let chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        let surfaceState = root.__v6WorkstationChartSurface.getState();
        while ((chartRecord.bars?.length || 0) <= previousCount && performance.now() < deadline) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
          surfaceState = root.__v6WorkstationChartSurface.getState();
        }
        return { chartRecord, surfaceState };
      }

      async function exerciseReset(label) {
        const beforeChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const beforeReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const beforeCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
        const beforeViewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
        const latestLogicalIndex = Math.max(0, (beforeChart.bars?.length || 0) - 1);

        await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.SET_MANUAL_INTENT, {
          latestOffsetBars: beforeViewport.intent.latestOffsetBars + 21,
          paneId: 'main',
          spanBars: 24,
        });
        await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.APPLY_CHART_DATA_REVISION, {
          chartBarsRevision: beforeChart.revision,
          latestLogicalIndex,
          paneId: 'main',
        });
        const manualViewport = await waitForViewport((viewport) => viewport.intent.origin === 'manual');
        const manualSurface = root.__v6WorkstationChartSurface.getState();

        document.querySelector('[data-v6-reset-view]').click();
        const resetViewport = await waitForViewport((viewport) => viewport.intent.origin === 'default');
        const afterChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const afterReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const afterCache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
        const resetSurface = root.__v6WorkstationChartSurface.getState();
        const resetVisible = latestVisible(afterChart, resetSurface);

        return {
          afterBarCount: afterChart.bars?.length || 0,
          afterCache,
          afterReplay,
          afterRevision: afterChart.revision,
          beforeBarCount: beforeChart.bars?.length || 0,
          beforeCache,
          beforeReplay,
          beforeRevision: beforeChart.revision,
          label,
          latestLogicalIndex,
          manual: {
            appliedViewport: manualSurface.appliedViewport[0],
            intent: manualViewport.intent,
            projection: manualViewport.projection,
          },
          reset: {
            appliedViewport: resetSurface.appliedViewport[0],
            intent: resetViewport.intent,
            projection: resetViewport.projection,
            visible: resetVisible,
          },
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initialReset = await exerciseReset('initial');
      const initialChart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });

      const nextState = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT);
      const afterNext = await waitForBarCountGreaterThan(initialChart.bars?.length || 0);
      const afterNextReset = await exerciseReset('after next');

      return {
        afterNextBarCount: afterNext.chartRecord.bars?.length || 0,
        afterNextReset,
        applyState,
        bridgeMounted: Boolean(root.__v6ResetViewControl?.resetView),
        initialBarCount: initialChart.bars?.length || 0,
        initialReset,
        nextState,
        resetButtonExists: Boolean(document.querySelector('[data-v6-reset-view]')),
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.bridgeMounted, true);
  assert.equal(value.resetButtonExists, true);
  assert.equal(value.initialBarCount > 0, true);

  for (const result of [value.initialReset, value.afterNextReset]) {
    assert.equal(result.manual.intent.origin, 'manual', `${result.label} manual origin`);
    assert.equal(result.reset.intent.origin, 'default', `${result.label} reset origin`);
    assert.equal(result.reset.intent.spanBars, null, `${result.label} reset span intent`);
    assert.equal(result.reset.projection.origin, 'default', `${result.label} reset projection origin`);
    assert.equal(result.reset.projection.to - result.latestLogicalIndex, result.reset.intent.latestOffsetBars);
    assert.equal(result.reset.appliedViewport.origin, 'default', `${result.label} applied viewport origin`);
    assert.equal(result.reset.visible.visible, true, `${result.label} latest bar visible`);
    assert.equal(result.afterBarCount, result.beforeBarCount, `${result.label} reset bar count`);
    assert.equal(result.afterRevision, result.beforeRevision, `${result.label} reset chart revision`);
    assert.deepEqual(result.afterReplay, result.beforeReplay, `${result.label} replay state`);
    assert.deepEqual(result.afterCache, result.beforeCache, `${result.label} bar cache`);
    assert.notDeepEqual(result.manual.projection, result.reset.projection, `${result.label} changed projection`);
  }

  assert.equal(value.nextState.status, 'advanced');
  assert.equal(value.afterNextBarCount, value.initialBarCount + 1);
  assert.equal(value.afterNextReset.afterBarCount, value.afterNextBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 reset view KXG flow browser step 146 smoke passed');
