import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

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

      document.querySelector('[data-v6-session-setup-start]').value = '2026-05-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-05-05T16:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();

      const applyState = await waitForApplied();
      const contextState = await commands.dispatchCommand(contracts.CHART_ENTRY_CONTEXT_COMMANDS.GET_STATE);
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const viewport = await commands.dispatchCommand(contracts.CHART_VIEWPORT_COMMANDS.GET_PANE, { paneId: 'main' });
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const surface = root.__v6WorkstationChartSurface.getState();
      const session = await commands.dispatchCommand(contracts.SESSION_COMMANDS.GET_ACTIVE);
      const latestLogicalIndex = Math.max(0, (chart.bars?.length || 0) - 1);
      const visibleRange = surface.panes[0]?.snapshot?.visibleLogicalRange || null;
      const latestVisible = Boolean(
        visibleRange &&
        Number(visibleRange.from) <= latestLogicalIndex &&
        Number(visibleRange.to) >= latestLogicalIndex
      );

      return {
        applyState,
        chart: {
          barCount: chart.bars?.length || 0,
          firstTimestamp: chart.bars?.[0]?.timestamp || null,
          latestLogicalIndex,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          revision: chart.revision,
        },
        context: contextState,
        latestVisible,
        replay: {
          cursorIndex: replay.cursorIndex,
          cursorTime: replay.cursorTime,
          revealedCount: replay.revealedCount,
          startTime: replay.startTime,
        },
        rowBoundaryText: document.querySelector('[data-v6-session-chart-boundary]')?.textContent || '',
        rowText: document.querySelector('[data-v6-dashboard-session-row]')?.textContent || '',
        session,
        surface: {
          activePaneId: surface.activePaneId,
          paneCount: surface.panes.length,
          visibleRange,
        },
        viewport,
      };
    })()))()
  `));

  assert.equal(value.session.startTime, '2026-05-01T09:30:00.000Z');
  assert.equal(value.session.endTime, '2026-05-05T16:00:00.000Z');
  assert.match(value.rowText, /2026-05-01 \/ 2026-05-05/);
  assert.match(value.rowBoundaryText, /Chart starts at/);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.context.status, 'loaded');
  assert.equal(value.context.loaded.sessionId, value.session.id);
  assert.equal(value.context.loaded.plannedWindow.bounded, true);
  assert.equal(String(value.context.loaded.plannedWindow.end).includes('2026-05-05'), false);
  assert.equal(value.chart.barCount > 0, true);
  assert.equal(value.chart.revision >= 1, true);
  assert.equal(value.replay.cursorTime, value.session.startTime);
  assert.equal(value.replay.revealedCount, 1);
  assert.equal(value.surface.activePaneId, 'main');
  assert.equal(value.surface.paneCount >= 1, true);
  assert.notEqual(value.surface.visibleRange, null);
  assert.equal(value.latestVisible, true);
  assert.equal(value.viewport.intent.origin, 'default');
  assert.equal(value.viewport.projection.latestLogicalIndex, value.chart.latestLogicalIndex);
  assert.equal(value.viewport.chartBarsRevision, value.chart.revision);
} finally {
  await page.cleanup();
}

console.log('v6 date-range entry viewport alignment step 247 smoke passed');
