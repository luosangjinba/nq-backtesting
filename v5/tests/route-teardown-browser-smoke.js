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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9397);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-route-teardown-browser-smoke-${process.pid}`;

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
      '--window-size=1500,950',
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
        window.__v5RouteTeardownErrors = [];
        window.addEventListener('error', (event) => {
          window.__v5RouteTeardownErrors.push(event.message || String(event.error || 'error'));
        });
        window.addEventListener('unhandledrejection', (event) => {
          window.__v5RouteTeardownErrors.push(event.reason?.message || String(event.reason || 'unhandledrejection'));
        });

        const originalFetch = window.fetch.bind(window);
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) {
            return originalFetch(...args);
          }
          const parsed = new URL(url, window.location.href);
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const stepSeconds = timeframe * 60;
          const start = Date.parse(parsed.searchParams.get('start').replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(parsed.searchParams.get('end').replace(' ', 'T') + ':00.000Z') / 1000;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += stepSeconds) {
            const index = Math.round((timestamp - start) / stepSeconds);
            const open = 20000 + index;
            bars.push({
              timestamp,
              open,
              high: open + 2,
              low: open - 2,
              close: open + (index % 2 ? -0.5 : 0.5),
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        function sleep(ms = 0) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await sleep(100);
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          const playback = await window.__v5Commands?.dispatchCommand('replay.getPlaybackState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            playback,
            route: document.querySelector('[data-v5-root]')?.dataset.currentRoute || '',
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
            errors: window.__v5RouteTeardownErrors,
          }));
        }

        function click(element) {
          if (!element) return;
          element.dispatchEvent(new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            button: 0,
          }));
        }

        function pointerDrag(element) {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const x = Math.round(rect.left + Math.max(1, rect.width / 2));
          const y = Math.round(rect.top + Math.max(1, rect.height / 2));
          const pointerId = 497;
          element.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: x,
            clientY: y,
          }));
          element.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: x + 120,
            clientY: y + 30,
          }));
          element.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            button: 0,
            pointerId,
            clientX: x + 120,
            clientY: y + 30,
          }));
        }

        const commands = await import('/v5/src/runtime/commands.js');
        window.__v5Commands = commands;
        const created = await commands.dispatchCommand('session.create', {
          id: 'browser-route-teardown',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01T09:30:00.000Z',
          sessionEnd: '2026-06-01T10:00:00.000Z',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });

        await waitFor('initial chart route loaded', async () => {
          const state = await commands.dispatchCommand('replay.getState');
          return state.status === 'initial-loaded'
            && document.querySelector('[data-route="chart"]')
            && !document.querySelector('[data-replay-next]')?.disabled;
        });

        click(document.querySelector('[data-layout-open]'));
        click(document.querySelector('[data-layout-mode-option="twice"][data-layout-variant-option="twice.vertical"]'));
        await waitFor('twice layout rendered', () =>
          document.querySelector('[data-layout-pane-shell]')?.dataset.paneCount === '2'
            && document.querySelector('[data-layout-split-handle]')
        );

        click(document.querySelector('[data-chart-settings-open]'));
        await waitFor('settings opened', () =>
          document.querySelector('[data-chart-settings-popover]')?.hidden === false
        );

        const staleLayoutSingle = document.querySelector('[data-layout-mode-option="single"]');
        const staleLayoutSync = document.querySelector('[data-layout-sync="interval"]');
        const staleSettingsTab = document.querySelector('[data-chart-settings-tab="canvas"]');
        const staleSettingsApply = document.querySelector('[data-chart-settings-apply]');
        const staleNext = document.querySelector('[data-replay-next]');
        const stalePlay = document.querySelector('[data-replay-play]');
        const staleSplitHandle = document.querySelector('[data-layout-split-handle]');

        staleNext.click();
        staleNext.click();
        staleNext.click();
        await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
        await waitFor('setup route active after teardown', () =>
          document.querySelector('[data-route="setup"]')
            && !document.querySelector('[data-route="chart"]')
        );
        await waitFor('playback paused after teardown', async () => {
          const playback = await commands.dispatchCommand('replay.getPlaybackState');
          return playback.playing === false;
        });
        await sleep(75);

        const layoutAfterTeardown = await commands.dispatchCommand('layout.getState');
        const replayAfterTeardown = await commands.dispatchCommand('replay.getState');
        const playbackAfterTeardown = await commands.dispatchCommand('replay.getPlaybackState');

        click(staleLayoutSingle);
        if (staleLayoutSync) {
          staleLayoutSync.checked = !staleLayoutSync.checked;
          staleLayoutSync.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        }
        click(staleSettingsTab);
        click(staleSettingsApply);
        click(staleNext);
        click(stalePlay);
        pointerDrag(staleSplitHandle);
        window.dispatchEvent(new Event('resize'));
        await sleep(120);

        const layoutAfterStaleEvents = await commands.dispatchCommand('layout.getState');
        const replayAfterStaleEvents = await commands.dispatchCommand('replay.getState');
        const playbackAfterStaleEvents = await commands.dispatchCommand('replay.getPlaybackState');

        return JSON.stringify({
          route: document.querySelector('[data-v5-root]')?.dataset.currentRoute || '',
          hasSetup: Boolean(document.querySelector('[data-route="setup"]')),
          hasChart: Boolean(document.querySelector('[data-route="chart"]')),
          oldElementsDisconnected: [
            staleLayoutSingle,
            staleLayoutSync,
            staleSettingsTab,
            staleSettingsApply,
            staleNext,
            stalePlay,
            staleSplitHandle,
          ].every((element) => !element || element.isConnected === false),
          layoutModeAfterTeardown: layoutAfterTeardown.mode,
          layoutModeAfterStaleEvents: layoutAfterStaleEvents.mode,
          layoutVariantAfterTeardown: layoutAfterTeardown.variant,
          layoutVariantAfterStaleEvents: layoutAfterStaleEvents.variant,
          layoutSyncAfterTeardown: layoutAfterTeardown.sync,
          layoutSyncAfterStaleEvents: layoutAfterStaleEvents.sync,
          replayCursorAfterTeardown: replayAfterTeardown.cursorTimestamp,
          replayCursorAfterStaleEvents: replayAfterStaleEvents.cursorTimestamp,
          replayCountAfterTeardown: replayAfterTeardown.displayBars?.length || 0,
          replayCountAfterStaleEvents: replayAfterStaleEvents.displayBars?.length || 0,
          playbackAfterTeardown,
          playbackAfterStaleEvents,
          errors: window.__v5RouteTeardownErrors,
        });
      })()
    `));

    assert.equal(value.route, 'setup');
    assert.equal(value.hasSetup, true);
    assert.equal(value.hasChart, false);
    assert.equal(value.oldElementsDisconnected, true);
    assert.equal(value.layoutModeAfterTeardown, 'twice');
    assert.equal(value.layoutModeAfterStaleEvents, 'twice');
    assert.equal(value.layoutVariantAfterTeardown, 'twice.vertical');
    assert.equal(value.layoutVariantAfterStaleEvents, 'twice.vertical');
    assert.deepEqual(value.layoutSyncAfterStaleEvents, value.layoutSyncAfterTeardown);
    assert.equal(value.replayCursorAfterStaleEvents, value.replayCursorAfterTeardown);
    assert.equal(value.replayCountAfterStaleEvents, value.replayCountAfterTeardown);
    assert.equal(value.playbackAfterTeardown.playing, false);
    assert.equal(value.playbackAfterStaleEvents.playing, false);
    assert.deepEqual(value.errors, []);
  } finally {
    client?.close();
    chrome?.kill('SIGTERM');
    if (chrome) await waitForProcessExit(chrome);
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
  () => console.log('v5 route teardown browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
