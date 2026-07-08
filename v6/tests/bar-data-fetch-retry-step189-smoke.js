import assert from 'node:assert/strict';
import { createBarDataRuntime } from '../src/bar-data/bar-data-runtime.js';
import { BAR_DATA_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  clearCommandsForTest,
  dispatchCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

clearCommandsForTest();
clearEventsForTest();

let attempts = 0;
const runtime = createBarDataRuntime({
  fetchRetryDelayMs: 1,
  fetchRetryLimit: 2,
  fetchBars: async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new TypeError('Failed to fetch');
    }
    return {
      bars: [
        { close: 100.5, high: 101, low: 100, open: 100, timestamp: 1780306200 },
        { close: 101.5, high: 102, low: 101, open: 101, timestamp: 1780306260 },
      ],
    };
  },
});

const registry = createRuntimeRegistry();
registry.registerRuntime(runtime);
await registry.start({ emitEvent });

const loaded = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  count: 2,
  direction: 'backward',
  end: '2026-06-01T09:31:00.000Z',
  instrument: 'NQ',
  start: '2026-06-01T09:30:00.000Z',
  timeframe: 1,
});

assert.equal(attempts, 2);
assert.equal(loaded.cacheHit, false);
assert.deepEqual(loaded.bars.map((bar) => bar.timestamp), [1780306200, 1780306260]);

const cached = await dispatchCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, {
  count: 2,
  direction: 'backward',
  end: '2026-06-01T09:31:00.000Z',
  instrument: 'NQ',
  start: '2026-06-01T09:30:00.000Z',
  timeframe: 1,
});

assert.equal(attempts, 2);
assert.equal(cached.cacheHit, true);

await registry.stop();

console.log('v6 bar data fetch retry step 189 smoke passed');
