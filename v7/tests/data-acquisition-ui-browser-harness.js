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
    if (target.includes('/v7/database/health')) {
      return new Response(JSON.stringify({
        status: 'ok', version: 1, databaseReady: true, activationLocked: true,
        bootstrapEnabled: false, importAllowed: false,
        maxUploadBytes: 5000000000,
        requiredColumns: ['instrument', 'ts', 'open', 'high', 'low', 'close', 'volume']
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (target.includes('/v7/market-data/bars?')) {
      return new Response(JSON.stringify({ bars: [
        { time: '2026-07-22 15:59', open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 },
        { time: '2026-07-22 16:00', open: 1.5, high: 2, low: 1, close: 1.75, volume: 12 }
      ] }), { status: 200 });
    }
    if (!target.includes('/v7/maintenance/run')) return nativeFetch(url, options);
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
      { key: 'DATABENTO_API_KEY', processSet: true }, { key: 'V7_MARKET_DATA_DB', processSet: true }
    ] };
    else if (payload.action === 'roll_health') {
      if (sessionStorage.getItem('test-roll-committed') === '1'
          && sessionStorage.getItem('test-fail-post-commit-roll-health') === '1') {
        result = { ok: false, output: 'forced post-commit roll-health failure' };
      } else result = { ok: true, calendarVersion: 2, rollHealth: [
        { instrument: 'ES', activeContract: 'ESU6', lastConfirmedContract: 'ESU6',
          lastEffectiveAtEt: '2026-06-15T00:00', nextOldContract: 'ESU6', nextNewContract: 'ESZ6',
          decisionDeadlineEt: '2026-09-14T00:00', state: 'ready' },
        { instrument: 'NQ', activeContract: 'NQU6', lastConfirmedContract: 'NQU6',
          lastEffectiveAtEt: '2026-06-15T00:00', nextOldContract: 'NQU6', nextNewContract: 'NQZ6',
          decisionDeadlineEt: '2026-09-14T00:00', state: 'ready' }
      ], output: 'roll_health_status: ok' };
    }
    else if (payload.action === 'roll_preview_v2') result = {
      ok: true, previewToken: 'roll-preview-browser-fixture', expectedConfirmation: 'ROLL ESU6 ESZ6',
      output: 'roll_preview_status: ok\\neffective_at_et: 2026-09-10T18:00\\nhistory_guard: clear'
    };
    else if (payload.action === 'roll_commit_v2') {
      sessionStorage.setItem('test-roll-committed', '1');
      result = {
        ok: true, rollHealth: [], output: 'roll_commit_status: committed\\ncalendar_backup: /safe/roll.yml'
      };
    }
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
      const jobResult = { ok: true, returncode: 0, output: outputs[request.action] };
      if (request.action === 'roll_scan_v2') {
        jobResult.output = 'scan_status: ok\\ncomplete_trade_dates: 4\\ncandidate_roll_date: 2026-09-11';
        jobResult.rollScan = {
          token: 'roll-scan-browser-fixture', oldContract: 'ESU6', newContract: 'ESZ6',
          candidateTradeDate: '2026-09-11', effectiveAtEt: '2026-09-10T18:00'
        };
      }
      result = { ok: true, job: { jobId: payload.jobId, action: request.action, state: 'succeeded', result: jobResult } };
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
  await waitFor(cdp, `document.querySelector('#databaseImportState')?.textContent === 'Database active'`);
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.coverage-card').length`), 2);
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseImportState').textContent`), 'Database active');
  assert.equal(await evaluate(cdp, `document.querySelector('#databaseFile').disabled`), true,
    'first-run importer must lock when an authoritative database already exists');
  assert.equal(await evaluate(cdp, `document.querySelectorAll('.roll-health-card').length`), 2);
  assert.equal(await evaluate(cdp, `document.querySelector('.roll-health-card').textContent.includes('ESU6 → ESZ6')`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#dryRun').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#backup').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#write').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#rollPreview').disabled`), true);
  assert.equal(await evaluate(cdp, `document.querySelector('#rollCommit').disabled`), true);

  await evaluate(cdp, `document.querySelector('#preflight').click()`);
  await waitFor(cdp, `document.querySelector('#data-acquisition-app').dataset.busy === 'true'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#instrument').disabled`), true,
    'a running maintenance task must lock the exact selection fields');
  await waitFor(cdp, `document.querySelector('[data-gate="preflight"]').dataset.state === 'passed'`);
  assert.equal(await evaluate(cdp, `document.querySelector('#instrument').disabled`), false);
  assert.equal(await evaluate(cdp, `document.querySelector('#rollPreview').disabled`), true,
    'finishing an unrelated task must not unlock roll Preview without scan evidence');
  assert.equal(await evaluate(cdp, `document.querySelector('#rollCommit').disabled`), true,
    'finishing an unrelated task must not unlock roll Commit without Preview evidence');
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
  await evaluate(cdp, `document.querySelector('#rollScan').click()`);
  await waitFor(cdp, `document.querySelector('#rollPreview').disabled === false`);
  await evaluate(cdp, `(() => {
    const note = document.querySelector('#rollNote');
    note.value = 'Two complete trade dates show new-contract dominance.';
    note.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#rollPreview').click();
  })()`);
  await waitFor(cdp, `document.querySelector('#rollCommit').disabled === false`);
  assert.equal(await evaluate(cdp, `document.querySelector('#rollConfirmation').placeholder`), 'ROLL ESU6 ESZ6');
  await evaluate(cdp, `(() => {
    sessionStorage.setItem('test-fail-post-commit-roll-health', '1');
    const confirmation = document.querySelector('#rollConfirmation');
    confirmation.value = 'ROLL ESU6 ESZ6';
    document.querySelector('#rollCommit').click();
  })()`);
  await waitFor(cdp, `document.querySelector('#data-acquisition-app').dataset.busy === 'false'
    && document.querySelector('#output').textContent.includes('forced post-commit roll-health failure')`);
  assert.equal(await evaluate(cdp, `document.querySelector('[data-gate="preflight"]').dataset.state`), 'pending',
    'a committed roll must revoke Preflight evidence before post-commit refresh');
  assert.equal(await evaluate(cdp, `document.querySelector('[data-gate="dry-run"]').dataset.state`), 'locked',
    'a committed roll must revoke Dry Run evidence before post-commit refresh');
  assert.equal(await evaluate(cdp, `document.querySelector('[data-gate="backup"]').dataset.state`), 'locked',
    'a committed roll must revoke Backup evidence before post-commit refresh');
  assert.equal(await evaluate(cdp, `document.querySelector('[data-gate="verify"]').dataset.state`), 'pending',
    'a committed roll must revoke read-verification evidence before post-commit refresh');
  assert.equal(await evaluate(cdp, `document.querySelector('#write').disabled`), true,
    'post-commit refresh failure must not preserve stale write authority');
  assert.equal(await evaluate(cdp, `document.querySelector('#rollCommit').disabled`), true,
    'committed Preview evidence must remain revoked when Roll health refresh fails');
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
