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

    const initial = await evaluate(client, `Boolean(document.querySelector('#comparisonWindowToggle'))`);
    assert.equal(initial, true, 'Compare toolbar toggle should exist');

    const shown = await evaluate(client, `
      (() => {
      document.querySelector('#comparisonWindowToggle').click();
      const root = document.querySelector('#comparison-window-root');
      const win = document.querySelector('#comparison-window');
      const instrument = document.querySelector('[data-comparison-instrument]');
      const timeframe = document.querySelector('[data-comparison-timeframe]');
      const status = document.querySelector('[data-comparison-status]');
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        hidden: root.hidden,
        width: win.getBoundingClientRect().width,
        height: win.getBoundingClientRect().height,
        instrumentValue: instrument.value,
        timeframeValue: timeframe.value,
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
    assert.match(shown.statusText, /Choose a main date range/, 'Comparison window should wait for main range before loading');

    const dragStart = await evaluate(client, `
      (() => {
      const before = document.querySelector('#comparison-window').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        x: before.left + 20,
        y: before.top + 12,
        beforeLeft: before.left,
        beforeTop: before.top,
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
      y: dragStart.y + 40,
      button: 'left',
    });
    await client.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: dragStart.x + 80,
      y: dragStart.y + 40,
      button: 'left',
      clickCount: 1,
    });
    const moved = await evaluate(client, `
      (() => {
      const after = document.querySelector('#comparison-window').getBoundingClientRect();
      const stack = document.querySelector('#chart-stack').getBoundingClientRect();
      const primary = document.querySelector('#primary-chart-panel').getBoundingClientRect();
      return {
        beforeLeft: ${dragStart.beforeLeft},
        afterLeft: after.left,
        beforeTop: ${dragStart.beforeTop},
        afterTop: after.top,
        stackWidth: stack.width,
        stackHeight: stack.height,
        primaryWidth: primary.width,
        primaryHeight: primary.height,
      };
      })();
    `);
    assert.ok(moved.afterLeft > moved.beforeLeft, 'Drag should move window horizontally');
    assert.ok(moved.afterTop > moved.beforeTop, 'Drag should move window vertically');
    assert.equal(moved.stackWidth, dragStart.stackWidth, 'Dragging window should not resize chart stack width');
    assert.equal(moved.stackHeight, dragStart.stackHeight, 'Dragging window should not resize chart stack height');
    assert.equal(moved.primaryWidth, dragStart.primaryWidth, 'Dragging window should not resize primary panel width');
    assert.equal(moved.primaryHeight, dragStart.primaryHeight, 'Dragging window should not resize primary panel height');

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
            comparisonPdaHit: comparisonPdaHit?.id === comparisonPda?.id,
            primaryPdaHit: primaryPdaHit?.id === comparisonPda?.id,
            comparisonSegmentHit: comparisonSegmentHit?.id === comparisonSegment?.id,
            primarySegmentHit: primarySegmentHit?.id === comparisonSegment?.id,
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
      comparisonPdaHit: true,
      primaryPdaHit: false,
      comparisonSegmentHit: true,
      primarySegmentHit: false,
    }, 'Comparison-source PDA/Segment should hit only in the comparison chart context');
    assert.deepEqual(contextMenuResult.comparisonPda, {
      type: 'bsl',
      sourceChartId: 'comparison-window',
      sourceChartLabel: 'Comparison',
      sourceInstrument: 'ES',
      sourceTimeframe: 60,
      sourceContext: 'ES 1H',
    });
    assert.deepEqual(contextMenuResult.comparisonFvg, {
      type: 'fvg',
      direction: 'bullish',
      sourceChartId: 'comparison-window',
      sourceInstrument: 'ES',
      sourceTimeframe: 60,
      sourceContext: 'ES 1H',
    });
    assert.deepEqual(contextMenuResult.comparisonSegment, {
      sourceChartId: 'comparison-window',
      sourceChartLabel: 'Comparison',
      sourceInstrument: 'ES',
      sourceTimeframe: 60,
      sourceContext: 'ES 1H',
      direction: 'up',
    });
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
        const pdaHitTest = await import('/src/pda/pda-hit-test.js');
        const segmentHitTest = await import('/src/segment/segment-hit-test.js');
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
        const result = {
          policySafe: (await import('/src/comparison/comparison-overlay-policy.js')).getComparisonOverlaySyncPolicy().safe,
          comparisonPrimaryPdaHit: comparisonPrimaryPdaHit?.id,
          primaryComparisonPdaHit: primaryComparisonPdaHit?.id,
          comparisonPrimarySegmentHit: comparisonPrimarySegmentHit?.id,
          primaryComparisonSegmentHit: primaryComparisonSegmentHit?.id,
        };
        const esBars = primaryBars.map((bar, index) => ({
          ...bar,
          open: 7400 + index * 8,
          high: 7424 + index * 8,
          low: 7388 + index * 8,
          close: 7412 + index * 8,
        }));
        comparisonStore.setComparisonOverlaySyncMode('local');
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
    }, 'Sync safe mode should make Main/Comparison PDA and Segment hit-test on both chart contexts');

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
      return { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height };
      })();
    `);
    assert.deepEqual(reset, { left: '18%', top: '10%', width: '48%', height: '46%' });

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
