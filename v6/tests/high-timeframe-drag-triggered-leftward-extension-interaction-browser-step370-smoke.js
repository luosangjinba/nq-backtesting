import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 820, width: 1360 });

async function pageEval(source) {
  return JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      ${source}
    })()))()
  `));
}

try {
  const setup = await pageEval(`
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const events = await import('/v6/src/runtime/events.js');
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      let activeBaselineSignature = null;
      let activeMilestones = null;
      let attemptFetchStartIndex = 0;
      let sampleContext = null;

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
          const stepX = Math.max(1, Math.floor(width / 160));
          const stepY = Math.max(1, Math.floor(height / 96));
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

      function mark(name, details = {}, { sampleSignature = true } = {}) {
        if (!activeMilestones) return;
        const signature = sampleSignature ? canvasSignature() : null;
        activeMilestones.push({
          details: {
            ...details,
            signature,
            signatureChangedFromBaseline: signature ? signatureChangedFromBaseline(signature) : false,
          },
          name,
          time: performance.now(),
        });
      }

      window.fetch = async (input, init) => {
        const startedAt = performance.now();
        const url = new URL(String(input), window.location.href);
        if (url.pathname === '/v4/bars') {
          mark('source-fetch-started', { tf: url.searchParams.get('tf') }, { sampleSignature: false });
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
          mark('source-fetch-ended', { bars: bars.length, tf: url.searchParams.get('tf') }, { sampleSignature: false });
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
          mark('target-fetch-started', { tf }, { sampleSignature: false });
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
          mark('target-fetch-ended', { bars: bars.length, tf }, { sampleSignature: false });
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

      function firstMilestone(name) {
        return (activeMilestones || []).find((milestone) => milestone.name === name) || null;
      }

      function lastMilestone(name) {
        return [...(activeMilestones || [])].reverse().find((milestone) => milestone.name === name) || null;
      }

      function firstPaintMilestone() {
        return (activeMilestones || []).find((milestone) => milestone.details?.signatureChangedFromBaseline) || null;
      }

      function requestMs(records) {
        return records.reduce((total, record) => total + Number(record.durationMs || 0), 0);
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

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      window.__v6Step370 = {
        async prepareSample(sample) {
          await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe: 1,
            paneId: 'main',
          });
          await animationFrames(3);
          await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe: sample.targetTimeframe,
            paneId: 'main',
          });
          await animationFrames(3);
          const before = await snapshot();
          const rect = host.getBoundingClientRect();
          sampleContext = {
            before,
            expectedTargetFetchTf: sample.expectedTargetFetchTf,
            label: sample.label,
            targetTimeframe: sample.targetTimeframe,
          };
          return {
            before,
            hostRect: {
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            },
          };
        },
        beginInputAttempt({ attemptIndex, deltaX }) {
          activeBaselineSignature = canvasSignature();
          activeMilestones = [];
          attemptFetchStartIndex = fetchLog.length;
          mark('user-input-dispatched', {
            attemptIndex,
            deltaX,
            label: sampleContext?.label || null,
            targetTimeframe: sampleContext?.targetTimeframe ?? null,
          }, { sampleSignature: false });
          return { ok: true };
        },
        async waitForAttempt({ timeoutMs = 1600 } = {}) {
          const deadline = performance.now() + timeoutMs;
          let after = await snapshot();
          while (performance.now() < deadline) {
            after = await snapshot();
            if (after.readout.path === 'target' && !firstMilestone('diagnostics-readout-visible')) {
              mark('diagnostics-readout-visible', {
                observation: 'poll',
                text: after.readout.text,
              });
            }
            if (
              firstMilestone('chart-data-applied') &&
              firstMilestone('viewport-projected') &&
              firstMilestone('left-extension-loaded') &&
              firstMilestone('diagnostics-readout-visible') &&
              firstPaintMilestone()
            ) {
              break;
            }
            await sleep(10);
          }
          await animationFrames(1);
          mark('first-animation-frame-after-readout', { readout: readDiagnosticsReadout() });
          await animationFrames(1);
          mark('second-animation-frame-after-readout', { readout: readDiagnosticsReadout() });
          after = await snapshot();

          const targetFetches = fetchLog
            .slice(attemptFetchStartIndex)
            .filter((record) => record.kind === 'target' && record.tf === sampleContext.expectedTargetFetchTf);
          const sourceFetches = fetchLog
            .slice(attemptFetchStartIndex)
            .filter((record) => record.kind === 'source');
          const diagnostics = after.history.extension?.diagnostics || {};
          const input = lastMilestone('user-input-dispatched');
          const targetFetchStarted = firstMilestone('target-fetch-started');
          const chartDataApplied = firstMilestone('chart-data-applied');
          const viewportProjected = firstMilestone('viewport-projected');
          const leftExtensionLoaded = firstMilestone('left-extension-loaded');
          const readoutVisible = firstMilestone('diagnostics-readout-visible');
          const secondFrame = firstMilestone('second-animation-frame-after-readout');
          const firstPaint = firstPaintMilestone();
          const loaded = Boolean(leftExtensionLoaded && diagnostics.path === 'target-history' && targetFetches.length);
          const requestEndedAt = Math.max(
            input?.time ?? 0,
            ...sourceFetches.map((record) => record.endedAt),
            ...targetFetches.map((record) => record.endedAt),
          );
          return {
            after,
            browserVisible: after.readout.path === 'target',
            displayTimeframe: sampleContext.targetTimeframe,
            expectedTargetFetchTf: sampleContext.expectedTargetFetchTf,
            fallbackReason: diagnostics.fallbackReason || null,
            firstPaintStage: firstPaint?.name || null,
            harnessObservationWindowMs: readoutVisible && secondFrame
              ? Math.max(0, secondFrame.time - readoutVisible.time)
              : null,
            inputToFirstPaintMs: input && firstPaint
              ? Math.max(0, firstPaint.time - input.time)
              : null,
            inputToLeftExtensionLoadedMs: input && leftExtensionLoaded
              ? Math.max(0, leftExtensionLoaded.time - input.time)
              : null,
            inputToTargetFetchStartMs: input && targetFetchStarted
              ? Math.max(0, targetFetchStarted.time - input.time)
              : null,
            label: sampleContext.label,
            loaded,
            measurementBoundary: 'htf-drag-triggered-leftward-extension-interaction-measurement',
            milestones: activeMilestones || [],
            path: diagnostics.path || null,
            phaseBreakdown: {
              chartDataReplacementMs: chartDataApplied
                ? Math.max(0, chartDataApplied.time - requestEndedAt)
                : null,
              realChartPaintVisibleLagMs: firstPaint && leftExtensionLoaded
                ? Math.max(0, firstPaint.time - leftExtensionLoaded.time)
                : null,
              sourceRequestMs: requestMs(sourceFetches),
              targetRequestMs: requestMs(targetFetches),
              viewportReapplyMs: leftExtensionLoaded && viewportProjected
                ? Math.max(0, leftExtensionLoaded.time - viewportProjected.time)
                : null,
            },
            prependedBarCount: diagnostics.prependedBarCount ?? null,
            realChartPaintObserved: Boolean(firstPaint),
            readoutObservation: readoutVisible?.details?.observation || null,
            sourceFetches,
            sourceRequestCount: diagnostics.sourceRequestCount ?? null,
            targetFetches,
            targetRequestCount: diagnostics.targetRequestCount ?? null,
          };
        },
        async restore() {
          activeBaselineSignature = null;
          activeMilestones = null;
          const restored = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe: 1,
            paneId: 'main',
          });
          unsubscribeHistory();
          return restored;
        },
      };

      return {
        applyState,
        bridgeMounted: Boolean(root.__v6LeftwardHistoryInputBridge?.destroy),
        initial: await snapshot(),
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
  `);

  assert.equal(setup.applyState.status, 'applied');
  assert.equal(setup.bridgeMounted, true);
  assert.equal(setup.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);
  assert.equal(setup.registrySnapshot.started.includes('runtime.replay-coordination-materialization-handoff'), true);

  const samples = [
    { expectedTargetFetchTf: '4h', label: '4h', targetTimeframe: 240 },
    { expectedTargetFetchTf: '8h', label: '8h', targetTimeframe: 480 },
    { expectedTargetFetchTf: '1D', label: '1D', targetTimeframe: '1D' },
    { expectedTargetFetchTf: '1W', label: '1W', targetTimeframe: '1W' },
  ];
  const records = [];

  for (const sample of samples) {
    const prepared = await pageEval(`
      return await window.__v6Step370.prepareSample(${JSON.stringify(sample)});
    `);
    const x = prepared.hostRect.left + (prepared.hostRect.width * 0.42);
    const y = prepared.hostRect.top + (prepared.hostRect.height * 0.54);
    let record = null;
    for (const [attemptIndex, deltaX] of [-960, 960, -1280, 1280, -1600, 1600, -2200, 2200].entries()) {
      await pageEval(`
        return window.__v6Step370.beginInputAttempt(${JSON.stringify({ attemptIndex, deltaX })});
      `);
      await page.client.send('Input.dispatchMouseEvent', {
        deltaX,
        deltaY: 0,
        type: 'mouseWheel',
        x,
        y,
      });
      const attempt = await pageEval(`
        return await window.__v6Step370.waitForAttempt({ timeoutMs: 1800 });
      `);
      if (attempt.loaded) {
        record = attempt;
        break;
      }
    }
    assert.notEqual(record, null, sample.label);
    records.push(record);
  }

  const restored = await pageEval(`
    return await window.__v6Step370.restore();
  `);

  assert.deepEqual(records.map((record) => record.label), ['4h', '8h', '1D', '1W']);
  console.log(JSON.stringify({
    records: records.map((record) => ({
      firstPaintStage: record.firstPaintStage,
      inputToFirstPaintMs: record.inputToFirstPaintMs,
      inputToLeftExtensionLoadedMs: record.inputToLeftExtensionLoadedMs,
      inputToTargetFetchStartMs: record.inputToTargetFetchStartMs,
      label: record.label,
      phaseBreakdown: record.phaseBreakdown,
      targetFetchBars: record.targetFetches[0]?.bars ?? null,
      targetFetchTf: record.targetFetches[0]?.tf ?? null,
    })),
    step: 370,
  }, null, 2));

  records.forEach((record) => {
    assert.equal(record.browserVisible, true);
    assert.equal(record.path, 'target-history');
    assert.equal(record.fallbackReason, null);
    assert.equal(record.measurementBoundary, 'htf-drag-triggered-leftward-extension-interaction-measurement');
    assert.equal(record.readoutObservation, 'left-extension-listener');
    assert.equal(record.targetRequestCount >= 1, true);
    assert.equal(record.sourceRequestCount, 0);
    assert.equal(record.prependedBarCount > 0, true);
    assert.equal(record.sourceFetches.length, 0);
    assert.equal(record.targetFetches.length >= 1, true);
    assert.equal(record.targetFetches.some((fetchRecord) => fetchRecord.tf === record.expectedTargetFetchTf), true);
    assert.equal(record.realChartPaintObserved, true);
    assert.equal(Number.isFinite(record.inputToTargetFetchStartMs), true);
    assert.equal(Number.isFinite(record.inputToLeftExtensionLoadedMs), true);
    assert.equal(Number.isFinite(record.inputToFirstPaintMs), true);
    assert.equal(Number.isFinite(record.phaseBreakdown.targetRequestMs), true);
    assert.equal(Number.isFinite(record.phaseBreakdown.chartDataReplacementMs), true);
    assert.equal(Number.isFinite(record.phaseBreakdown.viewportReapplyMs), true);
    assert.equal(Number.isFinite(record.phaseBreakdown.realChartPaintVisibleLagMs), true);

    const named = Object.fromEntries(record.milestones.map((milestone) => [milestone.name, milestone]));
    assert.equal(Number.isFinite(named['user-input-dispatched']?.time), true);
    assert.equal(Number.isFinite(named['target-fetch-started']?.time), true);
    assert.equal(Number.isFinite(named['target-fetch-ended']?.time), true);
    assert.equal(Number.isFinite(named['chart-data-applied']?.time), true);
    assert.equal(Number.isFinite(named['viewport-projected']?.time), true);
    assert.equal(Number.isFinite(named['left-extension-loaded']?.time), true);
    assert.equal(named['user-input-dispatched'].time <= named['target-fetch-started'].time, true);
    assert.equal(named['target-fetch-started'].time <= named['target-fetch-ended'].time, true);
    assert.equal(named['target-fetch-ended'].time <= named['chart-data-applied'].time, true);
    assert.equal(named['chart-data-applied'].time <= named['left-extension-loaded'].time, true);
  });

  assert.equal(restored.sourceBarCount, setup.initial.sourceBarCount);
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe drag-triggered leftward extension interaction browser step370 smoke passed');
