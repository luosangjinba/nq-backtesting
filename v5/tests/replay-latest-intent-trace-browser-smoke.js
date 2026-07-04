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
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9403);
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v5-replay-latest-intent-trace-${process.pid}`;
const LATEST_INTENT_OBSERVER_THRESHOLD_MS = 120;

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
        window.__v5ReplayTrace = {
          marks: [],
          mark(label, detail = {}) {
            this.marks.push({ label, t: performance.now(), detail });
          },
        };
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

        function canvasMetrics() {
          const canvas = document.querySelector('[data-chart-canvas]');
          return {
            renderedBarCount: Number(canvas?.dataset.renderedBarCount || 0),
            fullBarCount: Number(canvas?.dataset.fullBarCount || 0),
            viewportCursorTimestamp: Number(canvas?.dataset.viewportCursorTimestamp || 0),
          };
        }

        function observeCursorMetadata(expectedCursorTimestamp, timeoutMs = 1800) {
          const canvas = document.querySelector('[data-chart-canvas]');
          if (!canvas) {
            return Promise.resolve({
              observed: false,
              observedAt: null,
              reason: 'missing-canvas',
            });
          }
          if (Number(canvas.dataset.viewportCursorTimestamp || 0) === expectedCursorTimestamp) {
            return Promise.resolve({
              observed: true,
              observedAt: performance.now(),
              reason: 'already-visible',
            });
          }
          return new Promise((resolve) => {
            const deadlineTimer = setTimeout(() => {
              observer.disconnect();
              resolve({
                observed: false,
                observedAt: null,
                reason: 'timeout',
              });
            }, timeoutMs);
            const observer = new MutationObserver(() => {
              if (Number(canvas.dataset.viewportCursorTimestamp || 0) !== expectedCursorTimestamp) return;
              const observedAt = performance.now();
              clearTimeout(deadlineTimer);
              observer.disconnect();
              resolve({
                observed: true,
                observedAt,
                reason: 'mutation',
              });
            });
            observer.observe(canvas, {
              attributes: true,
              attributeFilter: ['data-viewport-cursor-timestamp'],
            });
          });
        }

        async function waitFor(label, predicate, timeoutMs = 5000) {
          const deadline = performance.now() + timeoutMs;
          while (performance.now() < deadline) {
            const value = await predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 5));
          }
          throw new Error('waitFor timed out: ' + label + ' ' + JSON.stringify({
            canvas: canvasMetrics(),
            marks: window.__v5ReplayTrace.marks,
          }));
        }

        function firstMark(label) {
          return window.__v5ReplayTrace.marks.find((mark) => mark.label === label);
        }

        function lastMark(label) {
          return [...window.__v5ReplayTrace.marks].reverse().find((mark) => mark.label === label);
        }

        function span(startLabel, endLabel) {
          const start = lastMark(startLabel);
          const end = lastMark(endLabel);
          return start && end ? end.t - start.t : null;
        }

        function lastSpanFromAny(startLabels, endLabel) {
          const starts = startLabels
            .map((label) => lastMark(label))
            .filter(Boolean)
            .sort((a, b) => b.t - a.t);
          const end = lastMark(endLabel);
          return starts[0] && end ? end.t - starts[0].t : null;
        }

        function sinceLastClick(label) {
          const click = lastMark('controls.next.click');
          const mark = lastMark(label);
          return click && mark ? mark.t - click.t : null;
        }

        try {
          const commands = await import('/v5/src/runtime/commands.js');
          const created = await commands.dispatchCommand('session.create', {
            id: 'browser-latest-intent-trace-single',
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
            const metrics = canvasMetrics();
            return state.status === 'initial-loaded'
              && document.querySelector('[data-replay-next]')?.disabled === false
              && metrics.renderedBarCount > 0;
          });

          window.__v5ReplayTrace.marks.length = 0;
          const clickCount = 20;
          const expectedCursorTimestamp = Date.parse('2026-06-01T09:50:00.000Z') / 1000;
          const forwardRequestsAfterInitial = window.__v5ForwardBarRequests;
          const observedCursorPromise = observeCursorMetadata(expectedCursorTimestamp);
          let finalClickAt = performance.now();
          const nextButton = document.querySelector('[data-replay-next]');
          for (let index = 0; index < clickCount; index += 1) {
            nextButton.click();
            finalClickAt = performance.now();
          }
          const observedCursor = await observedCursorPromise;
          await waitFor('latest cursor visible', async () =>
            canvasMetrics().viewportCursorTimestamp === expectedCursorTimestamp
          , 1800);
          const visibleAt = performance.now();
          await new Promise((resolve) => requestAnimationFrame(() => resolve()));
          const frameAt = performance.now();
          const finalState = await commands.dispatchCommand('replay.getState');
          const marks = window.__v5ReplayTrace.marks;
          const firstClick = firstMark('controls.next.click');
          const finalMetrics = canvasMetrics();
          return JSON.stringify({
            error: '',
            clickCount,
            finalClickToVisibleMs: observedCursor.observedAt == null
              ? visibleAt - finalClickAt
              : observedCursor.observedAt - finalClickAt,
            finalClickToPollingVisibleMs: visibleAt - finalClickAt,
            finalClickToAnimationFrameMs: frameAt - finalClickAt,
            observerDetected: Boolean(observedCursor.observed),
            observerReason: observedCursor.reason,
            finalClickToObservedVisibleMs: observedCursor.observedAt == null
              ? null
              : observedCursor.observedAt - finalClickAt,
            observerToPollingVisibleMs: observedCursor.observedAt == null
              ? null
              : visibleAt - observedCursor.observedAt,
            observerToAnimationFrameMs: observedCursor.observedAt == null
              ? null
              : frameAt - observedCursor.observedAt,
            firstClickToVisibleMs: firstClick ? visibleAt - firstClick.t : null,
            finalClickToFlushStartMs: sinceLastClick('controls.next.flush.start'),
            finalClickToCommandStartMs: sinceLastClick('controls.next.command.start'),
            finalClickToReplayStartMs: sinceLastClick('replay.next.start'),
            queueToFlushStartMs: span('controls.next.queue', 'controls.next.flush.start'),
            scheduleToFlushStartMs: lastSpanFromAny([
              'controls.next.schedule.microtask',
              'controls.next.schedule.timer',
            ], 'controls.next.flush.start'),
            controlFlushMs: span('controls.next.flush.start', 'controls.next.flush.end'),
            commandMs: span('controls.next.command.start', 'controls.next.command.end'),
            replayNextMs: span('replay.next.start', 'replay.next.end'),
            loadWindowMs: span('replay.next.loadWindow.start', 'replay.next.loadWindow.end'),
            selectBarsMs: span('replay.next.selectBars.start', 'replay.next.selectBars.end'),
            displayBuildMs: span('replay.next.displayBuild.start', 'replay.next.displayBuild.end'),
            rightEdgeMs: span('replay.next.rightEdge.start', 'replay.next.rightEdge.end'),
            chartSyncRightEdgeMs: span('chartSync.rightEdge.start', 'chartSync.rightEdge.end'),
            appendDisplayMs: span('replay.next.appendDisplay.start', 'replay.next.appendDisplay.end'),
            chartAppendMs: span('replay.next.chartAppend.start', 'replay.next.chartAppend.end'),
            chartSyncAppendMs: span('chartSync.append.start', 'chartSync.append.end'),
            chartSyncMetricsMs: span('chartSync.append.metrics.start', 'chartSync.append.metrics.end'),
            chartSyncAppendCommandMs: span('chartSync.append.command.start', 'chartSync.append.command.end'),
            chartRuntimeAppendMs: span('chartRuntime.append.start', 'chartRuntime.append.end'),
            chartRuntimeStateMs: span('chartRuntime.append.state.start', 'chartRuntime.append.state.end'),
            chartRuntimeHostSyncMs: span('chartRuntime.append.hostSync.start', 'chartRuntime.append.hostSync.end'),
            chartHostSyncAppendMs: span('chartHostSync.append.start', 'chartHostSync.append.end'),
            chartHostSyncComputeMs: span('chartHostSync.append.compute.start', 'chartHostSync.append.compute.end'),
            chartHostSyncAdapterMs: span('chartHostSync.append.adapter.start', 'chartHostSync.append.adapter.end'),
            chartHostSyncResizeBeforeMs: span('chartHostSync.append.resizeBefore.start', 'chartHostSync.append.resizeBefore.end'),
            chartHostSyncResizeAfterMs: span('chartHostSync.append.resizeAfter.start', 'chartHostSync.append.resizeAfter.end'),
            lightweightMetadataApplyMs: span('lightweight.append.metadataApply.start', 'lightweight.append.metadataApply.end'),
            replayStateWriteMs: span('replay.next.stateWrite.start', 'replay.next.stateWrite.end'),
            replayEmitMs: span('replay.next.emit.start', 'replay.next.emit.end'),
            replayPersistEnqueueMs: span('replay.next.persist.enqueue.start', 'replay.next.persist.enqueue.end'),
            replayEndToVisibleMs: sinceLastClick('replay.next.end') == null
              ? null
              : (visibleAt - (lastMark('replay.next.end')?.t || visibleAt)),
            replayEndToObservedVisibleMs: observedCursor.observedAt == null || lastMark('replay.next.end') == null
              ? null
              : (observedCursor.observedAt - lastMark('replay.next.end').t),
            lightweightMetadataToVisibleMs: sinceLastClick('lightweight.append.metadata') == null
              ? null
              : (visibleAt - (lastMark('lightweight.append.metadata')?.t || visibleAt)),
            lightweightMetadataToObservedVisibleMs: observedCursor.observedAt == null || lastMark('lightweight.append.metadata') == null
              ? null
              : (observedCursor.observedAt - lastMark('lightweight.append.metadata').t),
            lightweightAppendMs: span('lightweight.append.start', 'lightweight.append.end'),
            lightweightSeriesUpdateMs: span('lightweight.append.start', 'lightweight.append.seriesUpdated'),
            fallbackAppendMs: span('fallback.append.start', 'fallback.append.end'),
            metadataCursorTimestamp: finalMetrics.viewportCursorTimestamp,
            revealedCount: finalState.revealedCount,
            cursorTimestamp: finalState.cursorTimestamp,
            markCount: marks.length,
            labels: marks.map((mark) => mark.label),
            forwardRequestDelta: window.__v5ForwardBarRequests - forwardRequestsAfterInitial,
          });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        } finally {
          window.fetch = originalFetch;
          delete window.__v5ReplayTrace;
        }
      })();
    `));

    assert.equal(value.error, '', value.error || 'browser trace failed');
    assert.equal(value.revealedCount, 20);
    assert.equal(value.cursorTimestamp, '2026-06-01T09:50:00.000Z');
    assert.equal(value.forwardRequestDelta, 0);
    assert.equal(value.metadataCursorTimestamp, Date.parse('2026-06-01T09:50:00.000Z') / 1000);
    assert.equal(value.observerDetected, true, `cursor metadata observer should detect visibility: ${JSON.stringify(value)}`);
    assert.equal(typeof value.finalClickToObservedVisibleMs, 'number');
    assert.equal(typeof value.observerToPollingVisibleMs, 'number');
    assert.ok(
      value.finalClickToVisibleMs < LATEST_INTENT_OBSERVER_THRESHOLD_MS,
      `observer latest intent latency ${value.finalClickToVisibleMs}ms exceeded ${LATEST_INTENT_OBSERVER_THRESHOLD_MS}ms: ${JSON.stringify(value)}`
    );
    assert.equal(typeof value.finalClickToFlushStartMs, 'number');
    assert.equal(typeof value.finalClickToCommandStartMs, 'number');
    assert.equal(typeof value.finalClickToReplayStartMs, 'number');
    assert.equal(typeof value.queueToFlushStartMs, 'number');
    assert.equal(typeof value.scheduleToFlushStartMs, 'number');
    assert.ok(value.markCount > 0);
    console.log(JSON.stringify({
      finalClickToVisibleMs: value.finalClickToVisibleMs,
      finalClickToPollingVisibleMs: value.finalClickToPollingVisibleMs,
      finalClickToAnimationFrameMs: value.finalClickToAnimationFrameMs,
      finalClickToObservedVisibleMs: value.finalClickToObservedVisibleMs,
      observerReason: value.observerReason,
      observerToPollingVisibleMs: value.observerToPollingVisibleMs,
      observerToAnimationFrameMs: value.observerToAnimationFrameMs,
      finalClickToFlushStartMs: value.finalClickToFlushStartMs,
      finalClickToCommandStartMs: value.finalClickToCommandStartMs,
      finalClickToReplayStartMs: value.finalClickToReplayStartMs,
      queueToFlushStartMs: value.queueToFlushStartMs,
      scheduleToFlushStartMs: value.scheduleToFlushStartMs,
      controlFlushMs: value.controlFlushMs,
      commandMs: value.commandMs,
      replayNextMs: value.replayNextMs,
      loadWindowMs: value.loadWindowMs,
      selectBarsMs: value.selectBarsMs,
      displayBuildMs: value.displayBuildMs,
      rightEdgeMs: value.rightEdgeMs,
      chartSyncRightEdgeMs: value.chartSyncRightEdgeMs,
      appendDisplayMs: value.appendDisplayMs,
      chartAppendMs: value.chartAppendMs,
      chartSyncAppendMs: value.chartSyncAppendMs,
      chartSyncMetricsMs: value.chartSyncMetricsMs,
      chartSyncAppendCommandMs: value.chartSyncAppendCommandMs,
      chartRuntimeAppendMs: value.chartRuntimeAppendMs,
      chartRuntimeStateMs: value.chartRuntimeStateMs,
      chartRuntimeHostSyncMs: value.chartRuntimeHostSyncMs,
      chartHostSyncAppendMs: value.chartHostSyncAppendMs,
      chartHostSyncComputeMs: value.chartHostSyncComputeMs,
      chartHostSyncAdapterMs: value.chartHostSyncAdapterMs,
      chartHostSyncResizeBeforeMs: value.chartHostSyncResizeBeforeMs,
      chartHostSyncResizeAfterMs: value.chartHostSyncResizeAfterMs,
      lightweightMetadataApplyMs: value.lightweightMetadataApplyMs,
      replayStateWriteMs: value.replayStateWriteMs,
      replayEmitMs: value.replayEmitMs,
      replayPersistEnqueueMs: value.replayPersistEnqueueMs,
      replayEndToVisibleMs: value.replayEndToVisibleMs,
      replayEndToObservedVisibleMs: value.replayEndToObservedVisibleMs,
      lightweightMetadataToVisibleMs: value.lightweightMetadataToVisibleMs,
      lightweightMetadataToObservedVisibleMs: value.lightweightMetadataToObservedVisibleMs,
      lightweightAppendMs: value.lightweightAppendMs,
      lightweightSeriesUpdateMs: value.lightweightSeriesUpdateMs,
      fallbackAppendMs: value.fallbackAppendMs,
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

console.log('v5 replay latest intent trace browser smoke passed');
