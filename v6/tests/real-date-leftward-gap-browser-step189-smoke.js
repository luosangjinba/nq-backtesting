import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const APR_24_2026_1700 = 1777049940;
const APR_26_2026_1800 = 1777226400;

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');

      async function waitForApplied() {
        const deadline = performance.now() + 6000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status === 'idle' && performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 40));
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        return applyState;
      }

      async function readSnapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const cache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
        const surface = root.__v6WorkstationChartSurface.getState();
        return {
          barCount: chart.bars?.length || 0,
          cache,
          firstTimestamp: chart.bars?.[0]?.timestamp || null,
          history,
          lastTimestamp: chart.bars?.at(-1)?.timestamp || null,
          visibleRange: surface.panes[0]?.snapshot?.visibleLogicalRange || null,
        };
      }

      localStorage.removeItem('v6.sessions.metadata');
      document.querySelector('[data-v6-session-setup-start]').value = '2026-05-01T09:30';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-05-05T16:00';
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const initial = await readSnapshot();
      const extensions = [];
      let snapshot = initial;
      for (let index = 0; index < 48 && snapshot.firstTimestamp >= ${APR_26_2026_1800}; index += 1) {
        const state = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION, {
          paneId: 'main',
          visibleRange: { from: -220, to: 20 },
        });
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        snapshot = await readSnapshot();
        extensions.push({
          firstTimestamp: snapshot.firstTimestamp,
          plannedWindow: state.extension?.plannedWindow || null,
          prependedBarCount: state.extension?.prependedBarCount || 0,
          reason: state.error || state.extension?.reason || null,
          status: state.status,
        });
        if (state.status !== 'loaded') break;
      }

      return {
        applyState,
        extensions,
        final: snapshot,
        initial,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.initial.firstTimestamp > APR_26_2026_1800, true);
  assert.equal(value.extensions.length > 0, true);
  assert.equal(value.extensions.every((extension) => extension.status === 'loaded'), true);
  assert.equal(value.extensions.every((extension) => extension.prependedBarCount > 0), true);
  assert.equal(value.final.firstTimestamp <= APR_24_2026_1700, true);
  assert.equal(value.final.firstTimestamp < APR_26_2026_1800, true);
  assert.equal(value.final.barCount > value.initial.barCount, true);
  assert.equal(value.final.cache.windowCount > value.initial.cache.windowCount, true);
  assert.equal(Boolean(value.final.visibleRange), true);
} finally {
  await page.cleanup();
}

console.log('v6 real-date leftward gap browser step 189 smoke passed');
