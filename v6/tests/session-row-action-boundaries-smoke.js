import assert from 'node:assert/strict';
import {
  getRecentSessionRowActionBoundaries,
  getVisibleRecentSessionRowActions,
} from '../src/shell/session-row-action-boundaries.js';

const actions = getRecentSessionRowActionBoundaries();
const byId = new Map(actions.map((action) => [action.id, action]));

assert.deepEqual(
  actions.map((action) => action.id),
  ['summary', 'analytics', 'copy', 'order', 'journal', 'calendar'],
);

for (const action of actions) {
  assert.equal(typeof action.enabled, 'boolean');
  assert.equal(typeof action.owner, 'string');
  assert.ok(action.owner.length > 0, `${action.id} needs an owner boundary`);
  assert.equal(typeof action.reason, 'string');
  assert.ok(action.reason.length > 0, `${action.id} needs a boundary reason`);
}

assert.equal(byId.get('summary').owner, 'session-summary');
assert.equal(byId.get('summary').enabled, true);
assert.equal(byId.get('summary').status, 'surface-ready');
assert.match(byId.get('summary').reason, /read-only metadata/i);
assert.equal(byId.get('analytics').owner, 'session-analytics');
assert.equal(byId.get('analytics').enabled, false);
assert.equal(byId.get('copy').owner, 'session-repository');
assert.equal(byId.get('copy').enabled, false);
assert.match(byId.get('copy').reason, /metadata/i);
assert.equal(byId.get('order').owner, 'orders-runtime');
assert.equal(byId.get('order').enabled, false);
assert.equal(byId.get('journal').owner, 'journal-runtime');
assert.equal(byId.get('journal').enabled, false);
assert.equal(byId.get('calendar').owner, 'calendar-runtime');
assert.equal(byId.get('calendar').enabled, false);

assert.deepEqual(
  getVisibleRecentSessionRowActions().map((action) => action.id),
  ['summary', 'analytics', 'copy'],
);

console.log('v6 session row action boundaries smoke passed');
