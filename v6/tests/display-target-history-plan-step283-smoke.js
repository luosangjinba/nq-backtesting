import assert from 'node:assert/strict';
import { BAR_DATA_COMMANDS } from '../src/contracts/app-contracts.js';
import {
  planDisplayTargetHistoryWindow,
  shouldUseTargetBarsForDisplayHistory,
} from '../src/display-timeframe/display-timeframe-target-history-plan.js';

assert.equal(shouldUseTargetBarsForDisplayHistory({
  displayTimeframe: '8h',
  enabled: false,
  sourceTimeframe: 1,
}), false);

assert.equal(shouldUseTargetBarsForDisplayHistory({
  displayTimeframe: '1m',
  enabled: true,
  sourceTimeframe: 1,
}), false);

assert.equal(shouldUseTargetBarsForDisplayHistory({
  displayTimeframe: '8h',
  enabled: true,
  sourceTimeframe: 1,
}), true);

assert.equal(shouldUseTargetBarsForDisplayHistory({
  displayTimeframe: '1D',
  enabled: true,
  sourceTimeframe: 1,
}), true);

assert.deepEqual(planDisplayTargetHistoryWindow({
  displayTimeframe: '8H',
  enabled: false,
  end: '2026-06-02 00:00',
  instrument: 'NQ',
  paneId: 'main',
  sourceTimeframe: 1,
  start: '2026-06-01 00:00',
}), {
  command: null,
  reason: 'target-history-disabled',
  status: 'ignored',
});

assert.deepEqual(planDisplayTargetHistoryWindow({
  displayTimeframe: '8H',
  enabled: true,
  end: '2026-06-02 00:00',
  instrument: 'nq',
  paneId: 'main',
  sourceTimeframe: 1,
  start: '2026-06-01 00:00',
}), {
  command: BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
  paneId: 'main',
  reason: 'target-history-opt-in',
  status: 'planned',
  window: {
    end: '2026-06-02 00:00',
    instrument: 'NQ',
    start: '2026-06-01 00:00',
    timeframe: '8h',
  },
});

assert.deepEqual(planDisplayTargetHistoryWindow({
  displayTimeframe: '1d',
  enabled: true,
  end: '2026-06-05 18:00',
  instrument: 'NQ',
  paneId: 'secondary',
  sourceTimeframe: 1,
  start: '2026-06-01 18:00',
}), {
  command: BAR_DATA_COMMANDS.LOAD_TARGET_WINDOW,
  paneId: 'secondary',
  reason: 'target-history-opt-in',
  status: 'planned',
  window: {
    end: '2026-06-05 18:00',
    instrument: 'NQ',
    start: '2026-06-01 18:00',
    timeframe: '1D',
  },
});

assert.throws(() => planDisplayTargetHistoryWindow({
  displayTimeframe: '8h',
  enabled: true,
  end: '2026-06-02 00:00',
  instrument: 'NQ',
  paneId: '',
  sourceTimeframe: 1,
  start: '2026-06-01 00:00',
}), /paneId/);

console.log('v6 display target history plan step283 smoke passed');
