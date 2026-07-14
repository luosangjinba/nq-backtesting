import assert from 'node:assert/strict';
import {
  createSettingsRecord,
  DEFAULT_SETTINGS_INPUT,
  restoreSettingsPersistenceValue,
  SETTINGS_RECORD_VERSION,
  updateSettingsRecord,
} from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 7);
const customized = updateSettingsRecord(createSettingsRecord(), {
  chartDaySeparators: 'both',
  chartIctDaySeparatorColor: '#123456',
  chartIctDaySeparatorStyle: 'solid',
  chartTradingDaySeparatorColor: '#abcdef',
  chartTradingDaySeparatorStyle: 'dotted',
});
assert.equal(customized.chartDaySeparators, 'both');
assert.equal(customized.chartTradingDaySeparatorStyle, 'dotted');

assert.throws(
  () => updateSettingsRecord(customized, { chartDaySeparators: 'daily' }),
  /chartDaySeparators/,
);
assert.throws(
  () => updateSettingsRecord(customized, { chartIctDaySeparatorStyle: 'double' }),
  /chartIctDaySeparatorStyle/,
);

for (const version of [1, 2, 3, 4]) {
  const restored = restoreSettingsPersistenceValue({
    version,
    settings: { chartGrid: false },
  });
  assert.equal(restored.migrated, true);
  assert.equal(restored.settings.chartDaySeparators, DEFAULT_SETTINGS_INPUT.chartDaySeparators);
  assert.equal(
    restored.settings.chartTradingDaySeparatorColor,
    DEFAULT_SETTINGS_INPUT.chartTradingDaySeparatorColor,
  );
}

console.log('V6 Settings Day Separators model Step 412 smoke passed.');
