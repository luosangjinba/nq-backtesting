import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [transport, presentation] = await Promise.all([
  readFile('v6/src/shell/replay-transport.js', 'utf8'),
  readFile('v6/src/shell/replay-transport-presentation.js', 'utf8'),
]);

assert.match(transport, /renderReplayTransport\(root, state\)/);
assert.doesNotMatch(transport, /aria-valuetext|Replay step period|v6TransportPreviousAvailable/);
assert.match(presentation, /aria-valuetext/);
assert.match(presentation, /Replay step period/);
assert.match(presentation, /v6TransportPreviousAvailable/);
assert.doesNotMatch(presentation, /dispatchCommand|subscribeEvent|PLAYBACK_PERIOD_COMMANDS|REPLAY_COMMANDS|CHART_ENTRY_/);

console.log('v6 replay transport presentation boundary smoke passed');
