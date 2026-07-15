import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const names = (await readdir('v6/tests'))
  .filter((name) => name.endsWith('.js'))
  .sort();
const browserEntrypoints = [];

for (const name of names) {
  const source = await readFile(`v6/tests/${name}`, 'utf8');
  const importsBrowserRuntime = (
    /^import .*browser-cdp-client/m.test(source) ||
    /^import .*v6-browser-harness/m.test(source)
  );
  if (!importsBrowserRuntime) continue;
  browserEntrypoints.push(name);
  assert.equal(
    name.includes('browser') || name.includes('screenshot'),
    true,
    `${name} requires a browser but its filename does not declare that environment`,
  );
}

assert.equal(browserEntrypoints.length > 0, true);

const harness = await readFile('v6/tests/helpers/v6-browser-harness.js', 'utf8');
assert.match(harness, /CHROME_BIN/);
assert.match(harness, /127\.0\.0\.1/);
assert.match(harness, /http\.server/);
assert.match(harness, /CHROME_DEBUG_PORT/);
assert.match(harness, /cleanup/);

console.log(`v6 browser harness environment contract smoke passed (${browserEntrypoints.length} entrypoints)`);
