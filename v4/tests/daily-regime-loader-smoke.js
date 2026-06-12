import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import * as bus from '../src/event-bus.js';
import { initDailyRegimeVixLoader } from '../src/daily-regime/daily-regime-vix-loader.js';
import {
  clearDailyRegimes,
  getDailyRegimeByDate,
} from '../src/daily-regime/daily-regime-store.js';

const dataRoot = path.resolve('v4');

globalThis.fetch = async (resource) => {
  const filePath = path.join(dataRoot, String(resource));
  try {
    const text = await readFile(filePath, 'utf8');
    return {
      ok: true,
      status: 200,
      async text() {
        return text;
      },
    };
  } catch {
    return {
      ok: false,
      status: 404,
      async text() {
        return '';
      },
    };
  }
};

function timestamp(dateKey) {
  return Date.parse(`${dateKey}T00:00:00Z`) / 1000;
}

function waitForLoader() {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

initDailyRegimeVixLoader();

clearDailyRegimes();
bus.emit('bars:loaded', {
  instrument: 'ES',
  requestedRange: {
    startTs: timestamp('2024-01-08'),
    endTs: timestamp('2024-01-08'),
  },
});
await waitForLoader();

let regime = getDailyRegimeByDate('2024-01-08', 'ES');
assert.equal(regime.instrument, 'ES');
assert.equal(regime.vixClose, 13.08, 'ES uses shared VIX close');
assert.equal(regime.trendClose, 4798, 'ES trend/range comes from daily-regime-es.csv');
assert.equal(regime.trendRegime, 'bull_trend');
assert.equal(regime.rangeRegime, 'large_range');

bus.emit('primary-instrument:changed', { instrument: 'YM', previousInstrument: 'ES' });
regime = getDailyRegimeByDate('2024-01-08', 'ES');
assert.equal(regime.vixClose, null, 'Main switch clears stale daily regime data before reload');

bus.emit('bars:loaded', {
  instrument: 'YM',
  requestedRange: {
    startTs: timestamp('2024-01-08'),
    endTs: timestamp('2024-01-08'),
  },
});
await waitForLoader();

regime = getDailyRegimeByDate('2024-01-08', 'YM');
assert.equal(regime.instrument, 'YM');
assert.equal(regime.vixClose, 13.08, 'missing trend/range file does not block shared VIX');
assert.equal(regime.trendRegime, 'unknown');
assert.equal(regime.rangeRegime, 'unknown');

console.log('daily regime loader smoke passed');
