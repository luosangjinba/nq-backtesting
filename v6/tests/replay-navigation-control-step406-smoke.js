import assert from 'node:assert/strict';
import {
  normalizeReplayNavigationPaneIds,
  REPLAY_NAVIGATION_SHORTCUTS,
  resolveReplayNavigationShortcut,
} from '../src/shell/replay-navigation-control.js';

assert.deepEqual(normalizeReplayNavigationPaneIds(['main', 'secondary', 'main', '', null]), [
  'main',
  'secondary',
]);
assert.deepEqual(REPLAY_NAVIGATION_SHORTCUTS, {
  i: 'asian-session',
  l: 'london-session',
  n: 'new-york-session',
  y: 'next-day-open',
  z: 'next-session',
});

const workstation = { hidden: false };
const root = {
  querySelector: () => workstation,
  querySelectorAll: () => [],
};
const keyEvent = (key, extra = {}) => ({ key, target: { tagName: 'DIV' }, ...extra });

assert.equal(resolveReplayNavigationShortcut(keyEvent('Y'), { root }), 'next-day-open');
assert.equal(resolveReplayNavigationShortcut(keyEvent('z'), { root }), 'next-session');
assert.equal(resolveReplayNavigationShortcut(keyEvent('I', { ctrlKey: true }), { root }), null);
assert.equal(resolveReplayNavigationShortcut(keyEvent('L', { repeat: true }), { root }), null);
assert.equal(resolveReplayNavigationShortcut(keyEvent('N', { target: { tagName: 'INPUT' } }), { root }), null);
workstation.hidden = true;
assert.equal(resolveReplayNavigationShortcut(keyEvent('Y'), { root }), null);

console.log('V6 replay navigation control Step 406 smoke passed.');
