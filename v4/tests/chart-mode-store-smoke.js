import assert from 'node:assert/strict';
import {
  CHART_MODES,
  enterHistoryMode,
  enterLegacyReplayMode,
  getChartMode,
  isChartMode,
  normalizeChartMode,
  setChartMode,
} from '../src/runtime/chart-mode-store.js';

assert.equal(getChartMode(), CHART_MODES.HISTORY);
assert.equal(normalizeChartMode('bad-mode'), CHART_MODES.HISTORY);

assert.equal(enterLegacyReplayMode({ source: 'smoke' }), CHART_MODES.LEGACY_REPLAY);
assert.equal(getChartMode(), CHART_MODES.LEGACY_REPLAY);
assert.equal(isChartMode(CHART_MODES.LEGACY_REPLAY), true);

assert.equal(setChartMode('bad-mode'), CHART_MODES.HISTORY);
assert.equal(getChartMode(), CHART_MODES.HISTORY);
assert.equal(enterHistoryMode({ source: 'smoke' }), CHART_MODES.HISTORY);

console.log('chart mode store smoke passed');
