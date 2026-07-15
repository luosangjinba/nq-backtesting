import assert from 'node:assert/strict';
import {
  createStatusReadoutState,
  statusReadoutStateFromChartDataPayload,
  statusReadoutStateFromCrosshairPayload,
  statusReadoutStateFromDefaultWallPayload,
  statusReadoutStateFromReplayPayload,
  statusReadoutStateWithTimePresentation,
} from '../src/shell/status-readout-model.js';

const initial = createStatusReadoutState();
assert.equal(initial.title, 'NQ 1m');
assert.equal(initial.ohlc.open, 'O --');
assert.equal(initial.candleDirection, 'empty');
assert.deepEqual(initial.compactReplayStatus, {
  kind: 'preparing',
  message: 'Preparing replay…',
  protectionMessage: 'Future data hidden',
  protectionVisible: false,
});

const loaded = statusReadoutStateFromDefaultWallPayload({
  replayState: {
    cursorTime: '2026-06-01T09:30:00.000Z',
    endTime: '2026-06-01T09:33:00.000Z',
    revealedCount: 1,
    sessionId: 'session-1',
    startTime: '2026-06-01T09:30:00.000Z',
    status: 'ready',
    symbol: 'NQ',
    timeframe: '1m',
    totalBars: 4,
  },
  state: {
    latestBar: {
      close: 100.5,
      high: 101,
      low: 99,
      open: 100,
      timestamp: 1780306200,
    },
  },
});

assert.equal(loaded.title, 'NQ 1m');
assert.deepEqual(loaded.ohlc, {
  close: 'C 100.50',
  high: 'H 101.00',
  low: 'L 99.00',
  open: 'O 100.00',
});
assert.equal(loaded.candleDirection, 'up');
assert.deepEqual(loaded.compactReplayStatus, {
  kind: 'ready',
  message: 'Replay ready',
  protectionMessage: 'Future data hidden',
  protectionVisible: true,
});
assert.deepEqual(loaded.replayDiagnostics, {
  version: 1,
  sessionId: 'session-1',
  startTime: '2026-06-01T09:30:00.000Z',
  cursorTime: '2026-06-01T09:30:00.000Z',
  endTime: '2026-06-01T09:33:00.000Z',
  revealedCount: 1,
  totalBars: 4,
  hiddenCount: 3,
  runtimeStatus: 'ready',
});
assert.equal(loaded.timestamp, '09:30');
const twelveHour = statusReadoutStateWithTimePresentation(loaded, {
  displayTimezone: 'exchange',
  timeFormat: '12h',
});
assert.equal(twelveHour.timestamp, '9:30 AM');

const playing = statusReadoutStateFromReplayPayload({
  status: 'playing',
}, loaded);
assert.equal(playing.compactReplayStatus.message, 'Replay ready');
assert.equal(playing.replayDiagnostics.runtimeStatus, 'playing');
assert.equal(playing.ohlc.close, 'C 100.50');

const chartDataChanged = statusReadoutStateFromChartDataPayload({
  record: {
    bars: [
      {
        close: 101.5,
        high: 102,
        low: 100,
        open: 101,
        timestamp: 1780306260,
      },
    ],
  },
}, playing);
assert.deepEqual(chartDataChanged.ohlc, {
  close: 'C 101.50',
  high: 'H 102.00',
  low: 'L 100.00',
  open: 'O 101.00',
});
assert.equal(chartDataChanged.compactReplayStatus.message, 'Replay ready');
assert.equal(chartDataChanged.timestamp, '09:31');

const completed = statusReadoutStateFromReplayPayload({
  cursorTime: '2026-06-01T09:33:00.000Z',
  revealedCount: 4,
  status: 'ended',
}, chartDataChanged);
assert.equal(completed.compactReplayStatus.message, 'Replay complete');
assert.equal(completed.compactReplayStatus.protectionVisible, false);
assert.equal(completed.replayDiagnostics.hiddenCount, 0);

const unavailable = statusReadoutStateFromReplayPayload({ status: 'broken' }, loaded);
assert.equal(unavailable.compactReplayStatus.message, 'Replay unavailable');
assert.equal(unavailable.compactReplayStatus.kind, 'unavailable');

const crosshairChanged = statusReadoutStateFromCrosshairPayload({
  bar: {
    close: 101.5,
    high: 102,
    low: 100,
    open: 101,
    timestamp: 1780306260,
  },
  previousClose: 100.5,
}, chartDataChanged);
assert.deepEqual(crosshairChanged.ohlc, {
  close: 'C 101.50',
  high: 'H 102.00',
  low: 'L 100.00',
  open: 'O 101.00',
});
assert.equal(crosshairChanged.candleDirection, 'up');
assert.deepEqual(crosshairChanged.barChange, {
  absolute: '+1.00',
  percent: '+1.00%',
  text: '+1.00 (+1.00%)',
});

console.log('v6 status readout model smoke passed');
