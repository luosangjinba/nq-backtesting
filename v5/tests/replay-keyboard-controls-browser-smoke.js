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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9411);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-keyboard-controls-${process.pid}`;

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

  let client = null;
  let chrome = null;
  try {
    await waitForHttpOk(pageUrl);
    chrome = spawn(CHROME_BIN, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1600,1000',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE_DIR}`,
      pageUrl,
    ], { stdio: 'ignore' });

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

        function canvasMetrics() {
          const canvas = document.querySelector('[data-chart-canvas]');
          return {
            renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
            viewportCursorTimestamp: Number(canvas?.dataset.viewportCursorTimestamp || 0),
          };
        }

        function sendKey(target, key) {
          const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          });
          target.dispatchEvent(event);
          return event.defaultPrevented;
        }

        async function waitFor(label, predicate, timeoutMs = 5000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          const playback = await window.__v5Commands?.dispatchCommand('replay.getPlaybackState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            playback,
            canvas: canvasMetrics(),
            activeElement: document.activeElement?.tagName || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-keyboard-replay-controls',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T09:45:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded'
              && !document.querySelector('[data-replay-next]')?.disabled
              && canvasMetrics().renderedBarCount > 0;
          });

          const initialState = await commands.dispatchCommand('replay.getState');
          const initialCursorTimestamp = Date.parse(initialState.cursorTimestamp) / 1000;

          const bodyPreventedNext = sendKey(document.body, 'ArrowRight');
          await waitFor('ArrowRight advanced replay and chart cursor', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const metrics = canvasMetrics();
            return state.revealedCount === 1
              && metrics.viewportCursorTimestamp === initialCursorTimestamp + 60;
          });
          const afterArrowRight = await commands.dispatchCommand('replay.getState');

          const bodyPreventedPrevious = sendKey(document.body, 'ArrowLeft');
          await waitFor('ArrowLeft rewound replay and chart cursor', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const metrics = canvasMetrics();
            return state.revealedCount === 0
              && state.cursorTimestamp === initialState.cursorTimestamp
              && metrics.viewportCursorTimestamp === initialCursorTimestamp;
          });
          const afterArrowLeft = await commands.dispatchCommand('replay.getState');

          const speedInput = document.querySelector('[data-replay-speed]');
          speedInput.focus();
          const focusedInputPrevented = sendKey(speedInput, 'ArrowRight');
          await new Promise((resolve) => setTimeout(resolve, 180));
          const afterInputArrow = await commands.dispatchCommand('replay.getState');

          const timeframeSelect = document.querySelector('[data-display-timeframe-select]');
          timeframeSelect.focus();
          const focusedSelectPrevented = sendKey(timeframeSelect, 'ArrowRight');
          await new Promise((resolve) => setTimeout(resolve, 180));
          const afterSelectArrow = await commands.dispatchCommand('replay.getState');

          document.body.focus();
          const spacePreventedPlay = sendKey(document.body, ' ');
          await waitFor('Space started playback', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true;
          });
          const playing = await commands.dispatchCommand('replay.getPlaybackState');

          const spacePreventedPause = sendKey(document.body, ' ');
          await waitFor('Space paused playback', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });
          const paused = await commands.dispatchCommand('replay.getPlaybackState');

          return JSON.stringify({
            error: '',
            bodyPreventedNext,
            bodyPreventedPrevious,
            focusedInputPrevented,
            focusedSelectPrevented,
            spacePreventedPlay,
            spacePreventedPause,
            initialCursorTimestamp: initialState.cursorTimestamp,
            afterArrowRightCursorTimestamp: afterArrowRight.cursorTimestamp,
            afterArrowRightRevealedCount: afterArrowRight.revealedCount,
            afterArrowLeftCursorTimestamp: afterArrowLeft.cursorTimestamp,
            afterArrowLeftRevealedCount: afterArrowLeft.revealedCount,
            afterInputArrowRevealedCount: afterInputArrow.revealedCount,
            afterSelectArrowRevealedCount: afterSelectArrow.revealedCount,
            playing: playing.playing,
            paused: paused.playing,
            finalViewportCursorTimestamp: canvasMetrics().viewportCursorTimestamp,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.bodyPreventedNext, true);
    assert.equal(value.bodyPreventedPrevious, true);
    assert.equal(value.focusedInputPrevented, false);
    assert.equal(value.focusedSelectPrevented, false);
    assert.equal(value.spacePreventedPlay, true);
    assert.equal(value.spacePreventedPause, true);
    assert.equal(value.afterArrowRightRevealedCount, 1);
    assert.equal(value.afterArrowLeftRevealedCount, 0);
    assert.equal(value.afterInputArrowRevealedCount, 0);
    assert.equal(value.afterSelectArrowRevealedCount, 0);
    assert.equal(value.playing, true);
    assert.equal(value.paused, false);
  } finally {
    if (client) {
      try {
        await client.close();
      } catch {
        // Ignore cleanup failures.
      }
    }
    if (chrome) chrome.kill('SIGTERM');
    web.kill('SIGTERM');
    await waitForProcessExit(chrome).catch(() => {});
    await waitForProcessExit(web).catch(() => {});
    await rm(PROFILE_DIR, { recursive: true, force: true }).catch(() => {});
  }
}

await main();

console.log('v5 replay keyboard controls browser smoke passed');
