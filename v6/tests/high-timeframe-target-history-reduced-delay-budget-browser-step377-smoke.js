import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const TARGET_FETCH_BUDGET_MS = 300;
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
      const root = document.querySelector('[data-v6-root]');
      const host = document.querySelector('[data-v6-chart-engine-host][data-v6-pane-id="main"]');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      const traceLog = [];
      let attemptStartIndex = 0;
      let inputStartedAt = 0;
      let sampleContext = null;

      window.__v6LeftwardHistoryInputBridgeTrace = (record = {}) => {
        traceLog.push({
          ...record,
          time: performance.now(),
        });
      };

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

      async function historyState() {
        return await commands.dispatchCommand(contracts.CHART_HISTORY_COMMANDS.GET_STATE);
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();

      window.__v6Step377 = {
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
          const rect = host.getBoundingClientRect();
          sampleContext = sample;
          return {
            hostRect: {
              height: rect.height,
              left: rect.left,
              top: rect.top,
              width: rect.width,
            },
          };
        },
        beginAttempt() {
          traceLog.length = 0;
          attemptStartIndex = fetchLog.length;
          inputStartedAt = performance.now();
          return { ok: true };
        },
        async waitForAttempt({ timeoutMs = 1200 } = {}) {
          const deadline = performance.now() + timeoutMs;
          let history = await historyState();
          while (performance.now() < deadline) {
            history = await historyState();
            const targetFetch = fetchLog
              .slice(attemptStartIndex)
              .find((record) => record.kind === 'target' && record.tf === sampleContext.expectedTargetFetchTf);
            if (targetFetch && history.extension?.diagnostics?.path === 'target-history') {
              return {
                diagnosticsPath: history.extension.diagnostics.path,
                inputToTargetFetchStartMs: Math.max(0, targetFetch.startedAt - inputStartedAt),
                label: sampleContext.label,
                scheduleTrace: traceLog.slice(),
                sourceFetchCount: fetchLog.slice(attemptStartIndex).filter((record) => record.kind === 'source').length,
                targetFetchBars: targetFetch.bars,
                targetFetchTf: targetFetch.tf,
              };
            }
            await sleep(10);
          }
          return {
            diagnosticsPath: history.extension?.diagnostics?.path || null,
            inputToTargetFetchStartMs: null,
            label: sampleContext.label,
            scheduleTrace: traceLog.slice(),
            sourceFetchCount: fetchLog.slice(attemptStartIndex).filter((record) => record.kind === 'source').length,
            targetFetchBars: null,
            targetFetchTf: null,
          };
        },
        async restore() {
          delete window.__v6LeftwardHistoryInputBridgeTrace;
          return await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
            displayTimeframe: 1,
            paneId: 'main',
          });
        },
      };

      return {
        applyState,
        bridgeMounted: Boolean(root.__v6LeftwardHistoryInputBridge?.destroy),
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
      };
  `);

  assert.equal(setup.applyState.status, 'applied');
  assert.equal(setup.bridgeMounted, true);
  assert.equal(setup.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);

  const samples = [
    { expectedTargetFetchTf: '4h', label: '4h', targetTimeframe: 240 },
    { expectedTargetFetchTf: '8h', label: '8h', targetTimeframe: 480 },
    { expectedTargetFetchTf: '1D', label: '1D', targetTimeframe: '1D' },
    { expectedTargetFetchTf: '1W', label: '1W', targetTimeframe: '1W' },
  ];
  const records = [];

  for (const sample of samples) {
    const prepared = await pageEval(`
      return await window.__v6Step377.prepareSample(${JSON.stringify(sample)});
    `);
    const x = prepared.hostRect.left + (prepared.hostRect.width * 0.42);
    const y = prepared.hostRect.top + (prepared.hostRect.height * 0.54);
    let record = null;
    for (const deltaX of [-960, 960, -1280, 1280, -1600, 1600]) {
      await pageEval('return window.__v6Step377.beginAttempt();');
      await page.client.send('Input.dispatchMouseEvent', {
        deltaX,
        deltaY: 0,
        type: 'mouseWheel',
        x,
        y,
      });
      const attempt = await pageEval('return await window.__v6Step377.waitForAttempt();');
      if (attempt.targetFetchTf === sample.expectedTargetFetchTf) {
        record = attempt;
        break;
      }
    }
    assert.notEqual(record, null, sample.label);
    records.push(record);
  }

  await pageEval('return await window.__v6Step377.restore();');

  console.log(JSON.stringify({
    budgetMs: TARGET_FETCH_BUDGET_MS,
    records: records.map((record) => ({
      inputToTargetFetchStartMs: record.inputToTargetFetchStartMs,
      label: record.label,
      nativeScheduleCount: record.scheduleTrace.filter((trace) => (
        trace.phase === 'schedule-resolved' &&
        trace.mode === 'native-target-history-reduced-delay' &&
        trace.delayMs === 100
      )).length,
      suppressedScheduleCount: record.scheduleTrace.filter((trace) => trace.phase === 'schedule-suppressed').length,
      targetFetchBars: record.targetFetchBars,
      targetFetchTf: record.targetFetchTf,
    })),
    step: 377,
  }, null, 2));

  records.forEach((record) => {
    assert.equal(record.diagnosticsPath, 'target-history');
    assert.equal(record.sourceFetchCount, 0);
    assert.equal(record.targetFetchTf, samples.find((sample) => sample.label === record.label).expectedTargetFetchTf);
    assert.equal(Number.isFinite(record.inputToTargetFetchStartMs), true, record.label);
    assert.equal(record.inputToTargetFetchStartMs < TARGET_FETCH_BUDGET_MS, true, record.label);
    assert.equal(record.targetFetchBars > 0, true, record.label);
    assert.equal(
      record.scheduleTrace.some((trace) => (
        trace.phase === 'schedule-resolved' &&
        trace.mode === 'native-target-history-reduced-delay' &&
        trace.delayMs === 100 &&
        trace.targetHistoryEnabled === true
      )),
      true,
      record.label,
    );
    assert.equal(
      record.scheduleTrace.some((trace) => (
        trace.phase === 'timer-scheduled' &&
        trace.mode === 'native-target-history-reduced-delay' &&
        trace.delayMs === 100
      )),
      true,
      record.label,
    );
    const delayedRuntimeReasons = record.scheduleTrace
      .filter((trace) => (
        trace.phase === 'schedule-resolved' &&
        trace.mode === 'delayed' &&
        trace.delayMs === 500 &&
        (trace.reason === 'runtime-surface-check' || trace.reason === 'runtime-left-extension-loaded')
      ))
      .map((trace) => trace.reason);
    delayedRuntimeReasons.forEach((reason) => {
      assert.equal(
        record.scheduleTrace.some((trace) => trace.phase === 'schedule-suppressed' && trace.reason === reason),
        true,
        `${record.label}:${reason}`,
      );
    });
  });
} finally {
  await page.cleanup();
}
