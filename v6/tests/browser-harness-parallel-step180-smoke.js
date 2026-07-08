import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { evaluate } from '../../v4/tests/helpers/browser-cdp-client.js';
import { openV6Page } from './helpers/v6-browser-harness.js';

const pages = await Promise.all([
  openV6Page({ height: 700, width: 1000 }),
  openV6Page({ height: 720, width: 1020 }),
]);

try {
  assert.notEqual(pages[0].debugPort, pages[1].debugPort);
  assert.notEqual(pages[0].profileDir, pages[1].profileDir);
  assert.notEqual(pages[0].pageUrl, pages[1].pageUrl);
  assert.equal(existsSync(pages[0].profileDir), true);
  assert.equal(existsSync(pages[1].profileDir), true);

  const booted = await Promise.all(pages.map((page) => evaluate(page.client, `
    document.querySelector('[data-v6-root]')?.dataset.booted
  `)));
  assert.deepEqual(booted, ['true', 'true']);
} finally {
  await Promise.all(pages.map((page) => page.cleanup()));
}

assert.equal(existsSync(pages[0].profileDir), false);
assert.equal(existsSync(pages[1].profileDir), false);

console.log('v6 browser harness parallel step 180 smoke passed');
