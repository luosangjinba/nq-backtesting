import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const events = await import('/v6/src/runtime/events.js');
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      let activeMilestones = null;
      let activeBaselineSignature = null;

      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function animationFrames(count = 2) {
        for (let index = 0; index < count; index += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      }

      function parseApiTime(value) {
        return Math.floor(Date.parse(String(value).replace(' ', 'T') + 'Z') / 1000);
      }

      function targetStepSeconds(tf) {
        if (tf === '1W') return 7 * 24 * 60 * 60;
        if (tf === '1D') return 24 * 60 * 60;
        if (tf === '8h') return 8 * 60 * 60;
        if (tf === '4h') return 4 * 60 * 60;
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

      function canvasSignature() {
        const canvases = [...host.querySelectorAll('canvas')];
        let candlePixelCount = 0;
        let hash = 2166136261;
        let nonTransparentPixelCount = 0;
        let sampledPixelCount = 0;
        for (const canvas of canvases) {
          const context = canvas.getContext('2d', { willReadFrequently: true });
          if (!context) continue;
          const width = canvas.width;
          const height = canvas.height;
          const stepX = Math.max(1, Math.floor(width / 180));
          const stepY = Math.max(1, Math.floor(height / 120));
          for (let y = 0; y < height; y += stepY) {
            for (let x = 0; x < width; x += stepX) {
              const [red, green, blue, alpha] = context.getImageData(x, y, 1, 1).data;
              sampledPixelCount += 1;
              if (alpha > 0) nonTransparentPixelCount += 1;
              const greenCandle = green > 120 && red < 130 && blue < 190;
              const redCandle = red > 170 && green < 145 && blue < 170;
              if (alpha > 0 && (greenCandle || redCandle)) {
                candlePixelCount += 1;
              }
              hash ^= red + (green << 8) + (blue << 16) + (alpha << 24) + x + (y * 31);
              hash = Math.imul(hash, 16777619) >>> 0;
            }
          }
        }
        return {
          candlePixelCount,
          canvasCount: canvases.length,
          hash,
          nonTransparentPixelCount,
          sampledPixelCount,
        };
      }

      function signaturesEqual(left = {}, right = {}) {
        return (
          Number(left.hash) === Number(right.hash) &&
          Number(left.candlePixelCount) === Number(right.candlePixelCount) &&
          Number(left.nonTransparentPixelCount) === Number(right.nonTransparentPixelCount)
        );
      }

      function signatureChangedFromBaseline(signature) {
        return Boolean(activeBaselineSignature && !signaturesEqual(activeBaselineSignature, signature));
      }

      function mark(name, details = {}) {
        if (!activeMilestones) return;
        const signature = canvasSignature();
        activeMilestones.push({
          details: {
            ...details,
            signature,
            signatureChangedFromBaseline: signatureChangedFromBaseline(signature),
          },
          name,
          time: performance.now(),
        });
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

      function firstPaintMilestone(milestones) {
        return milestones.find((milestone) => milestone.details?.signatureChangedFromBaseline) || null;
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
          signature: canvasSignature(),
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

      async function collectSample({ expectedTargetFetchTf, label, targetTimeframe }) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 1,
          paneId: 'main',
        });
        await animationFrames(3);

        activeBaselineSignature = canvasSignature();
        const milestones = [];
        activeMilestones = milestones;
        const fetchStartIndex = fetchLog.length;
        const startedAt = performance.now();
        mark('target-history-apply-start', { label, targetTimeframe });
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: targetTimeframe,
          paneId: 'main',
        });
        mark('display-apply-returned', { label, targetTimeframe });

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
            firstMilestone(milestones, 'diagnostics-readout-visible') &&
            firstPaintMilestone(milestones)
          ) {
            break;
          }
          await sleep(10);
        }
        await animationFrames(1);
        mark('first-animation-frame-after-readout', { readout: readDiagnosticsReadout() });
        await animationFrames(1);
        mark('second-animation-frame-after-readout', { readout: readDiagnosticsReadout() });
        activeMilestones = null;
        after = await snapshot();

        const sampleFetches = fetchLog.slice(fetchStartIndex);
        const sourceFetches = sampleFetches.filter((record) => record.kind === 'source');
        const targetFetches = sampleFetches
          .filter((record) => record.kind === 'target' && record.tf === expectedTargetFetchTf);
        const named = Object.fromEntries(milestones.map((milestone) => [milestone.name, milestone]));
        const diagnostics = after.history.extension?.diagnostics || {};
        const firstPaint = firstPaintMilestone(milestones);
        const chartDataAppliedAt = named['chart-data-applied']?.time ?? null;
        const leftExtensionLoadedAt = named['left-extension-loaded']?.time ?? null;
        const readoutVisibleAt = named['diagnostics-readout-visible']?.time ?? null;
        const secondAnimationFrameAt = named['second-animation-frame-after-readout']?.time ?? null;
        const realChartPaintVisibleLagMs = firstPaint && leftExtensionLoadedAt !== null
          ? Math.max(0, firstPaint.time - leftExtensionLoadedAt)
          : null;
        const seriesUpdateToFirstPaintMs = firstPaint && chartDataAppliedAt !== null
          ? Math.max(0, firstPaint.time - chartDataAppliedAt)
          : null;
        const harnessObservationWindowMs = readoutVisibleAt !== null && secondAnimationFrameAt !== null
          ? Math.max(0, secondAnimationFrameAt - readoutVisibleAt)
          : null;
        const harnessMinusRealPaintMs = harnessObservationWindowMs !== null && realChartPaintVisibleLagMs !== null
          ? Math.max(0, harnessObservationWindowMs - realChartPaintVisibleLagMs)
          : null;
        return {
          browserVisible: after.readout.path === 'target',
          displayTimeframe: targetTimeframe,
          expectedTargetFetchTf,
          fallbackReason: diagnostics.fallbackReason || null,
          firstPaintStage: firstPaint?.name || null,
          harnessMinusRealPaintMs,
          harnessObservationWindowMs,
          label,
          measurementBoundary: 'target-history-real-chart-paint-visibility-measurement',
          milestones,
          path: diagnostics.path || null,
          prependedBarCount: diagnostics.prependedBarCount ?? null,
          realChartPaintObserved: Boolean(firstPaint),
          realChartPaintVisibleLagMs,
          readoutObservation: named['diagnostics-readout-visible']?.details?.observation || null,
          seriesUpdateToFirstPaintMs,
          sourceFetches,
          sourceRequestCount: diagnostics.sourceRequestCount ?? null,
          targetFetches,
          targetRequestCount: diagnostics.targetRequestCount ?? null,
        };
      }

      const records = [];
      for (const sample of [
        { expectedTargetFetchTf: '4h', label: '4h', targetTimeframe: 240 },
        { expectedTargetFetchTf: '8h', label: '8h', targetTimeframe: 480 },
        { expectedTargetFetchTf: '1D', label: '1D', targetTimeframe: '1D' },
        { expectedTargetFetchTf: '1W', label: '1W', targetTimeframe: '1W' },
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
  assert.equal(value.registrySnapshot.started.includes('runtime.replay-coordination-materialization-handoff'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.deepEqual(value.records.map((record) => record.label), ['4h', '8h', '1D', '1W']);

  console.log(JSON.stringify({
    records: value.records.map((record) => ({
      firstPaintStage: record.firstPaintStage,
      harnessMinusRealPaintMs: record.harnessMinusRealPaintMs,
      harnessObservationWindowMs: record.harnessObservationWindowMs,
      label: record.label,
      realChartPaintVisibleLagMs: record.realChartPaintVisibleLagMs,
      seriesUpdateToFirstPaintMs: record.seriesUpdateToFirstPaintMs,
      targetFetchBars: record.targetFetches[0]?.bars ?? null,
      targetFetchTf: record.targetFetches[0]?.tf ?? null,
    })),
    step: 369,
  }, null, 2));

  value.records.forEach((record) => {
    assert.equal(record.browserVisible, true);
    assert.equal(record.path, 'target-history');
    assert.equal(record.fallbackReason, null);
    assert.equal(record.measurementBoundary, 'target-history-real-chart-paint-visibility-measurement');
    assert.equal(record.readoutObservation, 'left-extension-listener');
    assert.equal(record.targetRequestCount, 1);
    assert.equal(record.sourceRequestCount, 0);
    assert.equal(record.prependedBarCount > 0, true);
    assert.equal(record.sourceFetches.length, 0);
    assert.equal(record.targetFetches.length, 1);
    assert.equal(record.targetFetches[0].tf, record.expectedTargetFetchTf);
    assert.equal(record.realChartPaintObserved, true);
    assert.equal([
      'chart-data-applied',
      'viewport-projected',
      'left-extension-loaded',
      'diagnostics-readout-visible',
      'display-apply-returned',
      'first-animation-frame-after-readout',
      'second-animation-frame-after-readout',
    ].includes(record.firstPaintStage), true);
    assert.equal(Number.isFinite(record.realChartPaintVisibleLagMs), true);
    assert.equal(Number.isFinite(record.seriesUpdateToFirstPaintMs), true);
    assert.equal(Number.isFinite(record.harnessObservationWindowMs), true);
    assert.equal(Number.isFinite(record.harnessMinusRealPaintMs), true);
    assert.equal(record.realChartPaintVisibleLagMs <= record.harnessObservationWindowMs, true);

    const named = Object.fromEntries(record.milestones.map((milestone) => [milestone.name, milestone]));
    assert.equal(Number.isFinite(named['chart-data-applied']?.time), true);
    assert.equal(Number.isFinite(named['left-extension-loaded']?.time), true);
    assert.equal(Number.isFinite(named['diagnostics-readout-visible']?.time), true);
    assert.equal(Number.isFinite(named['second-animation-frame-after-readout']?.time), true);
    assert.equal(named[record.firstPaintStage]?.details?.signatureChangedFromBaseline, true);
    assert.equal(named['chart-data-applied']?.details?.signature?.canvasCount > 0, true);
    assert.equal(named['chart-data-applied']?.details?.signature?.sampledPixelCount > 0, true);
  });

  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe leftward extension real chart paint visibility browser step369 smoke passed');
