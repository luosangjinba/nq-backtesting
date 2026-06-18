import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import http from 'node:http';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9348);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-primitive-render-lifecycle-${process.pid}`;

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
    req.setTimeout(500, () => {
      req.destroy(new Error('timeout'));
    });
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
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const expression = `
      (async () => {
        const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        const waitFor = async (predicate, label) => {
          const deadline = Date.now() + 5_000;
          while (Date.now() < deadline) {
            const value = predicate();
            if (value) return value;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          throw new Error('Timed out waiting for ' + label);
        };
        try {
          const chart = await import('/src/chart/chart-manager.js');
          const store = await import('/src/data/bar-store.js');
          const segments = await import('/src/segment/segment-store.js');
          const pdaStore = await import('/src/pda/pda-store.js');
          await waitFor(() => document.querySelector('#chart canvas') && chart.getSeries(), 'primary chart series');

          const series = chart.getSeries();
          const originalAttach = series.attachPrimitive.bind(series);
          const originalDetach = series.detachPrimitive.bind(series);
          const trackedPrimitiveClasses = new Set([
            'SegmentPrimitive',
            'LiquidityPrimitive',
            'RangePrimitive',
            'PointSetPrimitive',
            'FibPrimitive',
          ]);
          const active = new Set();
          const activeSummary = () => Array.from(active)
            .map((primitive) => primitive?.constructor?.name || 'UnknownPrimitive')
            .join(', ');
          const assertEqual = (actual, expected, label) => {
            if (actual !== expected) {
              throw new Error(label + ': expected ' + expected + ', got ' + actual + ' active=[' + activeSummary() + ']');
            }
          };
          let attachCount = 0;
          let detachCount = 0;
          series.attachPrimitive = (primitive) => {
            if (trackedPrimitiveClasses.has(primitive?.constructor?.name)) {
              active.add(primitive);
              attachCount += 1;
            }
            return originalAttach(primitive);
          };
          series.detachPrimitive = (primitive) => {
            if (active.delete(primitive)) detachCount += 1;
            return originalDetach(primitive);
          };

          const baseTs = 1710770400;
          const bars = Array.from({ length: 12 }, (_, index) => {
            const price = 18300 + index * 4;
            return {
              timestamp: baseTs + index * 60,
              time: baseTs + index * 60,
              tradingDay: '2024-03-18',
              open: price,
              high: price + 6,
              low: price - 6,
              close: price + 2,
            };
          });
          store.setBars(bars, '2024-03-18 10:00', '2024-03-18 10:11', 1, {
            startTs: bars[0].timestamp,
            endTs: bars.at(-1).timestamp,
          }, { instrument: 'NQ' });
          await waitFrame();

          active.clear();
          attachCount = 0;
          detachCount = 0;

          segments.loadSegments([
            {
              id: 'primitive_smoke_segment_1',
              source: 'smoke',
              sourceChartId: 'primary',
              instrument: 'NQ',
              timeframe: '1M',
              direction: 'up',
              start: { timestamp: bars[1].timestamp, price: bars[1].low },
              end: { timestamp: bars[4].timestamp, price: bars[4].high },
              display: { showLabel: false },
            },
            {
              id: 'primitive_smoke_segment_2',
              source: 'smoke',
              sourceChartId: 'primary',
              instrument: 'NQ',
              timeframe: '1M',
              direction: 'down',
              start: { timestamp: bars[5].timestamp, price: bars[5].high },
              end: { timestamp: bars[8].timestamp, price: bars[8].low },
              display: { showLabel: false },
            },
          ]);
          await waitFrame();
          assertEqual(active.size, 2, 'segments attached');

          segments.updateSegment('primitive_smoke_segment_1', { display: { showLabel: false, hidden: true } });
          await waitFrame();
          assertEqual(active.size, 1, 'hidden segment detached');

          segments.deleteSegment('primitive_smoke_segment_2');
          await waitFrame();
          assertEqual(active.size, 0, 'deleted segment detached');

          pdaStore.loadAnnotations([
            {
              id: 'primitive_smoke_pda_1',
              source: 'smoke',
              sourceChartId: 'primary',
              sourceInstrument: 'NQ',
              sourceTimeframe: 1,
              type: 'bsl',
              canonicalTimestamp: bars[3].timestamp,
              timestamp: bars[3].timestamp,
              price: bars[3].high,
              display: { showLabel: false },
            },
          ]);
          await waitFrame();
          assertEqual(active.size, 1, 'pda attached');

          pdaStore.updateAnnotation('primitive_smoke_pda_1', { display: { showLabel: false, hidden: true } });
          await waitFrame();
          assertEqual(active.size, 0, 'hidden pda detached');

          segments.loadSegments([
            {
              id: 'primitive_smoke_segment_3',
              source: 'smoke',
              sourceChartId: 'primary',
              instrument: 'NQ',
              timeframe: '1M',
              direction: 'up',
              start: { timestamp: bars[2].timestamp, price: bars[2].low },
              end: { timestamp: bars[6].timestamp, price: bars[6].high },
              display: { showLabel: false },
            },
          ]);
          pdaStore.loadAnnotations([
            {
              id: 'primitive_smoke_pda_2',
              source: 'smoke',
              sourceChartId: 'primary',
              sourceInstrument: 'NQ',
              sourceTimeframe: 1,
              type: 'ssl',
              canonicalTimestamp: bars[7].timestamp,
              timestamp: bars[7].timestamp,
              price: bars[7].low,
              display: { showLabel: false },
            },
          ]);
          await waitFrame();
          assertEqual(active.size, 2, 'segment and pda attached before clear');

          store.clearBars();
          await waitFrame();
          assertEqual(active.size, 0, 'bars clear detached all tracked primitives');

          return JSON.stringify({ error: '', attachCount, detachCount });
        } catch (error) {
          return JSON.stringify({ error: error?.stack || error?.message || String(error) });
        }
      })()
    `;
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = JSON.parse(result.result?.value || '{}');
    if (value.error) throw new Error(value.error);
    console.log('primitive render lifecycle smoke ok');
    console.log(`primitive_attach_count=${value.attachCount} primitive_detach_count=${value.detachCount}`);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await rm(PROFILE_DIR, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
