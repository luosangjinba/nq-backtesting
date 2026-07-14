import assert from 'node:assert/strict';
import fs from 'node:fs';

const decision = fs.readFileSync(
  new URL('../docs/V6_COMPACT_REPLAY_STATUS_PRESENTATION_STEP430.md', import.meta.url),
  'utf8',
);

assert.match(decision, /Replay Runtime remains authoritative/);
assert.match(decision, /`Preparing replay…`/);
assert.match(decision, /`Replay ready`/);
assert.match(decision, /`Replay complete`/);
assert.match(decision, /`Replay unavailable`/);
assert.match(decision, /`Future data hidden`/);
assert.match(decision, /data-v6-replay-diagnostics/);
assert.match(decision, /version: 1/);
assert.match(decision, /must not\s+require hidden diagnostic text nodes/);
assert.doesNotMatch(decision, /Step 431 may change[^.]*Replay Runtime ownership/);

console.log('v6 compact Replay status presentation Step 430 smoke passed');
