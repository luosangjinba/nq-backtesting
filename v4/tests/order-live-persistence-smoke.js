import assert from 'node:assert/strict';

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
globalThis.window = {
  location: { protocol: 'http:', hostname: '127.0.0.1' },
  localStorage: globalThis.localStorage,
};

const orderStore = await import('../src/order/order-review-store.js');
const orderPersistence = await import('../src/order/order-review-persistence.js');
const liveStore = await import('../src/live-record/live-record-store.js');
const livePersistence = await import('../src/live-record/live-record-persistence.js');
const { getInstrumentStorageKey } = await import('../src/storage/instrument-storage.js');

const order = {
  id: 'order_1',
  instrument: 'NQ',
  setupThesis: {
    eventType: 'other',
    timeframe: '1M',
    linkedObjectRefs: [{ type: 'pda', id: 'pda_1', role: 'context' }],
  },
  entryPlan: {
    direction: 'long',
    entryTimestamp: 1780000000,
    entryPrice: 30400,
  },
  resultReview: {
    result: 'unknown',
  },
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

const liveRecord = {
  id: 'live_1',
  instrument: 'NQ',
  anchor: { timestamp: 1780000000, timeframe: '1M', price: 30400 },
  execution: {
    entry: { timestamp: 1780000000, price: 30400 },
    targets: [],
  },
  linkedObjectRefs: [{ type: 'order-setup', id: 'order_1', role: 'context' }],
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

const orderStorageKey = getInstrumentStorageKey(orderPersistence.getOrderReviewStorageKeyBase(), 'NQ');
globalThis.localStorage.setItem(orderStorageKey, JSON.stringify({
  version: 1,
  savedAt: 1780000000001,
  instrument: 'NQ',
  orderReviews: [order, { id: 'draft_order', source: 'draft' }],
}));
orderPersistence.restoreOrderReviews('NQ', { syncServer: false });
assert.equal(orderStore.getOrderReviews().length, 1);
assert.equal(orderStore.getOrderReviews()[0].id, 'order_1');

const orderPutCalls = [];
await orderPersistence.saveOrderReviewsToServer('NQ', null, {
  fetchImpl: async (url, options = {}) => {
    orderPutCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(orderPutCalls.length, 1);
let body = JSON.parse(orderPutCalls[0].options.body);
assert.equal(body.domain, orderPersistence.getOrderReviewWorkspaceDomain());
assert.equal(body.instrument, 'NQ');
assert.equal(body.payload.orderReviews.length, 1);

orderStore.loadOrderReviews([]);
await orderPersistence.syncOrderReviewsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=order-reviews&instrument=NQ$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          found: true,
          domain: 'order-reviews',
          instrument: 'NQ',
          payload: { version: 1, savedAt: 1780000000001, instrument: 'NQ', orderReviews: [order] },
        };
      },
    };
  },
});
assert.equal(orderStore.getOrderReviews().length, 1);
assert.equal(orderStore.getOrderReviews()[0].id, 'order_1');

const liveStorageKey = livePersistence.getLiveRecordStorageKey('NQ');
globalThis.localStorage.setItem(liveStorageKey, JSON.stringify({
  version: 1,
  savedAt: 1780000000001,
  instrument: 'NQ',
  liveRecords: [liveRecord, { ...liveRecord, id: 'es_live', instrument: 'ES' }],
}));
livePersistence.restoreLiveRecords('NQ', { syncServer: false });
assert.equal(liveStore.getLiveRecords().length, 1);
assert.equal(liveStore.getLiveRecords()[0].id, 'live_1');

const livePutCalls = [];
await livePersistence.saveLiveRecordsToServer('NQ', null, {
  fetchImpl: async (url, options = {}) => {
    livePutCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(livePutCalls.length, 1);
body = JSON.parse(livePutCalls[0].options.body);
assert.equal(body.domain, livePersistence.getLiveRecordWorkspaceDomain());
assert.equal(body.instrument, 'NQ');
assert.equal(body.payload.liveRecords.length, 1);

liveStore.loadLiveRecords([]);
await livePersistence.syncLiveRecordsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=live-records&instrument=NQ$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          found: true,
          domain: 'live-records',
          instrument: 'NQ',
          payload: { version: 1, savedAt: 1780000000001, instrument: 'NQ', liveRecords: [liveRecord] },
        };
      },
    };
  },
});
assert.equal(liveStore.getLiveRecords().length, 1);
assert.equal(liveStore.getLiveRecords()[0].id, 'live_1');

console.log('order live persistence smoke passed');
