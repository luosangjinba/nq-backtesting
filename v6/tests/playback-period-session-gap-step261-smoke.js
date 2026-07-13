import assert from 'node:assert/strict';
import {
  BAR_DATA_COMMANDS,
  CHART_DATA_COMMANDS,
  CHART_ENTRY_MANUAL_NEXT_COMMANDS,
  PLAYBACK_PERIOD_COMMANDS,
  REPLAY_COMMANDS,
} from '../src/contracts/app-contracts.js';
import { createChartEntryManualNextRuntime } from '../src/chart-entry/chart-entry-manual-next-runtime.js';
import { createReplayRuntime } from '../src/replay/replay-runtime.js';
import {
  clearCommandsForTest,
  dispatchCommand,
  registerCommand,
} from '../src/runtime/commands.js';
import { clearEventsForTest, emitEvent } from '../src/runtime/events.js';
import { createRuntimeRegistry } from '../src/runtime/lifecycle.js';

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

async function runPeriodCase({
  expectedAppended,
  expectedFinalCursorTime,
  expectedFinalIndex,
  initialCursorTime,
  period,
}) {
  clearCommandsForTest();
  clearEventsForTest();
  const appendPayloads = [];
  const loadPayloads = [];
  const registry = createRuntimeRegistry();
  registry.registerRuntime(createReplayRuntime({ enableInternalTimer: false }));
  registry.registerRuntime(createChartEntryManualNextRuntime());
  await registry.start({ emitEvent });

  registerCommand(PLAYBACK_PERIOD_COMMANDS.GET_STATE, () => ({ period, sync: false }));
  registerCommand(BAR_DATA_COMMANDS.LOAD_WINDOW, (payload) => {
    loadPayloads.push({ ...payload });
    if (payload.direction === 'forward') {
      if (!isNoBarGap(new Date(payload.anchor).toISOString())) {
        return {
          bars: [sourceBarForAnchor(payload.anchor)],
          cacheHit: false,
          key: `forward|${payload.anchor}`,
        };
      }
      return {
        bars: [
          bar('2026-06-01T18:00:00.000Z', 30600),
          bar('2026-06-01T18:01:00.000Z', 30602),
          bar('2026-06-01T18:02:00.000Z', 30604),
          bar('2026-06-01T18:03:00.000Z', 30606),
          bar('2026-06-01T18:04:00.000Z', 30608),
          bar('2026-06-01T18:05:00.000Z', 30610),
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
    id: `playback-gap-${period}`,
    startTime: '2026-06-01T16:50:00.000Z',
    symbol: 'NQ',
    timeframe: '1m',
  });
  await dispatchCommand(REPLAY_COMMANDS.SET_CURSOR_TIME, { cursorTime: initialCursorTime });

  const state = await dispatchCommand(CHART_ENTRY_MANUAL_NEXT_COMMANDS.NEXT, { paneId: 'main' });
  const replay = await dispatchCommand(REPLAY_COMMANDS.GET_STATE);
  await registry.stop();
  clearCommandsForTest();
  clearEventsForTest();

  assert.equal(state.status, 'advanced', state.error || `${period} manual next should advance`);
  assert.equal(state.advanced.playbackPeriod, period);
  assert.equal(state.advanced.appendedBarCount, expectedAppended);
  assert.equal(state.advanced.replayState.cursorTime, expectedFinalCursorTime);
  assert.equal(state.advanced.replayState.cursorIndex, expectedFinalIndex);
  assert.equal(state.advanced.replayState.revealedCount, expectedFinalIndex + 1);
  assert.equal(replay.cursorTime, expectedFinalCursorTime);
  assert.equal(replay.cursorIndex, expectedFinalIndex);
  assert.equal(replay.revealedCount, expectedFinalIndex + 1);
  assert.equal(
    appendPayloads.some((payload) => payload.bars.some((item) => isoFromSeconds(item.timestamp ?? item.time) === '2026-06-01T18:00:00.000Z')),
    true,
    `${period} should append the first post-gap source bar`,
  );
  assert.equal(
    appendPayloads.some((payload) => payload.bars.some((item) => isoFromSeconds(item.timestamp ?? item.time) === expectedFinalCursorTime)),
    true,
    `${period} should append the final post-gap source bar`,
  );
  assert.equal(
    loadPayloads.some((payload) => payload.direction === 'forward' && payload.anchor === '2026-06-01T17:00:00.000Z'),
    true,
    `${period} should scan forward across the no-bar gap`,
  );
}

await runPeriodCase({
  expectedAppended: 5,
  expectedFinalCursorTime: '2026-06-01T18:01:00.000Z',
  expectedFinalIndex: 71,
  initialCursorTime: '2026-06-01T16:56:00.000Z',
  period: '5m',
});

await runPeriodCase({
  expectedAppended: 15,
  expectedFinalCursorTime: '2026-06-01T18:05:00.000Z',
  expectedFinalIndex: 75,
  initialCursorTime: '2026-06-01T16:50:00.000Z',
  period: '15m',
});

console.log('v6 playback period session gap step 261 smoke passed');
