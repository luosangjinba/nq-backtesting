import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const paths = [
  'v6/src/validation-domain/validation-artifacts.js',
  'v6/src/validation-domain/validation-lifecycle.js',
];
const source = (await Promise.all(paths.map((path) => readFile(path, 'utf8')))).join('\n');

for (const forbidden of [
  /app-contracts/,
  /runtime\/commands/,
  /replay\//,
  /bar-data\//,
  /chart-engine/,
  /LightweightCharts/,
  /\bdocument\b/,
  /\bwindow\b/,
  /localStorage/,
  /indexedDB/,
]) {
  assert.doesNotMatch(source, forbidden);
}

console.log('v6 validation domain boundary step463 static smoke passed');
