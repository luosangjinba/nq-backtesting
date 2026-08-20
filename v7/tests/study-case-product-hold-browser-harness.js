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
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-study-case-hold-'));
const server = createStaticServer(REPOSITORY_ROOT);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const webPort = server.address().port;
const chrome = spawn('/usr/bin/google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--window-size=1280,800',
  `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForDevtools() {
  const activePortFile = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(activePortFile)) {
      const debugPort = fs.readFileSync(activePortFile, 'utf8').split(/\r?\n/u)[0];
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
        const targets = await response.json();
        if (targets.some(({ type }) => type === 'page')) return { debugPort, targets };
      } catch {
        // Chrome may create DevToolsActivePort just before the JSON endpoint is ready.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

let cdp;
try {
  const { targets } = await waitForDevtools();
  cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `{
      globalThis.__studyCaseHoldErrors = [];
      addEventListener('error', (event) => globalThis.__studyCaseHoldErrors.push(event.message));
      addEventListener('unhandledrejection', (event) => {
        globalThis.__studyCaseHoldErrors.push(String(event.reason?.stack ?? event.reason));
      });
      localStorage.setItem('v7.validation-campaign:index', 'preserved-sentinel');
    }`,
  });
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${webPort}/v7/app/#/campaigns`,
  });
  await waitFor(cdp, `document.querySelector('.page-sessions')`, 15_000);
  const evidence = await evaluate(cdp, `(() => ({
    browserErrors: globalThis.__studyCaseHoldErrors,
    campaignCodeLoaded: performance.getEntriesByType('resource')
      .some(({ name }) => name.includes('/validation-campaign-ui/public.js')
        || name.includes('/validation-campaign-runtime/public.js')),
    campaignRouteRendered: document.querySelector('.validation-page') !== null,
    campaignStyleLoaded: document.querySelector(
      'link[href*="validation-campaign-ui/styles.css"]') !== null,
    preservedBytes: localStorage.getItem('v7.validation-campaign:index'),
    rail: [...document.querySelectorAll('.rail-link')].map((node) => node.textContent.trim()),
  }))()`);
  assert.deepEqual(evidence, {
    browserErrors: [],
    campaignCodeLoaded: false,
    campaignRouteRendered: false,
    campaignStyleLoaded: false,
    preservedBytes: 'preserved-sentinel',
    rail: ['Sessions', 'Data acquisition'],
  });
} finally {
  cdp?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill('SIGTERM');
  const stopped = await Promise.race([
    exited.then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!stopped) { chrome.kill('SIGKILL'); await exited; }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.promises.rm(userDataDirectory, {
    force: true, maxRetries: 10, recursive: true, retryDelay: 50,
  });
}

console.log('v7 Study Case product-hold browser harness passed (default app omits Campaign code/style/navigation/route and preserves stored bytes)');
