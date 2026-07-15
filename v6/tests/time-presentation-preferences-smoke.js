import assert from 'node:assert/strict';
import { createSettingsRecord } from '../src/settings/settings-model.js';
import { createTimePresentationChartOptions } from '../src/chart-engine/time-presentation-options.js';
import { createStatusReadoutState } from '../src/shell/status-readout-model.js';
import { normalizeTimePresentationPreferences } from '../src/time-domain/time-presentation-preferences.js';

const valid = normalizeTimePresentationPreferences({
  dateFormat: 'dd/mm/yyyy',
  displayTimezone: 'utc',
  showDayOfWeek: false,
  timeFormat: '12h',
});
assert.deepEqual(valid, {
  dateFormat: 'dd/mm/yyyy',
  displayTimezone: 'utc',
  showDayOfWeek: false,
  timeFormat: '12h',
});
assert.equal(Object.isFrozen(valid), true);

assert.deepEqual(normalizeTimePresentationPreferences({
  dateFormat: 'invalid',
  displayTimezone: 'invalid',
  timeFormat: 'invalid',
}), {
  dateFormat: 'yyyy/mm/dd',
  displayTimezone: 'exchange',
  showDayOfWeek: true,
  timeFormat: '24h',
});
assert.throws(
  () => normalizeTimePresentationPreferences({ displayTimezone: 'invalid' }, { strict: true }),
  /Settings displayTimezone is unsupported/,
);

const settings = createSettingsRecord(valid);
assert.equal(settings.displayTimezone, 'utc');
assert.equal(createTimePresentationChartOptions(settings).state.dateFormat, 'dd/mm/yyyy');
assert.equal(createStatusReadoutState({ timePresentation: settings }).timePresentation.timeFormat, '12h');

console.log('v6 time presentation preferences smoke passed');
