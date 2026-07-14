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
assert.equal(initial.footer.session, 'Session pending');
assert.equal(initial.footer.noFuture, 'No future pending');

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
  close: 'C --',
  high: 'H --',
  low: 'L --',
  open: 'O --',
});
assert.equal(loaded.candleDirection, 'empty');
assert.equal(loaded.footer.cursor, 'Cursor 09:30');
assert.equal(loaded.footer.end, 'End 09:33');
assert.equal(loaded.footer.noFuture, 'No future 3 hidden');
assert.equal(loaded.footer.playback, 'Playback ready');
assert.equal(loaded.footer.revealed, 'Revealed 1/4');
assert.equal(loaded.footer.session, 'Session session-1');
assert.equal(loaded.footer.start, 'Start 09:30');
assert.equal(loaded.timestamp, '09:30');
const twelveHour = statusReadoutStateWithTimePresentation(loaded, {
  displayTimezone: 'exchange',
  timeFormat: '12h',
});
assert.equal(twelveHour.footer.cursor, 'Cursor 9:30 AM');
assert.equal(twelveHour.footer.end, 'End 9:33 AM');
assert.equal(twelveHour.timestamp, '9:30 AM');

const playing = statusReadoutStateFromReplayPayload({
  status: 'playing',
}, loaded);
assert.equal(playing.footer.playback, 'Playback playing');
assert.equal(playing.ohlc.close, 'C --');

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
  close: 'C --',
  high: 'H --',
  low: 'L --',
  open: 'O --',
});
assert.equal(chartDataChanged.footer.playback, 'Playback playing');
assert.equal(chartDataChanged.timestamp, '09:31');

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
