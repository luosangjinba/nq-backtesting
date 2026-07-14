import assert from 'node:assert/strict';
import { formatCanonicalTime, formatChartTime, formatHourMinute } from '../src/time-domain/time-presentation.js';
import { createSettingsRecord, SETTINGS_RECORD_VERSION, updateSettingsRecord } from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 8);
assert.equal(createSettingsRecord().timeFormat, '24h');
assert.equal(updateSettingsRecord(createSettingsRecord(), { timeFormat: '12h' }).timeFormat, '12h');
assert.throws(() => updateSettingsRecord(createSettingsRecord(), { timeFormat: 'locale' }), /timeFormat/);

assert.equal(formatHourMinute(0, 5, '24h'), '00:05');
assert.equal(formatHourMinute(0, 5, '12h'), '12:05 AM');
assert.equal(formatHourMinute(19, 0, '12h'), '7:00 PM');
assert.equal(formatCanonicalTime('19:00', '12h'), '7:00 PM');
const summerChart = Date.UTC(2026, 6, 13, 0, 0) / 1000;
assert.equal(formatChartTime(summerChart, { displayTimezone: 'exchange', timeFormat: '24h' }), '00:00');
assert.equal(formatChartTime(summerChart, { displayTimezone: 'utc', timeFormat: '24h' }), '04:00');
const winterChart = Date.UTC(2026, 0, 13, 0, 0) / 1000;
assert.equal(formatChartTime(winterChart, { displayTimezone: 'utc', timeFormat: '24h' }), '05:00');
console.log('V6 Time Presentation Step 416 smoke passed.');
