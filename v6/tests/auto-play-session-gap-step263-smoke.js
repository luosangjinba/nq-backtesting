import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartEntryAutoPlayRuntime } from '../src/chart-entry/chart-entry-auto-play-runtime.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

function createFakeTimer() {
  let nextId = 1;
  const intervals = new Map();
  return {
    clearInterval(id) {
      intervals.delete(id);
    },
    intervalCount() {
      return intervals.size;
    },
    intervalDelay() {
      return [...intervals.values()][0]?.delayMs ?? null;
    },
    setInterval(callback, delayMs) {
      const id = nextId;
      nextId += 1;
      intervals.set(id, { callback, delayMs });
      return id;
    },
    async tick() {
      [...intervals.values()].forEach((interval) => interval.callback());
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

function bar(iso, price = 30600) {
  return {
    close: price + 0.25,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp: Math.floor(Date.parse(iso) / 1000),
  };
}

function isoFromSeconds(timestamp) {
  return new Date(Number(timestamp) * 1000).toISOString();
}

function isNoBarGap(iso) {
  return iso >= '2026-06-01T17:00:00.000Z' && iso < '2026-06-01T18:00:00.000Z';
}

function sourceBarForAnchor(anchor) {
  const iso = new Date(anchor).toISOString();
  if (isNoBarGap(iso)) {
    return bar('2026-06-01T16:59:00.000Z', 30596);
  }
  return bar(iso, iso >= '2026-06-01T18:00:00.000Z' ? 30600 : 30580);
}

clearCommandsForTest();
clearEventsForTest();

const fakeTimer = createFakeTimer();
const appendPayloads = [];
const loadPayloads = [];
const registry = createRuntimeRegistry();
registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
registry.registerRuntime(createChartEntryManualNextRuntime());
registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
await registry.start({ emitEvent });

registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));
registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
  loadPayloads.push({ ...payload });
  if (payload.direction === 'forward') {
    return {
      bars: [
        bar('2026-06-01T18:00:00.000Z', 30600),
        bar('2026-06-01T18:01:00.000Z', 30602),
      ],
      cacheHit: false,
      key: `forward|${payload.anchor}`,
    };
  }
  return {
    bars: [sourceBarForAnchor(payload.anchor)],
    cacheHit: true,
    key: `backward|${payload.anchor}`,
  };
});
registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload) => {
  appendPayloads.push(payload);
  return {
    bars: payload.bars.map((item) => ({ ...item })),
    cursorTimestamp: payload.cursorTimestamp,
    paneId: payload.paneId,
    revision: appendPayloads.length,
  };
});

await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
  endTime: '2026-06-01T18:10:00.000Z',
  id: 'auto-play-gap',
  startTime: '2026-06-01T16:50:00.000Z',
  symbol: 'NQ',
  timeframe: '1m',
});
await dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, {
  cursorTime: '2026-06-01T16:58:00.000Z',
});

const started = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.START, {
  paneId: 'main',
  speed: 4,
});
assert.equal(started.status, 'playing');
assert.equal(started.playing, true);
assert.equal(fakeTimer.intervalDelay(), 125);

await fakeTimer.tick();
let autoState = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
let replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(autoState.status, 'playing');
assert.equal(autoState.lastTick.status, 'advanced');
assert.equal(replay.cursorTime, '2026-06-01T16:59:00.000Z');
assert.equal(replay.cursorIndex, 9);
assert.equal(replay.revealedCount, 10);

await fakeTimer.tick();
autoState = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(autoState.status, 'playing');
assert.equal(autoState.lastTick.status, 'advanced');
assert.equal(replay.cursorTime, '2026-06-01T18:00:00.000Z');
assert.equal(replay.cursorIndex, 70);
assert.equal(replay.revealedCount, 71);

await fakeTimer.tick();
autoState = await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.GET_STATE);
replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
assert.equal(autoState.status, 'playing');
assert.equal(autoState.playing, true);
assert.equal(autoState.lastTick.status, 'advanced');
assert.equal(replay.cursorTime, '2026-06-01T18:01:00.000Z');
assert.equal(replay.cursorIndex, 71);
assert.equal(replay.revealedCount, 72);
assert.equal(fakeTimer.intervalCount(), 1);
assert.equal(
  appendPayloads.some((payload) => payload.bars.some((item) => isoFromSeconds(item.timestamp ?? item.time) === '2026-06-01T18:00:00.000Z')),
  true,
  'auto-play should append the first post-gap source bar',
);
assert.equal(
  appendPayloads.some((payload) => payload.bars.some((item) => isoFromSeconds(item.timestamp ?? item.time) === '2026-06-01T18:01:00.000Z')),
  true,
  'auto-play should continue after the first post-gap source bar',
);
assert.equal(
  loadPayloads.some((payload) => payload.direction === 'forward' && payload.anchor === '2026-06-01T17:01:00.000Z'),
  true,
  'auto-play should inherit manual-next forward gap scanning',
);

await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
await registry.stop();
clearCommandsForTest();
clearEventsForTest();

console.log('v6 auto-play session gap step 263 smoke passed');
