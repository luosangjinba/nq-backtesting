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

      async function readState() {
        const chartRecord = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const projectionState = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.GET_STATE);
        const autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
        const surfaceState = root.__v6WorkstationChartSurface.getState();
        const applied = surfaceState.appliedChartData.find((record) => record.paneId === 'main') || null;
        return {
          applied,
          autoPlay,
          barCount: chartRecord.bars?.length || 0,
          latestBar: chartRecord.bars?.at(-1) || null,
          manualNext,
          projectionState,
          replay,
          revision: chartRecord.revision,
          visible: latestVisible(chartRecord, surfaceState),
        };
      }

      await commands.dispatchCommand(contracts.PANE_COMMANDS.SET_DISPLAY_TIMEFRAME, {
        displayTimeframe: 5,
        paneId: 'main',
      });
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();

      const before = await readState();
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));

      const startedAt = performance.now();
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();
      let after = await readState();
      const deadline = startedAt + 5000;
      while (
        (
          after.replay.cursorIndex < before.replay.cursorIndex + 2 ||
          after.projectionState.projectionRevision < before.projectionState.projectionRevision + 2 ||
          Number(after.applied?.revision || 0) <= before.revision ||
          !after.visible
        ) &&
        after.autoPlay.status !== 'error' &&
        performance.now() < deadline
      ) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        after = await readState();
      }

      await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      const stopped = await readState();

      return {
        after,
        applyState,
        before,
        latencyMs: performance.now() - startedAt,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
        stopped,
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.chartEntryAutoPlay'), true);
  assert.equal(value.registrySnapshot.started.includes('runtime.chart-data-projection'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.before.barCount > 0, true);
  assert.equal(value.before.visible, true);
  assert.equal(value.after.autoPlay.error, null);
  assert.equal(['playing', 'ended'].includes(value.after.autoPlay.status), true);
  assert.equal(value.after.replay.cursorIndex >= value.before.replay.cursorIndex + 2, true);
  assert.equal(value.after.projectionState.projectionRevision >= value.before.projectionState.projectionRevision + 2, true);
  assert.equal(value.after.projectionState.lastProjection.paneId, 'main');
  assert.equal(value.after.projectionState.lastProjection.targetTimeframe, 5);
  assert.equal(value.after.manualNext.advanced.loadedWindow.projectionSource.owner, 'runtime.chart-data-projection');
  assert.equal(value.after.manualNext.advanced.loadedWindow.projectionSource.targetTimeframe, 5);
  assert.equal(value.after.barCount >= value.before.barCount, true);
  assert.equal(value.after.applied.revision > value.before.revision, true);
  assert.equal(value.after.visible, true);
  assert.equal(value.latencyMs < 1200, true);
  assert.equal(value.stopped.autoPlay.playing, false);
} finally {
  await page.cleanup();
}

console.log('v6 auto-play HTF visible latency browser step 199 smoke passed');
