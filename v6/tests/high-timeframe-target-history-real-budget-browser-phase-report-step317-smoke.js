import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { selectHighTimeframeTargetHistoryPhaseBudget } from '../src/chart-history/high-timeframe-target-history-phase-budget-selection.js';
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

      function targetStepSeconds(tf) {
        if (tf === '1W') return 7 * 24 * 60 * 60;
        if (tf === '1D') return 24 * 60 * 60;
        if (tf === '8h') return 8 * 60 * 60;
        return 60;
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
        const startedAt = performance.now();
        const url = new URL(String(input), window.location.href);
        if (url.pathname === '/v4/bars') {
          const tf = Number(url.searchParams.get('tf') || 1);
          const bars = makeBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: Math.max(1, tf) * 60,
          });
          const endedAt = performance.now();
          fetchLog.push({
            bars: bars.length,
            durationMs: endedAt - startedAt,
            endedAt,
            kind: 'source',
            startedAt,
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
          const bars = makeBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: targetStepSeconds(tf),
          });
          const endedAt = performance.now();
          fetchLog.push({
            bars: bars.length,
            durationMs: endedAt - startedAt,
            endedAt,
            kind: 'target',
            startedAt,
            tf,
          });
          return new Response(JSON.stringify({
            bars,
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
          path: element?.dataset.v6TargetHistoryDiagnosticsPath || null,
          text: element?.textContent || '',
        };
      }

      async function snapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const source = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
        const history = await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
        return {
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          history,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          readout: readDiagnosticsReadout(),
          sourceBarCount: source.bars?.length || 0,
        };
      }

      async function collectSample({ expectedTargetFetchTf, targetTimeframe }) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 1,
          paneId: 'main',
        });
        await animationFrames(3);
        const before = await snapshot();
        const fetchStartIndex = fetchLog.length;
        const startedAt = performance.now();
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: targetTimeframe,
          paneId: 'main',
        });

        const deadline = performance.now() + 9000;
        let after = await snapshot();
        let loadedAt = null;
        let visibleAt = null;
        let targetFetches = [];
        while (performance.now() < deadline) {
          after = await snapshot();
          targetFetches = fetchLog
            .slice(fetchStartIndex)
            .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
          if (
            !loadedAt &&
            targetFetches.length === 1 &&
            after.displayTimeframe === targetTimeframe &&
            after.history.status === 'loaded' &&
            after.history.extension?.targetHistory?.status === 'applied' &&
            after.history.extension?.diagnostics?.path === 'target-history' &&
            after.oldestTimestamp < before.oldestTimestamp
          ) {
            loadedAt = performance.now();
          }
          if (loadedAt && after.readout.path === 'target') {
            await animationFrames(2);
            after = await snapshot();
            visibleAt = performance.now();
            break;
          }
          await sleep(50);
        }

        const targetFetch = targetFetches[0] || null;
        const diagnostics = after.history.extension?.diagnostics || {};
        const durationMs = Number(diagnostics.durationMs);
        const finalVisibleAt = visibleAt || performance.now();
        const visualLatencyMs = finalVisibleAt - startedAt;
        const fetchEndedAt = targetFetch?.endedAt ?? startedAt;
        const loadedTime = loadedAt || finalVisibleAt;
        return {
          applyLagMs: Number.isFinite(durationMs) ? Math.max(0, visualLatencyMs - durationMs) : null,
          browserVisible: after.readout.path === 'target',
          chartDataReplacementMs: Math.max(0, loadedTime - fetchEndedAt),
          displayTimeframe: targetTimeframe,
          durationMs,
          fallbackReason: diagnostics.fallbackReason || null,
          fetchMs: targetFetch?.durationMs ?? null,
          path: diagnostics.path || null,
          prependedBarCount: diagnostics.prependedBarCount ?? null,
          sourceRequestCount: diagnostics.sourceRequestCount ?? null,
          targetFetches,
          targetRequestCount: diagnostics.targetRequestCount ?? null,
          viewportReapplyMs: Math.max(0, finalVisibleAt - loadedTime),
          visualLatencyMs,
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();
      const records = [];
      for (const sample of [
        { expectedTargetFetchTf: '8h', targetTimeframe: 480 },
        { expectedTargetFetchTf: '1D', targetTimeframe: '1D' },
        { expectedTargetFetchTf: '1W', targetTimeframe: '1W' },
      ]) {
        records.push(await collectSample(sample));
      }
      const restored = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 1,
        paneId: 'main',
      });

      return {
        applyState,
        initial,
        records,
        restored,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.records.length, 3);

  const expectedFetchTfs = ['8h', '1D', '1W'];
  value.records.forEach((record, index) => {
    assert.equal(record.browserVisible, true);
    assert.equal(record.path, 'target-history');
    assert.equal(record.fallbackReason, null);
    assert.equal(record.targetRequestCount, 1);
    assert.equal(record.sourceRequestCount, 0);
    assert.equal(record.prependedBarCount > 0, true);
    assert.equal(Number.isFinite(record.fetchMs), true);
    assert.equal(Number.isFinite(record.chartDataReplacementMs), true);
    assert.equal(Number.isFinite(record.viewportReapplyMs), true);
    assert.equal(Number.isFinite(record.applyLagMs), true);
    assert.equal(Number.isFinite(record.visualLatencyMs), true);
    assert.equal(record.targetFetches.length, 1);
    assert.equal(record.targetFetches[0].tf, expectedFetchTfs[index]);
  });

  const selection = selectHighTimeframeTargetHistoryPhaseBudget({
    records: value.records,
  });
  const allowedStatuses = new Set([
    'materialization-ready',
    'measurement-incomplete',
    'optimize-phase',
  ]);
  const allowedSlices = new Set([
    'high-timeframe-target-history-responsiveness-harness',
    'replay-coordination-materialization-transition',
    'target-history-browser-visible-apply-lag-optimization',
    'target-history-chart-data-replacement-optimization',
    'target-history-fetch-optimization',
    'target-history-viewport-reapply-optimization',
  ]);
  assert.equal(allowedStatuses.has(selection.status), true);
  assert.equal(allowedSlices.has(selection.selectedSlice), true);
  assert.equal(selection.probe.budgetReport.summary.browserSampleCount, 3);
  assert.equal(selection.probe.budgetReport.summary.targetCount, 3);
  assert.equal(selection.probe.budgetReport.summary.fallbackRate, 0);
  assert.equal(Number.isFinite(selection.probe.budgetReport.summary.durationP95Ms), true);
  assert.equal(Number.isFinite(selection.probe.budgetReport.summary.visualLatencyP95Ms), true);
  assert.equal(Number.isFinite(selection.probe.budgetReport.summary.applyLagP95Ms), true);
  assert.equal(Object.keys(selection.phaseBudgets).includes('fetch'), true);
  assert.equal(Object.keys(selection.phaseBudgets).includes('chart-data-replacement'), true);
  assert.equal(Object.keys(selection.phaseBudgets).includes('viewport-reapply'), true);
  assert.equal(Object.keys(selection.phaseBudgets).includes('browser-visible-apply-lag'), true);
  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe target history real budget browser phase report step317 smoke passed');
