import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { auditHighTimeframeTargetHistoryResponsiveness } from '../src/chart-history/high-timeframe-target-history-responsiveness-audit.js';
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
          const bars = makeBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: targetStepSeconds(tf),
          });
          fetchLog.push({
            bars: bars.length,
            end: url.searchParams.get('end'),
            kind: 'target',
            start: url.searchParams.get('start'),
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
        return {
          barCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          history,
          latestTimestamp: chart.bars?.at(-1)?.timestamp || null,
          oldestTimestamp: chart.bars?.[0]?.timestamp || null,
          readout: readDiagnosticsReadout(),
          sourceBarCount: source.bars?.length || 0,
          sourceOldestTimestamp: source.bars?.[0]?.timestamp || null,
        };
      }

      async function waitForTargetSample({ before, expectedTargetFetchTf, fetchStartIndex, startedAt, targetTimeframe }) {
        const deadline = performance.now() + 9000;
        let after = await snapshot();
        let targetFetches = fetchLog
          .slice(fetchStartIndex)
          .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
        while (
          (
            after.displayTimeframe !== targetTimeframe ||
            after.history.status !== 'loaded' ||
            after.history.extension?.targetHistory?.status !== 'applied' ||
            after.history.extension?.diagnostics?.path !== 'target-history' ||
            after.readout.path !== 'target' ||
            after.oldestTimestamp >= before.oldestTimestamp ||
            targetFetches.length !== 1
          ) &&
          performance.now() < deadline
        ) {
          await sleep(50);
          after = await snapshot();
          targetFetches = fetchLog
            .slice(fetchStartIndex)
            .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
        }
        await animationFrames(2);
        after = await snapshot();
        targetFetches = fetchLog
          .slice(fetchStartIndex)
          .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
        const visibleAt = performance.now();
        const diagnostics = after.history.extension?.diagnostics || {};
        const durationMs = Number(diagnostics.durationMs);
        const visualLatencyMs = visibleAt - startedAt;
        return {
          after,
          record: {
            applyLagMs: Number.isFinite(durationMs) ? Math.max(0, visualLatencyMs - durationMs) : null,
            browserVisible: after.readout.path === 'target',
            displayTimeframe: targetTimeframe,
            durationMs,
            fallbackReason: diagnostics.fallbackReason || null,
            path: diagnostics.path || null,
            prependedBarCount: diagnostics.prependedBarCount ?? null,
            sourceRequestCount: diagnostics.sourceRequestCount ?? null,
            targetFetches,
            targetRequestCount: diagnostics.targetRequestCount ?? null,
            visualLatencyMs,
          },
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
        const sample = await waitForTargetSample({
          before,
          expectedTargetFetchTf,
          fetchStartIndex,
          startedAt,
          targetTimeframe,
        });
        return sample.record;
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
      const restoredSource = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });

      return {
        applyState,
        fetchLog,
        initial,
        records,
        restored: {
          sourceBarCount: restored.sourceBarCount,
          targetBarCount: restored.targetBarCount,
        },
        restoredSourceBarCount: restoredSource.bars?.length || 0,
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
    assert.equal(Number.isFinite(record.durationMs), true);
    assert.equal(Number.isFinite(record.visualLatencyMs), true);
    assert.equal(Number.isFinite(record.applyLagMs), true);
    assert.equal(record.targetFetches.length, 1);
    assert.equal(record.targetFetches[0].tf, expectedFetchTfs[index]);
  });

  const audit = auditHighTimeframeTargetHistoryResponsiveness({
    packCostControlsReady: true,
    records: value.records,
    targetHistoryCoverageComplete: true,
    thresholds: {
      maxApplyLagMs: 10000,
      maxDurationMs: 10000,
      maxVisualLatencyMs: 10000,
    },
  });
  assert.equal(audit.summary.browserSampleCount, 3);
  assert.equal(audit.summary.targetCount, 3);
  assert.equal(audit.summary.fallbackCount, 0);
  assert.equal(audit.summary.fallbackRate, 0);
  assert.equal(audit.reason, 'high-timeframe-target-history-responsive-materialization-ready');
  assert.equal(audit.nextSlice, 'replay-coordination-materialization-transition');
  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
  assert.equal(value.restoredSourceBarCount, value.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe target history responsiveness browser step311 smoke passed');
