import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const sizing = await import('/v6/src/chart-history/target-history-request-sizing.js');
      const root = document.querySelector('[data-v6-root]');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      function parseApiTime(value) {
        return Math.floor(Date.parse(String(value).replace(' ', 'T') + 'Z') / 1000);
      }

      function makeBars({ end, start, stepSeconds }) {
        const startTs = parseApiTime(start);
        const endTs = parseApiTime(end);
        const bars = [];
        for (let timestamp = startTs; timestamp <= endTs && bars.length < 42000; timestamp += stepSeconds) {
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
          const tf = url.searchParams.get('tf');
          fetchLog.push({
            bars: 0,
            end: url.searchParams.get('end'),
            kind: 'target',
            start: url.searchParams.get('start'),
            tf,
          });
          return new Response(JSON.stringify({
            bars: [],
            requestedRange: {
              end: url.searchParams.get('end'),
              start: url.searchParams.get('start'),
            },
            targetTimeframe: tf,
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

      function readDiagnosticsReadout() {
        const element = document.querySelector('[data-v6-pane-id="main"] [data-v6-target-history-diagnostics]');
        return {
          fallbackReason: element?.dataset.v6TargetHistoryDiagnosticsFallbackReason || null,
          path: element?.dataset.v6TargetHistoryDiagnosticsPath || null,
          prependedBars: element?.dataset.v6TargetHistoryDiagnosticsPrependedBars || null,
          sourceRequests: element?.dataset.v6TargetHistoryDiagnosticsSourceRequests || null,
          targetRequests: element?.dataset.v6TargetHistoryDiagnosticsTargetRequests || null,
          text: element?.textContent || '',
          title: element?.title || '',
        };
      }

      async function snapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const source = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
        const requestSizing = history.extension?.plannedWindow
          ? sizing.auditTargetHistoryRequestSizing({
            displayTimeframe: pane.displayTimeframe,
            plannedWindow: history.extension.plannedWindow,
            sourceTimeframe: 1,
          })
          : null;
        return {
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          history,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          readout: readDiagnosticsReadout(),
          requestSizing,
          sourceBarCount: source.bars?.length || 0,
          sourceOldestTimestamp: source.bars?.[0]?.timestamp || null,
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();

      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: '1M',
        paneId: 'main',
      });

      const deadline = performance.now() + 9000;
      let after = await snapshot();
      while (
        (
          after.history.status !== 'loaded' ||
          after.history.extension?.targetHistory?.status !== 'fallback' ||
          after.displayTimeframe !== '1M' ||
          after.readout.path !== 'fallback'
        ) &&
        performance.now() < deadline
      ) {
        await sleep(100);
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
  const targetFetchIndex = value.fetchLog.findIndex((record) => record.kind === 'target');
  const sourceFetchAfterTarget = value.fetchLog
    .slice(targetFetchIndex + 1)
    .some((record) => record.kind === 'source');
  const diagnostics = value.after.history.extension.diagnostics;
  assert.equal(value.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.initial.readout.text, 'History idle');
  assert.equal(value.after.displayTimeframe, '1M');
  assert.equal(Boolean(targetFetch), true);
  assert.equal(targetFetch.tf, '1M');
  assert.equal(targetFetch.bars, 0);
  assert.equal(sourceFetchAfterTarget, true);
  assert.equal(value.after.history.status, 'loaded');
  assert.equal(value.after.history.extension.targetHistory.status, 'fallback');
  assert.equal(value.after.history.extension.targetHistory.reason, 'target-history-empty');
  assert.equal(value.after.history.extension.prependedBarCount > 0, true);
  assert.equal(diagnostics.path, 'target-history-fallback-source-window');
  assert.equal(diagnostics.targetRequestCount, 1);
  assert.equal(diagnostics.sourceRequestCount > 0, true);
  assert.equal(diagnostics.fallbackReason, 'target-history-empty');
  assert.equal(diagnostics.prependedBarCount, value.after.history.extension.prependedBarCount);
  assert.equal(value.after.requestSizing.status, 'session-aware-policy-sized');
  assert.equal(value.after.requestSizing.estimatedTargetBars, null);
  assert.equal(value.after.requestSizing.targetDisplayBars, 1);
  assert.equal(value.after.requestSizing.policy.prefetchSourceBars, 40000);
  assert.equal(value.after.readout.path, 'fallback');
  assert.equal(value.after.readout.fallbackReason, 'target-history-empty');
  assert.equal(value.after.readout.targetRequests, '1');
  assert.equal(Number(value.after.readout.sourceRequests) > 0, true);
  assert.equal(value.after.readout.prependedBars, String(diagnostics.prependedBarCount));
  assert.match(value.after.readout.text, /^History fallback \d+ms T1\/S\d+ \+\d+ target-history-empty$/);
  assert.match(value.after.readout.title, /Path: target-history-fallback-source-window/);
  assert.match(value.after.readout.title, /Fallback reason: target-history-empty/);
  assert.equal(value.after.oldestTimestamp < value.initial.oldestTimestamp, true);
  assert.equal(value.after.latestTimestamp <= value.initial.latestTimestamp, true);
  assert.equal(value.after.sourceOldestTimestamp < value.initial.sourceOldestTimestamp, true);
  assert.equal(value.restored.sourceBarCount > value.initial.sourceBarCount, true);
  assert.equal(value.restored.targetBarCount > 0, true);
  assert.equal(value.restoredSourceBarCount > value.initial.sourceBarCount, true);
} finally {
  await page.cleanup();
}

console.log('v6 monthly target history fallback browser step307 smoke passed');
