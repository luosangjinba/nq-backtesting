import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const doc = await readFile('v6/docs/V6_GOTO_REPLAY_NAVIGATION_PLAN_STEP402.md', 'utf8');

assert.match(doc, /session-global replay progression, not active-pane viewport inspection/i);
assert.match(doc, /Next Day Open \(`Y`\)/);
assert.match(doc, /Next Session \(`Z`\)/);
assert.match(doc, /America\/New_York/);
assert.match(doc, /Replay remains the sole cursor\/reveal owner/);
assert.match(doc, /Bar Data remains the sole bar requester\/cache owner/);
assert.match(doc, /Extract the smallest reusable `replay-cursor-materialization` boundary first/);
assert.match(doc, /Step 403 - Schedule Domain And Preferences Contract/);
assert.match(doc, /computes New York anchors with fixed UTC offsets/);

console.log('v6 go-to replay navigation plan step402 static smoke passed');
