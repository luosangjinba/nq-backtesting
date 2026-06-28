import { spawn } from 'node:child_process';
import {
  createCdpClient,
  evaluate,
  waitForExpression,
  waitForProcessExit,
  waitForTargets,
} from './helpers/browser-cdp-client.js';
import { buildInstallComparisonBarsMockScript } from './helpers/comparison-window-fixtures.js';
import { verifyComparisonPaneLayout } from './helpers/comparison-window-section-layout.js';
import { verifyComparisonDataAndViewport } from './helpers/comparison-window-section-data.js';
import { verifyComparisonContextMenu } from './helpers/comparison-window-section-context-menu.js';
import { verifyComparisonOverlayPolicy } from './helpers/comparison-window-section-overlay-policy.js';
import { verifyComparisonReplayWorkspace } from './helpers/comparison-window-section-replay-workspace.js';

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT || 9362);
const PAGE_URL = process.env.V4_PAGE_URL || 'http://127.0.0.1:8001/index.html';
const PROFILE_DIR = process.env.CHROME_PROFILE_DIR || `/tmp/v4-comparison-window-browser-smoke-profile-${process.pid}`;

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
    const target = await waitForTargets(DEBUG_PORT);
    client = createCdpClient(target.webSocketDebuggerUrl);
    await client.open();
    await client.send('Runtime.enable');
    await client.send('Page.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Page.navigate', { url: PAGE_URL });
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `Boolean(document.querySelector('#chartLayoutBtn'))`);
    await evaluate(client, `localStorage.removeItem('v4:chart-pane-labels')`);
    await client.send('Page.navigate', { url: PAGE_URL });
    await waitForExpression(client, `document.readyState === 'complete' || document.readyState === 'interactive'`);
    await waitForExpression(client, `Boolean(document.querySelector('#chartLayoutBtn'))`);
    await evaluate(client, buildInstallComparisonBarsMockScript());

    await verifyComparisonPaneLayout({ client });

    await verifyComparisonDataAndViewport({ client });
    await verifyComparisonContextMenu({ client });
    await verifyComparisonOverlayPolicy({ client });
    await verifyComparisonReplayWorkspace({ client });
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
