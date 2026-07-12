import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const page = await openV6Page({ height: 900, width: 1440 });

try {
  const value = JSON.parse(await evaluate(page.client, `
    (async () => JSON.stringify(await (async () => {
      localStorage.removeItem('v6.sessions.metadata');
      const commands = await import('/v6/src/runtime/commands.js');
      const contracts = await import('/v6/src/contracts/app-contracts.js');
      const originalFetch = window.fetch.bind(window);
      const fetchLog = [];

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

      function makeTargetBars({ cursorTimestamp, tf }) {
        const step = tf === '8h' ? 8 * 60 * 60 : 60;
        const first = bucketStart(cursorTimestamp, step);
        const second = first + step;
        return [first, second].map((timestamp, index) => ({
          close: 800 + index + 0.5,
          high: 801 + index,
          low: 799 + index,
          open: 800 + index,
          timestamp,
        }));
      }

      window.fetch = async (input, init) => {
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
          const cursorTimestamp = Number(window.__v6Step347CursorTimestamp || Date.parse('2026-06-01T16:50:00.000Z') / 1000);
          const bars = makeTargetBars({ cursorTimestamp, tf });
          fetchLog.push({
            bars: bars.length,
            kind: 'target',
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
        const deadline = performance.now() + 8000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status !== 'applied' && performance.now() < deadline) {
          await sleep(40);
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        await animationFrames(2);
        return applyState;
      }

      async function diagnosticsSnapshot() {
        return await commands.dispatchCommand(
          contracts.TARGET_MATERIALIZATION_REPLAY_DIAGNOSTICS_COMMANDS.GET_SNAPSHOT,
        );
      }

      async function replaySnapshot() {
        return await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      }

      function makeTargetHistory(cursorTimestamp) {
        return {
          enabled: true,
          end: formatApiTime(cursorTimestamp + 8 * 60 * 60),
          start: formatApiTime(cursorTimestamp - 8 * 60 * 60),
        };
      }

      document.querySelector('[data-v6-session-setup-name]').value = 'step347-diagnostics-read';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T17:10';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();

      const replayBeforeApply = await replaySnapshot();
      const cursorTimestamp = Math.floor(Date.parse(replayBeforeApply.cursorTime) / 1000);
      window.__v6Step347CursorTimestamp = cursorTimestamp;
      const materialized = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
        displayTimeframe: 480,
        paneId: 'main',
        targetHistory: makeTargetHistory(cursorTimestamp),
      });
      await animationFrames(3);
      const afterDisplayApplyDiagnostics = await diagnosticsSnapshot();

      const manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneId: 'main',
      });
      await animationFrames(2);
      const afterManualNextDiagnostics = await diagnosticsSnapshot();

      const autoStart = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
        paneId: 'main',
        speed: 4,
      });
      await animationFrames(2);
      const afterAutoStartDiagnostics = await diagnosticsSnapshot();

      const deadline = performance.now() + 3000;
      let afterAutoTickDiagnostics = afterAutoStartDiagnostics;
      while (performance.now() < deadline) {
        await sleep(60);
        afterAutoTickDiagnostics = await diagnosticsSnapshot();
        if (afterAutoTickDiagnostics.snapshot?.autoPlayStatus === 'playing') break;
      }

      const autoStop = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch((error) => ({
        error: error?.message || String(error),
      }));
      await animationFrames(2);
      const afterAutoStopDiagnostics = await diagnosticsSnapshot();

      return {
        afterAutoStartDiagnostics,
        afterAutoStopDiagnostics,
        afterAutoTickDiagnostics,
        afterDisplayApplyDiagnostics,
        afterManualNextDiagnostics,
        applyState,
        autoStart,
        autoStop,
        fetchLog,
        manualNext,
        materialized: {
          projectionOwner: materialized.projectionSource?.owner || null,
          targetHistoryStatus: materialized.targetHistory?.status || null,
        },
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');

  assert.equal(value.materialized.projectionOwner, 'runtime.bar-data');
  assert.equal(value.materialized.targetHistoryStatus, 'applied');
  assert.equal(value.afterDisplayApplyDiagnostics.status, 'ready');
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.displayApplyStatus, 'applied');
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.displayTimeframe, '480');
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.projectionOwner, 'runtime.bar-data');
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.targetHistoryStatus, 'applied');
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.sourceCursorAuthority, true);
  assert.equal(value.afterDisplayApplyDiagnostics.snapshot.targetBarsDisplayInputOnly, true);

  assert.equal(value.manualNext.status, 'advanced', value.manualNext.error || 'manual next should advance');
  assert.equal(value.afterManualNextDiagnostics.snapshot.manualNextStatus, 'advanced');
  assert.equal(value.afterManualNextDiagnostics.snapshot.sourceCursorTime, '2026-06-01T16:51:00.000Z');
  assert.equal(value.afterManualNextDiagnostics.snapshot.latestSourceTimestamp, Math.floor(Date.parse('2026-06-01T16:51:00.000Z') / 1000));

  assert.equal(value.autoStart.playing, true);
  assert.equal(value.afterAutoStartDiagnostics.snapshot.autoPlayStatus, 'started');
  assert.equal(value.afterAutoTickDiagnostics.snapshot.autoPlayStatus, 'playing');
  assert.equal(value.afterAutoStopDiagnostics.snapshot.autoPlayStatus, 'paused');
  assert.equal(value.afterAutoStopDiagnostics.snapshot.sourceCursorAuthority, true);
  assert.equal(value.afterAutoStopDiagnostics.snapshot.targetBarsDisplayInputOnly, true);

  const targetFetches = value.fetchLog.filter((record) => record.kind === 'target');
  assert.equal(targetFetches.some((record) => record.tf === '8h'), true);
} finally {
  await page.cleanup();
}

console.log('v6 target materialization replay diagnostics browser read step347 smoke passed');
