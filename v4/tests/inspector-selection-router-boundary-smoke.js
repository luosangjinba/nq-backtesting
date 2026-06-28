import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync('v4/src/ui/inspector-sidebar.js', 'utf8');
const routerSource = readFileSync('v4/src/ui/inspector/inspector-selection-router.js', 'utf8');

const routedEvents = [
  'pda:selected',
  'segment:selected',
  'segment-group:selected',
  'smt:selected',
  'order-setup-element:selected',
  'live-record-element:selected',
  'bars:loaded',
  'bars:cleared',
  'replay:changed',
];

for (const eventName of routedEvents) {
  assert.equal(
    sidebarSource.includes(`bus.on('${eventName}'`),
    false,
    `inspector-sidebar.js should not subscribe to ${eventName} directly`
  );
  assert.equal(
    routerSource.includes(`bus.on('${eventName}'`),
    true,
    `inspector-selection-router.js should subscribe to ${eventName}`
  );
}

assert.match(sidebarSource, /initInspectorSelectionRouter/);

console.log('inspector selection router boundary smoke passed');
