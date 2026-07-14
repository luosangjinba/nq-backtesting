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
  symbolBordersVisible: true,
  symbolDownBodyColor: '#112233',
  symbolPricePrecision: '4',
  symbolUpWickColor: '#abcdef',
});
assert.equal(customized.symbolBordersVisible, true);
assert.equal(customized.symbolPricePrecision, '4');
assert.equal('symbolWicksVisible' in customized, false);
assert.throws(
  () => updateSettingsRecord(customized, { symbolWicksVisible: false }),
  /Unsupported settings keys/,
);
assert.throws(
  () => updateSettingsRecord(customized, { symbolPricePrecision: '7' }),
  /symbolPricePrecision/,
);
assert.throws(
  () => updateSettingsRecord(customized, { symbolDownBorderColor: 'red' }),
  /symbolDownBorderColor/,
);

for (const version of [1, 2, 3, 4]) {
  const restored = restoreSettingsPersistenceValue({
    version,
    settings: { chartGrid: false },
  });
  assert.equal(restored.migrated, true);
  assert.equal(restored.settings.symbolPricePrecision, DEFAULT_SETTINGS_INPUT.symbolPricePrecision);
  assert.equal(restored.settings.symbolUpBodyColor, DEFAULT_SETTINGS_INPUT.symbolUpBodyColor);
}

console.log('V6 Settings Symbol model Step 413 smoke passed.');
