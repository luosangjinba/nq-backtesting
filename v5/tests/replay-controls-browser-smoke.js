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
            playDisabled: document.querySelector('[data-replay-play]')?.disabled,
            pauseDisabled: document.querySelector('[data-replay-pause]')?.disabled,
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
          }));
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

          document.querySelector('[data-replay-next]').click();
          await waitFor('next advanced', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length === initialCount + 1;
          });
          const afterNext = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-play]').click();
          await waitFor('playback started', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true && !document.querySelector('[data-replay-pause]').disabled;
          });
          await waitFor('play advanced', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.displayBars.length >= afterNext.displayBars.length + 1;
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

          const events = await import('/v5/src/runtime/events.js');
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          const listenerCountsAfterNavigate = {
            initialLoaded: events.listenerCount('replay:initialLoaded'),
            next: events.listenerCount('replay:next'),
            playbackChanged: events.listenerCount('replay:playbackChanged'),
          };

          return JSON.stringify({
            error: '',
            initialCount,
            afterNextCount: afterNext.displayBars.length,
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
            chartCount: chartCountAfterPause,
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
    assert.equal(value.afterNextCount, value.initialCount + 1);
    assert.ok(value.duringPlayCount > value.afterNextCount, 'Play should advance replay');
    assert.equal(value.afterPauseWaitCount, value.pausedCount, 'Pause should stop replay advancement');
    assert.equal(value.chartCount, value.afterPauseWaitCount);
    assert.ok(value.terminalCount > value.afterPauseWaitCount, 'Play should continue to session end');
    assert.equal(value.terminalStoppedReason, 'session-end');
    assert.equal(value.terminalStatusText, 'Replay stopped: session-end.');
    assert.equal(value.startText, '2026-06-01T09:30:00.000Z');
    assert.deepEqual(value.listenerCountsAfterNavigate, {
      initialLoaded: 0,
      next: 0,
      playbackChanged: 0,
    });
    assert.equal(value.cursorText, '2026-06-01T09:40:00.000Z');
    assert.equal(value.endText, '2026-06-01T09:40:00.000Z');
    assert.equal(value.revealedText, String(value.terminalRevealedCount));
    assert.equal(value.playbackText, 'Paused');
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
