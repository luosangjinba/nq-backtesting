import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

for (const path of [
  'v6/src/shell/session-dashboard.js',
  'v6/src/shell/journal-surface.js',
  'v6/src/shell/sessions-surface.js',
]) {
  const source = await readFile(path, 'utf8');
  assert.doesNotMatch(source, /\.innerHTML\s*=/, path);
  assert.match(source, /safe-dom-render\.js/, path);
  assert.match(source, /replaceNodeChildren/, path);
}

console.log('v6 persisted data safe DOM static smoke passed');
