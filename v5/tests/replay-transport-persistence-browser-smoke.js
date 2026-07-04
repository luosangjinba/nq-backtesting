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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9413);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-transport-persistence-${process.pid}`;

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

        function rect(selector) {
          const element = document.querySelector(selector);
          if (!element) return null;
          const value = element.getBoundingClientRect();
          return {
            left: value.left,
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            width: value.width,
            height: value.height,
          };
        }

        function speedSnapshot() {
          const input = document.querySelector('[data-replay-speed]');
          const active = document.querySelector('[data-replay-speed-preset][aria-pressed="true"]');
          return {
            value: Number(input?.value || 0),
            activePreset: Number(active?.dataset.replaySpeedPreset || 0),
          };
        }

        function readPreferences(key) {
          return JSON.parse(localStorage.getItem(key) || '{}');
        }

        async function waitFor(label, predicate, timeoutMs = 6000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            speed: speedSnapshot(),
            floating: rect('[data-replay-floating-controls]'),
          }));
        }

        async function navigateChart(commands, sessionId) {
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId },
          });
          await waitFor('chart loaded ' + sessionId, async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.sessionId === sessionId
              && state.status === 'initial-loaded'
              && !document.querySelector('[data-replay-play]')?.disabled
              && document.querySelector('[data-replay-floating-controls]');
          });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }

        async function dragFloating(dx, dy) {
          const handle = document.querySelector('[data-replay-drag-handle]');
          const start = handle.getBoundingClientRect();
          const startX = start.left + Math.round(start.width / 2);
          const startY = start.top + Math.round(start.height / 2);
          handle.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 527,
            pointerType: 'mouse',
            button: 0,
            buttons: 1,
            clientX: startX,
            clientY: startY,
          }));
          handle.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            pointerId: 527,
            pointerType: 'mouse',
            button: 0,
            buttons: 1,
            clientX: startX + dx,
            clientY: startY + dy,
          }));
          handle.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            pointerId: 527,
            pointerType: 'mouse',
            button: 0,
            buttons: 0,
            clientX: startX + dx,
            clientY: startY + dy,
          }));
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const prefsModule = await import('/v5/src/features/chart-replay/replay-transport-preferences.js');
          const preferenceKey = prefsModule.REPLAY_TRANSPORT_PREFERENCES_KEY;
          window.__v5Commands = commands;
          localStorage.removeItem(preferenceKey);

          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-transport-persistence',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T09:45:00.000Z',
          });
          await navigateChart(commands, created.session.id);

          const initialFloating = rect('[data-replay-floating-controls]');
          document.querySelector('[data-replay-speed-preset="250"]').click();
          await dragFloating(220, -90);
          const draggedFloating = rect('[data-replay-floating-controls]');
          const storedAfterDrag = readPreferences(preferenceKey);

          await navigateChart(commands, created.session.id);
          const restoredSpeed = speedSnapshot();
          const restoredFloating = rect('[data-replay-floating-controls]');
          document.querySelector('[data-replay-play]').click();
          await waitFor('restored speed used by playback', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === true && playback.intervalMs === 250;
          });
          const restoredPlayback = await commands.dispatchCommand('replay.getPlaybackState');
          document.querySelector('[data-replay-pause]').click();
          await waitFor('pause after restored speed check', async () => {
            const playback = await commands.dispatchCommand('replay.getPlaybackState');
            return playback.playing === false;
          });

          localStorage.setItem(preferenceKey, JSON.stringify({
            playbackIntervalMs: 125,
            floatingPosition: {
              left: 99999,
              top: -99999,
            },
          }));
          await navigateChart(commands, created.session.id);
          const clampedSpeed = speedSnapshot();
          const clampedFloating = rect('[data-replay-floating-controls]');

          return JSON.stringify({
            error: '',
            initialFloating,
            draggedFloating,
            restoredFloating,
            clampedFloating,
            storedAfterDrag,
            restoredSpeed,
            restoredPlayback,
            clampedSpeed,
            viewport: {
              width: window.innerWidth,
              height: window.innerHeight,
            },
            movedByDrag: Math.abs(draggedFloating.left - initialFloating.left) >= 80
              || Math.abs(draggedFloating.top - initialFloating.top) >= 40,
            restoredNearDragged: Math.abs(restoredFloating.left - draggedFloating.left) <= 2
              && Math.abs(restoredFloating.top - draggedFloating.top) <= 2,
            storedNearDragged: Math.abs(storedAfterDrag.floatingPosition.left - draggedFloating.left) <= 2
              && Math.abs(storedAfterDrag.floatingPosition.top - draggedFloating.top) <= 2,
            restoredInsideViewport: restoredFloating.left >= 0
              && restoredFloating.right <= window.innerWidth
              && restoredFloating.top >= 0
              && restoredFloating.bottom <= window.innerHeight,
            clampedInsideViewport: clampedFloating.left >= 0
              && clampedFloating.right <= window.innerWidth
              && clampedFloating.top >= 0
              && clampedFloating.bottom <= window.innerHeight,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.movedByDrag, true, `drag should move floating controls: ${JSON.stringify(value)}`);
    assert.equal(value.storedAfterDrag.playbackIntervalMs, 250);
    assert.equal(value.storedNearDragged, true, `stored position should match dragged position: ${JSON.stringify(value)}`);
    assert.deepEqual(value.restoredSpeed, { value: 250, activePreset: 250 });
    assert.equal(value.restoredPlayback.playing, true);
    assert.equal(value.restoredPlayback.intervalMs, 250);
    assert.equal(value.restoredNearDragged, true, `route re-entry should restore dragged position: ${JSON.stringify(value)}`);
    assert.equal(value.restoredInsideViewport, true, `restored position should be inside viewport: ${JSON.stringify(value)}`);
    assert.deepEqual(value.clampedSpeed, { value: 125, activePreset: 125 });
    assert.equal(value.clampedInsideViewport, true, `out-of-bounds stored position should be clamped: ${JSON.stringify(value)}`);
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

console.log('v5 replay transport persistence browser smoke passed');
