import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const RUNTIME_ID = 'runtime.replay-coordination-materialization-handoff';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const root = document.querySelector('[data-v6-root]');
      const registrySnapshot = root.__v6RuntimeRegistry.snapshot();

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

      function makeSourceBars({ end, start, stepSeconds }) {
        const startTs = parseApiTime(start);
        const endTs = parseApiTime(end);
        const bars = [];
        for (let timestamp = startTs; timestamp <= endTs && bars.length < 50000; timestamp += stepSeconds) {
          const index = Math.round((timestamp - parseApiTime('2026-06-01 00:00')) / 60);
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

      function bucketStart(timestamp, stepSeconds) {
        return Math.floor(timestamp / stepSeconds) * stepSeconds;
      }

      function makeTargetBars({ cursorTimestamp }) {
        const step = 8 * 60 * 60;
        const first = bucketStart(cursorTimestamp, step);
        const second = first + step;
        return [first, second].map((timestamp, index) => ({
          bucketEndTimestamp: timestamp,
          bucketStartTimestamp: timestamp,
          close: 800 + index + 0.5,
          high: 801 + index,
          low: 799 + index,
          open: 800 + index,
          timestamp,
        }));
      }

      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];
      window.fetch = async (input, init) => {
        const url = new URL(String(input), window.location.href);
        if (url.pathname === '/v4/bars') {
          const bars = makeSourceBars({
            end: url.searchParams.get('end'),
            start: url.searchParams.get('start'),
            stepSeconds: Math.max(1, Number(url.searchParams.get('tf') || 1)) * 60,
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
          const cursorTimestamp = Number(window.__v6Step365CursorTimestamp || Date.parse('2026-06-01T16:50:00.000Z') / 1000);
          const bars = makeTargetBars({ cursorTimestamp });
          fetchLog.push({
            bars: bars.length,
            kind: 'target',
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

      async function waitForApplied() {
        const deadline = performance.now() + 8000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status !== 'applied' && performance.now() < deadline) {
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
        const latest = chart.bars?.at(-1) || null;
        const latestSource = source.bars?.at(-1) || null;
        return {
          chartBarCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          latestChartClose: latest ? Number(latest.close) : null,
          latestChartTimestamp: latest ? Number(latest.timestamp ?? latest.time) : null,
          latestSourceTimestamp: latestSource ? Number(latestSource.timestamp ?? latestSource.time) : null,
          replayCursorTime: replay.cursorTime,
          replayCursorTimestamp: normalizeTimestamp(replay.cursorTime),
          replayIndex: replay.cursorIndex,
          revealedCount: replay.revealedCount,
          sourceBarCount: source.bars?.length || 0,
        };
      }

      function makeTargetHistory(cursorTimestamp) {
        const step = 8 * 60 * 60;
        return {
          enabled: true,
          end: formatApiTime(cursorTimestamp + step),
          start: formatApiTime(cursorTimestamp - step),
        };
      }

      document.querySelector('[data-v6-session-setup-name]').value = 'step365-app-registration';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T18:10';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();
      await waitForApplied();

      const beforeMaterialization = await snapshot();
      window.__v6Step365CursorTimestamp = beforeMaterialization.replayCursorTimestamp;
      await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 480,
        paneId: 'main',
        targetHistory: makeTargetHistory(beforeMaterialization.replayCursorTimestamp),
      });
      await animationFrames(3);
      const afterMaterialization = await snapshot();
      await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneId: 'main',
      });
      const handoffDeadline = performance.now() + 8000;
      let afterManualNext = await snapshot();
      while (afterManualNext.latestChartClose >= 900 && performance.now() < handoffDeadline) {
        await sleep(40);
        afterManualNext = await snapshot();
      }
      await animationFrames(2);
      afterManualNext = await snapshot();
      const handoffState = registrySnapshot.started.includes('${RUNTIME_ID}')
        ? root.__v6RuntimeRegistry.snapshot()
        : registrySnapshot;

      return {
        afterManualNext,
        afterMaterialization,
        beforeMaterialization,
        fetchLog,
        handoffState,
        registrySnapshot,
      };
    })()))()
  `));

  assert.equal(value.registrySnapshot.running, true);
  assert.equal(value.registrySnapshot.runtimes.includes(RUNTIME_ID), true);
  assert.equal(value.registrySnapshot.started.includes(RUNTIME_ID), true);
  assert.equal(value.handoffState.started.includes(RUNTIME_ID), true);
  assert.equal(value.beforeMaterialization.displayTimeframe, 1);
  assert.equal(value.afterMaterialization.displayTimeframe, 480);
  assert.equal(value.afterMaterialization.sourceBarCount > 0, true);
  assert.equal(value.afterMaterialization.chartBarCount > 0, true);
  assert.equal(value.afterManualNext.displayTimeframe, 480);
  assert.equal(value.afterManualNext.replayCursorTimestamp, value.beforeMaterialization.replayCursorTimestamp + 60);
  assert.equal(value.afterManualNext.latestSourceTimestamp, value.afterManualNext.replayCursorTimestamp);
  assert.equal(value.afterManualNext.sourceBarCount, value.afterMaterialization.sourceBarCount + 1);
  assert.equal(value.afterManualNext.latestChartTimestamp >= value.afterMaterialization.latestChartTimestamp, true);
  assert.equal(value.afterManualNext.latestChartClose < 900, true);
  assert.equal(value.fetchLog.some((entry) => entry.kind === 'target' && entry.tf === '8h'), true);
  assert.equal(value.fetchLog.some((entry) => entry.kind === 'source' && entry.tf === '1'), true);

  console.log('v6 replay coordination materialization runtime handoff app registration browser step365 smoke passed');
} finally {
  await page.cleanup();
}
