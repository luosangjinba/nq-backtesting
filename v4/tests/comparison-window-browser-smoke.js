import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9362);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-comparison-window-browser-smoke-profile-${process.pid}`;

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(500, () => req.destroy(new Error('timeout')));
  });
}

async function waitForTargets() {
  const url = `http://127.0.0.1:${DEBUG_PORT}/json/list`;
  const deadline = Date.now() + 10_000;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const targets = await getJson(url);
      const page = targets.find((target) => target.type === 'page' && target.webSocketDebuggerUrl);
      if (page) return page;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw lastError || new Error('Chrome target not available');
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) {
      reject(new Error(message.error.message || 'CDP error'));
      return;
    }
    resolve(message.result);
  });

  return {
    open() {
      return new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      socket.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
      });
    },
    close() {
      socket.close();
    },
  };
}

function waitForProcessExit(child, timeoutMs = 2_000) {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const detail =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.exception?.value ||
      result.exceptionDetails.text ||
      'Runtime.evaluate failed';
    throw new Error(detail);
  }
  return result.result.value;
}

async function waitForExpression(client, expression, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue = null;
  while (Date.now() < deadline) {
    lastValue = await evaluate(client, expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for expression: ${expression}; last value: ${lastValue}`);
}

async function main() {
  const chrome = spawn(CHROME_BIN, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    PAGE_URL,
  ], { stdio: 'ignore' });

  let client = null;
  try {
    const target = await waitForTargets();
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `Boolean(document.querySelector('#comparisonWindowToggle'))`);
    await evaluate(client, `
      (() => {
        window.__comparisonFetchCalls = 0;
        window.__comparisonBarsUrls = [];
        const makeBars = (instrument, timeframe) => {
          const base = instrument === 'NQ' ? 29400 : 7400;
          const step = Number(timeframe) * 60;
          if (Number(timeframe) === 1) {
            return [
              { time: '2026-06-12 09:00', timestamp: 1781254800, tradingDay: '2026-06-12', open: base + 4, high: base + 18, low: base - 30, close: base + 8, volume: 1000 },
              { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: base + 8, high: base + 30, low: base - 15, close: base + 24, volume: 1200 },
              { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: base + 24, high: base + 45, low: base + 14, close: base + 35, volume: 1300 },
              { time: '2026-06-12 10:30', timestamp: 1781260200, tradingDay: '2026-06-12', open: base + 35, high: base + 52, low: base + 22, close: base + 48, volume: 1100 },
              { time: '2026-06-12 11:00', timestamp: 1781262000, tradingDay: '2026-06-12', open: base + 48, high: base + 60, low: base + 32, close: base + 40, volume: 900 },
            ];
          }
          return [
            { time: '2026-06-12 09:00', timestamp: 1781254800, tradingDay: '2026-06-12', open: base + 4.5, high: base + 24.75, low: base - 33.5, close: base - 17.0, volume: 169817 },
            { time: '2026-06-12 10:00', timestamp: 1781254800 + step, tradingDay: '2026-06-12', open: base - 16.75, high: base + 43.5, low: base - 19.75, close: base + 40.5, volume: 200251 },
            { time: '2026-06-12 11:00', timestamp: 1781254800 + step * 2, tradingDay: '2026-06-12', open: base + 40.75, high: base + 61.75, low: base + 30.25, close: base + 5.75, volume: 160953 },
          ];
        };
        const nativeFetch = window.fetch.bind(window);
        window.fetch = (...args) => {
          if (String(args[0]).includes('/v4/bars')) {
            const url = new URL(String(args[0]), window.location.href);
            const instrument = url.searchParams.get('instrument') || 'ES';
            const timeframe = Number(url.searchParams.get('tf') || 60);
            window.__comparisonFetchCalls += 1;
            window.__comparisonLastBarsUrl = String(args[0]);
            window.__comparisonBarsUrls.push(String(args[0]));
            const bars = makeBars(instrument, timeframe);
            return Promise.resolve(new Response(JSON.stringify({
              bars,
              requestedRange: { startTs: bars[0].timestamp, endTs: bars.at(-1).timestamp },
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }));
          }
          return nativeFetch(...args);
        };
        return true;
      })();
    `);

    const initial = await evaluate(client, `
      ({
        compareToggle: Boolean(document.querySelector('#comparisonWindowToggle')),
        splitToggle: Boolean(document.querySelector('#splitScreenToggle')),
        secondaryInstrument: Boolean(document.querySelector('#secondaryInstrumentSelect')),
        secondaryTimeframe: Boolean(document.querySelector('#secondaryTfSelect')),
        splitLayout: Boolean(document.querySelector('#splitLayoutSelect')),
        secondaryPanel: Boolean(document.querySelector('#secondary-chart-panel')),
      })
    `);
    assert.deepEqual(initial, {
      compareToggle: true,
      splitToggle: false,
      secondaryInstrument: false,
      secondaryTimeframe: false,
      splitLayout: false,
      secondaryPanel: false,
    }, 'Comparison window should remain available after old Split UI is removed');

    const shown = await evaluate(client, `
      (() => {
      document.querySelector('#comparisonWindowToggle').click();
      const root = document.querySelector('#comparison-window-root');
      const win = document.querySelector('#comparison-window');
      const instrument = document.querySelector('[data-comparison-instrument]');
      const timeframe = document.querySelector('[data-comparison-timeframe]');
      const overlaySync = document.querySelector('[data-comparison-overlay-sync]');
      const status = document.querySelector('[data-comparison-status]');
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        hidden: root.hidden,
        width: win.getBoundingClientRect().width,
        height: win.getBoundingClientRect().height,
        instrumentValue: instrument.value,
        timeframeValue: timeframe.value,
        overlaySyncValue: overlaySync.value,
        overlaySyncLabel: overlaySync.closest('label')?.querySelector('span')?.textContent,
        overlaySyncOptions: [...overlaySync.options].map((option) => ({ value: option.value, text: option.textContent })),
        statusText: status.textContent,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.equal(shown.hidden, false, 'Comparison window should be visible after toggle');
    assert.ok(shown.width >= 280, 'Comparison window should have stable width');
    assert.ok(shown.height >= 210, 'Comparison window should have stable height');
    assert.equal(shown.instrumentValue, 'ES', 'Comparison window should expose independent instrument control');
    assert.equal(shown.timeframeValue, '60', 'Comparison window should expose independent timeframe control');
    assert.equal(shown.overlaySyncValue, 'sync', 'Comparison drawings should default to Sync');
    assert.equal(shown.overlaySyncLabel, 'Drawings', 'Comparison drawing sync control should use user-facing Drawings label');
    assert.deepEqual(shown.overlaySyncOptions, [
      { value: 'sync', text: 'Sync' },
      { value: 'no-sync', text: 'No Sync' },
    ]);
    assert.match(shown.statusText, /Choose a main date range/, 'Comparison window should wait for main range before loading');

    const dragStart = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      const handle = document.querySelector('.comparison-window-left-handle').getBoundingClientRect();
      const canvas = document.querySelector('#comparison-chart-canvas').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        x: handle.left + handle.width / 2,
        y: handle.top + handle.height / 2,
        beforeLeft: before.left,
        beforeRight: before.right,
        beforeWidth: before.width,
        beforeTop: before.top,
        beforeCanvasWidth: canvas.width,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: dragStart.x,
      y: dragStart.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: dragStart.x + 80,
      y: dragStart.y,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: dragStart.x + 80,
      y: dragStart.y,
      button: 'left',
      clickCount: 1,
    });
    const moved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      const canvas = document.querySelector('#comparison-chart-canvas').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        beforeLeft: ${dragStart.beforeLeft},
        afterLeft: after.left,
        beforeRight: ${dragStart.beforeRight},
        afterRight: after.right,
        beforeWidth: ${dragStart.beforeWidth},
        afterWidth: after.width,
        beforeTop: ${dragStart.beforeTop},
        afterTop: after.top,
        beforeCanvasWidth: ${dragStart.beforeCanvasWidth},
        afterCanvasWidth: canvas.width,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.ok(moved.afterLeft > moved.beforeLeft, 'Sliding drag should move the left boundary right');
    assert.equal(Math.round(moved.afterRight), Math.round(moved.beforeRight), 'Sliding drag should keep the right boundary fixed');
    assert.ok(moved.afterWidth < moved.beforeWidth, 'Sliding drag should reduce the clipped visible width');
    assert.equal(Math.round(moved.afterTop), Math.round(moved.beforeTop), 'Sliding drag should not move window vertically');
    assert.ok(moved.afterCanvasWidth > moved.afterWidth, 'Sliding drag should keep internal canvas wider than clipped shell');
    assert.equal(Math.round(moved.afterCanvasWidth), Math.round(moved.beforeCanvasWidth), 'Sliding drag should not shrink internal chart canvas');
    assert.equal(moved.stackWidth, dragStart.stackWidth, 'Dragging window should not resize chart stack width');
    assert.equal(moved.stackHeight, dragStart.stackHeight, 'Dragging window should not resize chart stack height');
    assert.equal(moved.primaryWidth, dragStart.primaryWidth, 'Dragging window should not resize primary panel width');
    assert.equal(moved.primaryHeight, dragStart.primaryHeight, 'Dragging window should not resize primary panel height');

    const handleContextMenu = await evaluate(client, `
      (() => {
        const handle = document.querySelector('.comparison-window-left-handle');
        const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
        const dispatchResult = handle.dispatchEvent(event);
        return {
          dispatchResult,
          defaultPrevented: event.defaultPrevented,
          menuHidden: document.querySelector('#comparison-context-menu').hidden,
        };
      })();
    `);
    assert.equal(handleContextMenu.dispatchResult, false, 'Left handle contextmenu should be cancelled');
    assert.equal(handleContextMenu.defaultPrevented, true, 'Left handle contextmenu should prevent default');
    assert.equal(handleContextMenu.menuHidden, true, 'Left handle contextmenu should not open comparison menu');

    const stageDrag = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      return { x: before.left + before.width / 2, y: before.top + before.height / 2, beforeLeft: before.left, beforeTop: before.top };
      })();
    `);
    await client.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: stageDrag.x,
      y: stageDrag.y,
      button: 'left',
      clickCount: 1,
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: stageDrag.x + 90,
      y: stageDrag.y + 50,
      button: 'left',
      clickCount: 1,
    });
    const stageMoved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      return { beforeLeft: ${stageDrag.beforeLeft}, afterLeft: after.left, beforeTop: ${stageDrag.beforeTop}, afterTop: after.top };
      })();
    `);
    assert.equal(stageMoved.afterLeft, stageMoved.beforeLeft, 'Dragging inside chart stage should not move outer window');
    assert.equal(stageMoved.afterTop, stageMoved.beforeTop, 'Dragging inside chart stage should not move outer window vertically');
    const fetchCallsWithoutRange = await evaluate(client, `window.__comparisonFetchCalls`);
    assert.equal(fetchCallsWithoutRange, 0, 'Comparison window should not request bars before a main range exists');

    await evaluate(client, `
      (async () => {
        const store = await import('/src/data/bar-store.js');
        store.setBars([
          { time: '2026-06-12 09:30', timestamp: 1781256600, tradingDay: '2026-06-12', open: 29494.5, high: 29501, low: 29371, close: 29430.5, volume: 4223 },
          { time: '2026-06-12 10:00', timestamp: 1781258400, tradingDay: '2026-06-12', open: 29430.5, high: 29470, low: 29410, close: 29455.5, volume: 4123 },
          { time: '2026-06-12 10:30', timestamp: 1781260200, tradingDay: '2026-06-12', open: 29455.5, high: 29520, low: 29448, close: 29510.25, volume: 4023 },
        ], '2026-06-12 09:30', '2026-06-12 10:30', 1, { startTs: 1781256600, endTs: 1781260200 }, { instrument: 'NQ' });
        return true;
      })();
    `);
    await waitForExpression(client, `window.__comparisonFetchCalls === 2 && document.querySelector('[data-comparison-placeholder]').hidden`);
    const loaded = await evaluate(client, `
      (() => {
        return {
          fetchCalls: window.__comparisonFetchCalls,
          url: window.__comparisonLastBarsUrl,
          urls: window.__comparisonBarsUrls,
          info: document.querySelector('#comparison-chart-info').textContent,
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
          overlayStatus: document.querySelector('[data-comparison-overlay-status]').textContent,
        };
      })();
    `);
    assert.equal(loaded.fetchCalls, 2, 'Comparison window should request comparison bars and replay source bars after main range loads');
    assert.ok(loaded.urls.some((url) => /instrument=ES/.test(url) && /tf=60/.test(url)), 'Comparison window should request its own default timeframe');
    assert.ok(loaded.urls.some((url) => /instrument=ES/.test(url) && /tf=1/.test(url)), 'Comparison window should request 1M replay source for HTF progressive replay');
    assert.equal(loaded.info, 'ES 1H');
    assert.equal(loaded.placeholderHidden, true, 'Comparison placeholder should hide after data loads');
    assert.match(loaded.overlayStatus, /Time overlays ready/, 'Comparison overlay status should update after data loads');

    const canvasHealth = await evaluate(client, `
      (() => {
        const canvases = [...document.querySelectorAll('#comparison-chart-canvas canvas')];
        const colors = new Set();
        let paintedPixels = 0;
        for (const canvas of canvases) {
          const ctx = canvas.getContext('2d');
          if (!ctx || !canvas.width || !canvas.height) continue;
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < image.length; i += 4 * 16) {
            const alpha = image[i + 3];
            if (!alpha) continue;
            paintedPixels += 1;
            colors.add([image[i], image[i + 1], image[i + 2], alpha].join(','));
          }
        }
        return { canvasCount: canvases.length, paintedPixels, uniqueColors: colors.size };
      })();
    `);
    assert.ok(canvasHealth.canvasCount > 0, 'Comparison chart should create canvas elements');
    assert.ok(canvasHealth.paintedPixels > 0, 'Comparison canvas should contain painted pixels');
    assert.ok(canvasHealth.uniqueColors > 2, 'Comparison canvas should not be a blank single-color surface');

    const contextMenuResult = await evaluate(client, `
      (async () => {
        const { getComparisonChartContext } = await import('/src/chart/chart-context.js');
        const context = getComparisonChartContext();
        const chartEl = document.querySelector('#comparison-chart-canvas');
        const rect = chartEl.getBoundingClientRect();
        const bars = context.getDisplayBars();
        const first = bars[0];
        const last = bars[bars.length - 1];
        const openAt = (bar, price) => {
          const x = context.timeToCoordinate(bar.timestamp);
          const y = context.priceToCoordinate(price);
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + x,
            clientY: rect.top + y,
          }));
        };
        const openBlankAt = () => {
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.right + 120,
            clientY: rect.top + rect.height / 2,
          }));
        };

        openBlankAt();
        const blankMenu = document.querySelector('#comparison-context-menu');
        const blankMenuRect = blankMenu.getBoundingClientRect();
        const chartRect = chartEl.getBoundingClientRect();
        const blankMenuTopElement = document.elementFromPoint(
          blankMenuRect.left + 10,
          blankMenuRect.top + 10
        );
        const blankMenuReachable = Boolean(blankMenuTopElement?.closest('#comparison-context-menu'));
        const blankMenuConstrained = blankMenu.classList.contains('is-scroll-constrained');
        const blankMenuFitsVertically = blankMenuRect.bottom <= chartRect.bottom + 1;
        const blankObDisabled = document
          .querySelector('[data-comparison-action="comparison-pda-ob-last-bar"]')
          ?.hasAttribute('disabled');

        openAt(first, first.low);
        document.querySelector('[data-comparison-action="comparison-pda-bsl"]').click();
        await new Promise((resolve) => setTimeout(resolve, 350));

        openAt(bars[1], bars[1].close);
        document.querySelector('[data-comparison-action="comparison-pda-fvg"]').click();
        await new Promise((resolve) => setTimeout(resolve, 350));

        openAt(first, first.low);
        document.querySelector('[data-comparison-action="comparison-segment-start-low"]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));

        openAt(last, last.high);
        document.querySelector('[data-comparison-action="comparison-segment-finish-high"]').click();
        await new Promise((resolve) => setTimeout(resolve, 600));

        const orderActive = await import('/src/order/order-review-active.js');
        orderActive.createChartReviewSet({
          bar: first,
          price: first.close,
          timeframe: '1H',
        });
        openAt(bars[1], bars[1].close);
        const evidenceSubmenu = document
          .querySelector('#comparison-context-menu .pda-menu-submenu-trigger')
          ?.closest('.pda-menu-submenu');
        evidenceSubmenu?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        evidenceSubmenu?.querySelector('.pda-menu-submenu-trigger')?.focus();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const evidencePanel = evidenceSubmenu?.querySelector('.pda-submenu-panel');
        const evidencePanelRect = evidencePanel?.getBoundingClientRect();
        const evidencePanelTopElement = evidencePanelRect
          ? document.elementFromPoint(evidencePanelRect.left + 10, evidencePanelRect.top + 10)
          : null;
        const evidencePanelVisible = Boolean(
          evidenceSubmenu?.classList.contains('is-open') &&
            evidencePanelRect?.width > 0 &&
            evidencePanelRect?.height > 0 &&
            evidencePanelTopElement?.closest('.pda-submenu-panel') === evidencePanel
        );
        document.querySelector('[data-comparison-action="comparison-order-add-bar-evidence"]').click();
        await new Promise((resolve) => setTimeout(resolve, 150));

        const pdaStore = await import('/src/pda/pda-store.js');
        const segmentStore = await import('/src/segment/segment-store.js');
        const annotations = pdaStore.getAnnotations();
        const segments = segmentStore.getSegments();
        const comparisonPda = annotations.find((annotation) => annotation.sourceChartId === 'comparison-window');
        const comparisonFvg = annotations.find((annotation) => annotation.sourceChartId === 'comparison-window' && annotation.type === 'fvg');
        const comparisonSegment = segments.find((segment) => segment.sourceChartId === 'comparison-window');
        const activeSetup = orderActive.getActiveReviewSet();
        const comparisonEvidence = activeSetup.orderReview.setupThesis.manualEvents.find((event) => event.sourceChartId === 'comparison-window');
        const pdaHitTest = await import('/src/pda/pda-hit-test.js');
        const segmentHitTest = await import('/src/segment/segment-hit-test.js');
        const chartContexts = await import('/src/chart/chart-context.js');
        const primaryContext = chartContexts.getPrimaryChartContext();
        const comparisonContext = chartContexts.getComparisonChartContext();
        const pdaHitX = comparisonContext.timeToCoordinate(first.timestamp);
        const pdaHitY = comparisonContext.priceToCoordinate(first.high);
        const primaryPdaHitX = primaryContext.timeToCoordinate(first.timestamp);
        const primaryPdaHitY = primaryContext.priceToCoordinate(first.high);
        const comparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: pdaHitX,
          y: pdaHitY,
          context: comparisonContext,
        });
        const primaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryPdaHitX,
          y: primaryPdaHitY,
          context: primaryContext,
        });
        const segmentHitX = comparisonContext.timeToCoordinate(last.timestamp);
        const segmentHitY = comparisonContext.priceToCoordinate(last.high);
        const primarySegmentHitX = primaryContext.timeToCoordinate(last.timestamp);
        const primarySegmentHitY = primaryContext.priceToCoordinate(last.high);
        const comparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: segmentHitX,
          y: segmentHitY,
          context: comparisonContext,
        });
        const primarySegmentHit = segmentHitTest.hitTestSegments({
          x: primarySegmentHitX,
          y: primarySegmentHitY,
          context: primaryContext,
        });
        return {
          menuExists: Boolean(document.querySelector('#comparison-context-menu')),
          menuReachable: blankMenuReachable,
          menuConstrained: blankMenuConstrained,
          menuFitsVertically: blankMenuFitsVertically,
          menuGeometry: {
            menuTop: blankMenuRect.top,
            menuBottom: blankMenuRect.bottom,
            menuHeight: blankMenuRect.height,
            chartTop: chartRect.top,
            chartBottom: chartRect.bottom,
            chartHeight: chartRect.height,
            maxHeight: getComputedStyle(blankMenu).maxHeight,
            overflowY: getComputedStyle(blankMenu).overflowY,
          },
          blankObDisabled,
          evidencePanelVisible,
          sourceIsolation: {
            comparisonPdaHit: Boolean(comparisonPda && comparisonPdaHit?.id === comparisonPda.id),
            primaryPdaHit: Boolean(comparisonPda && primaryPdaHit?.id === comparisonPda.id),
            comparisonSegmentHit: Boolean(comparisonSegment && comparisonSegmentHit?.id === comparisonSegment.id),
            primarySegmentHit: Boolean(comparisonSegment && primarySegmentHit?.id === comparisonSegment.id),
          },
          comparisonPda: comparisonPda ? {
            type: comparisonPda.type,
            sourceChartId: comparisonPda.sourceChartId,
            sourceChartLabel: comparisonPda.sourceChartLabel,
            sourceInstrument: comparisonPda.sourceInstrument,
            sourceTimeframe: comparisonPda.sourceTimeframe,
            sourceContext: comparisonPda.sourceContext,
          } : null,
          comparisonFvg: comparisonFvg ? {
            type: comparisonFvg.type,
            direction: comparisonFvg.direction,
            sourceChartId: comparisonFvg.sourceChartId,
            sourceInstrument: comparisonFvg.sourceInstrument,
            sourceTimeframe: comparisonFvg.sourceTimeframe,
            sourceContext: comparisonFvg.sourceContext,
          } : null,
          comparisonSegment: comparisonSegment ? {
            sourceChartId: comparisonSegment.sourceChartId,
            sourceChartLabel: comparisonSegment.sourceChartLabel,
            sourceInstrument: comparisonSegment.sourceInstrument,
            sourceTimeframe: comparisonSegment.sourceTimeframe,
            sourceContext: comparisonSegment.sourceContext,
            direction: comparisonSegment.direction,
          } : null,
          comparisonEvidence: comparisonEvidence ? {
            sourceChartId: comparisonEvidence.sourceChartId,
            sourceChartLabel: comparisonEvidence.sourceChartLabel,
            sourceInstrument: comparisonEvidence.sourceInstrument,
            sourceTimeframe: comparisonEvidence.sourceTimeframe,
            sourceTimeframeLabel: comparisonEvidence.sourceTimeframeLabel,
            sourceContext: comparisonEvidence.sourceContext,
          } : null,
        };
      })();
    `);
    assert.equal(contextMenuResult.menuExists, true, 'Comparison context menu should exist');
    assert.equal(contextMenuResult.menuReachable, true, 'Comparison context menu should render above the chart canvas');
    assert.equal(contextMenuResult.menuConstrained, true, 'Comparison context menu should become scroll constrained in a compact window');
    assert.equal(
      contextMenuResult.menuFitsVertically,
      true,
      `Comparison context menu should stay inside the chart viewport: ${JSON.stringify(contextMenuResult.menuGeometry)}`
    );
    assert.equal(contextMenuResult.blankObDisabled, true, 'Comparison OB Last Bar should be disabled without a comparison bar');
    assert.equal(contextMenuResult.evidencePanelVisible, true, 'Comparison Order Setup Evidence submenu should open');
    assert.deepEqual(contextMenuResult.sourceIsolation, {
      comparisonPdaHit: false,
      primaryPdaHit: false,
      comparisonSegmentHit: false,
      primarySegmentHit: false,
    }, 'Mismatch comparison-source PDA/Segment should not hit either chart context');
    assert.equal(contextMenuResult.comparisonPda, null, 'Mismatch comparison PDA creation should be blocked');
    assert.equal(contextMenuResult.comparisonFvg, null, 'Mismatch comparison FVG creation should be blocked');
    assert.equal(contextMenuResult.comparisonSegment, null, 'Mismatch comparison Segment creation should be blocked');
    assert.deepEqual(contextMenuResult.comparisonEvidence, {
      sourceChartId: 'comparison-window',
      sourceChartLabel: 'Comparison',
      sourceInstrument: 'ES',
      sourceTimeframe: 60,
      sourceTimeframeLabel: '1H',
      sourceContext: 'ES 1H',
    });

    const syncedHitResult = await evaluate(client, `
      (async () => {
        const comparisonStore = await import('/src/comparison/comparison-window-store.js');
        const pdaStore = await import('/src/pda/pda-store.js');
        const segmentStore = await import('/src/segment/segment-store.js');
        const orderStore = await import('/src/order/order-review-store.js');
        const liveStore = await import('/src/live-record/live-record-store.js');
        const pdaHitTest = await import('/src/pda/pda-hit-test.js');
        const segmentHitTest = await import('/src/segment/segment-hit-test.js');
        const orderHitTest = await import('/src/order/order-setup-hit-test.js');
        const liveHitTest = await import('/src/live-record/live-record-hit-test.js');
        const pdaSelection = await import('/src/pda/pda-selection.js');
        const segmentSelection = await import('/src/segment/segment-selection.js');
        const chartContexts = await import('/src/chart/chart-context.js');
        const primaryContext = chartContexts.getPrimaryChartContext();
        const primaryBars = primaryContext.getDisplayBars();
        const first = primaryBars[0];
        const last = primaryBars[primaryBars.length - 1];
        comparisonStore.setComparisonInstrument('NQ');
        comparisonStore.setComparisonTimeframe(1);
        comparisonStore.setComparisonOverlaySyncMode('sync');
        comparisonStore.setComparisonBars(primaryBars, {
          startTs: first.timestamp,
          endTs: last.timestamp,
        }, {
          start: '2026-06-12 09:30',
          end: '2026-06-12 10:30',
        });
        await new Promise((resolve) => setTimeout(resolve, 350));
        const comparisonContext = chartContexts.getComparisonChartContext();
        pdaStore.addAnnotation({
          id: 'sync-primary-pda',
          source: 'manual',
          type: 'bsl',
          sourceChartId: 'primary',
          sourceChartLabel: 'Main',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          sourceContext: 'NQ 1M',
          timestamp: first.timestamp,
          canonicalTimestamp: first.timestamp,
          anchorTime: first.timestamp,
          price: first.high,
          display: { showLabel: true },
        });
        pdaStore.addAnnotation({
          id: 'sync-comparison-pda',
          source: 'manual',
          type: 'ssl',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Comparison',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          sourceContext: 'NQ 1M',
          timestamp: first.timestamp,
          canonicalTimestamp: first.timestamp,
          anchorTime: first.timestamp,
          price: first.low,
          display: { showLabel: true },
        });
        segmentStore.addSegment({
          id: 'sync-primary-segment',
          source: 'manual',
          sourceChartId: 'primary',
          sourceChartLabel: 'Main',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          timeframe: 1,
          sourceContext: 'NQ 1M',
          direction: 'up',
          start: { timestamp: first.timestamp, time: first.timestamp, price: first.low },
          end: { timestamp: last.timestamp, time: last.timestamp, price: last.high },
          display: {},
        });
        segmentStore.addSegment({
          id: 'sync-comparison-segment',
          source: 'manual',
          sourceChartId: 'comparison-window',
          sourceChartLabel: 'Comparison',
          sourceInstrument: 'NQ',
          sourceTimeframe: 1,
          timeframe: 1,
          sourceContext: 'NQ 1M',
          direction: 'down',
          start: { timestamp: first.timestamp, time: first.timestamp, price: first.high },
          end: { timestamp: last.timestamp, time: last.timestamp, price: last.low },
          display: {},
        });
        orderStore.addOrderReview({
          id: 'sync-primary-order',
          instrument: 'NQ',
          setupThesis: {
            primaryEventTimestamp: first.timestamp,
            primaryEventTimeframe: '1M',
            primaryEventPrice: first.low,
          },
          entryPlan: {
            direction: 'long',
            entryTimestamp: first.timestamp,
            entryTimeframe: '1M',
            entryPrice: first.close,
            stopLossTimestamp: first.timestamp,
            stopLossTimeframe: '1M',
            stopLoss: first.low,
            targets: [],
          },
          display: {
            elementVisibility: {
              entry: true,
              stopLoss: true,
            },
          },
        });
        liveStore.addLiveRecord({
          id: 'sync-primary-live',
          instrument: 'NQ',
          status: 'closed',
          direction: 'long',
          anchor: {
            timestamp: first.timestamp,
            timeframe: '1M',
            price: first.low,
          },
          execution: {
            entry: {
              role: 'entry',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.open,
              complete: true,
            },
            stopLoss: {
              role: 'stopLoss',
              timestamp: first.timestamp,
              timeframe: '1M',
              price: first.low,
              complete: true,
            },
            targets: [],
          },
          result: {
            exitType: 'unknown',
          },
        });
        await new Promise((resolve) => setTimeout(resolve, 350));

        const comparisonPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.high),
          context: comparisonContext,
        });
        const primaryComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(first.timestamp),
          y: primaryContext.priceToCoordinate(first.low),
          context: primaryContext,
        });
        const comparisonPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(last.timestamp),
          y: comparisonContext.priceToCoordinate(last.high),
          context: comparisonContext,
        });
        const primaryComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(last.timestamp),
          y: primaryContext.priceToCoordinate(last.low),
          context: primaryContext,
        });
        const comparisonOrderHit = orderHitTest.hitTestOrderSetupElements({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.close),
          context: comparisonContext,
        }).primaryHit;
        const comparisonLiveHit = liveHitTest.hitTestLiveRecordElements({
          x: comparisonContext.timeToCoordinate(first.timestamp),
          y: comparisonContext.priceToCoordinate(first.open),
          context: comparisonContext,
        }).primaryHit;
        const pdaCountBeforeDelete = pdaStore.getAnnotations()
          .filter((annotation) => annotation.id === 'sync-primary-pda')
          .length;
        pdaSelection.selectPda(comparisonPrimaryPdaHit?.id);
        const selectedPdaAfterComparisonHit = pdaSelection.getSelectedPda();
        pdaStore.updateAnnotation(comparisonPrimaryPdaHit?.id, { note: 'edited from comparison sync hit' });
        const editedPda = pdaStore.getAnnotationById('sync-primary-pda');
        pdaStore.deleteAnnotation('sync-primary-pda');
        const pdaCountAfterDelete = pdaStore.getAnnotations()
          .filter((annotation) => annotation.id === 'sync-primary-pda')
          .length;

        const segmentCountBeforeDelete = segmentStore.getSegments()
          .filter((segment) => segment.id === 'sync-primary-segment')
          .length;
        segmentSelection.selectSegment(comparisonPrimarySegmentHit?.id);
        const selectedSegmentAfterComparisonHit = segmentSelection.getSelectedSegment();
        segmentStore.updateSegment(comparisonPrimarySegmentHit?.id, { narrative: 'edited from comparison sync hit' });
        const editedSegment = segmentStore.getSegmentById('sync-primary-segment');
        segmentStore.deleteSegment('sync-primary-segment');
        const segmentCountAfterDelete = segmentStore.getSegments()
          .filter((segment) => segment.id === 'sync-primary-segment')
          .length;
        const result = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          comparisonPrimaryPdaHit: comparisonPrimaryPdaHit?.id,
          primaryComparisonPdaHit: primaryComparisonPdaHit?.id,
          comparisonPrimarySegmentHit: comparisonPrimarySegmentHit?.id,
          primaryComparisonSegmentHit: primaryComparisonSegmentHit?.id,
          comparisonOrderHit: comparisonOrderHit ? {
            setupId: comparisonOrderHit.setupId,
            element: comparisonOrderHit.element,
          } : null,
          comparisonLiveHit: comparisonLiveHit ? {
            liveRecordId: comparisonLiveHit.liveRecordId,
            element: comparisonLiveHit.element,
          } : null,
          originalRouting: {
            selectedPdaId: selectedPdaAfterComparisonHit?.id,
            editedPdaNote: editedPda?.note,
            pdaCountBeforeDelete,
            pdaCountAfterDelete,
            selectedSegmentId: selectedSegmentAfterComparisonHit?.id,
            editedSegmentNarrative: editedSegment?.narrative,
            segmentCountBeforeDelete,
            segmentCountAfterDelete,
          },
        };
        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        await new Promise((resolve) => setTimeout(resolve, 100));
        result.noSyncIsolation = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          primaryComparisonPdaHit: pdaHitTest.hitTestPdaAnnotations({
            x: primaryContext.timeToCoordinate(first.timestamp),
            y: primaryContext.priceToCoordinate(first.low),
            context: primaryContext,
          })?.id || null,
          primaryComparisonSegmentHit: segmentHitTest.hitTestSegments({
            x: primaryContext.timeToCoordinate(last.timestamp),
            y: primaryContext.priceToCoordinate(last.low),
            context: primaryContext,
          })?.id || null,
        };

        const chartEl = document.querySelector('#comparison-chart-canvas');
        const openComparisonAt = (bar, price) => {
          const rect = chartEl.getBoundingClientRect();
          chartEl.dispatchEvent(new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: rect.left + comparisonContext.timeToCoordinate(bar.timestamp),
            clientY: rect.top + comparisonContext.priceToCoordinate(price),
          }));
        };

        const second = primaryBars[1];
        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        await new Promise((resolve) => setTimeout(resolve, 100));
        openComparisonAt(second, second.high);
        document.querySelector('[data-comparison-action="comparison-pda-bsl"]').click();
        await new Promise((resolve) => setTimeout(resolve, 600));

        openComparisonAt(first, first.low);
        document.querySelector('[data-comparison-action="comparison-segment-start-low"]').click();
        await new Promise((resolve) => setTimeout(resolve, 100));
        openComparisonAt(last, last.high);
        document.querySelector('[data-comparison-action="comparison-segment-finish-high"]').click();
        await new Promise((resolve) => setTimeout(resolve, 450));

        const autoPda = pdaStore.getAnnotations()
          .filter((annotation) =>
            annotation.sourceChartId === 'comparison-window' &&
            annotation.type === 'bsl'
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
        const autoSegment = segmentStore.getSegments()
          .filter((segment) =>
            segment.sourceChartId === 'comparison-window' &&
            segment.direction === 'up'
          )
          .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
        const normalizeAutoHit = (id, expectedId) => id && expectedId && id === expectedId ? 'auto' : id || null;
        const autoPdaTimestamp = autoPda?.canonicalTimestamp ?? autoPda?.timestamp ?? second.timestamp;
        const autoPdaPrice = autoPda?.price ?? second.high;
        const autoSegmentTimestamp = autoSegment?.end?.timestamp ?? last.timestamp;
        const autoSegmentPrice = autoSegment?.end?.price ?? last.high;
        const autoComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(autoPdaTimestamp),
          y: comparisonContext.priceToCoordinate(autoPdaPrice),
          context: comparisonContext,
        });
        const autoPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(autoPdaTimestamp),
          y: primaryContext.priceToCoordinate(autoPdaPrice),
          context: primaryContext,
        });
        const autoComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(autoSegmentTimestamp),
          y: comparisonContext.priceToCoordinate(autoSegmentPrice),
          context: comparisonContext,
        });
        const autoPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(autoSegmentTimestamp),
          y: primaryContext.priceToCoordinate(autoSegmentPrice),
          context: primaryContext,
        });
        result.autoSyncCreation = {
          modeAfterCreate: comparisonStore.getComparisonWindowState().descriptor.overlaySyncMode,
          comparisonPdaHit: normalizeAutoHit(autoComparisonPdaHit?.id, autoPda?.id),
          primaryPdaHit: normalizeAutoHit(autoPrimaryPdaHit?.id, autoPda?.id),
          comparisonSegmentHit: normalizeAutoHit(autoComparisonSegmentHit?.id, autoSegment?.id),
          primarySegmentHit: normalizeAutoHit(autoPrimarySegmentHit?.id, autoSegment?.id),
          autoPdaId: autoPda?.id ? 'auto' : null,
          autoSegmentId: autoSegment?.id ? 'auto' : null,
        };

        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        await new Promise((resolve) => setTimeout(resolve, 100));
        const autoNoSyncComparisonPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: comparisonContext.timeToCoordinate(autoPdaTimestamp),
          y: comparisonContext.priceToCoordinate(autoPdaPrice),
          context: comparisonContext,
        });
        const autoNoSyncPrimaryPdaHit = pdaHitTest.hitTestPdaAnnotations({
          x: primaryContext.timeToCoordinate(autoPdaTimestamp),
          y: primaryContext.priceToCoordinate(autoPdaPrice),
          context: primaryContext,
        });
        const autoNoSyncComparisonSegmentHit = segmentHitTest.hitTestSegments({
          x: comparisonContext.timeToCoordinate(autoSegmentTimestamp),
          y: comparisonContext.priceToCoordinate(autoSegmentPrice),
          context: comparisonContext,
        });
        const autoNoSyncPrimarySegmentHit = segmentHitTest.hitTestSegments({
          x: primaryContext.timeToCoordinate(autoSegmentTimestamp),
          y: primaryContext.priceToCoordinate(autoSegmentPrice),
          context: primaryContext,
        });
        result.autoSyncCreation.afterNoSync = {
          mode: comparisonStore.getComparisonWindowState().descriptor.overlaySyncMode,
          comparisonPdaHit: normalizeAutoHit(autoNoSyncComparisonPdaHit?.id, autoPda?.id),
          primaryPdaHit: normalizeAutoHit(autoNoSyncPrimaryPdaHit?.id, autoPda?.id),
          comparisonSegmentHit: normalizeAutoHit(autoNoSyncComparisonSegmentHit?.id, autoSegment?.id),
          primarySegmentHit: normalizeAutoHit(autoNoSyncPrimarySegmentHit?.id, autoSegment?.id),
        };

        const esBars = primaryBars.map((bar, index) => ({
          ...bar,
          open: 7400 + index * 8,
          high: 7424 + index * 8,
          low: 7388 + index * 8,
          close: 7412 + index * 8,
        }));
        comparisonStore.setComparisonOverlaySyncMode('no-sync');
        comparisonStore.setComparisonInstrument('ES');
        comparisonStore.setComparisonTimeframe(60);
        comparisonStore.setComparisonBars(esBars, {
          startTs: first.timestamp,
          endTs: last.timestamp,
        }, {
          start: '2026-06-12 09:30',
          end: '2026-06-12 10:30',
        });
        return result;
      })();
    `);
    assert.deepEqual(syncedHitResult, {
      policySafe: true,
      comparisonPrimaryPdaHit: 'sync-primary-pda',
      primaryComparisonPdaHit: 'sync-comparison-pda',
      comparisonPrimarySegmentHit: 'sync-primary-segment',
      primaryComparisonSegmentHit: 'sync-comparison-segment',
      comparisonOrderHit: {
        setupId: 'sync-primary-order',
        element: 'entry',
      },
      comparisonLiveHit: {
        liveRecordId: 'sync-primary-live',
        element: 'entry',
      },
      originalRouting: {
        selectedPdaId: 'sync-primary-pda',
        editedPdaNote: 'edited from comparison sync hit',
        pdaCountBeforeDelete: 1,
        pdaCountAfterDelete: 0,
        selectedSegmentId: 'sync-primary-segment',
        editedSegmentNarrative: 'edited from comparison sync hit',
        segmentCountBeforeDelete: 1,
        segmentCountAfterDelete: 0,
      },
      noSyncIsolation: {
        policySafe: false,
        primaryComparisonPdaHit: 'sync-comparison-pda',
        primaryComparisonSegmentHit: 'sync-comparison-segment',
      },
      autoSyncCreation: {
        modeAfterCreate: 'sync',
        comparisonPdaHit: 'auto',
        primaryPdaHit: 'auto',
        comparisonSegmentHit: 'auto',
        primarySegmentHit: 'auto',
        autoPdaId: 'auto',
        autoSegmentId: 'auto',
        afterNoSync: {
          mode: 'no-sync',
          comparisonPdaHit: null,
          primaryPdaHit: 'auto',
          comparisonSegmentHit: null,
          primarySegmentHit: 'auto',
        },
      },
    }, 'Sync safe mode should make Main/Comparison overlays hit-test on both chart contexts');

    const replayProgressive = await evaluate(client, `
      (async () => {
        const bus = await import('/src/event-bus.js');
        bus.emit('replay:changed', { enabled: true, cursorTimestamp: 1781256600 });
        await new Promise((resolve) => setTimeout(resolve, 250));
        const chart = await import('/src/chart/comparison-chart-manager.js');
        return {
          info: document.querySelector('#comparison-chart-info').textContent,
          chartReady: Boolean(chart.getComparisonChart() && chart.getComparisonSeries()),
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
          replaySourceRequested: window.__comparisonBarsUrls.some((url) => /instrument=ES/.test(url) && /tf=1/.test(url)),
        };
      })();
    `);
    assert.deepEqual(replayProgressive, {
      info: 'ES 1H',
      chartReady: true,
      placeholderHidden: true,
      replaySourceRequested: true,
    }, 'Replay progressive HTF path should keep the comparison chart rendered from 1M source data');

    const smtResult = await evaluate(client, `
      (async () => {
        const smtStore = await import('/src/smt/smt-store.js');
        const smtSelection = await import('/src/smt/smt-selection.js');
        const chart = await import('/src/chart/chart-manager.js');
        const record = smtStore.addSmtRecord({
          type: smtStore.SMT_TYPES.LIQUIDITY,
          direction: smtStore.SMT_DIRECTIONS.BEARISH,
          timeframe: '1H',
          primaryInstrument: 'NQ',
          compareInstrument: 'ES',
          compareChartId: 'comparison-window',
          compareChartLabel: 'Comparison Window',
          leftTimestamp: 1781254800,
          rightTimestamp: 1781258400,
          primaryLeftPrice: 29501,
          primaryRightPrice: 29470,
          compareLeftPrice: 7424.75,
          compareRightPrice: 7443.5,
        });
        smtSelection.selectSmt(record.id, { chartId: 'comparison-window' });
        await new Promise((resolve) => setTimeout(resolve, 250));
        const selectedBeforeLocate = smtSelection.getSelectedSmt();
        const locateButton = document.querySelector('[data-inspector-action="smt-locate"][data-smt-id="' + record.id + '"]');
        const beforeRange = chart.getVisibleLogicalRange();
        locateButton?.click();
        await new Promise((resolve) => setTimeout(resolve, 250));
        const afterRange = chart.getVisibleLogicalRange();
        return {
          selected: selectedBeforeLocate,
          locateButtonExists: Boolean(locateButton),
          inspectorText: document.querySelector('#inspector-sidebar')?.textContent || '',
          beforeRange,
          afterRange,
        };
      })();
    `);
    assert.equal(smtResult.selected?.id.startsWith('smt_liquidity_'), true, 'SMT selection should store comparison SMT id');
    assert.equal(smtResult.selected?.chartId, 'comparison-window', 'SMT selection should preserve comparison chart id');
    assert.equal(smtResult.locateButtonExists, true, 'SMT inspector should expose locate action');
    assert.match(smtResult.inspectorText, /Bearish Liquidity SMT/, 'Inspector should render selected SMT');
    assert.ok(smtResult.afterRange, 'SMT locate should leave primary chart with a visible range');

    const sameInstrumentCrossTimeframe = await evaluate(client, `
      (async () => {
        const instrumentSelect = document.querySelector('[data-comparison-instrument]');
        const timeframeSelect = document.querySelector('[data-comparison-timeframe]');
        instrumentSelect.value = 'NQ';
        instrumentSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 250));
        timeframeSelect.value = '15';
        timeframeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          info: document.querySelector('#comparison-chart-info').textContent,
          urls: window.__comparisonBarsUrls,
          placeholderHidden: document.querySelector('[data-comparison-placeholder]').hidden,
        };
      })();
    `);
    assert.equal(sameInstrumentCrossTimeframe.info, 'NQ 15M');
    assert.equal(sameInstrumentCrossTimeframe.placeholderHidden, true, 'Same-instrument cross-timeframe load should render data');
    assert.ok(
      sameInstrumentCrossTimeframe.urls.some((url) => /instrument=NQ/.test(url) && /tf=15/.test(url)),
      'Comparison window should request same-instrument cross-timeframe bars'
    );
    assert.ok(
      sameInstrumentCrossTimeframe.urls.some((url) => /instrument=NQ/.test(url) && /tf=1/.test(url)),
      'Comparison window should request same-instrument 1M source for HTF replay'
    );

    const reset = await evaluate(client, `
      (() => {
      document.querySelector('[data-comparison-reset]').click();
      const win = document.querySelector('#comparison-window');
      return {
        left: win.style.left,
        right: win.style.right,
        top: win.style.top,
        width: win.style.width,
        height: win.style.height,
        layoutMode: win.dataset.layoutMode,
      };
      })();
    `);
    assert.deepEqual(reset, {
      left: '34%',
      right: '0px',
      top: '0%',
      width: 'auto',
      height: '100%',
      layoutMode: 'sliding',
    });

    const closed = await evaluate(client, `
      (() => {
      document.querySelector('[data-comparison-close]').click();
      return { hidden: document.querySelector('#comparison-window-root').hidden, checked: document.querySelector('#comparisonWindowToggle').checked };
      })();
    `);
    assert.deepEqual(closed, { hidden: true, checked: false });
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
  }
}

main().then(
  () => console.log('comparison-window-browser-smoke passed'),
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
