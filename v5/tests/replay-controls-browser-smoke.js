import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import {
  createCdpClient,
  evaluate,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from '../../v4/tests/helpers/browser-cdp-client.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9369);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-controls-browser-smoke-${process.pid}`;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

function waitForHttpOk(url, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 400) {
          resolve();
          return;
        }
        retry();
      });
      request.on('error', retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(attempt, 100);
    };
    attempt();
  });
}

async function main() {
  const webPort = Number(process.env.V5_WEB_PORT || await getFreePort());
  const pageUrl = process.env.V5_PAGE_URL || `http://127.0.0.1:${webPort}/v5/index.html`;
  const web = spawn('python3', [
    '-m',
    'http.server',
    String(webPort),
    '--bind',
    '127.0.0.1',
  ], { cwd: process.cwd(), stdio: 'ignore' });
  await waitForHttpOk(pageUrl);

  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    pageUrl,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: pageUrl });
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);

    const value = JSON.parse(await evaluate(client, `
      (async () => {
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) {
            return originalFetch(...args);
          }
          window.__v5BarRequestCount = Number(window.__v5BarRequestCount || 0) + 1;
          const parsed = new URL(url, window.location.href);
          const start = Date.parse(parsed.searchParams.get('start').replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(parsed.searchParams.get('end').replace(' ', 'T') + ':00.000Z') / 1000;
          const step = Number(parsed.searchParams.get('tf') || 1) * 60;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += step) {
            const index = Math.round((timestamp - start) / step);
            const open = 100 + index;
            bars.push({
              timestamp,
              open,
              high: open + 1,
              low: open - 1,
              close: open + 0.5,
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          const playback = await window.__v5Commands?.dispatchCommand('replay.getPlaybackState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            playback,
            nextDisabled: document.querySelector('[data-replay-next]')?.disabled,
            previousDisabled: document.querySelector('[data-replay-previous]')?.disabled,
            playDisabled: document.querySelector('[data-replay-play]')?.disabled,
            pauseDisabled: document.querySelector('[data-replay-pause]')?.disabled,
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
          }));
        }

        async function clickRenderedBar(predicate) {
          const chartHost = document.querySelector('[data-chart-host]');
          const rendered = await window.__v5Commands.dispatchCommand('chart.getRenderedBars');
          const bars = Array.isArray(rendered?.renderedBars) ? rendered.renderedBars : [];
          const index = bars.findIndex(predicate);
          if (!chartHost || index < 0) {
            throw new Error('Unable to find rendered bar for click: ' + JSON.stringify({
              count: bars.length,
              first: bars[0]?.time,
              last: bars.at(-1)?.time,
            }));
          }
          const rect = chartHost.getBoundingClientRect();
          const ratio = bars.length <= 1 ? 0.5 : index / (bars.length - 1);
          const x = rect.left + Math.min(Math.max(ratio, 0), 1) * rect.width;
          const y = rect.top + rect.height / 2;
          chartHost.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            clientX: x,
            clientY: y,
            pointerId: 99,
          }));
          chartHost.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            clientX: x,
            clientY: y,
          }));
          return bars[index].time;
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-controls',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T09:40:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });

          await waitFor('initial loaded', async () => {
            const next = document.querySelector('[data-replay-next]');
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded' && next && !next.disabled;
          });
          const initialState = await commands.dispatchCommand('replay.getState');
          const initialCount = initialState.displayBars.length;
          const previousInitiallyDisabled = document.querySelector('[data-replay-previous]')?.disabled === true;

          document.querySelector('[data-replay-next]').click();
          await waitFor('next advanced', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount + 1
              && document.querySelector('[data-replay-previous]')?.disabled === false;
          });
          const afterNext = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-previous]').click();
          await waitFor('previous rewound', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount
              && state.cursorTimestamp === initialState.cursorTimestamp
              && state.revealedCount === 0
              && document.querySelector('[data-replay-previous]')?.disabled === true;
          });
          const afterPrevious = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-next]').click();
          await waitFor('next advanced after previous', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount + 1;
          });
          const afterNextAgain = await commands.dispatchCommand('replay.getState');

          const truncateRequestCountBefore = window.__v5BarRequestCount || 0;
          await waitFor('truncate enabled after replay load', () =>
            document.querySelector('[data-replay-truncate-to-selection]')?.disabled === false
          );
          document.querySelector('[data-replay-truncate-to-selection]').click();
          await waitFor('truncate pick mode active', () =>
            document.querySelector('.chart-viewport')?.dataset.truncatePickMode === 'true'
              && document.querySelector('[data-replay-truncate-to-selection]')?.getAttribute('aria-pressed') === 'true'
          );
          await clickRenderedBar((bar) => bar.time === initialState.cursorTimestamp);
          await waitFor('truncate to selected bar', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount
              && state.cursorTimestamp === initialState.cursorTimestamp
              && state.revealedCount === 0;
          });
          const afterTruncate = await commands.dispatchCommand('replay.getState');
          const truncateRequestDelta = (window.__v5BarRequestCount || 0) - truncateRequestCountBefore;

          document.querySelector('[data-replay-next]').click();
          await waitFor('next advanced after truncate', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount + 1;
          });
          const afterTruncateNext = await commands.dispatchCommand('replay.getState');

          const beforeStartStateCount = afterTruncateNext.displayBars.length;
          document.querySelector('[data-replay-truncate-to-selection]').click();
          await waitFor('truncate pick mode active for before-start warning', () =>
            document.querySelector('.chart-viewport')?.dataset.truncatePickMode === 'true'
          );
          const beforeStartClickedTimestamp = await clickRenderedBar((bar) =>
            Date.parse(bar.time) < Date.parse(afterTruncateNext.startBarTimestamp)
          );
          await waitFor('before start truncate warning visible', () =>
            document.querySelector('[data-replay-truncate-error]')?.hidden === false
              && document.querySelector('[data-replay-truncate-error-title]')?.textContent.includes('cannot go further back')
          );
          const beforeStartWarningText = document.querySelector('[data-replay-truncate-error-message]')?.textContent || '';
          const afterBeforeStartWarning = await commands.dispatchCommand('replay.getState');
          document.querySelector('[data-replay-truncate-error-close]')?.click();
          await waitFor('before start warning closed', () =>
            document.querySelector('[data-replay-truncate-error]')?.hidden === true
          );

          document.querySelector('[data-replay-play]').click();
          await waitFor('playback started', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true && !document.querySelector('[data-replay-pause]').disabled;
          });
          await waitFor('play advanced', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length >= afterTruncateNext.displayBars.length + 1;
          }, 4000);
          const duringPlay = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-pause]').click();
          await waitFor('playback paused', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });
          const paused = await commands.dispatchCommand('replay.getState');
          await new Promise((resolve) => setTimeout(resolve, 700));
          const afterPauseWait = await commands.dispatchCommand('replay.getState');
          const chartCountAfterPause = Number(document.querySelector('[data-chart-bar-count]')?.dataset.chartBarCount || 0);
          const fullChartCountAfterPause = Number(document.querySelector('[data-chart-bar-count]')?.dataset.fullChartBarCount || 0);

          document.querySelector('[data-replay-play]').click();
          await waitFor('playback auto stopped at end', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false && playback.stoppedReason === 'session-end';
          }, 8000);
          await waitFor('terminal label updated', () =>
            document.querySelector('[data-replay-state]')?.textContent === 'session-end'
          );
          const terminalState = await commands.dispatchCommand('replay.getState');
          const terminalPlayback = await commands.dispatchCommand('replay.getPlaybackState');
          const terminalStatusText = document.querySelector('[data-replay-load-status]')?.textContent || '';
          const terminalStartText = document.querySelector('[data-replay-start]')?.textContent || '';
          const terminalCursorText = document.querySelector('[data-replay-cursor]')?.textContent || '';
          const terminalEndText = document.querySelector('[data-replay-end]')?.textContent || '';
          const terminalRevealedText = document.querySelector('[data-replay-revealed-count]')?.textContent || '';
          const terminalPlaybackText = document.querySelector('[data-replay-playback]')?.textContent || '';

          const disposeCreated = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-dispose-pause',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T10:00:00.000Z',
            sessionEnd: '2026-06-01T10:05:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: disposeCreated.session.id },
          });
          await waitFor('dispose session initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.sessionId === disposeCreated.session.id
              && state.status === 'initial-loaded'
              && !document.querySelector('[data-replay-play]')?.disabled;
          });
          document.querySelector('[data-replay-play]').click();
          await waitFor('dispose session playback started', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true;
          });
          await waitFor('dispose session advanced once', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.revealedCount >= 1;
          }, 4000);
          const beforeDisposeNavigate = await commands.dispatchCommand('replay.getState');
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          await waitFor('dispose paused playback', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });
          await new Promise((resolve) => setTimeout(resolve, 700));
          const afterDisposeWait = await commands.dispatchCommand('replay.getState');
          const afterDisposePlayback = await commands.dispatchCommand('replay.getPlaybackState');

          const events = await import('/v5/src/runtime/events.js');
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          const listenerCountsAfterNavigate = {
            initialLoaded: events.listenerCount('replay:initialLoaded'),
            next: events.listenerCount('replay:next'),
            previous: events.listenerCount('replay:previous'),
            playbackChanged: events.listenerCount('replay:playbackChanged'),
          };

          return JSON.stringify({
            error: '',
            initialCount,
            previousInitiallyDisabled,
            afterNextCount: afterNext.displayBars.length,
            afterPreviousCount: afterPrevious.displayBars.length,
            afterPreviousCursor: afterPrevious.cursorTimestamp,
            afterPreviousRevealedCount: afterPrevious.revealedCount,
            afterNextAgainCount: afterNextAgain.displayBars.length,
            afterTruncateCount: afterTruncate.displayBars.length,
            afterTruncateCursor: afterTruncate.cursorTimestamp,
            afterTruncateRevealedCount: afterTruncate.revealedCount,
            truncateRequestDelta,
            afterTruncateNextCount: afterTruncateNext.displayBars.length,
            beforeStartClickedTimestamp,
            beforeStartWarningText,
            afterBeforeStartWarningCount: afterBeforeStartWarning.displayBars.length,
            afterBeforeStartWarningCursor: afterBeforeStartWarning.cursorTimestamp,
            beforeStartStateCount,
            duringPlayCount: duringPlay.displayBars.length,
            pausedCount: paused.displayBars.length,
            afterPauseWaitCount: afterPauseWait.displayBars.length,
            terminalCount: terminalState.displayBars.length,
            terminalRevealedCount: terminalState.revealedCount,
            terminalStoppedReason: terminalPlayback.stoppedReason,
            terminalStatusText,
            startText: terminalStartText,
            cursorText: terminalCursorText,
            endText: terminalEndText,
            revealedText: terminalRevealedText,
            playbackText: terminalPlaybackText,
            beforeDisposeCursor: beforeDisposeNavigate.cursorTimestamp,
            afterDisposeCursor: afterDisposeWait.cursorTimestamp,
            beforeDisposeRevealedCount: beforeDisposeNavigate.revealedCount,
            afterDisposeRevealedCount: afterDisposeWait.revealedCount,
            afterDisposePlaying: afterDisposePlayback.playing,
            chartCount: chartCountAfterPause,
            fullChartCount: fullChartCountAfterPause,
            listenerCountsAfterNavigate,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.previousInitiallyDisabled, true);
    assert.equal(value.afterNextCount, value.initialCount + 1);
    assert.equal(value.afterPreviousCount, value.initialCount);
    assert.equal(value.afterPreviousCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.afterPreviousRevealedCount, 0);
    assert.equal(value.afterNextAgainCount, value.initialCount + 1);
    assert.equal(value.afterTruncateCount, value.initialCount);
    assert.equal(value.afterTruncateCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.afterTruncateRevealedCount, 0);
    assert.equal(value.truncateRequestDelta, 0);
    assert.equal(value.afterTruncateNextCount, value.initialCount + 1);
    assert.ok(
      Date.parse(value.beforeStartClickedTimestamp) < Date.parse('2026-06-01T09:30:00.000Z'),
      'Before-start warning should be exercised with a prefix bar'
    );
    assert.ok(value.beforeStartWarningText.includes('session start date'));
    assert.equal(value.afterBeforeStartWarningCount, value.beforeStartStateCount);
    assert.equal(value.afterBeforeStartWarningCursor, '2026-06-01T09:31:00.000Z');
    assert.ok(value.duringPlayCount > value.afterNextCount, 'Play should advance replay');
    assert.equal(value.afterPauseWaitCount, value.pausedCount, 'Pause should stop replay advancement');
    assert.equal(value.fullChartCount, value.afterPauseWaitCount);
    assert.ok(value.chartCount > 0, 'Chart should render a visible replay window');
    assert.ok(value.chartCount <= value.fullChartCount, 'Chart rendered bars should be a viewport subset');
    assert.ok(value.terminalCount > value.afterPauseWaitCount, 'Play should continue to session end');
    assert.equal(value.terminalStoppedReason, 'session-end');
    assert.equal(value.terminalStatusText, 'Replay stopped: session-end.');
    assert.equal(value.startText, '2026-06-01 09:30');
    assert.deepEqual(value.listenerCountsAfterNavigate, {
      initialLoaded: 0,
      next: 0,
      previous: 0,
      playbackChanged: 0,
    });
    assert.equal(value.cursorText, '2026-06-01 09:40');
    assert.equal(value.endText, '2026-06-01 09:40');
    assert.equal(value.revealedText, String(value.terminalRevealedCount));
    assert.equal(value.playbackText, 'Paused');
    assert.equal(value.afterDisposePlaying, false);
    assert.equal(value.afterDisposeCursor, value.beforeDisposeCursor);
    assert.equal(value.afterDisposeRevealedCount, value.beforeDisposeRevealedCount);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    web.kill('SIGTERM');
    await waitForProcessExit(web);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().then(
  () => console.log('v5 replay controls browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
