import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync('v4/src/ui/inspector-sidebar.js', 'utf8');
const openObjectSource = readFileSync('v4/src/ui/inspector/inspector-open-object-coordinator.js', 'utf8');

for (const importPath of [
  './inspector/inspector-shell.js',
  './inspector/inspector-navigation.js',
  './inspector/inspector-open-object-coordinator.js',
]) {
  assert.match(sidebarSource, new RegExp(importPath.replaceAll('.', '\\.')));
}

assert.match(openObjectSource, /inspector-panel-registry\.js/);

for (const forbidden of [
  'let sidebarEl',
  'let bodyEl',
  "document.createElement('aside')",
  "id = 'inspector-sidebar'",
  "classList.add('open')",
  "classList.remove('open')",
]) {
  assert.equal(
    sidebarSource.includes(forbidden),
    false,
    `inspector-sidebar.js should not own shell detail: ${forbidden}`
  );
}

console.log('inspector shell boundary smoke passed');
