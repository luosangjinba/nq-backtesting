import assert from 'node:assert/strict';
import { validateReplayNavigationSettingsDraft } from '../src/shell/replay-navigation-settings.js';

assert.deepEqual(validateReplayNavigationSettingsDraft({}).preferences, {
  asianSession: '19:00',
  dayOpen: '18:00',
  londonSession: '02:00',
  newYorkSession: '09:30',
});
assert.equal(validateReplayNavigationSettingsDraft({ dayOpen: '24:00' }).valid, false);
assert.equal(validateReplayNavigationSettingsDraft({ londonSession: '2:00' }).valid, false);
assert.deepEqual(validateReplayNavigationSettingsDraft({ newYorkSession: '08:45' }), {
  error: null,
  preferences: {
    asianSession: '19:00',
    dayOpen: '18:00',
    londonSession: '02:00',
    newYorkSession: '08:45',
  },
  valid: true,
});

console.log('V6 replay navigation settings Step 406 smoke passed.');
