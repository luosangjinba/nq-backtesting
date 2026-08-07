import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDatabaseImportProxy } from '../scripts/database-import-proxy.mjs';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const visualRoot = path.join(testDirectory, 'fixtures/database-import-ui');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-database-import-ui-'));
const target = path.join(temporaryRoot, 'market', 'trading_data.duckdb');
const staging = path.join(temporaryRoot, 'staging');
const csvPath = path.join(temporaryRoot, 'market.csv');
const replacementCsvPath = path.join(temporaryRoot, 'replacement.csv');
const userDataDirectory = path.join(temporaryRoot, 'chrome');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(csvPath, [
  'instrument,ts,open,high,low,close,volume',
  'ES,2026-01-02 09:30:00,6000,6001,5999,6000.5,20',
  'NQ,2026-01-02 09:30:00,21000,21002,20999,21001,30',
].join('\n'));
fs.writeFileSync(replacementCsvPath, [
  'instrument,ts,open,high,low,close,volume',
  'ES,2026-01-02 09:30:00,6000,6001,5999,6000.5,20',
  'NQ,2026-01-02 09:30:00,21000,21002,20999,21001,30',
  'NQ,2026-01-02 09:31:00,21001,21003,21000,21002,31',
].join('\n'));

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

const importPort = await reservePort();
const importService = spawn('python3', [
  path.join(repositoryRoot, 'v7/server/database_import_api.py'),
  '--db', target,
  '--staging-root', staging,
  '--port', String(importPort),
  '--max-upload-bytes', '10000000',
  '--enabled',
], { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'pipe'] });
let serviceOutput = '';
importService.stdout.on('data', (chunk) => { serviceOutput += chunk; });
importService.stderr.on('data', (chunk) => { serviceOutput += chunk; });

async function waitForImportService() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (importService.exitCode !== null) throw new Error(`database service exited: ${serviceOutput}`);
    try {
      const response = await fetch(`http://127.0.0.1:${importPort}/v7/database/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`database service did not start: ${serviceOutput}`);
}

await waitForImportService();
const webServer = createStaticServer(repositoryRoot, {
  databaseImportProxy: createDatabaseImportProxy({
    origin: `http://127.0.0.1:${importPort}`,
    userId: 'reviewer',
  }),
});
await new Promise((resolve) => webServer.listen(0, '127.0.0.1', resolve));
const webPort = webServer.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1440,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function capture(cdpClient, name) {
  const file = path.join(visualRoot, `${name}-1440x900.png`);
  let actual;
  if (process.env.V7_UPDATE_VISUALS === '1') {
    const { data } = await cdpClient.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.mkdirSync(visualRoot, { recursive: true });
    fs.writeFileSync(file, Buffer.from(data, 'base64'));
    return;
  }
  assert.ok(fs.existsSync(file), `missing visual fixture ${path.basename(file)}; run with V7_UPDATE_VISUALS=1`);
  const expected = fs.readFileSync(file);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await evaluate(cdpClient, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    }
    const { data } = await cdpClient.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    if (actual.equals(expected)) return;
  }
  fs.writeFileSync(path.join(os.tmpdir(), `v7-${name}-actual.png`), actual);
  const pixelDifference = await evaluate(cdpClient, `(async () => {
    const decode = async (base64) => createImageBitmap(await (await fetch(
      'data:image/png;base64,' + base64
    )).blob());
    const [left, right] = await Promise.all([
      decode(${JSON.stringify(actual.toString('base64'))}),
      decode(${JSON.stringify(expected.toString('base64'))}),
    ]);
    if (left.width !== right.width || left.height !== right.height) {
      return { dimensionsEqual: false, differentPixels: null, maxChannelDelta: null };
    }
    const canvas = new OffscreenCanvas(left.width, left.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(left, 0, 0);
    const leftPixels = context.getImageData(0, 0, left.width, left.height).data;
    context.clearRect(0, 0, left.width, left.height);
    context.drawImage(right, 0, 0);
    const rightPixels = context.getImageData(0, 0, right.width, right.height).data;
    let differentPixels = 0;
    let maxChannelDelta = 0;
    for (let index = 0; index < leftPixels.length; index += 4) {
      let pixelChanged = false;
      for (let channel = 0; channel < 4; channel += 1) {
        const delta = Math.abs(leftPixels[index + channel] - rightPixels[index + channel]);
        if (delta > 0) pixelChanged = true;
        maxChannelDelta = Math.max(maxChannelDelta, delta);
      }
      if (pixelChanged) differentPixels += 1;
    }
    return { dimensionsEqual: true, differentPixels, maxChannelDelta };
  })()`);
  assert.equal(pixelDifference.dimensionsEqual, true, `${name} visual dimensions changed`);
  // Chromium can move a handful of one-channel border pixels by one level.
  assert.equal(pixelDifference.maxChannelDelta <= 1 && pixelDifference.differentPixels <= 32, true,
    `${name} visual pixels changed: ${JSON.stringify(pixelDifference)}`);
}

