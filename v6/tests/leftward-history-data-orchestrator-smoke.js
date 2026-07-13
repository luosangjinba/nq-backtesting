import assert from 'node:assert/strict';
import { CHART_DATA_PROJECTION_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  createLeftwardSourcePrepend,
  replayCursorTimestamp,
} from '../src/chart-history/leftward-history-data-orchestrator.js';
import { clearCommandsForTest, registerCommand } from '../src/runtime/commands.js';

assert.equal(replayCursorTimestamp({ cursorTime: '2026-06-01T18:00:00.000Z' }), 1780336800);
clearCommandsForTest();
registerCommand(CHART_DATA_PROJECTION_COMMANDS.PROJECT, (payload) => ({
  ...payload,
  bars: [{ close: 2, timestamp: payload.bars[0].timestamp }],
}));

const result = await createLeftwardSourcePrepend({
  displayTimeframe: 5,
  loadedBars: [{ close: 1, timestamp: 1780336500 }],
  loadedWindow: { timeframe: 1 },
  paneId: 'main',
  paneRecord: { displayTimeframe: 5, instrument: 'NQ' },
  plannedWindow: { timeframe: 1 },
  replayState: {
    cursorTime: '2026-06-01T18:00:00.000Z',
    startTime: '2026-06-01T16:50:00.000Z',
    timeframe: 1,
  },
});
assert.equal(result.projectionRecord.targetTimeframe, 5);
assert.equal(result.bars[0].close, 2);
assert.equal(result.sourceBars[0].close, 1);

clearCommandsForTest();
console.log('v6 leftward history data orchestrator smoke passed');
