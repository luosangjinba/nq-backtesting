import * as bus from '../../event-bus.js';
import {
  getVisibleBarCapacity,
  getVisibleLogicalRange,
  onVisibleLogicalRangeChange,
} from '../../chart/chart-manager.js';
import * as store from '../../data/bar-store.js';
import { hasActiveReplaySession } from './replay-session-state.js';
import { loadPreviousReplaySessionPrefix } from './replay-session-loader.js';

const LEFT_EDGE_THRESHOLD_BARS = 12;
const PREFIX_BUFFER_SCREENS = 1.5;
const MAX_PREFIX_REQUEST_BARS = 5000;

let initialized = false;
let inFlight = false;
let lastAttemptEarliestTimestamp = null;
let pendingRange = null;

function getEarliestLoadedTimestamp() {
  const bars = store.getDisplayBars();
  const timestamp = Number(bars[0]?.timestamp);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getPrefixLoadPlan(range) {
  const from = Number(range?.from);
  const to = Number(range?.to);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > LEFT_EDGE_THRESHOLD_BARS) return null;
  const visibleBars = Math.max(1, Math.ceil(to - from) || getVisibleBarCapacity());
  const missingBars = Math.max(0, Math.ceil(LEFT_EDGE_THRESHOLD_BARS - from));
  const bufferBars = Math.ceil(visibleBars * PREFIX_BUFFER_SCREENS);
  const chunkBars = Math.min(MAX_PREFIX_REQUEST_BARS, Math.max(visibleBars, missingBars + bufferBars));
  return {
    chunkBars,
    retentionBars: bufferBars,
    visibleLogicalRange: { from, to },
  };
}

async function maybeLoadPreviousPrefix(range) {
  if (!hasActiveReplaySession() || !range) return;
  if (inFlight) {
    pendingRange = range;
    return;
  }
  const loadPlan = getPrefixLoadPlan(range);
  if (!loadPlan) return;

  const earliestTimestamp = getEarliestLoadedTimestamp();
  if (earliestTimestamp === null || earliestTimestamp === lastAttemptEarliestTimestamp) return;

  inFlight = true;
  lastAttemptEarliestTimestamp = earliestTimestamp;
  try {
    const result = await loadPreviousReplaySessionPrefix(loadPlan);
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
    const nextRange = pendingRange || getVisibleLogicalRange();
    pendingRange = null;
    if (getPrefixLoadPlan(nextRange)) {
      globalThis.setTimeout?.(() => maybeLoadPreviousPrefix(nextRange), 0);
    }
  }
}

export function initReplaySessionPrefixLoader() {
  if (initialized) return;
  initialized = true;
  onVisibleLogicalRangeChange((range) => {
    maybeLoadPreviousPrefix(range);
  });
}