const maintenanceFetchStub = `{
  const nativeFetch = globalThis.fetch.bind(globalThis);
  let suppressCurrentOnce = new URLSearchParams(globalThis.location.search).has('hide-current');
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/v7/database/import/current') && suppressCurrentOnce) {
      suppressCurrentOnce = false;
      return new Response(JSON.stringify({
        error: { code: 'DATABASE_UPLOAD_NOT_FOUND', message: 'upload was not found' }
      }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
    if (!target.includes('/v7/maintenance/run')) return nativeFetch(url, options);
    const payload = JSON.parse(options.body || '{}');
    let result = { ok: false, output: 'Market database is awaiting first-run import.' };
    if (payload.action === 'coverage_status') result.coverage = [];
    if (payload.action === 'environment_status') result = { ok: true, environment: [] };
    if (payload.action === 'job_status') result = { ok: false, output: 'No retained job.' };
    return new Response(JSON.stringify(result), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  };
}`;

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((item) => item.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('DOM.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: maintenanceFetchStub });
  async function selectFile(filePath) {
    const input = await cdp.send('Runtime.evaluate', {
      expression: `document.querySelector('#databaseFile')`,
    });
    await cdp.send('DOM.setFileInputFiles', {
      files: [filePath],
      objectId: input.result.objectId,
    });
    await evaluate(cdp, `document.querySelector('#databaseFile').dispatchEvent(new Event('change', { bubbles: true }))`);
  }
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/app/data-acquisition.html`,
  });
  await waitFor(cdp, `document.querySelector('#databaseImportState')?.textContent === 'Awaiting database'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').disabled`), false);
  assert.match(
    await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`),
    /Ready for a strict first-run import/,
  );

  await selectFile(csvPath);
  await waitFor(cdp, `document.querySelector('#databaseUpload').disabled === false`);
  await evaluate(cdp, `document.querySelector('#databaseUpload').click()`);
  await waitFor(cdp, `document.querySelector('#databasePrepare').disabled === false`);
  assert.match(await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`), /State: uploaded/);
  await evaluate(cdp, `document.querySelector('#databasePrepare').click()`);
  await waitFor(cdp, `document.querySelector('#databaseActivate').disabled === false`);
  const report = await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`);
  assert.match(report, /2 rows/);
  assert.match(report, /ES: 1 rows/);
  assert.match(report, /NQ: 1 rows/);
  await cdp.send('Page.reload', { ignoreCache: true });
  await waitFor(cdp, `document.querySelector('#databaseActivate')?.disabled === false`);
  assert.match(
    await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`),
    /State: ready/,
    'a hard refresh must recover the authenticated ready candidate',
  );
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').disabled`), true,
    'a retained candidate must lock direct file replacement');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseDiscard').hidden`), false);

  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/app/data-acquisition.html?hide-current=1`,
  });
  await waitFor(cdp, `document.querySelector('#databaseImportState')?.textContent === 'Awaiting database'
    && document.querySelector('#databaseFile')?.disabled === false`);
  await selectFile(replacementCsvPath);
  await waitFor(cdp, `document.querySelector('#databaseUpload').disabled === false`);
  await evaluate(cdp, `document.querySelector('#databaseUpload').click()`);
  await waitFor(cdp, `document.querySelector('#databaseDiscard')?.disabled === false`);
  assert.match(
    await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`),
    /A previous upload is already staged/,
    'a busy upload must recover the authoritative retained candidate',
  );
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').files.length`), 0,
    'busy recovery must clear the rejected local replacement selection');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseProgress').hidden`), true,
    'busy recovery must clear the rejected local upload progress');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseProgressText').textContent`), '0%');

  await evaluate(cdp, `document.querySelector('#databaseDiscard').click()`);
  await waitFor(cdp, `document.querySelector('#databaseDiscardConfirmation').hidden === false`);
  assert.equal(await evaluate(cdp, `document.activeElement.id`), 'databaseDiscardConfirm');
  assert.match(
    await evaluate(cdp, `document.querySelector('#databaseDiscardMessage').textContent`),
    /No active database will be changed/,
  );
  await capture(cdp, 'reupload-confirmation');
  await evaluate(cdp, `document.querySelector('#databaseDiscardCancel').click()`);
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseDiscardConfirmation').hidden`), true);
  assert.equal(await evaluate(cdp, `document.activeElement.id`), 'databaseDiscard');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseActivate').disabled`), false,
    'cancelling replacement must preserve the ready candidate');

  await evaluate(cdp, `document.querySelector('#databaseDiscard').click()`);
  await evaluate(cdp, `document.querySelector('#databaseDiscardConfirm').click()`);
  await waitFor(cdp, `document.querySelector('#databaseFile').disabled === false`);
  assert.equal(await evaluate(cdp, `document.activeElement.id`), 'databaseFile');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseDiscard').hidden`), true);
  assert.match(
    await evaluate(cdp, `document.querySelector('#databaseValidationReport').textContent`),
    /Previous staged file discarded/,
  );
  assert.equal(fs.existsSync(target), false, 'discarding a candidate cannot activate the database');

  await selectFile(replacementCsvPath);
  await waitFor(cdp, `document.querySelector('#databaseUpload').disabled === false`);
  await evaluate(cdp, `document.querySelector('#databaseUpload').click()`);
  await waitFor(cdp, `document.querySelector('#databasePrepare').disabled === false`);
  await evaluate(cdp, `document.querySelector('#databasePrepare').click()`);
  await waitFor(cdp, `document.querySelector('#databaseActivate').disabled === false`);
  await evaluate(cdp, `(() => {
    document.querySelector('#databaseConfirmation').value = 'ACTIVATE DATABASE';
    document.querySelector('#databaseActivate').click();
  })()`);
  await waitFor(cdp, `document.querySelector('#databaseImportState')?.textContent === 'Database active'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').disabled`), true);
  assert.equal(fs.existsSync(target), true);

  const smoke = spawnSync('python3', ['-c', [
    'import duckdb,sys',
    'c=duckdb.connect(sys.argv[1], read_only=True)',
    'print(c.execute("select count(*) from futures_1m").fetchone()[0])',
    'c.close()',
  ].join(';'), target], { encoding: 'utf8' });
  assert.equal(smoke.status, 0, smoke.stderr);
  assert.equal(smoke.stdout.trim(), '3');
  console.log('v7 database import UI browser harness passed');
} finally {
  cdp?.close();
  const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  if (!await Promise.race([
    chromeExited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ])) {
    chrome.kill('SIGKILL');
    await chromeExited;
  }
  webServer.closeAllConnections();
  await new Promise((resolve) => webServer.close(resolve));
  const serviceExited = new Promise((resolve) => importService.once('exit', resolve));
  importService.kill('SIGTERM');
  await serviceExited;
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
