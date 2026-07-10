import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_DATA_PROJECTION_COMMANDS,
  CHART_ENTRY_AUTO_PLAY_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PANE_COMMANDS,
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

const HTF_TARGETS = Object.freeze(['1D', '1W', '1M']);

function ts(iso) {
  return Math.floor(Date.parse(iso) / 1000);
}

function bar(iso, price = 30600) {
  return {
    close: price + 0.25,
    high: price + 1,
    low: price - 1,
    open: price,
    timestamp: ts(iso),
  };
}

function isoFromBar(item) {
  return new Date(Number(item.timestamp ?? item.time) * 1000).toISOString();
}

function createProjectedCursorBucket(payload) {
  const cursorTimestamp = Number(payload.cursorTimestamp);
  const bucketStartTimestamp = ts('2026-05-31T18:00:00.000Z');
  return {
    bars: [{
      close: 30600.25,
      high: 30601,
      low: 30599,
      open: 30600,
      timestamp: bucketStartTimestamp,
    }],
    buckets: [{
      bucketEndTimestamp: ts('2026-07-31T17:59:59.000Z'),
      bucketStartTimestamp,
      complete: false,
      cursorCapped: true,
      firstSourceTimestamp: cursorTimestamp,
      inProgress: true,
      key: payload.targetTimeframe,
      lastSourceTimestamp: cursorTimestamp,
      sourceCount: payload.bars.length,
      unit: payload.targetTimeframe,
    }],
    paneId: payload.paneId,
    projectionRevision: 1,
    sourceBarCount: payload.bars.length,
    sourceTimeframe: payload.sourceTimeframe,
    targetTimeframe: payload.targetTimeframe,
  };
}

function installGapDataCommands({
  appendPayloads,
  displayTimeframe,
  loadPayloads,
  projectionPayloads,
}) {
  registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period: '1m', sync: false }));
  registerCommand(PANE_COMMANDS.GET_BY_ID, (paneId) => ({
    active: true,
    displayTimeframe,
    id: paneId,
    instrument: 'NQ',
    timeframe: '1m',
  }));
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
    const anchorIso = new Date(payload.anchor).toISOString();
    if (anchorIso >= '2026-06-01T17:00:00.000Z' && anchorIso < '2026-06-01T18:00:00.000Z') {
      return {
        bars: [bar('2026-06-01T16:59:00.000Z', 30596)],
        cacheHit: true,
        key: `backward-gap|${payload.anchor}`,
      };
    }
    return {
      bars: [bar(anchorIso, anchorIso >= '2026-06-01T18:00:00.000Z' ? 30600 : 30580)],
      cacheHit: true,
      key: `backward|${payload.anchor}`,
    };
  });
  registerCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, (payload) => {
    projectionPayloads.push({
      ...payload,
      bars: payload.bars.map((item) => ({ ...item })),
    });
    return createProjectedCursorBucket(payload);
  });
  registerCommand(CHART_DATA_COMMANDS.APPEND_BARS, (payload) => {
    appendPayloads.push({
      ...payload,
      bars: payload.bars.map((item) => ({ ...item })),
    });
    return {
      bars: payload.bars.map((item) => ({ ...item })),
      cursorTimestamp: payload.cursorTimestamp,
      paneId: payload.paneId,
      revision: appendPayloads.length,
    };
  });
}

