import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.name.endsWith('.js')) files.push(target);
  }
  return files;
}

const governanceFiles = await walk('v6/tests/governance/helpers');
assert.equal(governanceFiles.length >= 18, true);

const sourceFiles = await walk('v6/src');
const sourceText = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n');
for (const governanceFile of governanceFiles) {
  assert.equal(sourceText.includes(path.basename(governanceFile)), false, path.basename(governanceFile));
}

console.log('v6 governance helper placement smoke passed');
