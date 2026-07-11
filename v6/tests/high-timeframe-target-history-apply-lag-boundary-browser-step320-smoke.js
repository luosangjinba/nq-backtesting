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
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      const milestones = [];

      function mark(name, details = {}) {
        milestones.push({
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
            stepSeconds: tf === '8h' ? 8 * 60 * 60 : 60,
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

      function firstMilestone(name) {
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
          if (readout.path === 'target' && !firstMilestone('diagnostics-readout-visible')) {
            mark('diagnostics-readout-visible', {
              observation: 'left-extension-listener',
              text: readout.text,
            });
          }
        },
      );

      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 1,
        paneId: 'main',
      });
      await animationFrames(3);
      const before = await snapshot();
      milestones.length = 0;
      const fetchStartIndex = fetchLog.length;
      mark('target-history-apply-start', { targetTimeframe: 480 });
      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 480,
        paneId: 'main',
      });

      const deadline = performance.now() + 9000;
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
          firstMilestone('diagnostics-readout-visible')
        ) {
          break;
        }
        await sleep(25);
      }
      unsubscribeHistory();
      await animationFrames(2);
      after = await snapshot();

      const targetFetches = fetchLog
        .slice(fetchStartIndex)
        .filter((record) => record.kind === 'target' && record.tf === '8h');
      const named = Object.fromEntries(milestones.map((milestone) => [milestone.name, milestone]));
      return {
        after,
        applyState,
        before,
        initial,
        milestones,
        named,
        registrySnapshot: root.__v6RuntimeRegistry.snapshot(),
        targetFetches,
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.started.includes('runtime.leftward-history-extension'), true);
  assert.equal(value.applyState.status, 'applied');
  assert.equal(value.initial.barCount > 0, true);
  assert.equal(value.before.displayTimeframe, 1);
  assert.equal(value.after.displayTimeframe, 480);
  assert.equal(value.after.history.status, 'loaded');
  assert.equal(value.after.history.extension?.targetHistory?.status, 'applied');
  assert.equal(value.after.history.extension?.diagnostics?.path, 'target-history');
  assert.equal(value.after.oldestTimestamp < value.before.oldestTimestamp, true);
  assert.equal(value.after.readout.path, 'target');
  assert.equal(value.targetFetches.length, 1);

  for (const name of [
    'target-history-apply-start',
    'viewport-projected',
    'chart-data-applied',
    'left-extension-loaded',
    'diagnostics-readout-visible',
  ]) {
    assert.equal(Number.isFinite(value.named[name]?.time), true, name);
  }

  assert.equal(value.named['target-history-apply-start'].time <= value.named['viewport-projected'].time, true);
  assert.equal(value.named['target-history-apply-start'].time <= value.named['chart-data-applied'].time, true);
  assert.equal(value.named['viewport-projected'].time <= value.named['left-extension-loaded'].time, true);
  assert.equal(value.named['chart-data-applied'].time <= value.named['left-extension-loaded'].time, true);
  assert.equal(value.named['left-extension-loaded'].time <= value.named['diagnostics-readout-visible'].time, true);
  assert.equal(value.named['diagnostics-readout-visible'].details.observation, 'left-extension-listener');
} finally {
  await page.cleanup();
}

console.log('v6 high timeframe target history apply lag boundary browser step320 smoke passed');