async function runManualNextCase(displayTimeframe) {
  clearCommandsForTest();
  clearEventsForTest();

  const appendPayloads = [];
  const loadPayloads = [];
  const projectionPayloads = [];
  const registry = createRuntimeRegistry();
  registry.registerRuntime(createChartEntryManualNextRuntime());
  await registry.start({ emitEvent });

  let replayState = {
    cursorIndex: 85,
    cursorTime: '2026-06-01T16:59:00.000Z',
    endTime: '2026-06-05T16:00:00.000Z',
    previousAvailable: true,
    revealedCount: 86,
    sessionId: `manual-gap-${displayTimeframe}`,
    startTime: '2026-06-01T15:34:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 5787,
  };

  registerCommand(REPLAY_COMMANDS.GET_STATE, () => ({ ...replayState }));
  registerCommand(REPLAY_COMMANDS.NEXT, () => {
    replayState = {
      ...replayState,
      cursorIndex: replayState.cursorIndex + 1,
      cursorTime: '2026-06-01T17:00:00.000Z',
      revealedCount: replayState.revealedCount + 1,
    };
    return { ...replayState };
  });
  registerCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, ({ cursorTime }) => {
    const cursorIndex = Math.floor((Date.parse(cursorTime) - Date.parse(replayState.startTime)) / 60000);
    replayState = {
      ...replayState,
      cursorIndex,
      cursorTime,
      revealedCount: cursorIndex + 1,
    };
    return { ...replayState };
  });
  installGapDataCommands({
    appendPayloads,
    displayTimeframe,
    loadPayloads,
    projectionPayloads,
  });

  const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });

  assert.equal(state.status, 'advanced', state.error || `manual next should cross gap for ${displayTimeframe}`);
  assert.equal(state.advanced.replayState.cursorTime, '2026-06-01T18:00:00.000Z');
  assert.equal(state.advanced.replayState.cursorIndex, 146);
  assert.equal(state.advanced.replayState.revealedCount, 147);
  assert.equal(projectionPayloads.at(-1).targetTimeframe, displayTimeframe);
  assert.equal(projectionPayloads.at(-1).instrument, 'NQ');
  assert.deepEqual(projectionPayloads.at(-1).bars.map(isoFromBar), ['2026-06-01T18:00:00.000Z']);
  assert.equal(appendPayloads.at(-1).cursorTimestamp, ts('2026-05-31T18:00:00.000Z'));
  assert.equal(
    loadPayloads.some((payload) => payload.direction === 'forward' && payload.anchor === '2026-06-01T17:01:00.000Z'),
    true,
    `manual next should scan forward across gap for ${displayTimeframe}`,
  );

  await registry.stop();
  clearCommandsForTest();
  clearEventsForTest();
}

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

async function runAutoPlayCase(displayTimeframe) {
  clearCommandsForTest();
  clearEventsForTest();

  const appendPayloads = [];
  const loadPayloads = [];
  const projectionPayloads = [];
  const fakeTimer = createFakeTimer();
  const registry = createRuntimeRegistry();
  registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
  registry.registerRuntime(createChartEntryManualNextRuntime());
  registry.registerRuntime(createChartEntryAutoPlayRuntime({ timer: fakeTimer }));
  await registry.start({ emitEvent });

  installGapDataCommands({
    appendPayloads,
    displayTimeframe,
    loadPayloads,
    projectionPayloads,
  });

  await dispatchCommand(REPLAY_COMMANDS.LOAD_SESSION, {
    endTime: '2026-06-01T18:10:00.000Z',
    id: `auto-gap-${displayTimeframe}`,
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

  await fakeTimer.tick();
  let replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(replay.cursorTime, '2026-06-01T16:59:00.000Z');

  await fakeTimer.tick();
  replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(replay.cursorTime, '2026-06-01T18:00:00.000Z');

  await fakeTimer.tick();
  replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  assert.equal(replay.cursorTime, '2026-06-01T18:01:00.000Z');
  assert.equal(fakeTimer.intervalCount(), 1);
  assert.equal(projectionPayloads.at(-2).targetTimeframe, displayTimeframe);
  assert.deepEqual(projectionPayloads.at(-2).bars.map(isoFromBar), ['2026-06-01T18:00:00.000Z']);
  assert.equal(projectionPayloads.at(-1).targetTimeframe, displayTimeframe);
  assert.deepEqual(projectionPayloads.at(-1).bars.map(isoFromBar), ['2026-06-01T18:01:00.000Z']);
  assert.equal(
    loadPayloads.some((payload) => payload.direction === 'forward' && payload.anchor === '2026-06-01T17:01:00.000Z'),
    true,
    `auto-play should scan forward across gap for ${displayTimeframe}`,
  );

  await dispatchCommand(CHART_ENTRY_AUTO_PLAY_COMMANDS.STOP);
  await registry.stop();
  clearCommandsForTest();
  clearEventsForTest();
}

for (const displayTimeframe of HTF_TARGETS) {
  await runManualNextCase(displayTimeframe);
  await runAutoPlayCase(displayTimeframe);
}

console.log('v6 HTF replay gap regression pack step272 smoke passed');
