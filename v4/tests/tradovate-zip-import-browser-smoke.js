import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { join } from 'node:path';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9361);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/data-maintenance.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-tradovate-zip-browser-smoke-profile-${process.pid}`;

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

async function createTradovateZipPackage() {
  if (process.env.TRADOVATE_ZIP_PATH) {
    return {
      dir: '',
      zipPath: process.env.TRADOVATE_ZIP_PATH,
      external: true,
    };
  }
  const dir = await mkdtemp(`/tmp/v4-tradovate-zip-package-${process.pid}-`);
  const filesDir = join(dir, 'csv');
  await mkdir(filesDir);
  const performancePath = join(filesDir, 'Performance.csv');
  const fillsPath = join(filesDir, 'Fills.csv');
  const ordersPath = join(filesDir, 'Orders.csv');
  const zipPath = join(dir, 'tradovate.zip');
  await writeFile(performancePath, [
    'symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration',
    'MNQM6,-2,0,0.25,buy-1,sell-1,1,29320.00,29330.00,$20.00,06/12/2026 09:49:42,06/12/2026 09:50:11,29sec',
  ].join('\n'));
  await writeFile(fillsPath, [
    'Fill ID,Order ID,Timestamp,Date,Account,B/S,Quantity,Price,_priceFormat,_priceFormatType,_tickSize,Contract,Product,Product Description,commission',
    'buy-1,order-buy,06/12/2026 09:49:42,6/12/26,acct, Buy,1,29320.00,-2,0,0.25,MNQM6,MNQ,Micro,0.5',
    'sell-1,order-sell,06/12/2026 09:50:11,6/12/26,acct, Sell,1,29330.00,-2,0,0.25,MNQM6,MNQ,Micro,0.5',
  ].join('\n'));
  await writeFile(ordersPath, [
    'Order ID,B/S,Contract,Product,Status,Timestamp,Type,Quantity,Filled Qty,Avg Fill Price',
    'order-buy, Buy,MNQM6,MNQ,Filled,06/12/2026 09:49:42,Market,1,1,29320.00',
    'order-sell, Sell,MNQM6,MNQ,Filled,06/12/2026 09:50:11,Market,1,1,29330.00',
  ].join('\n'));
  const script = [
    'import sys, zipfile',
    'zip_path, *files = sys.argv[1:]',
    'with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:',
    '    [zf.write(path, arcname=path.rsplit("/", 1)[-1]) for path in files]',
  ].join('\n');
  const result = spawnSync('python3', ['-c', script, zipPath, performancePath, fillsPath, ordersPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`failed to create zip package: ${result.stderr || result.stdout}`);
  }
  return { dir, zipPath, external: false };
}

async function main() {
  const zipPackage = await createTradovateZipPackage();
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
    await client.send('DOM.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await new Promise((resolve) => setTimeout(resolve, 1_200));

    const documentNode = await client.send('DOM.getDocument');
    const zipInput = await client.send('DOM.querySelector', {
      nodeId: documentNode.root.nodeId,
      selector: '#tradovateZip',
    });
    assert.ok(zipInput.nodeId, 'Tradovate ZIP input should exist');
    await client.send('DOM.setFileInputFiles', {
      nodeId: zipInput.nodeId,
      files: [zipPackage.zipPath],
    });

    const expression = `
      (async () => {
        document.querySelector('#tradovatePreview').click();

        const deadline = Date.now() + 5_000;
        while (Date.now() < deadline) {
          const text = document.querySelector('#output')?.textContent || '';
        if (text.includes('ZIP package:') && text.includes('File alignment:')) {
          return JSON.stringify({ ok: true, text });
        }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return JSON.stringify({ ok: false, text: document.querySelector('#output')?.textContent || '' });
      })()
    `;
    const result = await client.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const payload = JSON.parse(result.result.value || '{}');
    assert.equal(payload.ok, true, payload.text || 'Tradovate ZIP preview did not complete');
    assert.match(payload.text, /Performance\.csv -> performance/);
    assert.match(payload.text, /Fills\.csv -> fills/);
    assert.match(payload.text, /Orders\.csv -> orders/);
    assert.match(payload.text, /Live Records: [1-9]/);
    if (!zipPackage.external) assert.match(payload.text, /File alignment: ok/);
  } finally {
    client?.close();
    chrome.kill('SIGTERM');
    await waitForProcessExit(chrome);
    await rm(PROFILE_DIR, { recursive: true, force: true, maxRetries: 5, retryDelay: 150 });
    if (zipPackage.dir) await rm(zipPackage.dir, { recursive: true, force: true });
  }
}

main()
  .then(() => {
    console.log('tradovate zip import browser smoke passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
