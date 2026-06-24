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
globalThis.fetch = async () => ({
  ok: true,
  status: 200,
  async json() {
    return { ok: true, found: true };
  },
});

const { getInstrumentStorageKey } = await import('../src/storage/instrument-storage.js');
const chartStore = await import('../src/chart-notes/chart-note-store.js');
const chartPersistence = await import('../src/chart-notes/chart-note-persistence.js');
const dailyStore = await import('../src/time-reaction/daily-time-review-store.js');
const dailyPersistence = await import('../src/time-reaction/daily-time-review-persistence.js');
const overlayStore = await import('../src/time-overlays/time-overlay-store.js');
const overlayPersistence = await import('../src/time-overlays/time-overlay-persistence.js');
const eventNoteStore = await import('../src/economic-calendar/economic-event-note-store.js');
const eventNotePersistence = await import('../src/economic-calendar/economic-event-note-persistence.js');
const catalogStore = await import('../src/entry-context/entry-context-catalog-store.js');

function makeFetchRecorder(responseFactory) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      async json() {
        return responseFactory(url, options);
      },
    };
  };
  return { calls, fetchImpl };
}

const chartNote = {
  id: 'chart_note_1',
  instrument: 'NQ',
  timeframe: 1,
  timestamp: 1780306200,
  text: 'reaction note',
  createdAt: 1780306200000,
  updatedAt: 1780306200000,
};
globalThis.localStorage.setItem(getInstrumentStorageKey('v4:chart-notes', 'NQ'), JSON.stringify({
  version: 1,
  savedAt: 1780306200001,
  instrument: 'NQ',
  chartNotes: [chartNote],
}));
chartPersistence.restoreChartNotes('NQ', { syncServer: false });
assert.equal(chartStore.getChartNotes().length, 1);
assert.equal(chartStore.getChartNotes()[0].id, 'chart_note_1');

let recorder = makeFetchRecorder(() => ({ ok: true, found: true }));
await chartPersistence.saveChartNotesToServer('NQ', null, { fetchImpl: recorder.fetchImpl });
let body = JSON.parse(recorder.calls[0].options.body);
assert.equal(body.domain, chartPersistence.getChartNoteWorkspaceDomain());
assert.equal(body.instrument, 'NQ');
assert.equal(body.payload.chartNotes.length, 1);

chartStore.loadChartNotes([]);
recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: 'chart-notes',
  instrument: 'NQ',
  payload: { version: 1, savedAt: 1780306200001, instrument: 'NQ', chartNotes: [chartNote] },
}));
await chartPersistence.syncChartNotesFromServer('NQ', { fetchImpl: recorder.fetchImpl });
assert.equal(chartStore.getChartNotes()[0].id, 'chart_note_1');

const dailyReview = {
  id: 'dtr_1',
  date: '2026-06-01',
  instrument: 'NQ',
  dailyBias: { note: 'daily bias' },
  createdAt: 1780306200000,
  updatedAt: 1780306200000,
};
globalThis.localStorage.setItem(getInstrumentStorageKey('v4:daily-time-reviews', 'NQ'), JSON.stringify({
  version: 1,
  savedAt: 1780306200001,
  instrument: 'NQ',
  dailyTimeReviews: [dailyReview],
}));
dailyPersistence.restoreDailyTimeReviews('NQ', { syncServer: false });
assert.equal(dailyStore.getDailyTimeReviewsWithContent().length, 1);

recorder = makeFetchRecorder(() => ({ ok: true, found: true }));
await dailyPersistence.saveDailyTimeReviewsToServer('NQ', null, { fetchImpl: recorder.fetchImpl });
body = JSON.parse(recorder.calls[0].options.body);
assert.equal(body.domain, dailyPersistence.getDailyTimeReviewWorkspaceDomain());
assert.equal(body.payload.dailyTimeReviews.length, 1);

