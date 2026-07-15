import assert from 'node:assert/strict';
import { formatCanonicalTime, formatChartDateTime, formatChartTime, formatDateParts, formatHourMinute, parseDisplayedTime } from '../src/time-domain/time-presentation.js';
import { createSettingsRecord, restoreSettingsPersistenceValue, SETTINGS_RECORD_VERSION, updateSettingsRecord } from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 9);
assert.equal(createSettingsRecord().timeFormat, '24h');
assert.equal(createSettingsRecord().dateFormat, 'yyyy/mm/dd');
assert.equal(createSettingsRecord().showDayOfWeek, true);
assert.equal(updateSettingsRecord(createSettingsRecord(), { timeFormat: '12h' }).timeFormat, '12h');
assert.throws(() => updateSettingsRecord(createSettingsRecord(), { timeFormat: 'locale' }), /timeFormat/);
assert.throws(() => updateSettingsRecord(createSettingsRecord(), { dateFormat: 'yy/mm/dd' }), /dateFormat/);
const restoredV8 = restoreSettingsPersistenceValue({
  version: 8,
  settings: { displayTimezone: 'utc', timeFormat: '12h' },
});
assert.equal(restoredV8.migrated, true);
assert.equal(restoredV8.settings.dateFormat, 'yyyy/mm/dd');
assert.equal(restoredV8.settings.showDayOfWeek, true);

assert.equal(formatHourMinute(0, 5, '24h'), '00:05');
assert.equal(formatHourMinute(0, 5, '12h'), '12:05 AM');
assert.equal(formatHourMinute(19, 0, '12h'), '7:00 PM');
assert.equal(formatCanonicalTime('19:00', '12h'), '7:00 PM');
assert.equal(parseDisplayedTime('7:00 PM', '12h'), '19:00');
assert.equal(parseDisplayedTime('12:05 AM', '12h'), '00:05');
assert.equal(parseDisplayedTime('08:45', '12h'), '08:45');
assert.equal(parseDisplayedTime('7:00 PM', '24h'), null);
const summerChart = Date.UTC(2026, 6, 13, 0, 0) / 1000;
assert.equal(formatChartTime(summerChart, { displayTimezone: 'exchange', timeFormat: '24h' }), '00:00');
assert.equal(formatChartTime(summerChart, { displayTimezone: 'utc', timeFormat: '24h' }), '04:00');
const winterChart = Date.UTC(2026, 0, 13, 0, 0) / 1000;
assert.equal(formatChartTime(winterChart, { displayTimezone: 'utc', timeFormat: '24h' }), '05:00');
assert.equal(formatDateParts({ day: 14, month: 7, year: 2026 }), '2026/07/14');
assert.equal(formatDateParts({ day: 14, month: 7, year: 2026 }, 'yyyy-mm-dd'), '2026-07-14');
assert.equal(formatDateParts({ day: 14, month: 7, year: 2026 }, 'dd/mm/yyyy'), '14/07/2026');
assert.equal(formatDateParts({ day: 14, month: 7, year: 2026 }, 'mm/dd/yyyy'), '07/14/2026');
const crosshairChart = Date.UTC(2026, 6, 14, 22, 26) / 1000;
assert.equal(formatChartDateTime(crosshairChart), 'Tue 2026/07/14 22:26');
assert.equal(formatChartDateTime(crosshairChart, {
  dateFormat: 'dd/mm/yyyy',
  showDayOfWeek: false,
  timeFormat: '12h',
}), '14/07/2026 10:26 PM');
assert.equal(formatChartDateTime(crosshairChart, {
  displayTimezone: 'utc',
}), 'Wed 2026/07/15 02:26');
console.log('V6 Time Presentation Step 416 smoke passed.');
