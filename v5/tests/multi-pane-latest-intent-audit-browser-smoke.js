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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9404);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-multi-pane-latest-intent-audit-${process.pid}`;

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
            const open = 30000 + Math.sin(index / 4) * 8 + index * 0.5;
            bars.push({
              timestamp,
              open,
              high: open + 5,
              low: open - 5,
              close: open + (index % 2 ? -1.5 : 1.5),
            });
          }
          return new Response(JSON.stringify({ bars }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        };

        function paneEntries() {
          return Array.from(document.querySelectorAll('[data-layout-pane]')).map((pane) => {
            const canvas = pane.querySelector('[data-chart-canvas]');
            return {
              paneId: pane.dataset.paneId || '',
              canvas,
            };
          }).filter((entry) => entry.canvas);
        }

        function paneMetrics() {
          return paneEntries().map(({ paneId, canvas }) => ({
            paneId,
            fullBarCount: Number(canvas.dataset.fullBarCount || 0),
            renderedBarCount: Number(canvas.dataset.renderedBarCount || 0),
            displayTimeframe: Number(canvas.dataset.displayTimeframe || 0),
            viewportCursorTimestamp: Number(canvas.dataset.viewportCursorTimestamp || 0),
          }));
        }

        function metricMap(metrics = paneMetrics()) {
          return Object.fromEntries(metrics.map((pane) => [pane.paneId, pane]));
        }

        function observePaneCursors(expectedCursorTimestamp, timeoutMs = 1800) {
          const entries = paneEntries();
          const perPane = Object.fromEntries(entries.map((entry) => [entry.paneId, {
            observed: Number(entry.canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp,
            observedAt: Number(entry.canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp
              ? performance.now()
              : null,
            reason: Number(entry.canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp
              ? 'already-visible'
              : '',
          }]));
          if (!entries.length) {
            return Promise.resolve({
              observed: false,
              observedAt: null,
              reason: 'missing-canvases',
              perPane,
            });
          }
          const allVisible = () => entries.every((entry) =>
            Number(entry.canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp
          );
          if (allVisible()) {
            return Promise.resolve({
              observed: true,
              observedAt: performance.now(),
              reason: 'already-visible',
              perPane,
            });
          }
          return new Promise((resolve) => {
            const observers = [];
            const cleanup = () => {
              clearTimeout(deadlineTimer);
              observers.forEach((observer) => observer.disconnect());
            };
            const maybeResolve = (paneId, canvas) => {
              if (Number(canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp && !perPane[paneId].observed) {
                perPane[paneId] = {
                  observed: true,
                  observedAt: performance.now(),
                  reason: 'mutation',
                };
              }
              if (!allVisible()) return;
              const observedAt = performance.now();
              cleanup();
              resolve({
                observed: true,
                observedAt,
                reason: 'mutation',
                perPane,
              });
            };
            const deadlineTimer = setTimeout(() => {
              cleanup();
              resolve({
                observed: false,
                observedAt: null,
                reason: 'timeout',
                perPane,
              });
            }, timeoutMs);
            entries.forEach(({ paneId, canvas }) => {
              const observer = new MutationObserver(() => maybeResolve(paneId, canvas));
              observer.observe(canvas, {
                attributes: true,
                attributeFilter: ['data-viewport-cursor-timestamp'],
              });
              observers.push(observer);
            });
          });
        }

        async function waitFor(label, predicate, timeoutMs = 5000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            panes: paneMetrics(),
          }));
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-multi-pane-latest-intent-audit',
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
              && document.querySelector('[data-replay-next]')?.disabled === false
              && Number(document.querySelector('[data-chart-canvas]')?.dataset.renderedBarCount || 0) > 0;
          });
          await commands.dispatchCommand('layout.setMode', {
            mode: 'twice',
            variant: 'twice.vertical',
          });
          await waitFor('two panes rendered', async () => {
            const metrics = paneMetrics();
            return metrics.length === 2
              && metrics.every((pane) => pane.displayTimeframe === 1)
              && metrics.every((pane) => pane.fullBarCount > 0)
              && metrics.every((pane) => pane.renderedBarCount > 0);
          });

          const initial = await commands.dispatchCommand('replay.getState');
          const beforeMetrics = paneMetrics();
          const beforeByPane = metricMap(beforeMetrics);
          const forwardRequestsAfterLayout = window.__v5ForwardBarRequests;
          const expectedCursorTimestamp = Date.parse('2026-06-01T09:40:00.000Z') / 1000;
          const observedCursorPromise = observePaneCursors(expectedCursorTimestamp);
          let finalClickAt = performance.now();
          const nextButton = document.querySelector('[data-replay-next]');
          for (let index = 0; index < 10; index += 1) {
            nextButton.click();
            finalClickAt = performance.now();
          }
          const observedCursor = await observedCursorPromise;
          await waitFor('runtime and all panes reached latest cursor', async () => {
            const state = await commands.dispatchCommand('replay.getState');
            const metrics = paneMetrics();
            return state.revealedCount === initial.revealedCount + 10
              && state.cursorTimestamp === '2026-06-01T09:40:00.000Z'
              && metrics.length === 2
              && metrics.every((pane) => pane.viewportCursorTimestamp === expectedCursorTimestamp)
              && metrics.every((pane) => pane.renderedBarCount > 0);
          }, 1800);
          const pollingVisibleAt = performance.now();
          await new Promise((resolve) => requestAnimationFrame(() => resolve()));
          const frameAt = performance.now();
          const finalState = await commands.dispatchCommand('replay.getState');
          const afterMetrics = paneMetrics();
          const perPaneLatency = Object.fromEntries(Object.entries(observedCursor.perPane).map(([paneId, entry]) => [
            paneId,
            entry.observedAt == null ? null : entry.observedAt - finalClickAt,
          ]));
          return JSON.stringify({
            error: '',
            finalClickToAllPaneObservedMs: observedCursor.observedAt == null
              ? null
              : observedCursor.observedAt - finalClickAt,
            finalClickToPollingVisibleMs: pollingVisibleAt - finalClickAt,
            finalClickToAnimationFrameMs: frameAt - finalClickAt,
            observerDetected: Boolean(observedCursor.observed),
            observerReason: observedCursor.reason,
            perPaneLatency,
            perPaneObserved: observedCursor.perPane,
            revealedCount: finalState.revealedCount,
            cursorTimestamp: finalState.cursorTimestamp,
            beforeMetrics,
            afterMetrics,
            fullBarDeltas: afterMetrics.map((pane) => ({
              paneId: pane.paneId,
              delta: pane.fullBarCount - (beforeByPane[pane.paneId]?.fullBarCount || 0),
            })),
            forwardRequestDelta: window.__v5ForwardBarRequests - forwardRequestsAfterLayout,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser audit failed');
    assert.equal(value.revealedCount, 10);
    assert.equal(value.cursorTimestamp, '2026-06-01T09:40:00.000Z');
    assert.equal(value.forwardRequestDelta, 0);
    assert.equal(value.observerDetected, true, `all pane cursor observer should detect visibility: ${JSON.stringify(value)}`);
    assert.ok(value.finalClickToAllPaneObservedMs < 1000, `all pane observer latency is unexpectedly high: ${JSON.stringify(value)}`);
    assert.equal(value.afterMetrics.length, 2);
    assert.ok(value.afterMetrics.every((pane) => pane.renderedBarCount > 0));
    console.log(JSON.stringify({
      finalClickToAllPaneObservedMs: value.finalClickToAllPaneObservedMs,
      finalClickToPollingVisibleMs: value.finalClickToPollingVisibleMs,
      finalClickToAnimationFrameMs: value.finalClickToAnimationFrameMs,
      perPaneLatency: value.perPaneLatency,
      observerReason: value.observerReason,
    }));
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

console.log('v5 multi-pane latest intent audit browser smoke passed');
