import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const repository = await readFile(
  'v6/src/validation-persistence/validation-repository.js',
  'utf8',
);
const adapter = await readFile(
  'v6/src/validation-persistence/validation-persistence-adapters.js',
  'utf8',
);

for (const forbidden of [
  /app\.js/,
  /shell\//,
  /runtime\/commands/,
  /replay\//,
  /bar-data\//,
  /chart-engine/,
  /LightweightCharts/,
  /\bdocument\b/,
  /\bwindow\b/,
  /localStorage/,
]) {
  assert.doesNotMatch(`${repository}\n${adapter}`, forbidden);
}
assert.match(adapter, /indexedDB/);
assert.match(repository, /adapter\.transaction/);
assert.doesNotMatch(repository, /PERSISTENCE_COMMANDS/);

console.log('v6 validation persistence boundary step463 static smoke passed');
