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
    clear() {
      data.clear();
    },
  };
}

globalThis.localStorage = createMemoryStorage();
globalThis.window = { localStorage: globalThis.localStorage };

const { getInstrumentStorageKey, normalizeInstrumentForStorage } = await import('../src/storage/instrument-storage.js');
const { getPrimaryInstrument, setPrimaryInstrument } = await import('../src/data/primary-instrument-store.js');
const {
  clearChartNotes,
  getChartNoteForBar,
  upsertChartNote,
} = await import('../src/chart-notes/chart-note-store.js');
const {
  clearDailyTimeReviews,
  getDailyTimeReviewByDate,
  updateDailyTimeBiasField,
} = await import('../src/time-reaction/daily-time-review-store.js');
const {
  clearReplayHistory,
  getReplayHistory,
  saveReplayHistoryItem,
} = await import('../src/ui/replay-history-store.js');

assert.equal(getPrimaryInstrument(), 'NQ', 'default primary instrument remains NQ');
assert.equal(normalizeInstrumentForStorage('es'), 'ES', 'storage instrument normalization accepts ES');
assert.equal(normalizeInstrumentForStorage('bad'), 'NQ', 'unknown instruments fall back to NQ');
assert.equal(getInstrumentStorageKey('v4:pda-annotations', 'NQ'), 'v4:pda-annotations:NQ');
assert.equal(getInstrumentStorageKey('v4:pda-annotations', 'ES'), 'v4:pda-annotations:ES');

setPrimaryInstrument('ES');
assert.equal(getPrimaryInstrument(), 'ES', 'primary instrument can switch to ES');
assert.equal(getInstrumentStorageKey('v4:chart-notes'), 'v4:chart-notes:ES', 'default storage key follows current Main');
setPrimaryInstrument('NQ');

clearChartNotes();
upsertChartNote({ instrument: 'NQ', timeframe: 60, timestamp: 1_704_896_400, text: 'NQ note' });
upsertChartNote({ instrument: 'ES', timeframe: 60, timestamp: 1_704_896_400, text: 'ES note' });
assert.equal(getChartNoteForBar({ instrument: 'NQ', timeframe: 60, timestamp: 1_704_896_400 })?.text, 'NQ note');
assert.equal(getChartNoteForBar({ instrument: 'ES', timeframe: 60, timestamp: 1_704_896_400 })?.text, 'ES note');

clearDailyTimeReviews();
updateDailyTimeBiasField('2024-01-08', 'dailyBiasPrediction', 'NQ daily bias', 'NQ');
updateDailyTimeBiasField('2024-01-08', 'dailyBiasPrediction', 'ES daily bias', 'ES');
assert.equal(getDailyTimeReviewByDate('2024-01-08', 'NQ')?.bias.dailyBiasPrediction, 'NQ daily bias');
assert.equal(getDailyTimeReviewByDate('2024-01-08', 'ES')?.bias.dailyBiasPrediction, 'ES daily bias');

clearReplayHistory();
saveReplayHistoryItem({
  primary: { instrument: 'NQ', timeframe: 1, start: '2024-01-08', end: '2024-01-09' },
  replay: { enabled: true, cursorTimestamp: 1_704_896_400 },
}, { now: 1_000 });
saveReplayHistoryItem({
  primary: { instrument: 'ES', timeframe: 1, start: '2024-01-08', end: '2024-01-09' },
  replay: { enabled: true, cursorTimestamp: 1_704_896_400 },
}, { now: 2_000 });

assert.deepEqual(getReplayHistory('NQ').map((item) => item.primary.instrument), ['NQ']);
assert.deepEqual(getReplayHistory('ES').map((item) => item.primary.instrument), ['ES']);
clearReplayHistory('ES');
assert.deepEqual(getReplayHistory().map((item) => item.primary.instrument), ['NQ']);

console.log('primary instrument compatibility smoke passed');
