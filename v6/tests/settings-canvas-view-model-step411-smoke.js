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
  chartBottomMarginPercent: 12,
  chartNavigationVisibility: 'always',
  chartRightMarginBars: 20,
  chartTopMarginPercent: 15,
});
assert.equal(customized.chartNavigationVisibility, 'always');
assert.equal(customized.chartRightMarginBars, 20);

assert.throws(() => updateSettingsRecord(customized, {
  chartNavigationVisibility: 'sometimes',
}), /chartNavigationVisibility/);
assert.throws(() => updateSettingsRecord(customized, {
  chartTopMarginPercent: 41,
}), /integer from 0 to 40/);
assert.throws(() => updateSettingsRecord(customized, {
  chartRightMarginBars: -1,
}), /integer from 0 to 100/);

for (const version of [1, 2, 3, 4]) {
  const restored = restoreSettingsPersistenceValue({
    version,
    settings: { chartGrid: false },
  });
  assert.equal(restored.migrated, true);
  assert.equal(restored.settings.chartGrid, false);
  assert.equal(restored.settings.chartRightMarginBars, DEFAULT_SETTINGS_INPUT.chartRightMarginBars);
}

console.log('V6 Settings Canvas View model Step 411 smoke passed.');
