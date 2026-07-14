import assert from 'node:assert/strict';
import { createSettingsRecord, restoreSettingsPersistenceValue, SETTINGS_RECORD_VERSION, updateSettingsRecord } from '../src/settings/settings-model.js';

assert.equal(SETTINGS_RECORD_VERSION, 7);
const customized = updateSettingsRecord(createSettingsRecord(), {
  currentPriceLineVisible: false,
  currentPriceNameVisible: false,
  currentPriceValueVisible: false,
});
assert.equal(customized.currentPriceLineVisible, false);
assert.equal(customized.currentPriceNameVisible, false);
assert.equal(customized.currentPriceValueVisible, false);
for (const version of [1, 2, 3, 4, 5, 6]) {
  const restored = restoreSettingsPersistenceValue({ version, settings: {} });
  assert.equal(restored.migrated, true);
  assert.equal(restored.settings.currentPriceLineVisible, true);
}
console.log('V6 Settings Scales model Step 415 smoke passed.');
