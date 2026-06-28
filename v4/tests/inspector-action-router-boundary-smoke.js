import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebarSource = readFileSync('v4/src/ui/inspector-sidebar.js', 'utf8');
const actionRouterSource = readFileSync('v4/src/ui/inspector/inspector-action-router.js', 'utf8');
const changeRouterSource = readFileSync('v4/src/ui/inspector/inspector-change-router.js', 'utf8');
const archiveActionsSource = readFileSync('v4/src/ui/inspector/inspector-archive-actions.js', 'utf8');

for (const importPath of [
  './inspector/inspector-action-router.js',
  './inspector/inspector-change-router.js',
  './inspector/inspector-archive-actions.js',
]) {
  assert.match(sidebarSource, new RegExp(importPath.replaceAll('.', '\\.')));
}

for (const forbidden of [
  'function handleInspectorClick',
  'function handleInspectorChange',
  "action === 'export-pda'",
  "action === 'import-pda-file'",
  "action === 'clear-saved'",
]) {
  assert.equal(
    sidebarSource.includes(forbidden),
    false,
    `inspector-sidebar.js should not own routed action/change logic: ${forbidden}`
  );
}

for (const expected of [
  "action === 'inspector-back'",
  "action === 'entry-context-catalog-open'",
  "action === 'calendar-prev-month'",
  'handleOrderReviewClick',
  'handlePdaClick',
]) {
  assert.match(
    actionRouterSource,
    new RegExp(expected.replaceAll('(', '\\(').replaceAll(')', '\\)')),
    `inspector-action-router.js should own click dispatch: ${expected}`
  );
}

for (const expected of [
  'archiveActions.handleChange',
  'handleOrderReviewChange',
  'handleSegmentChange',
  'handlePdaChange',
]) {
  assert.match(
    changeRouterSource,
    new RegExp(expected.replaceAll('.', '\\.')),
    `inspector-change-router.js should own change dispatch: ${expected}`
  );
}

for (const expected of [
  'exportPdaArchive',
  'importPdaArchive',
  'exportReviewArchive',
  'importReviewArchive',
  'migrateCurrentPdaAnnotationsToServer',
]) {
  assert.match(
    archiveActionsSource,
    new RegExp(expected),
    `inspector-archive-actions.js should own archive action: ${expected}`
  );
}

console.log('inspector action router boundary smoke passed');
