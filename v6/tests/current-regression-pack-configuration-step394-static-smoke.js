import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TARGET_HISTORY_PACK_OPTIONAL_TESTS,
  TARGET_HISTORY_PACK_TESTS,
} from './helpers/target-history-pack-cost-control.js';

const [foundationPack, targetPack] = await Promise.all([
  readFile('v6/tests/timeframe-replay-foundation-regression-pack-step276-smoke.js', 'utf8'),
  readFile('v6/tests/target-history-diagnostics-readout-regression-pack-step293-smoke.js', 'utf8'),
]);

assert.equal(TARGET_HISTORY_PACK_TESTS.length, 8);
assert.ok(TARGET_HISTORY_PACK_OPTIONAL_TESTS.length >= 4);
assert.match(foundationPack, /FOUNDATION_REPLAY_GAP_MODE/);
assert.match(foundationPack, /replay-gap-fast-browser-regression-pack-step387-smoke\.js/);
assert.match(foundationPack, /replay-gap-browser-regression-pack-step274-smoke\.js/);
assert.match(targetPack, /createTargetHistoryPackPlanFromEnv/);
assert.doesNotMatch(targetPack, /fetchV4TargetBars|registerCommand/);

console.log('v6 current regression pack configuration step394 static smoke passed');
