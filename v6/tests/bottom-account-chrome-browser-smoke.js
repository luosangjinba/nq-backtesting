import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const [accountContract, ordersContract, shellSource, stylesSource] = await Promise.all([
  readFile('v6/src/account-trading/account-trading-contract.js', 'utf8'),
  readFile('v6/src/orders/orders-contract.js', 'utf8'),
  readFile('v6/src/shell/workstation-shell.js', 'utf8'),
  readFile('v6/src/styles/app.css', 'utf8'),
]);

assert.doesNotMatch(shellSource, /data-v6-bottom-(account-chrome|buy|sell|quantity|analytics|account-balance|realized-pnl|unrealized-pnl)/);
assert.doesNotMatch(stylesSource, /\.bottom-(account-chrome|trade-actions|account-readouts|trade-button|analytics-button|quantity-field)/);
assert.match(accountContract, /account-trading-runtime/);
assert.match(ordersContract, /orders-runtime/);

const page = await openV6Page({ height: 860, width: 1440 });
try {
  const value = JSON.parse(await evaluate(page.client, `JSON.stringify({
    placeholderCount: document.querySelectorAll('[data-v6-bottom-account-chrome], [data-v6-bottom-buy], [data-v6-bottom-sell], [data-v6-bottom-quantity], [data-v6-bottom-analytics], [data-v6-bottom-account-balance], [data-v6-bottom-realized-pnl], [data-v6-bottom-unrealized-pnl]').length,
    statusExists: Boolean(document.querySelector('[data-v6-status-bar]')),
    transportExists: Boolean(document.querySelector('[data-v6-transport]')),
  })`));

  assert.deepEqual(value, {
    placeholderCount: 0,
    statusExists: true,
    transportExists: true,
  });
} finally {
  await page.cleanup();
}

console.log('v6 bottom account placeholder removal browser smoke passed');
