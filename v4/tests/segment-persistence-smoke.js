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

const segmentStore = await import('../src/segment/segment-store.js');
const groupStore = await import('../src/segment/segment-group-store.js');
const persistence = await import('../src/segment/segment-persistence.js');
const { getInstrumentStorageKey } = await import('../src/storage/instrument-storage.js');

const storageKey = getInstrumentStorageKey(persistence.getSegmentStorageKeyBase(), 'NQ');

const segmentA = {
  id: 'seg_a',
  source: 'manual',
  sourceChartId: 'primary',
  instrument: 'NQ',
  timeframe: '1H',
  start: { timestamp: 1780000000, price: 30400 },
  end: { timestamp: 1780003600, price: 30500 },
  pdaResponses: [{ pdaId: 'pda_1', relation: 'respected' }],
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

const segmentB = {
  ...segmentA,
  id: 'seg_b',
  start: { timestamp: 1780003600, price: 30500 },
  end: { timestamp: 1780007200, price: 30350 },
};

const composite = {
  id: 'group_1',
  type: 'composite-move',
  childSegmentIds: ['seg_a', 'seg_b'],
  targetSegmentId: 'seg_b',
  objective: 'break-previous-extreme',
  outcome: 'pending',
  notes: 'server smoke',
  createdAt: 1780000000000,
  updatedAt: 1780000000000,
};

globalThis.localStorage.setItem(storageKey, JSON.stringify({
  version: 2,
  savedAt: 1780000000001,
  instrument: 'NQ',
  segments: [segmentA, { id: 'draft_seg', source: 'draft' }],
  segmentGroups: [composite],
}));

persistence.restoreSegments('NQ', { syncServer: false });
assert.equal(segmentStore.getSegments().length, 1);
assert.equal(segmentStore.getSegments()[0].id, 'seg_a');
assert.equal(groupStore.getSegmentGroups().length, 1);
assert.deepEqual(new Set(groupStore.getSegmentGroups()[0].childSegmentIds), new Set(['seg_a', 'seg_b']));

segmentStore.loadSegments([segmentA, segmentB]);
groupStore.loadSegmentGroups([composite]);
const putCalls = [];
await persistence.saveSegmentsToServer('NQ', null, {
  fetchImpl: async (url, options = {}) => {
    putCalls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, found: true };
      },
    };
  },
});
assert.equal(putCalls.length, 1);
const putBody = JSON.parse(putCalls[0].options.body);
assert.equal(putBody.domain, persistence.getSegmentWorkspaceDomain());
assert.equal(putBody.instrument, 'NQ');
assert.equal(putBody.payload.segments.length, 2);
assert.equal(putBody.payload.segmentGroups[0].childSegmentIds.length, 2);

segmentStore.loadSegments([]);
groupStore.loadSegmentGroups([]);
await persistence.syncSegmentsFromServer('NQ', {
  fetchImpl: async (url, options = {}) => {
    assert.match(url, /\/v4\/workspace\?domain=market-segments&instrument=NQ$/);
    assert.equal(options.method, 'GET');
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          found: true,
          user_id: 'default',
          workspace_id: 'default',
          domain: 'market-segments',
          instrument: 'NQ',
          version: 2,
          savedAt: '2026-06-24T05:00:00Z',
          revision: '2026-06-24T05:00:00Z',
          payload: {
            version: 2,
            savedAt: 1780000000001,
            instrument: 'NQ',
            segments: [segmentA, segmentB],
            segmentGroups: [composite],
          },
        };
      },
    };
  },
});
assert.equal(segmentStore.getSegments().length, 2);
assert.equal(groupStore.getSegmentGroups().length, 1);
assert.deepEqual(groupStore.getSegmentGroups()[0].childSegmentIds, ['seg_a', 'seg_b']);

console.log('segment persistence smoke passed');
