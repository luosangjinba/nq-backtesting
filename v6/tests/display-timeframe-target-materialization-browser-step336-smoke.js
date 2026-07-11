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
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      let targetMode = 'success';

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

      function formatApiTime(timestamp) {
        return new Date(timestamp * 1000).toISOString().slice(0, 16).replace('T', ' ');
      }

      function normalizeTimestamp(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return Math.floor(value > 10000000000 ? value / 1000 : value);
        }
        return Math.floor(Date.parse(value) / 1000);
      }

      function stepSecondsForTarget(tf) {
        if (tf === '1W') return 7 * 24 * 60 * 60;
        if (tf === '1D') return 24 * 60 * 60;
        if (tf === '8h') return 8 * 60 * 60;
        return 60;
      }

      function makeSourceBars({ end, start, stepSeconds }) {
        const startTs = parseApiTime(start);
        const endTs = parseApiTime(end);
        const bars = [];
        for (let timestamp = startTs; timestamp <= endTs && bars.length < 50000; timestamp += stepSeconds) {
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

      function makeTargetBars({ cursorTimestamp, tf }) {
        const step = stepSecondsForTarget(tf);
        const first = cursorTimestamp - step;
        const second = cursorTimestamp + step;
        return [first, second].map((timestamp, index) => ({
          close: 500 + index + 0.5,
          high: 501 + index,
          low: 499 + index,
          open: 500 + index,
          timestamp,
        }));
      }

      window.fetch = async (input, init) => {
        const startedAt = performance.now();
        const url = new URL(String(input), window.location.href);
        if (url.pathname === '/v4/bars') {
          const tf = Number(url.searchParams.get('tf') || 1);
          const bars = makeSourceBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: Math.max(1, tf) * 60,
          });
          fetchLog.push({
            bars: bars.length,
            durationMs: performance.now() - startedAt,
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
          const cursorTimestamp = Number(url.searchParams.get('cursor') || window.__v6Step336CursorTimestamp);
          const bars = targetMode === 'empty'
            ? []
            : makeTargetBars({ cursorTimestamp, tf });
          fetchLog.push({
            bars: bars.length,
            durationMs: performance.now() - startedAt,
            kind: 'target',
            mode: targetMode,
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

      async function snapshot() {
        const chart = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_BARS, { paneId: 'main' });
        const source = await commands.dispatchCommand(contracts.CHART_DATA_COMMANDS.GET_SOURCE_BARS, { paneId: 'main' });
        const pane = await commands.dispatchCommand(contracts.PANE_COMMANDS.GET_BY_ID, 'main');
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        return {
          chartOpen: chart.bars?.[0]?.open ?? null,
          chartTimestamps: (chart.bars || []).map((bar) => bar.timestamp),
          displayTimeframe: pane.displayTimeframe,
          replayCursorTime: replay.cursorTime,
          sourceBarCount: source.bars?.length || 0,
          sourceTimestamps: (source.bars || []).map((bar) => bar.timestamp),
          targetBarCount: chart.bars?.length || 0,
        };
      }

      function makeTargetHistory(cursorTimestamp, tf, offsetSeconds = 0) {
        const step = stepSecondsForTarget(tf);
        const anchor = cursorTimestamp + offsetSeconds;
        return {
          enabled: true,
          end: formatApiTime(anchor + step),
          start: formatApiTime(anchor - step),
        };
      }

      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();
      const initial = await snapshot();
      const cursorTimestamp = normalizeTimestamp(initial.replayCursorTime);
      window.__v6Step336CursorTimestamp = cursorTimestamp;

      async function applyTarget({ expectedTf, displayTimeframe, historyOffsetSeconds = 0 }) {
        await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 1,
          paneId: 'main',
        });
        await animationFrames(2);

        const fetchStartIndex = fetchLog.length;
        const startedAt = performance.now();
        const result = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe,
          paneId: 'main',
          targetHistory: makeTargetHistory(cursorTimestamp, expectedTf, historyOffsetSeconds),
        });
        await animationFrames(3);
        const endedAt = performance.now();
        const after = await snapshot();
        const targetFetch = fetchLog
          .slice(fetchStartIndex)
          .find((record) => record.kind === 'target' && record.tf === expectedTf) || null;
        return {
          after,
          displayTimeframe,
          durationMs: endedAt - startedAt,
          path: result.projectionSource?.owner === 'runtime.bar-data' ? 'target-history' : 'source-window-fallback',
          result: {
            projectionOwner: result.projectionSource?.owner || null,
            targetHistory: result.targetHistory,
          },
          sourcePreserved: after.sourceTimestamps.length === initial.sourceTimestamps.length &&
            after.sourceTimestamps.every((timestamp, index) => timestamp === initial.sourceTimestamps[index]),
          targetFetch,
          visualLatencyMs: endedAt - startedAt,
        };
      }

      const records = [];
      for (const sample of [
        { displayTimeframe: 480, expectedTf: '8h' },
        { displayTimeframe: '1D', expectedTf: '1D' },
        { displayTimeframe: '1W', expectedTf: '1W' },
      ]) {
        records.push(await applyTarget(sample));
      }

      const restored = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 1,
        paneId: 'main',
      });
      await animationFrames(2);
      const restoredSnapshot = await snapshot();

      targetMode = 'empty';
      const fallback = await applyTarget({
        displayTimeframe: 480,
        expectedTf: '8h',
        historyOffsetSeconds: 60,
      });

      return {
        applyState,
        fallback,
        fetchLog,
        initial,
        records,
        restored: {
          projectionOwner: restored.projectionSource?.owner || null,
          sourceBarCount: restored.sourceBarCount,
          targetBarCount: restored.targetBarCount,
        },
        restoredSnapshot,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.sourceBarCount > 0, true);
  assert.equal(value.records.length, 3);

  const expected = [
    { displayTimeframe: 480, tf: '8h' },
    { displayTimeframe: '1D', tf: '1D' },
    { displayTimeframe: '1W', tf: '1W' },
  ];
  value.records.forEach((record, index) => {
    assert.equal(record.displayTimeframe, expected[index].displayTimeframe);
    assert.equal(record.path, 'target-history');
    assert.equal(record.result.projectionOwner, 'runtime.bar-data');
    assert.equal(record.result.targetHistory.status, 'applied');
    assert.equal(record.result.targetHistory.reason, 'target-history-opt-in');
    assert.equal(record.result.targetHistory.barCount, 1);
    assert.equal(record.result.targetHistory.revealStates.length, 2);
    assert.equal(record.result.targetHistory.revealStates[0].visible, true);
    assert.equal(record.result.targetHistory.revealStates[1].visible, false);
    assert.equal(record.result.targetHistory.revealStates[1].reason, 'target-bar-start-after-source-cursor');
    assert.equal(record.targetFetch.tf, expected[index].tf);
    assert.equal(record.targetFetch.bars, 2);
    assert.equal(record.after.chartOpen, 500);
    assert.equal(record.after.targetBarCount, 1);
    assert.equal(record.sourcePreserved, true);
    assert.equal(Number.isFinite(record.visualLatencyMs), true);
    assert.equal(record.visualLatencyMs < 350, true);
  });

  assert.equal(value.restored.projectionOwner, 'runtime.chart-data-projection');
  assert.equal(value.restored.sourceBarCount, value.initial.sourceBarCount);
  assert.equal(value.restored.targetBarCount, value.initial.sourceBarCount);
  assert.deepEqual(value.restoredSnapshot.sourceTimestamps, value.initial.sourceTimestamps);
  assert.deepEqual(value.restoredSnapshot.chartTimestamps, value.initial.sourceTimestamps);

  assert.equal(value.fallback.path, 'source-window-fallback');
  assert.equal(value.fallback.result.projectionOwner, 'runtime.chart-data-projection');
  assert.equal(value.fallback.result.targetHistory.status, 'fallback');
  assert.equal(value.fallback.result.targetHistory.reason, 'target-history-no-visible-bars');
  assert.equal(value.fallback.targetFetch.mode, 'empty');
  assert.equal(value.fallback.targetFetch.bars, 0);
  assert.equal(value.fallback.after.sourceBarCount >= value.initial.sourceBarCount, true);

  const responsiveness = auditHighTimeframeTargetHistoryResponsiveness({
    records: value.records.map((record) => ({
      applyLagMs: 0,
      browserVisible: true,
      durationMs: record.durationMs,
      path: 'target-history',
      visualLatencyMs: record.visualLatencyMs,
    })),
    packCostControlsReady: true,
    targetHistoryCoverageComplete: true,
  });
  assert.equal(responsiveness.reason, 'high-timeframe-target-history-responsive-materialization-ready');
  assert.equal(responsiveness.summary.browserSampleCount, 3);
  assert.equal(responsiveness.summary.targetCount, 3);
  assert.equal(responsiveness.summary.fallbackRate, 0);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe target materialization browser step336 smoke passed');
