import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const archiveSource = readFileSync('v4/src/review/review-archive.js', 'utf8');

for (const importPath of [
  './review-archive-date-keys.js',
  './review-archive-format.js',
]) {
  assert.match(archiveSource, new RegExp(importPath.replaceAll('.', '\\.')));
}

for (const forbidden of [
  'function validateReviewPayload',
  'function addDateKeyFromTimestamp',
  'function formatReviewExportStatus',
  'function formatReviewImportStatus',
]) {
  assert.equal(
    archiveSource.includes(forbidden),
    false,
    `review-archive.js should not own extracted helper: ${forbidden}`
  );
}

console.log('review archive domain boundary smoke passed');
