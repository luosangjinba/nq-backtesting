import assert from 'node:assert/strict';
import { planLeftwardTargetHistoryActivation } from '../src/chart-history/leftward-target-history-activation.js';

assert.deepEqual(planLeftwardTargetHistoryActivation({
  displayTimeframe: 1,
  paneId: 'main',
}), {
  paneId: 'main',
  reason: 'target-history-timeframe-below-policy',
  status: 'ignored',
  targetHistory: null,
  timeframe: '1m',
});

assert.equal(planLeftwardTargetHistoryActivation({
  displayTimeframe: 30,
  paneId: 'main',
}).status, 'enabled');

assert.equal(planLeftwardTargetHistoryActivation({
  displayTimeframe: 15,
  paneId: 'main',
}).status, 'ignored');

assert.deepEqual(planLeftwardTargetHistoryActivation({
  displayTimeframe: 60,
  paneId: 'main',
}), {
  displayTimeframe: 60,
  paneId: 'main',
  reason: 'target-history-high-timeframe-policy',
  status: 'enabled',
  targetHistory: {
    enabled: true,
    policy: 'high-timeframe-leftward-history',
    reason: 'target-history-high-timeframe-policy',
  },
  timeframe: '1h',
});

assert.deepEqual(planLeftwardTargetHistoryActivation({
  displayTimeframe: '8h',
  paneId: 'secondary',
}), {
  displayTimeframe: 480,
  paneId: 'secondary',
  reason: 'target-history-high-timeframe-policy',
  status: 'enabled',
  targetHistory: {
    enabled: true,
    policy: 'high-timeframe-leftward-history',
    reason: 'target-history-high-timeframe-policy',
  },
  timeframe: '8h',
});

assert.deepEqual(planLeftwardTargetHistoryActivation({
  displayTimeframe: '1D',
  paneId: 'main',
}), {
  displayTimeframe: '1D',
  paneId: 'main',
  reason: 'target-history-high-timeframe-policy',
  status: 'enabled',
  targetHistory: {
    enabled: true,
    policy: 'high-timeframe-leftward-history',
    reason: 'target-history-high-timeframe-policy',
  },
  timeframe: '1D',
});

assert.deepEqual(planLeftwardTargetHistoryActivation({
  displayTimeframe: 480,
  enabled: false,
  paneId: 'main',
}), {
  paneId: 'main',
  reason: 'target-history-activation-disabled',
  status: 'disabled',
  targetHistory: null,
});

assert.throws(
  () => planLeftwardTargetHistoryActivation({ displayTimeframe: 480 }),
  /paneId must be a non-empty string/,
);

console.log('v6 leftward target history activation step286 smoke passed');
