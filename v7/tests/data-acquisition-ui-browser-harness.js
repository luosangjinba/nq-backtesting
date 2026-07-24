import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const VISUAL_ROOT = path.join(TEST_DIR, 'fixtures/data-acquisition');
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-data-acquisition-chrome-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1440,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function capture(cdp, name) {
  const file = path.join(VISUAL_ROOT, `${name}-1440x900.png`);
  let actual;
  if (process.env.V7_UPDATE_VISUALS === '1') {
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    fs.mkdirSync(VISUAL_ROOT, { recursive: true });
    fs.writeFileSync(file, actual);
    return;
  }
  assert.ok(fs.existsSync(file), `missing visual fixture ${path.basename(file)}; run with V7_UPDATE_VISUALS=1`);
  const expected = fs.readFileSync(file);
  let matches = false;
  for (let attempt = 0; attempt < 5 && !matches; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await evaluate(cdp, `new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
    }
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    actual = Buffer.from(data, 'base64');
    matches = actual.equals(expected);
  }
  if (!matches) fs.writeFileSync(path.join(os.tmpdir(), `v7-${name}-actual.png`), actual);
  assert.equal(matches, true, `${name} visual fixture changed`);
}

const fetchStub = `{
  const nativeFetch = globalThis.fetch.bind(globalThis);
  let jobCounter = 0;
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/v4/bars?')) {
      return new Response(JSON.stringify({ bars: [
        { time: '2026-07-22 15:59', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
        { time: '2026-07-22 16:00', open: 1.5, high: 2, low: 1, close: 1.75, volume: 12 }
      ] }), { status: 200 });
    }
    if (!target.includes('/v4/data_maintenance/run')) return nativeFetch(url, options);
    const payload = JSON.parse(options.body || '{}');
    let result;
    if (payload.action === 'coverage_status') {
      const dirtyCoverage = sessionStorage.getItem('test-dirty-coverage') === '1';
      result = {
      ok: true, coverage: [
        { instrument: 'ES', rows: 6460984, latestTimestamp: '2026-07-22 16:00', ageHours: 18.2,
          duplicateTimestamps: dirtyCoverage ? 1 : 0, integrity: dirtyCoverage ? 'failed' : 'ok' },
        { instrument: 'NQ', rows: 6127515, latestTimestamp: '2026-07-22 16:01', ageHours: 18.1,
          duplicateTimestamps: dirtyCoverage ? 1 : 0, integrity: dirtyCoverage ? 'failed' : 'ok' }
      ]
      };
      if (dirtyCoverage) result.ok = false;
    }
    else if (payload.action === 'environment_status') result = { ok: true, environment: [
      { key: 'DATABENTO_API_KEY', processSet: true }, { key: 'V4_TRADING_DB', processSet: true }
    ] };
    else if (payload.action === 'job_status' && !payload.jobId) result = { ok: false, output: 'No retained data maintenance job is available.' };
    else if (payload.action === 'job_start') {
      jobCounter += 1;
      result = { ok: true, job: { jobId: 'job-' + jobCounter, action: payload.request.action, state: 'running' } };
      sessionStorage.setItem('test-job-' + jobCounter, JSON.stringify(payload.request));
    } else if (payload.action === 'job_status') {
      const request = JSON.parse(sessionStorage.getItem('test-' + payload.jobId));
      const outputs = {
        preflight: 'preflight_status: write-eligible',
        dry_run: 'dry_run_range_et: 2026-07-22 16:01:00 -> 2026-07-23 12:00:00 (exclusive)\\nwrite_status: dry-run; no database changes were made\\nduplicate_candidate_keys: 0\\nwould_insert_rows: 28',
        backup: 'backup_status: ok\\nrestore_smoke_status: ok\\ndatabase_backup: /safe/backup.duckdb',
        write: 'inserted_rows: 28\\nwrite_status: committed insert-only transaction',
        roll_report: 'roll_report_status: ok'
      };
      result = { ok: true, job: { jobId: payload.jobId, action: request.action, state: 'succeeded',
        result: { ok: true, returncode: 0, output: outputs[request.action] } } };
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
}`;

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [1784822400000])); }
        static now() { return 1784822400000; }
      };
    }`,
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: fetchStub });
  await cdp.send('Page.navigate', { url: `http://127.0.0.1:${webPort}/v7/app/data-acquisition.html` });
  await waitFor(cdp, `document.querySelector('#serviceState')?.dataset.state === 'ready'`);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.coverage-card').length`), 2);
  assert.equal(await evaluate(cdp, `document.querySelector('#dryRun').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#backup').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#write').disabled`), true);

  await evaluate(cdp, `document.querySelector('#preflight').click()`);
  await waitFor(cdp, `document.querySelector('#data-acquisition-app').dataset.busy === 'true'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#instrument').disabled`), true,
    'a running maintenance task must lock the exact selection fields');
  await waitFor(cdp, `document.querySelector('[data-gate="preflight"]').dataset.state === 'passed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#instrument').disabled`), false);
  await evaluate(cdp, `document.querySelector('#dryRun').click()`);
  await waitFor(cdp, `document.querySelector('[data-gate="dry-run"]').dataset.state === 'passed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#write').disabled`), true,
    'clean Dry Run cannot bypass the verified-backup gate');
  await evaluate(cdp, `document.querySelector('#backup').click()`);
  await waitFor(cdp, `document.querySelector('[data-gate="backup"]').dataset.state === 'passed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#write').disabled`), false);
  await evaluate(cdp, `(() => {
    const input = document.querySelector('#confirmation');
    input.value = 'WRITE ES';
    document.querySelector('#write').click();
  })()`);
  await waitFor(cdp, `document.querySelector('[data-gate="verify"]').dataset.state === 'passed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#output').textContent.includes('inserted_rows: 28')`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#output').textContent.includes('returned_bars: 2')`), true);
  assert.equal(await evaluate(cdp, `JSON.parse(sessionStorage.getItem('test-job-4')).end`), '2026-07-23T12:00',
    'write must reuse the Dry Run effective end instead of a later provider watermark');

  await capture(cdp, 'ready-verified');
  await evaluate(cdp, `(() => {
    const instrument = document.querySelector('#instrument');
    instrument.value = 'NQ';
    instrument.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  assert.equal(await evaluate(cdp, `document.querySelector('[data-gate="verify"]').dataset.state`), 'pending',
    'changing the selected feed must clear prior read-verification presentation');
  await evaluate(cdp, `(() => {
    sessionStorage.setItem('test-dirty-coverage', '1');
    document.querySelector('#refreshCoverage').click();
  })()`);
  await waitFor(cdp, `document.querySelector('#serviceState strong').textContent === 'Coverage integrity failed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#preflight').disabled`), true,
    'duplicate timestamps in authoritative coverage must disable Preflight and Write');
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.coverage-card.has-error').length`), 2);
  console.log('v7 data acquisition UI browser harness passed');
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2000)),
  ]);
  if (!stopped) {
    chrome.kill('SIGKILL');
    await exited;
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await new Promise((resolve) => setTimeout(resolve, 200));
  await fs.promises.rm(userDataDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
}
