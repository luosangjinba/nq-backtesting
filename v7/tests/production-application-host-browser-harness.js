import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dataAcquisitionApplication from '../src/data-acquisition-application/public.js';
import * as sessionApplication from '../src/session-application/public.js';
import { createStaticServer } from '../scripts/static-server.mjs';
import { connectCdp, evaluate, waitFor } from './support/cdp-client.js';

assert.equal(typeof sessionApplication.createProductionModuleDefinition, 'function');
assert.equal(typeof dataAcquisitionApplication.createProductionModuleDefinition, 'function');

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(TEST_DIR, '../..');
const negativeCases = JSON.parse(fs.readFileSync(path.join(
  TEST_DIR,
  'fixtures/production-application-host/negative/cases.json',
), 'utf8'));
assert.equal(negativeCases.schemaVersion, 1);
assert.equal(negativeCases.cases.length, 2);
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-production-host-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1280,900',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) {
      return fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/)[0];
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

let cdp;
try {
  const debugPort = await waitForDevtools();
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  cdp = await connectCdp(targets.find((target) => target.type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/tests/fixtures/production-application-host/`,
  });
  await waitFor(cdp, `globalThis.__productionApplicationHostEvidence
    && globalThis.__productionApplicationHostEvidence.status !== 'running'`, 15_000);
  const evidence = await evaluate(cdp, `globalThis.__productionApplicationHostEvidence`);
  assert.equal(evidence.status, 'passed', evidence.message);
  assert.deepEqual(evidence.isolationBefore.one, evidence.isolationBefore.two);
  assert.equal(evidence.isolationBefore.one.status, 'running');
  assert.equal(evidence.isolationAfterFirstStop.one.status, 'disposed');
  assert.equal(evidence.isolationAfterFirstStop.oneChildren, 0);
  assert.equal(evidence.isolationAfterFirstStop.two.status, 'running');
  assert.ok(evidence.isolationAfterFirstStop.twoChildren > 0);
  assert.deepEqual(evidence.reverseCleanup.slice(0, 2).map(({ event, moduleId }) => `${event}:${moduleId}`), [
    'stop:adapter.session-application',
    'dispose:adapter.session-application',
  ]);
  assert.equal(evidence.optional.moduleIds.includes('adapter.replay-workspace-ui'), false);
  assert.equal(evidence.optional.snapshot.hasReplayWorkspace, false);
  assert.deepEqual(evidence.optional.sessionBrowserOptionalPortIds, []);
  assert.equal(evidence.data.running.status, 'running');
  assert.equal(evidence.data.stopped.status, 'disposed');
  assert.equal(evidence.data.childrenAfterStop, 0);
  assert.equal(evidence.rollback.failureCode, 'MODULE_HOST_START_FAILED');
  assert.equal(evidence.rollback.status, 'failed');
  assert.equal(evidence.rollback.children, 0);
  assert.ok(evidence.rollback.trace.some(({ event, moduleId }) => (
    event === 'stop' && moduleId === 'adapter.session-application'
  )));
  assert.ok(evidence.rollback.trace.some(({ event, moduleId }) => (
    event === 'dispose' && moduleId === 'adapter.session-application'
  )));
  assert.equal(evidence.requiredOmissionFailureCode, 'MISSING_REQUIRED_MODULE');
  assert.deepEqual(
    [evidence.requiredOmissionFailureCode, evidence.rollback.failureCode].sort(),
    negativeCases.cases.map(({ expectedFailureCode }) => expectedFailureCode).sort(),
  );
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) {
    chrome.kill('SIGKILL');
    await exited;
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log('v7 production application host browser harness passed (2 isolated instances, reverse cleanup, partial rollback, optional removal, 2 real roots, 2 negative controls)');
