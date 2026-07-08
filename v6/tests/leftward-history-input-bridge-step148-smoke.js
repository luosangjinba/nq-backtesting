import assert from 'node:assert/strict';
import { CHART_HISTORY_COMMANDS } from '../src/contracts/app-contracts.js';
import { connectLeftwardHistoryInputBridge } from '../src/chart-history/leftward-history-input-bridge.js';

const dispatches = [];
let listener = null;
const chartSurface = {
  subscribeVisibleRangeChange(handler) {
    listener = handler;
    return () => {
      listener = null;
    };
  },
};

const bridge = connectLeftwardHistoryInputBridge({
  chartSurface,
  dispatchCommand(command, payload) {
    dispatches.push({ command, payload });
    return Promise.resolve({ status: 'loaded' });
  },
});

listener({ from: 2, paneId: 'main', to: 42 });
listener({ from: Number.NaN, paneId: 'main', to: 42 });
listener({ from: -3.2, paneId: '', to: 42 });
assert.deepEqual(dispatches, []);

listener({ from: -3.2, paneId: 'main', to: 42 });
assert.deepEqual(dispatches, [{
  command: CHART_HISTORY_COMMANDS.REQUEST_LEFT_EXTENSION,
  payload: {
    paneId: 'main',
    visibleRange: { from: -3.2, to: 42 },
  },
}]);

bridge.destroy();
assert.equal(listener, null);

assert.throws(
  () => connectLeftwardHistoryInputBridge({ dispatchCommand: () => {} }),
  /requires a chart surface/,
);
assert.throws(
  () => connectLeftwardHistoryInputBridge({ chartSurface, dispatchCommand: null }),
  /requires dispatchCommand/,
);

console.log('v6 leftward history input bridge step 148 smoke passed');
