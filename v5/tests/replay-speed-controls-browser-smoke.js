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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9412);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-speed-controls-${process.pid}`;

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

        function sendKey(target, key) {
          const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            cancelable: true,
          });
          target.dispatchEvent(event);
          return event.defaultPrevented;
        }

        function speedSnapshot() {
          const input = document.querySelector('[data-replay-speed]');
          const active = document.querySelector('[data-replay-speed-preset][aria-pressed="true"]');
          return {
            value: Number(input?.value || 0),
            activePreset: Number(active?.dataset.replaySpeedPreset || 0),
          };
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
            speed: speedSnapshot(),
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-speed-replay-controls',
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
              && !document.querySelector('[data-replay-play]')?.disabled
              && !document.querySelector('[data-replay-speed-preset="250"]')?.disabled;
          });

          const initialSpeed = speedSnapshot();
          document.querySelector('[data-replay-speed-preset="250"]').click();
          const after2xPreset = speedSnapshot();

          const spacePreventedPlay = sendKey(document.body, ' ');
          await waitFor('space starts playback at selected speed', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true && playback.intervalMs === 250;
          });
          const playbackAt2x = await commands.dispatchCommand('replay.getPlaybackState');

          const spacePreventedPause = sendKey(document.body, ' ');
          await waitFor('space pauses playback', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });

          const slowPrevented = sendKey(document.body, '[');
          const afterSlow = speedSnapshot();
          const fastPrevented = sendKey(document.body, ']');
          const afterFast = speedSnapshot();
          const fasterPrevented = sendKey(document.body, ']');
          const afterFaster = speedSnapshot();

          const speedInput = document.querySelector('[data-replay-speed]');
          speedInput.focus();
          const focusedInputPrevented = sendKey(speedInput, '[');
          await new Promise((resolve) => setTimeout(resolve, 80));
          const afterFocusedInputSlow = speedSnapshot();

          return JSON.stringify({
            error: '',
            initialSpeed,
            after2xPreset,
            spacePreventedPlay,
            playbackAt2x,
            spacePreventedPause,
            slowPrevented,
            afterSlow,
            fastPrevented,
            afterFast,
            fasterPrevented,
            afterFaster,
            focusedInputPrevented,
            afterFocusedInputSlow,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.initialSpeed.value, 500);
    assert.equal(value.initialSpeed.activePreset, 500);
    assert.equal(value.after2xPreset.value, 250);
    assert.equal(value.after2xPreset.activePreset, 250);
    assert.equal(value.spacePreventedPlay, true);
    assert.equal(value.playbackAt2x.playing, true);
    assert.equal(value.playbackAt2x.intervalMs, 250);
    assert.equal(value.spacePreventedPause, true);
    assert.equal(value.slowPrevented, true);
    assert.deepEqual(value.afterSlow, { value: 500, activePreset: 500 });
    assert.equal(value.fastPrevented, true);
    assert.deepEqual(value.afterFast, { value: 250, activePreset: 250 });
    assert.equal(value.fasterPrevented, true);
    assert.deepEqual(value.afterFaster, { value: 125, activePreset: 125 });
    assert.equal(value.focusedInputPrevented, false);
    assert.deepEqual(value.afterFocusedInputSlow, { value: 125, activePreset: 125 });
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

console.log('v5 replay speed controls browser smoke passed');
