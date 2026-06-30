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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9370);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-restore-browser-smoke-${process.pid}`;

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
        const installBarsFetchStub = () => {
          if (window.__v5OriginalFetch) return;
          window.__v5OriginalFetch = window.fetch.bind(window);
          window.__v5BarRequests = [];
          window.fetch = async (...args) => {
            const url = String(args[0] || '');
            if (!url.includes('/v4/bars')) {
              return window.__v5OriginalFetch(...args);
            }
            const parsed = new URL(url, window.location.href);
            const startText = parsed.searchParams.get('start');
            const endText = parsed.searchParams.get('end');
            window.__v5BarRequests.push({ start: startText, end: endText, tf: parsed.searchParams.get('tf') });
            const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
            const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
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
        };
        installBarsFetchStub();
        const barRequests = [];
        const flushBarRequests = () => {
          barRequests.push(...(window.__v5BarRequests || []));
          window.__v5BarRequests = [];
        };

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            state,
            nextDisabled: document.querySelector('[data-replay-next]')?.disabled,
            resetDisabled: document.querySelector('[data-replay-reset]')?.disabled,
            statusText: document.querySelector('[data-replay-load-status]')?.textContent || '',
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          window.__v5Commands = commands;
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-replay-restore',
            instrument: 'NQ',
            timeframe: 1,
            sessionStart: '2026-06-01T09:30:00.000Z',
            sessionEnd: '2026-06-01T09:35:00.000Z',
          });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('initial loaded', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.status === 'initial-loaded' && !document.querySelector('[data-replay-next]')?.disabled;
          });
          const initial = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-next]').click();
          await waitFor('next persisted', async () => {
            const record = await commands.dispatchCommand('session.get', { sessionId: created.session.id });
            return record.cursor?.cursorTimestamp === '2026-06-01T09:31:00.000Z';
          });
          const advanced = await commands.dispatchCommand('replay.getState');

          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('renavigate restored', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.cursorTimestamp === '2026-06-01T09:31:00.000Z'
              && document.querySelector('[data-replay-cursor]')?.textContent === '2026-06-01 09:31';
          });
          const restored = await commands.dispatchCommand('replay.getState');

          document.querySelector('[data-replay-reset]').click();
          await waitFor('reset to start', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const record = await commands.dispatchCommand('session.get', { sessionId: created.session.id });
            return state.cursorTimestamp === '2026-06-01T09:30:00.000Z'
              && state.revealedCount === 0
              && record.cursor?.cursorTimestamp === '2026-06-01T09:30:00.000Z'
              && document.querySelector('[data-replay-revealed-count]')?.textContent === '0';
          });
          const reset = await commands.dispatchCommand('replay.getState');

          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: created.session.id },
          });
          await waitFor('reset restored as start', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.cursorTimestamp === '2026-06-01T09:30:00.000Z'
              && state.revealedCount === 0
              && document.querySelector('[data-replay-cursor]')?.textContent === '2026-06-01 09:30'
              && document.querySelector('[data-replay-revealed-count]')?.textContent === '0';
          });
          const restoredAfterReset = await commands.dispatchCommand('replay.getState');
          const restoredAfterResetCursorText = document.querySelector('[data-replay-cursor]')?.textContent || '';
          const restoredAfterResetRevealedText = document.querySelector('[data-replay-revealed-count]')?.textContent || '';
          flushBarRequests();

          const events = await import('/v5/src/runtime/events.js');
          await commands.dispatchCommand('app.navigate', { routeId: 'setup' });
          const listenerCountsAfterNavigate = {
            initialLoaded: events.listenerCount('replay:initialLoaded'),
            next: events.listenerCount('replay:next'),
            reset: events.listenerCount('replay:reset'),
            playbackChanged: events.listenerCount('replay:playbackChanged'),
          };

          return JSON.stringify({
            error: '',
            initialCount: initial.displayBars.length,
            advancedCount: advanced.displayBars.length,
            restoredCount: restored.displayBars.length,
            resetCount: reset.displayBars.length,
            restoredAfterResetCount: restoredAfterReset.displayBars.length,
            restoredCursor: restored.cursorTimestamp,
            restoredRevealedCount: restored.revealedCount,
            resetCursor: reset.cursorTimestamp,
            resetRevealedCount: reset.revealedCount,
            restoredAfterResetCursor: restoredAfterReset.cursorTimestamp,
            restoredAfterResetRevealedCount: restoredAfterReset.revealedCount,
            cursorText: restoredAfterResetCursorText,
            revealedText: restoredAfterResetRevealedText,
            barRequests,
            listenerCountsAfterNavigate,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `));

    assert.equal(value.error, '', value.error || 'browser smoke failed');
    assert.equal(value.advancedCount, value.initialCount + 1);
    assert.equal(value.restoredCount, value.advancedCount);
    assert.equal(value.restoredCursor, '2026-06-01T09:31:00.000Z');
    assert.equal(value.restoredRevealedCount, 1);
    assert.equal(value.resetCount, value.initialCount);
    assert.equal(value.resetCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.resetRevealedCount, 0);
    assert.equal(value.restoredAfterResetCount, value.initialCount);
    assert.equal(value.restoredAfterResetCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(value.restoredAfterResetRevealedCount, 0);
    assert.equal(value.cursorText, '2026-06-01 09:30');
    assert.equal(value.revealedText, '0');
    assert.equal(
      value.barRequests.some((request) => request.start === '2026-06-01 09:30' && request.end === '2026-06-01 09:35'),
      false
    );
    assert.deepEqual(value.listenerCountsAfterNavigate, {
      initialLoaded: 0,
      next: 0,
      reset: 0,
      playbackChanged: 0,
    });

    await client.send('Page.reload', { ignoreCache: true });
    await waitForExpression(client, `document.querySelector('[data-v5-root]')?.dataset.booted === 'true'`, 8_000);
    const reloadValue = JSON.parse(await evaluate(client, `
      (async () => {
        const installBarsFetchStub = () => {
          if (window.__v5OriginalFetch) return;
          window.__v5OriginalFetch = window.fetch.bind(window);
          window.__v5BarRequests = [];
          window.fetch = async (...args) => {
            const url = String(args[0] || '');
            if (!url.includes('/v4/bars')) {
              return window.__v5OriginalFetch(...args);
            }
            const parsed = new URL(url, window.location.href);
            const startText = parsed.searchParams.get('start');
            const endText = parsed.searchParams.get('end');
            window.__v5BarRequests.push({ start: startText, end: endText, tf: parsed.searchParams.get('tf') });
            const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
            const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
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
        };

        async function waitFor(label, predicate, timeoutMs = 8000) {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('waitFor timed out: ' + label);
        }

        try {
          installBarsFetchStub();
          const commands = await import('/v5/src/runtime/commands.js');
          const record = await commands.dispatchCommand('session.get', { sessionId: 'browser-replay-restore' });
          await commands.dispatchCommand('app.navigate', {
            routeId: 'chart',
            params: { sessionId: 'browser-replay-restore' },
          });
          await waitFor('reload restored', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            return state.cursorTimestamp === '2026-06-01T09:30:00.000Z'
              && state.revealedCount === 0
              && document.querySelector('[data-replay-cursor]')?.textContent === '2026-06-01 09:30';
          });
          const restored = await commands.dispatchCommand('replay.getState');
          return JSON.stringify({
            error: '',
            persistedSessionId: record?.session?.id || null,
            persistedCursor: record?.cursor?.cursorTimestamp || null,
            restoredCursor: restored.cursorTimestamp,
            restoredRevealedCount: restored.revealedCount,
            restoredCount: restored.displayBars.length,
            barRequests: window.__v5BarRequests || [],
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `));
    assert.equal(reloadValue.error, '', reloadValue.error || 'browser reload smoke failed');
    assert.equal(reloadValue.persistedSessionId, 'browser-replay-restore');
    assert.equal(reloadValue.persistedCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(reloadValue.restoredCursor, '2026-06-01T09:30:00.000Z');
    assert.equal(reloadValue.restoredRevealedCount, 0);
    assert.equal(reloadValue.restoredCount, value.initialCount);
    assert.equal(
      reloadValue.barRequests.some((request) => request.start === '2026-06-01 09:30' && request.end === '2026-06-01 09:35'),
      false
    );
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
  () => console.log('v5 replay restore browser smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
