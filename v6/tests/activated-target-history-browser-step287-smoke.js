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
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function parseApiTime(value) {
        return Math.floor(Date.parse(String(value).replace(' ', 'T') + 'Z') / 1000);
      }

      function apiTime(timestamp) {
        return new Date(timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ');
      }

      function makeBars({ end, start, stepSeconds }) {
        const startTs = parseApiTime(start);
        const endTs = parseApiTime(end);
        const bars = [];
        for (let timestamp = startTs; timestamp <= endTs && bars.length < 12000; timestamp += stepSeconds) {
          const index = bars.length;
          bars.push({
            close: 100 + index + 0.5,
            high: 101 + index,
            low: 99 + index,
            open: 100 + index,
            timestamp,
          });
        }
        return bars;
      }

      window.fetch = async (input, init) => {
        const url = new URL(String(input), window.location.href);
        if (url.pathname === '/v4/bars') {
          const tf = Number(url.searchParams.get('tf') || 1);
          const bars = makeBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: Math.max(1, tf) * 60,
          });
          fetchLog.push({
            bars: bars.length,
            kind: 'source',
            tf: url.searchParams.get('tf'),
          });
          return new Response(JSON.stringify({
            bars,
            requestedRange: {
              end: url.searchParams.get('end'),
              start: url.searchParams.get('start'),
            },
          }), { headers: { 'content-type': 'application/json' }, status: 200 });
        }
        if (url.pathname === '/v4/target_bars') {
          const bars = makeBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: 8 * 60 * 60,
          });
          fetchLog.push({
            bars: bars.length,
            end: url.searchParams.get('end'),
            kind: 'target',
            start: url.searchParams.get('start'),
            tf: url.searchParams.get('tf'),
          });
          return new Response(JSON.stringify({
            bars,
            requestedRange: {
              end: url.searchParams.get('end'),
              start: url.searchParams.get('start'),
            },
            targetTimeframe: url.searchParams.get('tf'),
          }), { headers: { 'content-type': 'application/json' }, status: 200 });
        }
        return originalFetch(input, init);
      };

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

      async function snapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const source = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
        const surface = root.__v6WorkstationChartSurface.getState();
        return {
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          history,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          sourceBarCount: source.bars?.length || 0,
          sourceOldestTimestamp: source.bars?.[0]?.timestamp || null,
          visibleRange: surface.panes[0]?.snapshot?.visibleLogicalRange || null,
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();

      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 480,
        paneId: 'main',
      });

      const deadline = performance.now() + 7000;
      let after = await snapshot();
      while (
        (
          after.history.status !== 'loaded' ||
          after.history.extension?.targetHistory?.status !== 'applied'
        ) &&
        performance.now() < deadline
      ) {
        await sleep(80);
        after = await snapshot();
      }

      const restored = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 1,
        paneId: 'main',
      });
      const restoredSource = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });

      return {
        after,
        applyState,
        fetchLog,
        initial,
        restored: {
          sourceBarCount: restored.sourceBarCount,
          targetBarCount: restored.targetBarCount,
        },
        restoredSourceBarCount: restoredSource.bars?.length || 0,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
    })()))()
  `));

  const targetFetch = value.fetchLog.find((record) => record.kind === 'target');
  assert.equal(value.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.after.displayTimeframe, 480);
  assert.equal(Boolean(targetFetch), true);
  assert.equal(targetFetch.tf, '8h');
  assert.equal(value.after.history.status, 'loaded');
  assert.equal(value.after.history.extension.projectionSource.owner, 'runtime.bar-data');
  assert.equal(value.after.history.extension.projectionSource.targetTimeframe, '8h');
  assert.equal(value.after.history.extension.targetHistory.status, 'applied');
  assert.equal(value.after.history.extension.targetHistory.reason, 'target-history-opt-in');
  assert.equal(value.after.history.extension.prependedBarCount > 0, true);
  assert.equal(value.after.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(value.after.latestTimestamp <= value.initial.latestTimestamp, true);
  assert.equal(value.after.sourceOldestTimestamp, value.initial.sourceOldestTimestamp);
  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
  assert.equal(value.restored.targetBarCount, value.initial.sourceBarCount);
  assert.equal(value.restoredSourceBarCount, value.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 activated target history browser step287 smoke passed');
