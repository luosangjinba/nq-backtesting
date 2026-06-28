import assert from 'node:assert/strict';
import {
  CHART_MODE_SOURCES,
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
assert.equal(normalizeChartMode(CHART_MODES.FX_REPLAY), CHART_MODES.FX_REPLAY);
assert.equal(CHART_MODE_SOURCES.LEGACY_REPLAY_SLICE, 'legacy-replay-slice');

assert.equal(enterLegacyReplayMode({ source: CHART_MODE_SOURCES.LEGACY_REPLAY_SLICE }), CHART_MODES.LEGACY_REPLAY);
assert.equal(getChartMode(), CHART_MODES.LEGACY_REPLAY);
assert.equal(isChartMode(CHART_MODES.LEGACY_REPLAY), true);

assert.equal(setChartMode('bad-mode'), CHART_MODES.HISTORY);
assert.equal(getChartMode(), CHART_MODES.HISTORY);
assert.equal(enterHistoryMode({ source: 'smoke' }), CHART_MODES.HISTORY);

console.log('chart mode store smoke passed');