dailyStore.loadDailyTimeReviews([]);
recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: 'daily-time-reviews',
  instrument: 'NQ',
  payload: { version: 1, savedAt: 1780306200001, instrument: 'NQ', dailyTimeReviews: [dailyReview] },
}));
await dailyPersistence.syncDailyTimeReviewsFromServer('NQ', { fetchImpl: recorder.fetchImpl });
assert.equal(dailyStore.getDailyTimeReviewsWithContent()[0].id, 'dtr_1');

const overlaySettings = {
  enabled: true,
  eventTimes: [{ id: 'event_time_1', date: '', time: '09:30', label: '0930', enabled: true }],
  killzones: [{ id: 'killzone_1', date: '2026-06-01', startTime: '09:30', endTime: '10:30', label: 'AM', enabled: true }],
};
overlayStore.loadTimeOverlaySettings(overlaySettings);
recorder = makeFetchRecorder(() => ({ ok: true, found: true }));
await overlayPersistence.saveTimeOverlaySettingsToServer('NQ', null, { fetchImpl: recorder.fetchImpl });
body = JSON.parse(recorder.calls[0].options.body);
assert.equal(body.domain, overlayPersistence.getTimeOverlayWorkspaceDomain());
assert.equal(body.payload.settings.eventTimes.length, 1);

overlayStore.loadTimeOverlaySettings(null);
recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: 'time-overlays',
  instrument: 'NQ',
  payload: { version: 1, savedAt: 1780306200001, instrument: 'NQ', settings: overlaySettings },
}));
await overlayPersistence.syncTimeOverlaySettingsFromServer('NQ', { fetchImpl: recorder.fetchImpl });
assert.equal(overlayStore.getTimeOverlaySettings().killzones[0].id, 'killzone_1');

const eventNote = { eventId: 'event_1', note: 'FOMC review', updatedAt: 1780306200000 };
eventNoteStore.loadEconomicEventNotes([eventNote]);
recorder = makeFetchRecorder(() => ({ ok: true, found: true }));
await eventNotePersistence.saveEconomicEventNotesToServer('NQ', null, { fetchImpl: recorder.fetchImpl });
body = JSON.parse(recorder.calls[0].options.body);
assert.equal(body.domain, eventNotePersistence.getEconomicEventNoteWorkspaceDomain());
assert.equal(body.payload.notes.length, 1);

eventNoteStore.loadEconomicEventNotes([]);
recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: 'economic-event-notes',
  instrument: 'NQ',
  payload: { version: 1, savedAt: 1780306200001, instrument: 'NQ', notes: [eventNote] },
}));
await eventNotePersistence.syncEconomicEventNotesFromServer('NQ', { fetchImpl: recorder.fetchImpl });
assert.equal(eventNoteStore.getEconomicEventNotes()[0].eventId, 'event_1');

const catalog = {
  patterns: [{ id: 'pattern-a', label: 'Pattern A', active: true, sort: 10 }],
  sessions: [{ id: 'session-a', label: 'Session A', active: true, sort: 10 }],
  lessons: [{ id: 'lesson-a', label: 'Lesson A', active: true, sort: 10, lessonRoles: ['entry'] }],
};
catalogStore.loadEntryContextCatalog(catalog);
recorder = makeFetchRecorder(() => ({ ok: true, found: true }));
await catalogStore.saveEntryContextCatalogToServer(null, { fetchImpl: recorder.fetchImpl });
body = JSON.parse(recorder.calls[0].options.body);
assert.equal(body.domain, catalogStore.getEntryContextCatalogWorkspaceDomain());
assert.equal(body.instrument, null);
assert.equal(body.payload.catalog.patterns[0].id, 'pattern-a');

catalogStore.loadEntryContextCatalog({ patterns: [], sessions: [], lessons: [] });
recorder = makeFetchRecorder(() => ({
  ok: true,
  found: true,
  domain: 'entry-context-catalog',
  instrument: null,
  payload: { version: 1, savedAt: 1780306200001, catalog },
}));
await catalogStore.syncEntryContextCatalogFromServer({ fetchImpl: recorder.fetchImpl });
assert.equal(catalogStore.getEntryContextCatalog().lessons[0].id, 'lesson-a');

console.log('notes review domains persistence smoke passed');
