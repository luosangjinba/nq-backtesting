import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

async function readState() {
  return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
      const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
      const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      const cache = await commands.dispatchCommand(contracts.BAR_DATA_COMMANDS.GET_CACHE_SUMMARY);
      const surface = root.__v6WorkstationChartSurface.getState();
      const latestLogicalIndex = Math.max(0, (chart.bars?.length || 0) - 1);
      const visibleRange = surface.panes[0]?.snapshot?.visibleLogicalRange;
      return {
        barCount: chart.bars?.length || 0,
        cache,
        history,
        latestVisible: Boolean(
          visibleRange &&
          Number(visibleRange.from) <= latestLogicalIndex &&
          Number(visibleRange.to) >= latestLogicalIndex
        ),
        oldestTimestamp: chart.bars?.[0]?.timestamp || null,
        replay,
        visibleRange,
      };
    })()))()
  `));
}

try {
  const setup = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const deadline = performance.now() + 5000;
      let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      while (applyState.status === 'idle' && performance.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 40));
        applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const host = document.querySelector('[data-v6-chart-engine-host]');
      const rect = host.getBoundingClientRect();
      const root = document.querySelector('[data-v6-root]');
      return {
        applyState,
        bridgeMounted: Boolean(root.__v6LeftwardHistoryInputBridge?.destroy),
        hostRect: {
          height: rect.height,
          left: rect.left,
          top: rect.top,
          width: rect.width,
        },
      };
    })()))()
  `));

  assert.equal(setup.applyState.status, 'applied');
  assert.equal(setup.bridgeMounted, true);

  const initial = await readState();
  const x = setup.hostRect.left + (setup.hostRect.width * 0.42);
  const y = setup.hostRect.top + (setup.hostRect.height * 0.54);
  let loaded = null;
  let latencyMs = null;

  for (const deltaX of [-960, 960, -1280, 1280, -1600, 1600]) {
    const attemptStartedAt = Date.now();
    await page.client.send('Input.dispatchMouseEvent', {
      deltaX,
      deltaY: 0,
      type: 'mouseWheel',
      x,
      y,
    });
    const deadline = Date.now() + 1200;
    while (Date.now() < deadline) {
      const state = await readState();
      if (state.history.status === 'loaded' && state.barCount > initial.barCount) {
        loaded = state;
        latencyMs = Date.now() - attemptStartedAt;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    if (loaded) break;
  }

  assert.notEqual(loaded, null);
  assert.equal(loaded.history.extension.plannedWindow.requestCap, 'canvas-left');
  assert.equal(loaded.history.extension.plannedWindow.historyRequest, 'older-window');
  assert.equal(loaded.oldestTimestamp < initial.oldestTimestamp, true);
  assert.equal(loaded.cache.windowCount > initial.cache.windowCount, true);
  assert.deepEqual(loaded.replay, initial.replay);
  assert.equal(loaded.latestVisible, true);
  assert.equal(latencyMs < 1800, true);
} finally {
  await page.cleanup();
}

console.log('v6 drag-triggered history extension browser step 149 smoke passed');
