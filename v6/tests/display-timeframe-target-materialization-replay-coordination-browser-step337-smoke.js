import assert from 'node:assert/strict';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const EIGHT_HOUR_SECONDS = 8 * 60 * 60;
const GAP_END_ISO = '2026-06-01T18:00:00.000Z';
const AFTER_GAP_ISO = '2026-06-01T18:01:00.000Z';

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

      function normalizeTimestamp(value) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return Math.floor(value > 10000000000 ? value / 1000 : value);
        }
        return Math.floor(Date.parse(value) / 1000);
      }

      function isTradingTimestamp(timestamp) {
        const iso = new Date(timestamp * 1000).toISOString();
        return !(iso >= '2026-06-01T17:00:00.000Z' && iso < '2026-06-01T18:00:00.000Z');
      }

      function makeSourceBars({ end, start, stepSeconds }) {
        const startTs = parseApiTime(start);
        const endTs = parseApiTime(end);
        const bars = [];
        for (let timestamp = startTs; timestamp <= endTs && bars.length < 50000; timestamp += stepSeconds) {
          if (!isTradingTimestamp(timestamp)) continue;
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
            end: url.searchParams.get('end'),
            kind: 'source',
            start: url.searchParams.get('start'),
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
          const cursorTimestamp = Number(window.__v6Step337CursorTimestamp || Date.parse('2026-06-01T16:50:00.000Z') / 1000);
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
        const projection = await commands.dispatchCommand(contracts.CHART_DATA_PROJECTION_COMMANDS.GET_STATE);
        const replay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        const latest = chart.bars?.at(-1) || null;
        const latestSource = source.bars?.at(-1) || null;
        const projectedBucket = projection.lastProjection?.buckets?.at(-1) || null;
        return {
          chartBarCount: chart.bars?.length || 0,
          displayTimeframe: pane.displayTimeframe,
          latestChartTimestamp: latest ? Number(latest.timestamp ?? latest.time) : null,
          latestChartOpen: latest?.open ?? null,
          latestSourceTimestamp: latestSource ? Number(latestSource.timestamp ?? latestSource.time) : null,
          projectedBucket,
          replayCursorTime: replay.cursorTime,
          replayCursorTimestamp: normalizeTimestamp(replay.cursorTime),
          replayIndex: replay.cursorIndex,
          revealedCount: replay.revealedCount,
          sourceBarCount: source.bars?.length || 0,
        };
      }

      function makeTargetHistory(cursorTimestamp, offsetSeconds = 0) {
        const anchor = cursorTimestamp + offsetSeconds;
        return {
          enabled: true,
          end: formatApiTime(anchor + ${EIGHT_HOUR_SECONDS}),
          start: formatApiTime(anchor - ${EIGHT_HOUR_SECONDS}),
        };
      }

      async function applyTargetMaterialization(offsetSeconds = 0) {
        const before = await snapshot();
        window.__v6Step337CursorTimestamp = before.replayCursorTimestamp;
        const result = await commands.dispatchCommand(contracts.DISPLAY_TIMEFRAME_COMMANDS.APPLY, {
          displayTimeframe: 480,
          paneId: 'main',
          targetHistory: makeTargetHistory(before.replayCursorTimestamp, offsetSeconds),
        });
        await animationFrames(3);
        return {
          before,
          result: {
            projectionOwner: result.projectionSource?.owner || null,
            targetHistory: result.targetHistory,
          },
          snapshot: await snapshot(),
        };
      }

      document.querySelector('[data-v6-session-setup-name]').value = 'step337-replay-coordination';
      document.querySelector('[data-v6-session-setup-start]').value = '2026-06-01T16:50';
      document.querySelector('[data-v6-session-setup-end]').value = '2026-06-01T18:10';
      document.querySelector('[data-v6-session-auto-end]').checked = false;
      document.querySelector('[data-v6-session-auto-end]').dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('[data-v6-dashboard-create-session]').click();
      const applyState = await waitForApplied();

      const materialized = await applyTargetMaterialization();
      const manualNext = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
        paneId: 'main',
      });
      await animationFrames(2);
      const afterManualNext = await snapshot();

      let crossedReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      let gapAdvance = null;
      for (let index = 0; index < 100; index += 1) {
        if (Date.parse(crossedReplay.cursorTime) >= Date.parse('${GAP_END_ISO}')) break;
        gapAdvance = await commands.dispatchCommand(contracts.CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, {
          paneId: 'main',
        });
        crossedReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      }
      await animationFrames(2);
      const afterGap = await snapshot();

      const targetModeBeforeFallback = targetMode;
      targetMode = 'empty';
      const fallbackMaterialized = await applyTargetMaterialization(60);

      await commands.dispatchCommand(contracts.REPLAY_COMMANDS.SET_CURSOR_TIME, {
        cursorTime: '2026-06-01T16:58:00.000Z',
      });
      targetMode = targetModeBeforeFallback;
      const autoPlayMaterialized = await applyTargetMaterialization(120);
      const speedSlider = document.querySelector('[data-v6-transport-speed-slider]');
      speedSlider.value = '4';
      speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-v6-transport-action="play-toggle"]').click();

      const deadline = performance.now() + 5000;
      let autoReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      let autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      while (
        Date.parse(autoReplay.cursorTime) < Date.parse('${AFTER_GAP_ISO}') &&
        autoPlay.status !== 'error' &&
        performance.now() < deadline
      ) {
        await sleep(40);
        autoReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
        autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      }
      await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP).catch(() => null);
      await animationFrames(2);
      autoReplay = await commands.dispatchCommand(contracts.REPLAY_COMMANDS.GET_STATE);
      autoPlay = await commands.dispatchCommand(contracts.CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
      const afterAutoPlay = await snapshot();

      return {
        afterAutoPlay,
        afterGap,
        afterManualNext,
        applyState,
        autoPlay,
        autoPlayMaterialized,
        autoReplay,
        fallbackMaterialized,
        fetchLog,
        gapAdvance,
        manualNext,
        materialized,
      };
    })()))()
  `));

  assert.equal(value.applyState.status, 'applied');

  assert.equal(value.materialized.result.projectionOwner, 'runtime.bar-data');
  assert.equal(value.materialized.result.targetHistory.status, 'applied');
  assert.equal(value.materialized.result.targetHistory.reason, 'target-history-opt-in');
  assert.equal(value.materialized.snapshot.displayTimeframe, 480);
  assert.equal(value.materialized.snapshot.latestChartTimestamp, Math.floor(Date.parse('2026-06-01T16:00:00.000Z') / 1000));
  assert.equal(value.materialized.snapshot.latestChartOpen, 800);

  assert.equal(value.manualNext.status, 'advanced', value.manualNext.error || 'manual next should advance after target materialization');
  assert.equal(value.afterManualNext.replayCursorTime, '2026-06-01T16:51:00.000Z');
  assert.equal(value.afterManualNext.displayTimeframe, 480);
  assert.equal(
    value.afterManualNext.projectedBucket.lastSourceTimestamp,
    Math.floor(Date.parse('2026-06-01T16:51:00.000Z') / 1000),
  );
  assert.equal(value.afterManualNext.latestSourceTimestamp, Math.floor(Date.parse('2026-06-01T16:51:00.000Z') / 1000));
  assert.equal(value.afterManualNext.latestChartTimestamp, Math.floor(Date.parse('2026-06-01T16:50:00.000Z') / 1000));

  assert.equal(value.gapAdvance.status, 'advanced', value.gapAdvance.error || 'gap advance should skip to next source bar');
  assert.equal(value.afterGap.replayCursorTime, GAP_END_ISO);
  assert.equal(value.afterGap.displayTimeframe, 480);
  assert.equal(
    value.afterGap.projectedBucket.lastSourceTimestamp,
    Math.floor(Date.parse(GAP_END_ISO) / 1000),
  );
  assert.equal(value.afterGap.latestSourceTimestamp, Math.floor(Date.parse(GAP_END_ISO) / 1000));
  assert.equal(value.afterGap.latestChartTimestamp, Math.floor(Date.parse('2026-06-01T16:50:00.000Z') / 1000));

  assert.equal(value.fallbackMaterialized.result.projectionOwner, 'runtime.chart-data-projection');
  assert.equal(value.fallbackMaterialized.result.targetHistory.status, 'fallback');
  assert.equal(value.fallbackMaterialized.result.targetHistory.reason, 'target-history-no-visible-bars');
  assert.equal(value.fallbackMaterialized.snapshot.sourceBarCount >= value.afterGap.sourceBarCount, true);

  assert.equal(value.autoPlayMaterialized.result.projectionOwner, 'runtime.bar-data');
  assert.equal(value.autoPlay.error, null, value.autoPlay.error || 'auto-play should not error after target materialization');
  assert.equal(value.autoPlay.playing, false);
  assert.equal(value.autoReplay.cursorTime, AFTER_GAP_ISO);
  assert.equal(value.afterAutoPlay.displayTimeframe, 480);
  assert.equal(
    value.afterAutoPlay.projectedBucket.lastSourceTimestamp,
    Math.floor(Date.parse(AFTER_GAP_ISO) / 1000),
  );
  assert.equal(value.afterAutoPlay.latestSourceTimestamp, Math.floor(Date.parse(AFTER_GAP_ISO) / 1000));

  const sourceFetches = value.fetchLog.filter((record) => record.kind === 'source');
  const targetFetches = value.fetchLog.filter((record) => record.kind === 'target');
  assert.equal(sourceFetches.length > 0, true);
  assert.equal(targetFetches.some((record) => record.tf === '8h' && record.mode === 'success'), true);
  assert.equal(targetFetches.some((record) => record.tf === '8h' && record.mode === 'empty'), true);
} finally {
  await page.cleanup();
}

console.log('v6 display timeframe target materialization replay coordination browser step337 smoke passed');
