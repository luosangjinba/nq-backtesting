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
          const cursorTimestamp = Number(window.__v6Step352CursorTimestamp || Date.parse('2026-06-01T16:50:00.000Z') / 1000);
          const bars = targetMode === 'empty'
            ? []
            : makeTargetBars({ cursorTimestamp, tf });
          fetchLog.push({
            bars: bars.length,
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
        const deadline = performance.now() + 8000;
        let applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        while (applyState.status !== 'applied' && performance.now() < deadline) {
          await sleep(40);
          applyState = await commands.dispatchCommand(contracts.CHART_ENTRY_PROJECTION_APPLY_COMMANDS.GET_STATE);
        }
        await animationFrames(2);
        return applyState;
      }

      function readoutState(paneId = 'main') {
        const readout = document.querySelector(
          '[data-v6-pane-status-readout][data-v6-pane-id="' + paneId + '"] [data-v6-target-materialization-diagnostics]',
        );
        return {
          exists: Boolean(readout),
          hidden: readout?.hidden ?? null,
          mode: readout?.dataset.v6TargetMaterializationDiagnosticsMode || '',
          paneId: readout?.dataset.v6TargetMaterializationDiagnosticsPaneId || '',
          reason: readout?.dataset.v6TargetMaterializationDiagnosticsReason || '',
          rows: [...(readout?.querySelectorAll('[data-v6-target-materialization-diagnostics-row]') || [])].map((row) => ({
            field: row.dataset.v6TargetMaterializationDiagnosticsField || '',
            text: row.textContent || '',
            value: row.dataset.v6TargetMaterializationDiagnosticsValue || '',
          })),
          snapshotReady: readout?.dataset.v6TargetMaterializationDiagnosticsSnapshotReady || '',
          text: readout?.textContent || '',
          title: readout?.title || '',
        };
      }

      async function waitForReadout(predicate) {
        const deadline = performance.now() + 8000;
        let state = readoutState('main');
        while (performance.now() < deadline) {
          if (predicate(state)) return state;
          await sleep(40);
          state = readoutState('main');
        }
        return state;
      }

      function rowValue(state, field) {
        return state.rows.find((row) => row.field === field)?.value || null;
      }

      async function replaySnapshot() {
        return await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      }

      function makeTargetHistory(cursorTimestamp, offsetSeconds = 0) {
        const anchor = cursorTimestamp + offsetSeconds;
        return {
          enabled: true,
          end: formatApiTime(anchor + 8 * 60 * 60),
          start: formatApiTime(anchor - 8 * 60 * 60),
        };
      }

      async function applyDisplayTimeframe({ displayTimeframe = 480, offsetSeconds = 0, targetHistory = null } = {}) {
        const replay = await replaySnapshot();
        const cursorTimestamp = Math.floor(Date.parse(replay.cursorTime) / 1000);
        window.__v6Step352CursorTimestamp = cursorTimestamp;
        const result = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe,
          paneId: 'main',
          targetHistory: targetHistory || makeTargetHistory(cursorTimestamp, offsetSeconds),
        });
        await animationFrames(3);
        return result;
      }

      document.querySelector('[data-v6-session-setup-name]').value = 'step352-readout-producer-flow';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T17:10';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();

      const initial = readoutState('main');

      const materialized = await applyDisplayTimeframe();
      const afterDisplayApply = await waitForReadout((state) => (
        state.mode === 'collapsed'
        && state.reason === 'target-history-active'
        && rowValue(state, 'targetHistoryStatus') === 'applied'
        && rowValue(state, 'projectionOwner') === 'runtime.bar-data'
      ));

      const manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneId: 'main',
      });
      await animationFrames(2);
      const afterManualNext = await waitForReadout((state) => (
        state.reason === 'target-history-active'
        && rowValue(state, 'manualNextStatus') === 'advanced'
      ));

      const autoStart = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
        paneId: 'main',
        speed: 4,
      });
      const afterAutoStart = await waitForReadout((state) => (
        state.reason === 'target-history-active'
        && rowValue(state, 'autoPlayStatus') === 'started'
      ));

      const autoDeadline = performance.now() + 3000;
      let afterAutoTick = afterAutoStart;
      while (performance.now() < autoDeadline) {
        await sleep(60);
        afterAutoTick = readoutState('main');
        if (rowValue(afterAutoTick, 'autoPlayStatus') === 'playing') break;
      }

      await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      await animationFrames(2);
      const afterAutoStop = await waitForReadout((state) => (
        state.reason === 'target-history-active'
        && rowValue(state, 'autoPlayStatus') === 'paused'
      ));

      targetMode = 'empty';
      const fallbackMaterialized = await applyDisplayTimeframe({ offsetSeconds: 60 });
      const afterFallback = await waitForReadout((state) => (
        state.mode === 'collapsed'
        && state.reason === 'fallback'
        && rowValue(state, 'targetHistoryStatus') === 'fallback'
        && rowValue(state, 'fallbackStatus') === 'target-history-no-visible-bars'
      ));

      targetMode = 'success';
      const normalMaterialized = await applyDisplayTimeframe({
        displayTimeframe: 1,
        targetHistory: { enabled: false },
      });
      const afterNormal = await waitForReadout((state) => (
        state.mode === 'hidden'
        && state.reason === 'normal-replay'
        && state.rows.length === 0
      ));

      return {
        afterAutoStart,
        afterAutoStop,
        afterAutoTick,
        afterDisplayApply,
        afterFallback,
        afterManualNext,
        afterNormal,
        applyState,
        autoStart,
        fetchLog,
        fallbackMaterialized: {
          targetHistoryStatus: fallbackMaterialized.targetHistory?.status || null,
        },
        initial,
        manualNext,
        materialized: {
          projectionOwner: materialized.projectionSource?.owner || null,
          targetHistoryStatus: materialized.targetHistory?.status || null,
        },
        normalMaterialized: {
          targetHistoryStatus: normalMaterialized.targetHistory?.status || null,
        },
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');

  assert.equal(value.initial.exists, true);
  assert.equal(value.initial.hidden, true);
  assert.equal(value.initial.mode, 'hidden');

  assert.equal(value.materialized.projectionOwner, 'runtime.bar-data');
  assert.equal(value.materialized.targetHistoryStatus, 'applied');
  assert.equal(value.afterDisplayApply.hidden, false);
  assert.equal(value.afterDisplayApply.mode, 'collapsed');
  assert.equal(value.afterDisplayApply.reason, 'target-history-active');
  assert.deepEqual(value.afterDisplayApply.rows.map((row) => row.field), [
    'displayTimeframe',
    'targetHistoryStatus',
    'projectionOwner',
    'manualNextStatus',
    'autoPlayStatus',
    'fallbackStatus',
  ]);
  assert.match(value.afterDisplayApply.text, /TF 480m/);
  assert.match(value.afterDisplayApply.text, /Target applied/);
  assert.match(value.afterDisplayApply.text, /Projection runtime\.bar-data/);
  assert.match(value.afterDisplayApply.text, /Fallback available/);
  assert.doesNotMatch(value.afterDisplayApply.text, /sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp/);
  assert.match(value.afterDisplayApply.title, /Replay cursor authority: source 1m/);

  assert.equal(value.manualNext.status, 'advanced', value.manualNext.error || 'manual next should advance');
  assert.match(value.afterManualNext.text, /Next advanced/);
  assert.doesNotMatch(value.afterManualNext.text, /sourceCursorTime|latestSourceTimestamp/);

  assert.equal(value.autoStart.playing, true);
  assert.match(value.afterAutoStart.text, /Auto started/);
  assert.match(value.afterAutoTick.text, /Auto playing/);
  assert.match(value.afterAutoStop.text, /Auto paused/);
  assert.doesNotMatch(value.afterAutoStop.text, /sourceCursorAuthority|targetBarsDisplayInputOnly|latestSourceTimestamp/);

  assert.equal(value.fallbackMaterialized.targetHistoryStatus, 'fallback');
  assert.equal(value.afterFallback.hidden, false);
  assert.equal(value.afterFallback.mode, 'collapsed');
  assert.equal(value.afterFallback.reason, 'fallback');
  assert.match(value.afterFallback.text, /Target fallback/);
  assert.match(value.afterFallback.text, /Fallback target-history-no-visible-bars/);

  assert.equal(value.afterNormal.hidden, true);
  assert.equal(value.afterNormal.mode, 'hidden');
  assert.equal(value.afterNormal.reason, 'normal-replay');
  assert.equal(value.afterNormal.rows.length, 0);
  assert.equal(value.afterNormal.text, '');

  const targetFetches = value.fetchLog.filter((record) => record.kind === 'target');
  assert.equal(targetFetches.some((record) => record.tf === '8h' && record.mode === 'success'), true);
  assert.equal(targetFetches.some((record) => record.tf === '8h' && record.mode === 'empty'), true);
} finally {
  await page.cleanup();
}

console.log('v6 target materialization replay diagnostics readout producer flow browser step352 smoke passed');
