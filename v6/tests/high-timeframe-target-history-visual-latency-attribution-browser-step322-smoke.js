import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { selectHighTimeframeTargetHistoryPhaseBudget } from './governance/helpers/chart-history/high-timeframe-target-history-phase-budget-selection.js';
import { stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution } from '../src/chart-history/high-timeframe-target-history-visual-latency-attribution.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const events = await import('/v6/src/runtime/events.js');
      const root = document.querySelector('[data-v6-root]');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      let activeMilestones = null;

      function mark(name, details = {}) {
        if (!activeMilestones) return;
        activeMilestones.push({
          details,
          name,
          time: performance.now(),
        });
      }

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

      function firstMilestone(milestones, name) {
        return milestones.find((milestone) => milestone.name === name) || null;
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

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();

      const surface = root.__v6WorkstationChartSurface;
      const originalApplyChartDataRecord = surface.applyChartDataRecord.bind(surface);
      const originalApplyViewportProjection = surface.applyViewportProjection.bind(surface);
      surface.applyChartDataRecord = (record = {}) => {
        const result = originalApplyChartDataRecord(record);
        if (record.paneId === 'main' && record.operation === 'prepend') {
          mark('chart-data-applied', {
            barCount: record.bars?.length || 0,
            operation: record.operation,
            revision: record.revision ?? null,
          });
        }
        return result;
      };
      surface.applyViewportProjection = (record = {}) => {
        const result = originalApplyViewportProjection(record);
        if (record.paneId === 'main' && record.projection) {
          mark('viewport-projected', {
            chartBarsRevision: record.chartBarsRevision ?? null,
            origin: record.projection.origin || null,
          });
        }
        return result;
      };

      const unsubscribeHistory = events.subscribeEvent(
        contracts.CHART_HISTORY_EVENTS.LEFT_EXTENSION_LOADED,
        (extension = {}) => {
          if (extension.paneId !== 'main' || extension.diagnostics?.path !== 'target-history') return;
          mark('left-extension-loaded', {
            path: extension.diagnostics.path,
            prependedBarCount: extension.prependedBarCount,
          });
          const readout = readDiagnosticsReadout();
          if (readout.path === 'target') {
            mark('diagnostics-readout-visible', {
              observation: 'left-extension-listener',
              text: readout.text,
            });
          }
        },
      );

      async function collectSample({ expectedTargetFetchTf, targetTimeframe }) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 1,
          paneId: 'main',
        });
        await animationFrames(3);
        const before = await snapshot();
        const milestones = [];
        activeMilestones = milestones;
        const fetchStartIndex = fetchLog.length;
        const startedAt = performance.now();
        mark('target-history-apply-start', { targetTimeframe });
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: targetTimeframe,
          paneId: 'main',
        });

        const deadline = performance.now() + 9000;
        let after = await snapshot();
        while (performance.now() < deadline) {
          after = await snapshot();
          if (after.readout.path === 'target' && !firstMilestone(milestones, 'diagnostics-readout-visible')) {
            mark('diagnostics-readout-visible', {
              observation: 'poll',
              text: after.readout.text,
            });
          }
          if (
            firstMilestone(milestones, 'chart-data-applied') &&
            firstMilestone(milestones, 'viewport-projected') &&
            firstMilestone(milestones, 'left-extension-loaded') &&
            firstMilestone(milestones, 'diagnostics-readout-visible')
          ) {
            break;
          }
          await sleep(25);
        }
        activeMilestones = null;
        await animationFrames(2);
        after = await snapshot();

        const targetFetches = fetchLog
          .slice(fetchStartIndex)
          .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
        const targetFetch = targetFetches[0] || null;
        const named = Object.fromEntries(milestones.map((milestone) => [milestone.name, milestone]));
        const diagnostics = after.history.extension?.diagnostics || {};
        const readoutVisibleAt = named['diagnostics-readout-visible']?.time ?? performance.now();
        const leftExtensionLoadedAt = named['left-extension-loaded']?.time ?? readoutVisibleAt;
        const chartDataAppliedAt = named['chart-data-applied']?.time ?? leftExtensionLoadedAt;
        const viewportProjectedAt = named['viewport-projected']?.time ?? leftExtensionLoadedAt;
        const fetchEndedAt = targetFetch?.endedAt ?? startedAt;
        return {
          applyLagMs: Math.max(0, readoutVisibleAt - leftExtensionLoadedAt),
          browserVisible: after.readout.path === 'target',
          chartDataReplacementMs: Math.max(0, chartDataAppliedAt - fetchEndedAt),
          displayTimeframe: targetTimeframe,
          durationMs: Number(diagnostics.durationMs),
          fallbackReason: diagnostics.fallbackReason || null,
          fetchMs: targetFetch?.durationMs ?? null,
          measurementBoundary: 'event-driven-readout-milestones',
          milestones,
          path: diagnostics.path || null,
          prependedBarCount: diagnostics.prependedBarCount ?? null,
          readoutObservation: named['diagnostics-readout-visible']?.details?.observation || null,
          sourceRequestCount: diagnostics.sourceRequestCount ?? null,
          targetFetches,
          targetRequestCount: diagnostics.targetRequestCount ?? null,
          viewportReapplyMs: Math.max(0, leftExtensionLoadedAt - viewportProjectedAt),
          visualLatencyMs: Math.max(0, readoutVisibleAt - startedAt),
        };
      }

      const records = [];
      for (const sample of [
        { expectedTargetFetchTf: '8h', targetTimeframe: 480 },
        { expectedTargetFetchTf: '1D', targetTimeframe: '1D' },
        { expectedTargetFetchTf: '1W', targetTimeframe: '1W' },
      ]) {
        records.push(await collectSample(sample));
      }
      unsubscribeHistory();
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
    assert.equal(record.measurementBoundary, 'event-driven-readout-milestones');
    assert.equal(record.readoutObservation, 'left-extension-listener');
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

    const named = Object.fromEntries(record.milestones.map((milestone) => [milestone.name, milestone]));
    assert.equal(Number.isFinite(named['left-extension-loaded']?.time), true);
    assert.equal(Number.isFinite(named['diagnostics-readout-visible']?.time), true);
    assert.equal(named['left-extension-loaded'].time <= named['diagnostics-readout-visible'].time, true);
    assert.equal(record.applyLagMs, named['diagnostics-readout-visible'].time - named['left-extension-loaded'].time);
  });

  const selection = selectHighTimeframeTargetHistoryPhaseBudget({
    records: value.records,
  });
  const attribution = stabilizeHighTimeframeTargetHistoryVisualLatencyAttribution({
    selection,
  });
  assert.equal(selection.status, 'optimize-phase');
  assert.equal(selection.probe.budgetReport.summary.browserSampleCount, 3);
  assert.equal(selection.probe.budgetReport.summary.targetCount, 3);
  assert.equal(selection.probe.budgetReport.summary.fallbackRate, 0);
  assert.equal(selection.probe.budgetReport.summary.applyLagP95Ms < 80, true);
  assert.equal(selection.probe.budgetReport.summary.visualLatencyP95Ms > selection.probe.budgetReport.thresholds.maxVisualLatencyMs, true);
  assert.notEqual(selection.selectedSlice, 'target-history-browser-visible-apply-lag-optimization');
  assert.equal(attribution.status, 'visual-latency-attribution-needed');
  assert.equal(attribution.ownerBoundary, 'browser-rendering-or-measurement-boundary');
  assert.equal(attribution.nextSlice, 'target-history-browser-rendering-visibility-attribution');
  assert.equal(['chart-data-replacement', 'viewport-reapply'].includes(attribution.suppressedPhase), true);
  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe target history visual latency attribution browser step322 smoke passed');
