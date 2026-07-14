import assert from 'node:assert/strict';
import {
  createSettingsRecord,
  DEFAULT_SETTINGS_INPUT,
  restoreSettingsPersistenceValue,
  SETTINGS_RECORD_VERSION,
  updateSettingsRecord,
} from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 8);
const customized = updateSettingsRecord(createSettingsRecord(), {
  statusBackgroundColor: '#112233',
  statusBackgroundOpacityPercent: 65,
  statusBarChangeVisible: false,
  statusOhlcVisible: false,
  statusTitleMode: 'hidden',
});
assert.equal(customized.statusBackgroundColor, '#112233');
assert.equal(customized.statusBackgroundOpacityPercent, 65);
assert.equal(customized.statusBarChangeVisible, false);
assert.equal(customized.statusOhlcVisible, false);
assert.equal(customized.statusTitleMode, 'hidden');
assert.throws(
  () => updateSettingsRecord(customized, { statusTitleMode: 'description' }),
  /statusTitleMode/,
);
assert.throws(
  () => updateSettingsRecord(customized, { statusBackgroundOpacityPercent: 101 }),
  /statusBackgroundOpacityPercent/,
);

for (const version of [1, 2, 3, 4, 5]) {
  const restored = restoreSettingsPersistenceValue({
    version,
    settings: { chartGrid: false },
  });
  assert.equal(restored.migrated, true);
  assert.equal(restored.settings.statusTitleMode, DEFAULT_SETTINGS_INPUT.statusTitleMode);
  assert.equal(restored.settings.statusOhlcVisible, DEFAULT_SETTINGS_INPUT.statusOhlcVisible);
}

console.log('V6 Settings Status model Step 414 smoke passed.');
