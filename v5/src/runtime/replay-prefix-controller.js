import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import {
  DEFAULT_PREFIX_BARS,
  MAX_PREFIX_BARS,
  cloneReplayValue as clone,
  mergeSparseDisplayBars,
  splitRetainedPrefixChunks,
} from './replay-runtime-state.js';

export function createReplayPrefixController({
  getState,
  setState,
  dispatchCommand,
  chartSync,
  emitEvent,
  barDataCommands = BAR_DATA_COMMANDS,
  replayEvents = REPLAY_EVENTS,
}) {
  const loadedPrefixAnchors = new Set();
  const loadingPrefixAnchors = new Set();

  function resetAnchors() {
    loadedPrefixAnchors.clear();
    loadingPrefixAnchors.clear();
  }

  async function loadPrefixDemand({ prefixDemand } = {}) {
    const state = getState();
    if (!state.session || !state.sessionId) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'no-session',
      };
    }
    if (state.displayTimeframe !== state.replayTimeframe) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'display-window-demand-active',
      };
    }
    if (!prefixDemand?.anchor) {
      throw new Error('replay prefix demand anchor is required.');
    }

    const anchor = prefixDemand.anchor;
    if (loadedPrefixAnchors.has(anchor) || loadingPrefixAnchors.has(anchor)) {
      return {
        ...clone(state),
        loaded: false,
        reason: 'duplicate-prefix-demand',
      };
    }

    const suggestedCount = Number(prefixDemand.suggestedCount || DEFAULT_PREFIX_BARS);
    const count = Math.min(Math.max(1, Math.ceil(suggestedCount)), MAX_PREFIX_BARS);
    loadingPrefixAnchors.add(anchor);
    try {
      const window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
        instrument: state.session.instrument,
        timeframe: state.session.timeframe,
        sessionId: state.sessionId,
        paneId: 'primary',
        anchor,
        direction: 'backward',
        count,
      });
      const current = getState();
      const earliestLoadedTimestamp = Number(prefixDemand.earliestLoadedTimestamp);
      const bars = window.bars
        .filter((bar) => !Number.isFinite(earliestLoadedTimestamp) || Number(bar?.timestamp) < earliestLoadedTimestamp)
        .sort((left, right) => Number(left.timestamp) - Number(right.timestamp));
      const chunk = {
        anchor,
        earliestLoadedTimestamp: Number.isFinite(earliestLoadedTimestamp) ? earliestLoadedTimestamp : null,
        bars: clone(bars),
        window: {
          key: window.key,
          instrument: window.instrument,
          timeframe: window.timeframe,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
        },
      };
      const prefixChunks = [
        chunk,
        ...current.prefixChunks,
      ];
      const displayBars = mergeSparseDisplayBars(current.displayBars, prefixChunks, current.cursorTimestamp);
      await chartSync.renderDisplayBars(displayBars, current.cursorTimestamp);
      const nextState = setState({
        ...current,
        prefixChunks,
        displayBars: clone(displayBars),
      });
      loadedPrefixAnchors.add(anchor);
      const result = {
        ...clone(nextState),
        loaded: true,
        prefixChunk: clone(chunk),
      };
      emitEvent(replayEvents.PREFIX_CHUNK_LOADED, result);
      return result;
    } finally {
      loadingPrefixAnchors.delete(anchor);
    }
  }

  async function applyPrefixRetention({ visibleRange } = {}) {
    const state = getState();
    if (state.displayTimeframe !== state.replayTimeframe) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
        reason: 'display-window-demand-active',
      };
    }
    if (!state.session || !state.prefixChunks.length) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
      };
    }

    const { retained, released, releaseBefore } = splitRetainedPrefixChunks(state.prefixChunks, visibleRange);
    if (!released.length) {
      return {
        ...clone(state),
        released: false,
        releasedPrefixChunks: [],
        releaseBefore,
      };
    }

    for (const chunk of released) {
      if (chunk.window) {
        await dispatchCommand(barDataCommands.RELEASE_WINDOW, {
          instrument: chunk.window.instrument,
          timeframe: chunk.window.timeframe,
          anchor: chunk.window.anchor || chunk.anchor,
          direction: chunk.window.direction,
          count: chunk.window.estimatedBars,
        });
      }
      loadedPrefixAnchors.delete(chunk.anchor);
    }
    const current = getState();
    const displayBars = mergeSparseDisplayBars([
      ...current.prefixBars,
      current.startBar,
      ...current.displayBars.filter((bar) => Number(bar?.timestamp) >= Number(current.startBar?.timestamp)),
    ], retained, current.cursorTimestamp);
    await chartSync.renderDisplayBars(displayBars, current.cursorTimestamp);

    const releasedSummaries = released.map((chunk) => ({
      anchor: chunk.anchor,
      window: clone(chunk.window),
      barCount: chunk.bars?.length || 0,
    }));
    const nextState = setState({
      ...current,
      prefixChunks: retained,
      releasedPrefixChunks: [
        ...current.releasedPrefixChunks,
        ...releasedSummaries,
      ],
      displayBars: clone(displayBars),
    });
    const result = {
      ...clone(nextState),
      released: true,
      releasedPrefixChunks: clone(releasedSummaries),
      releaseBefore,
    };
    emitEvent(replayEvents.PREFIX_CHUNK_RELEASED, result);
    return result;
  }

  return {
    applyPrefixRetention,
    loadPrefixDemand,
    resetAnchors,
  };
}
