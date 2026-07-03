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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9398);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-fast-next-browser-smoke-${process.pid}`;

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
        window.__v5ForwardBarRequests = 0;
        window.fetch = async (...args) => {
          const url = String(args[0] || '');
          if (!url.includes('/v4/bars')) {
            return originalFetch(...args);
          }
          const parsed = new URL(url, window.location.href);
          const startText = parsed.searchParams.get('start');
          const endText = parsed.searchParams.get('end');
          const timeframe = Number(parsed.searchParams.get('tf') || 1);
          const start = Date.parse(startText.replace(' ', 'T') + ':00.000Z') / 1000;
          const end = Date.parse(endText.replace(' ', 'T') + ':00.000Z') / 1000;
          if (end > start && startText >= '2026-06-01 09:30') {
            window.__v5ForwardBarRequests += 1;
          }
          await new Promise((resolve) => setTimeout(resolve, 120));
          const step = timeframe * 60;
          const bars = [];
          for (let timestamp = start; timestamp <= end; timestamp += step) {
            const index = Math.round((timestamp - start) / step);
            const open = 1000 + index;
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

        async function waitFor(label, predicate, timeoutMs = 5000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 25));
          }
          const state = await window.__v5Commands?.dispatchCommand('replay.getState').catch(() => null);
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify(state));
        }

        const commands = await import('/v5/src/runtime/commands.js');
        window.__v5Commands = commands;
        const created = await commands.dispatchCommand('session.create', {
          id: 'browser-fast-next',
          instrument: 'NQ',
          timeframe: 1,
          sessionStart: '2026-06-01T09:30:00.000Z',
          sessionEnd: '2026-06-01T10:30:00.000Z',
        });
        await commands.dispatchCommand('app.navigate', {
          routeId: 'chart',
          params: { sessionId: created.session.id },
        });
        await waitFor('initial loaded', async () => {
          const state = await commands.dispatchCommand('replay.getState');
          return state.status === 'initial-loaded'
            && document.querySelector('[data-replay-next]')?.disabled === false;
        });

        const initial = await commands.dispatchCommand('replay.getState');
        const forwardRequestsAfterInitial = window.__v5ForwardBarRequests;
        const startedAt = performance.now();
        const nextButton = document.querySelector('[data-replay-next]');
        for (let index = 0; index < 10; index += 1) {
          nextButton.click();
        }
        await waitFor('ten next clicks applied', async () => {
          const state = await commands.dispatchCommand('replay.getState');
          return state.revealedCount === initial.revealedCount + 10;
        }, 1500);
        const finishedAt = performance.now();
        const finalState = await commands.dispatchCommand('replay.getState');
        return JSON.stringify({
          elapsedMs: finishedAt - startedAt,
          revealedCount: finalState.revealedCount,
          cursorTimestamp: finalState.cursorTimestamp,
          forwardRequestDelta: window.__v5ForwardBarRequests - forwardRequestsAfterInitial,
          displayBars: finalState.displayBars.length,
        });
      })();
    `));

    assert.equal(value.revealedCount, 10);
    assert.equal(value.cursorTimestamp, '2026-06-01T09:40:00.000Z');
    assert.equal(value.forwardRequestDelta, 0);
    assert.ok(value.elapsedMs < 1500, `10 next clicks took ${value.elapsedMs}ms`);
    assert.ok(value.displayBars > 10);
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

console.log('v5 replay fast next browser smoke passed');
