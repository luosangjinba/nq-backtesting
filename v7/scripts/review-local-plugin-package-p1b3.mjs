import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';
import { connectCdp } from '../tests/support/cdp-client.js';
import { createLocalPluginPackageFixture } from '../tests/support/local-plugin-package-fixture.js';

const SCRIPT_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_ROOT, '../..');
const fixture = createLocalPluginPackageFixture();
const userDataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-p1b3-human-review-'));
const server = createStaticServer(REPOSITORY_ROOT, {
  additionalPublicPathPrefixes: ['/v7/tests/fixtures/local-plugin-package/product-browser/'],
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const chrome = spawn('/usr/bin/google-chrome', [
  '--no-sandbox', '--disable-breakpad', '--disable-crash-reporter',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0',
  '--window-size=1440,920', `--user-data-dir=${userDataDirectory}`, 'about:blank',
], { stdio: 'ignore' });

let cdp;
let stopping = false;
async function devtoolsPort() {
  const target = path.join(userDataDirectory, 'DevToolsActivePort');
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(target)) return fs.readFileSync(target, 'utf8').split(/\r?\n/u)[0];
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

async function cleanup() {
  if (stopping) return;
  stopping = true;
  cdp?.close();
  if (chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  fixture.dispose();
  await fs.promises.rm(userDataDirectory, { force: true, maxRetries: 10, recursive: true, retryDelay: 50 });
}

process.on('SIGINT', async () => { await cleanup(); process.exit(130); });
process.on('SIGTERM', async () => { await cleanup(); process.exit(143); });

try {
  const port = await devtoolsPort();
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  cdp = await connectCdp(targets.find(({ type }) => type === 'page').webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `globalThis.__h117PackageArchiveBase64 = ${JSON.stringify(
      Buffer.from(fixture.archiveBytes).toString('base64'),
    )};`,
  });
  await cdp.send('Page.navigate', {
    url: `http://127.0.0.1:${server.address().port}`
      + `/v7/tests/fixtures/local-plugin-package/product-browser/?manual=1&token=${process.pid}`,
  });
  console.log('P1b.3 focused review is open. Follow docs/V7_LOCAL_PLUGIN_PACKAGE_P1B3_HUMAN_REVIEW.md.');
  console.log('Close the review browser window or press Ctrl+C here when finished.');
  await new Promise((resolve) => chrome.once('exit', resolve));
} finally {
  await cleanup();
}
