import assert from 'node:assert/strict';
import {
  applyEventRegimes,
  getCuratedEventTagsForDate,
} from '../v4/src/daily-regime/daily-regime-events.js';
import { EVENT_TAGS } from '../v4/src/daily-regime/daily-regime-types.js';

const table = {
  '2024-01-31': [EVENT_TAGS.FOMC, 'cpi', 'FOMC'],
  '2024-02-02': 'nfp',
};

assert.deepEqual(getCuratedEventTagsForDate('2024-01-31', table), [EVENT_TAGS.FOMC, EVENT_TAGS.CPI]);
assert.deepEqual(getCuratedEventTagsForDate('2024-02-02', table), [EVENT_TAGS.NFP]);
assert.deepEqual(getCuratedEventTagsForDate('2024-02-05', table), [EVENT_TAGS.NONE]);
assert.deepEqual(getCuratedEventTagsForDate('bad-date', table), [EVENT_TAGS.UNKNOWN]);

const regimes = applyEventRegimes([
  { date: '2024-01-31', instrument: 'NQ' },
  { date: '2024-02-05', instrument: 'NQ' },
], table);

assert.deepEqual(regimes[0].eventTags, [EVENT_TAGS.FOMC, EVENT_TAGS.CPI]);
assert.deepEqual(regimes[1].eventTags, [EVENT_TAGS.NONE]);
