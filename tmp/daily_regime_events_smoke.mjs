import assert from 'node:assert/strict';
import {
  applyEconomicEventRegimes,
  applyEventRegimes,
  getCuratedEventTagsForDate,
  getEconomicEventTagsForDate,
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

const economicEvents = [
  { eventDate: '2024-01-05', title: 'Non-Farm Employment Change', impact: 'High' },
  { eventDate: '2024-01-05', title: 'Unemployment Rate', impact: 'High' },
  { eventDate: '2024-01-05', title: 'Average Hourly Earnings m/m', impact: 'High' },
  { eventDate: '2024-01-05', title: 'FOMC Member Barkin Speaks', impact: 'Medium' },
  { eventDate: '2024-01-11', title: 'Core CPI m/m', impact: 'High' },
  { eventDate: '2024-01-12', title: 'PPI m/m', impact: 'High' },
  { eventDate: '2024-01-31', title: 'Federal Funds Rate', impact: 'High' },
];

assert.deepEqual(getEconomicEventTagsForDate('2024-01-05', economicEvents), [EVENT_TAGS.NFP]);
assert.deepEqual(getEconomicEventTagsForDate('2024-01-11', economicEvents), [EVENT_TAGS.CPI]);
assert.deepEqual(getEconomicEventTagsForDate('2024-01-12', economicEvents), [EVENT_TAGS.PPI]);
assert.deepEqual(getEconomicEventTagsForDate('2024-01-31', economicEvents), [EVENT_TAGS.FOMC]);
assert.deepEqual(getEconomicEventTagsForDate('2024-01-15', economicEvents), [EVENT_TAGS.NONE]);

const economicRegimes = applyEconomicEventRegimes([
  { date: '2024-01-05', instrument: 'NQ', eventTags: [EVENT_TAGS.NONE] },
], economicEvents);
assert.deepEqual(economicRegimes[0].eventTags, [EVENT_TAGS.NFP]);
