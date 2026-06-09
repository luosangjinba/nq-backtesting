import assert from 'node:assert/strict';

globalThis.localStorage = {
  _data: new Map(),
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  },
  setItem(key, value) {
    this._data.set(key, String(value));
  },
  removeItem(key) {
    this._data.delete(key);
  },
};

const { clearAnnotations, loadAnnotations } = await import('../src/pda/pda-store.js');
const { clearSegments } = await import('../src/segment/segment-store.js');
const { clearSegmentGroups } = await import('../src/segment/segment-group-store.js');
const { getDisplayVisibility, shouldRenderPda, updateDisplayMode } = await import('../src/display/display-mode.js');

clearAnnotations();
clearSegments();
clearSegmentGroups();

loadAnnotations([
  {
    id: 'manual-fib-old',
    type: 'fib',
    source: 'manual',
    createdAt: 100,
    start: { timestamp: 1_704_896_400, price: 4890 },
    end: { timestamp: 1_704_900_000, price: 4910 },
  },
  {
    id: 'manual-fib-new',
    type: 'fib',
    source: 'manual',
    createdAt: 200,
    start: { timestamp: 1_704_903_600, price: 4880 },
    end: { timestamp: 1_704_907_200, price: 4920 },
  },
]);

updateDisplayMode({ mode: 'recent-workspace', recentCount: 1 });

const visibility = getDisplayVisibility();
assert.equal(visibility.visiblePdaIds.has('manual-fib-new'), true);
assert.equal(visibility.visiblePdaIds.has('manual-fib-old'), false);
assert.equal(shouldRenderPda({ id: 'manual-fib-new', type: 'fib' }), true);
assert.equal(shouldRenderPda({ id: 'manual-fib-old', type: 'fib' }), false);

console.log('display mode smoke passed');
