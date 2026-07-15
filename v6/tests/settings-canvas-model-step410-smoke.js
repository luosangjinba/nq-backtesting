import assert from 'node:assert/strict';
import {
  createSettingsPersistenceValue,
  createSettingsRecord,
  DEFAULT_SETTINGS_INPUT,
  restoreSettingsPersistenceValue,
  SETTINGS_RECORD_VERSION,
  updateSettingsRecord,
} from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 9);
assert.deepEqual(createSettingsRecord(), DEFAULT_SETTINGS_INPUT);

const customized = updateSettingsRecord(createSettingsRecord(), {
  chartAxisBorderColor: '#abcdef',
  chartBackgroundColor: '#010203',
  chartCrosshairColor: '#112233',
  chartGrid: false,
  chartGridColor: '#223344',
  chartScaleFontSize: 16,
  chartScaleTextColor: '#ddeeff',
});
assert.equal(customized.chartScaleFontSize, 16);
assert.equal(customized.chartBackgroundColor, '#010203');

assert.throws(
  () => updateSettingsRecord(customized, { chartBackgroundColor: 'red' }),
  /six-digit hex color/,
);
assert.throws(
  () => updateSettingsRecord(customized, { chartScaleFontSize: 9 }),
  /integer from 10 to 20/,
);

const restoredV1 = restoreSettingsPersistenceValue({
  version: 1,
  settings: {
    chartGrid: false,
    displayTimezone: 'utc',
    showWatermark: false,
    theme: 'light',
  },
});
assert.equal(restoredV1.migrated, true);
assert.equal(restoredV1.settings.chartGrid, false);
assert.equal(restoredV1.settings.chartBackgroundColor, DEFAULT_SETTINGS_INPUT.chartBackgroundColor);
assert.deepEqual(createSettingsPersistenceValue(restoredV1.settings), {
  settings: restoredV1.settings,
  version: 9,
});

console.log('V6 Settings Canvas model Step 410 smoke passed.');
