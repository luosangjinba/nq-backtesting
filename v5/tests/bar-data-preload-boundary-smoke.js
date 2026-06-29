import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { clearCommandsForTest, dispatchCommand } from '../src/runtime/commands.js';
import { clearEventsForTest } from '../src/runtime/events.js';
import { BAR_DATA_COMMANDS, createBarDataRuntime } from '../src/runtime/bar-data-runtime.js';

const repoRoot = resolve('.');
const setupRouteSource = readFileSync(
  resolve(repoRoot, 'v5/src/features/session-setup/session-setup-route.js'),
  'utf8'
);
const sessionRuntimeSource = readFileSync(
  resolve(repoRoot, 'v5/src/runtime/session-runtime.js'),
  'utf8'
);

assert.equal(
  setupRouteSource.includes('barData.loadWindow'),
  false,
  'session setup must not load bars while creating a session'
);
assert.equal(
  sessionRuntimeSource.includes('barData.loadWindow'),
  false,
  'session creation runtime must not load bars'
);

clearCommandsForTest();
clearEventsForTest();

let fetchCalled = false;
const runtime = createBarDataRuntime({
  maxBarsPerWindow: 500,
  fetchBars: async () => {
    fetchCalled = true;
    return { bars: [] };
  },
});
runtime.start();

await assert.rejects(
  () => dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
    instrument: 'NQ',
    timeframe: 1,
    start: '2026-06-01T09:30:00.000Z',
    end: '2026-06-05T16:00:00.000Z',
  }),
  /limit 500/
);
assert.equal(fetchCalled, false, 'oversized full-range requests must fail before fetch');

runtime.stop();

console.log('v5 bar data preload boundary smoke passed');
