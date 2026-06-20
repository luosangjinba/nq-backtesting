import assert from 'node:assert/strict';

import {
  addCatalogItem,
  deactivateCatalogItem,
  getEntryContextCatalogStorageKey,
  initEntryContextCatalogStore,
  loadEntryContextCatalog,
  renameCatalogItem,
  resetEntryContextCatalog,
  resolveCatalogLabel,
} from '../src/entry-context/entry-context-catalog-store.js';
import {
  addOrderReview,
  clearOrderReviews,
  getOrderReviewById,
} from '../src/order/order-review-store.js';
import {
  addLiveRecord,
  getLiveRecordById,
  loadLiveRecords,
} from '../src/live-record/live-record-store.js';
import { renderOrderReviewDetailPanel } from '../src/ui/inspector/order-review-panel.js';
import { renderLiveRecordDetailPanel } from '../src/ui/inspector/live-record-panel.js';

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.window = { localStorage: globalThis.localStorage };

function renderSetup(id) {
  return renderOrderReviewDetailPanel(getOrderReviewById(id));
}

function renderLive(id) {
  return renderLiveRecordDetailPanel(getLiveRecordById(id));
}

resetEntryContextCatalog();
clearOrderReviews();
loadLiveRecords([]);

const pattern = addCatalogItem('patterns', 'Opening Sweep');
const session = addCatalogItem('sessions', 'Asia Open');
const lesson = addCatalogItem('lessons', 'Late Chase');

const setup = addOrderReview({
  id: 'catalog-setup-selected',
  entryPlan: {
    entryPatternIds: [pattern.id],
    entrySessionId: session.id,
  },
});
const live = addLiveRecord({
  id: 'catalog-live-selected',
  entryContext: {
    patternIds: [pattern.id],
    sessionId: session.id,
  },
  execution: {
    orders: [{
      id: 'order-1',
      lessonIds: [lesson.id],
    }],
  },
});

assert.ok(renderSetup(setup.id).includes('Opening Sweep'), 'added pattern appears in Order Setup Detail');
assert.ok(renderLive(live.id).includes('Opening Sweep'), 'added pattern appears in Live Record Detail');
assert.ok(renderSetup(setup.id).includes('Asia Open'), 'added session appears in Order Setup Detail');
assert.ok(renderLive(live.id).includes('Asia Open'), 'added session appears in Live Record Detail');
assert.ok(renderLive(live.id).includes('Late Chase'), 'added lesson appears on Live Record order');

renameCatalogItem('patterns', pattern.id, 'Opening Sweep Renamed');
renameCatalogItem('lessons', lesson.id, 'Late Chase Renamed');
assert.ok(renderSetup(setup.id).includes('Opening Sweep Renamed'), 'renamed pattern updates Order Setup Detail');
assert.ok(renderLive(live.id).includes('Opening Sweep Renamed'), 'renamed pattern updates Live Record Detail');
assert.ok(renderLive(live.id).includes('Late Chase Renamed'), 'renamed lesson updates Live Record order display');

deactivateCatalogItem('patterns', pattern.id);
const newSetup = addOrderReview({ id: 'catalog-setup-new' });
const newLive = addLiveRecord({ id: 'catalog-live-new' });
assert.ok(renderSetup(setup.id).includes('Opening Sweep Renamed'), 'inactive selected pattern remains resolvable in setup');
assert.ok(renderLive(live.id).includes('Opening Sweep Renamed'), 'inactive selected pattern remains resolvable in live record');
assert.equal(renderSetup(newSetup.id).includes('Opening Sweep Renamed'), false, 'inactive pattern is hidden from new setup selections');
assert.equal(renderLive(newLive.id).includes('Opening Sweep Renamed'), false, 'inactive pattern is hidden from new live selections');

const savedCatalog = globalThis.localStorage.getItem(getEntryContextCatalogStorageKey());
assert.ok(savedCatalog, 'catalog maintenance persists to localStorage');
loadEntryContextCatalog({ patterns: [], sessions: [], lessons: [] });
globalThis.localStorage.setItem(getEntryContextCatalogStorageKey(), savedCatalog);
initEntryContextCatalogStore();
assert.equal(resolveCatalogLabel('patterns', pattern.id), 'Opening Sweep Renamed', 'catalog restores renamed pattern from storage');
assert.equal(resolveCatalogLabel('lessons', lesson.id), 'Late Chase Renamed', 'catalog restores renamed lesson from storage');

const savedLive = getLiveRecordById(live.id);
loadLiveRecords([savedLive]);
assert.deepEqual(
  getLiveRecordById(live.id).execution.orders[0].lessonIds,
  [lesson.id],
  'live order lessonIds survive reload/restore normalization'
);

console.log('entry context catalog integration smoke ok');
