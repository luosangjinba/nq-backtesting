import * as bus from '../../event-bus.js';
import { onVisibleLogicalRangeChange } from '../../chart/chart-manager.js';
import * as store from '../../data/bar-store.js';
import { hasActiveReplaySession } from './replay-session-state.js';
import { loadPreviousReplaySessionPrefix } from './replay-session-loader.js';

const LEFT_EDGE_THRESHOLD_BARS = 12;

let initialized = false;
let inFlight = false;
let lastAttemptEarliestTimestamp = null;

function getEarliestLoadedTimestamp() {
  const bars = store.getDisplayBars();
  const timestamp = Number(bars[0]?.timestamp);
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function maybeLoadPreviousPrefix(range) {
  if (!hasActiveReplaySession() || inFlight || !range) return;
  if (!Number.isFinite(Number(range.from)) || Number(range.from) > LEFT_EDGE_THRESHOLD_BARS) return;

  const earliestTimestamp = getEarliestLoadedTimestamp();
  if (earliestTimestamp === null || earliestTimestamp === lastAttemptEarliestTimestamp) return;

  inFlight = true;
  lastAttemptEarliestTimestamp = earliestTimestamp;
  try {
    const result = await loadPreviousReplaySessionPrefix();
    if (result?.ok) {
      lastAttemptEarliestTimestamp = null;
      bus.emit('status:update', {
        text: `Loaded ${result.prefixBars.length} older replay bars`,
        isError: false,
      });
    } else if (result?.message) {
      bus.emit('status:update', { text: result.message, isError: true });
    }
  } catch (error) {
    bus.emit('status:update', {
      text: `Replay prefix load failed: ${error.message}`,
      isError: true,
    });
  } finally {
    inFlight = false;
  }
}

export function initReplaySessionPrefixLoader() {
  if (initialized) return;
  initialized = true;
  onVisibleLogicalRangeChange((range) => {
    maybeLoadPreviousPrefix(range);
  });
}
