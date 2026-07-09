import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

async function walkFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(entryPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(entryPath);
    }
  }
  return files;
}

const displayRuntime = await readFile('v6/src/display-timeframe/display-timeframe-runtime.js', 'utf8');
const sourceFiles = await walkFiles('v6/src');
const importsProjectionDomain = [];

for (const file of sourceFiles) {
  if (file.includes(`${path.sep}chart-data-projection${path.sep}`)) continue;
  const text = await readFile(file, 'utf8');
  if (text.includes('chart-data-projection-domain')) {
    importsProjectionDomain.push(file);
  }
}

assert.equal(displayRuntime.includes('chart-data-projection'), false);
assert.equal(displayRuntime.includes('BAR_DATA_COMMANDS'), false);
assert.equal(displayRuntime.includes('createChart'), false);
assert.equal(displayRuntime.includes('setData'), false);
assert.equal(displayRuntime.includes('series.update'), false);
assert.deepEqual(importsProjectionDomain, []);

console.log('v6 display timeframe no wiring step 193 smoke passed');
