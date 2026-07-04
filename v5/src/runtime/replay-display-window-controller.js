import { BAR_DATA_COMMANDS } from '../contracts/bar-data-contracts.js';
import { CHART_COMMANDS } from '../contracts/chart-contracts.js';
import { REPLAY_EVENTS } from '../contracts/replay-contracts.js';
import {
  MAX_PREFIX_BARS,
  MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS,
  alignTimestampToTimeframe,
  cloneReplayValue as clone,
  computePrefixBarCount,
  displayBarsEqual,
  earliestBarTimestamp,
  filterDisplayBarsForCursor,
  isoFromTimestamp,
  mergeDisplayBarsForCursor,
  normalizeTimeframe,
  previousWindowAnchor,
  shouldSeekEarlierDisplayWindow,
} from './replay-runtime-state.js';

export function createReplayDisplayWindowController({
  getState,
  setState,
  dispatchCommand,
  chartSync,
  ensureInitialSession,
  emitEvent,
  barDataCommands = BAR_DATA_COMMANDS,
  chartCommands = CHART_COMMANDS,
  replayEvents = REPLAY_EVENTS,
}) {
  const loadingDisplayWindowKeys = new Set();

  function displayContextSnapshot(sourceState = getState()) {
    return {
      sessionId: sourceState.sessionId,
      replayTimeframe: sourceState.replayTimeframe || sourceState.session?.timeframe || null,
      displayTimeframe: sourceState.displayTimeframe || sourceState.session?.timeframe || null,
      cursorTimestamp: sourceState.cursorTimestamp,
      displayBars: clone(sourceState.displayBars),
      viewportMetrics: clone(sourceState.viewportMetrics),
      status: sourceState.status,
    };
  }

  async function loadDisplayWindow({
    sessionId = getState().sessionId,
    paneId = 'primary',
    displayTimeframe = getState().displayTimeframe || getState().session?.timeframe,
    anchor = getState().cursorTimestamp,
    direction = 'backward',
    count,
    viewportDemand,
  } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (getState().sessionId !== sessionId || getState().status === 'idle') {
      await ensureInitialSession({ sessionId });
    }

    const sourceState = getState();
    const targetPaneId = String(paneId || 'primary').trim() || 'primary';
    const statefulLoad = targetPaneId === 'primary';
    const missingWindow = viewportDemand?.missingWindow || {};
    const normalizedDisplayTimeframe = normalizeTimeframe(
      viewportDemand?.displayTimeframe || displayTimeframe,
      'display timeframe'
    );
    const metrics = await dispatchCommand(chartCommands.GET_VIEWPORT_METRICS, { paneId: targetPaneId });
    const requestedCount = count ?? missingWindow.suggestedCount;
    const displayCount = Number.isInteger(Number(requestedCount))
      ? Number(requestedCount)
      : computePrefixBarCount(metrics) + 1;
    const normalizedCount = Math.min(Math.max(1, Math.ceil(displayCount)), MAX_PREFIX_BARS);
    const normalizedAnchor = missingWindow.anchor
      || isoFromTimestamp(alignTimestampToTimeframe(anchor, normalizedDisplayTimeframe));
    const normalizedDirection = missingWindow.direction || viewportDemand?.direction || direction;
    const demandKey = [
      sessionId,
      sourceState.session.instrument,
      normalizedDisplayTimeframe,
      normalizedAnchor,
      normalizedDirection,
      normalizedCount,
    ].join('|');
    if (loadingDisplayWindowKeys.has(demandKey)) {
      return {
        ...clone(sourceState),
        loaded: false,
        reason: 'duplicate-display-window-demand',
      };
    }

    loadingDisplayWindowKeys.add(demandKey);
    try {
      const displayContext = {
        cursorTimestamp: sourceState.cursorTimestamp,
        displayTimeframe: normalizedDisplayTimeframe,
        replayTimeframe: sourceState.replayTimeframe || sourceState.session.timeframe,
      };
      const shouldMergeDisplayBars = sourceState.displayBarsTimeframe === normalizedDisplayTimeframe;
      const currentEarliestTimestamp = earliestBarTimestamp(sourceState.displayBars);
      const displayWindowAttempts = [];
      let nextAnchor = normalizedAnchor;
      let window = null;
      let windowDisplayBars = [];
      let accumulatedWindowDisplayBars = [];
      let displayBars = sourceState.displayBars;

      for (let attempt = 0; attempt < MAX_DISPLAY_WINDOW_SEEK_ATTEMPTS; attempt += 1) {
        window = await dispatchCommand(barDataCommands.LOAD_WINDOW, {
          instrument: sourceState.session.instrument,
          timeframe: normalizedDisplayTimeframe,
          sessionId,
          paneId: targetPaneId,
          anchor: nextAnchor,
          direction: normalizedDirection,
          count: normalizedCount,
        });
        windowDisplayBars = filterDisplayBarsForCursor(window.bars, displayContext);
        accumulatedWindowDisplayBars = mergeDisplayBarsForCursor(
          accumulatedWindowDisplayBars,
          windowDisplayBars,
          displayContext
        );
        displayBars = shouldMergeDisplayBars
          ? mergeDisplayBarsForCursor(sourceState.displayBars, accumulatedWindowDisplayBars, displayContext)
          : accumulatedWindowDisplayBars;
        const nextEarliestTimestamp = earliestBarTimestamp(windowDisplayBars);
        displayWindowAttempts.push({
          key: window.key,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          cached: Boolean(window.cached),
          barCount: window.bars.length,
          displayBarCount: windowDisplayBars.length,
          earliestTimestamp: Number.isFinite(nextEarliestTimestamp) ? nextEarliestTimestamp : null,
        });

        if (!shouldSeekEarlierDisplayWindow({
          direction: normalizedDirection,
          attempt,
          displayTimeframe: normalizedDisplayTimeframe,
          missingWindow,
          currentEarliestTimestamp,
          window,
          windowDisplayBars,
        })) {
          break;
        }
        nextAnchor = previousWindowAnchor(window, normalizedDisplayTimeframe);
      }

      const displayBarsChanged = !displayBarsEqual(sourceState.displayBars, displayBars);
      if (displayBarsChanged) {
        await chartSync.renderDisplayBars(displayBars, sourceState.cursorTimestamp, { paneId: targetPaneId });
        if (statefulLoad) {
          await chartSync.syncChartRightEdgeLimit(sourceState.cursorTimestamp);
        }
        await chartSync.syncChartDisplayContext({
          paneId: targetPaneId,
          displayTimeframe: normalizedDisplayTimeframe,
          bars: displayBars,
        });
      }

      const nextState = statefulLoad
        ? setState({
          ...sourceState,
          displayTimeframe: normalizedDisplayTimeframe,
          displayBarsTimeframe: normalizedDisplayTimeframe,
          displayBars: clone(displayBars),
          viewportMetrics: clone(metrics),
          status: 'display-loaded',
        })
        : {
          ...clone(sourceState),
          paneId: targetPaneId,
          displayTimeframe: normalizedDisplayTimeframe,
          displayBarsTimeframe: normalizedDisplayTimeframe,
          displayBars: clone(displayBars),
          viewportMetrics: clone(metrics),
          status: sourceState.status,
        };
      const result = {
        ...clone(nextState),
        paneId: targetPaneId,
        displayWindow: {
          key: window.key,
          instrument: window.instrument,
          timeframe: window.timeframe,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
          cached: Boolean(window.cached),
          rendered: displayBarsChanged,
          attempts: displayWindowAttempts,
          seekAttempts: Math.max(0, displayWindowAttempts.length - 1),
        },
      };
      emitEvent(replayEvents.DISPLAY_WINDOW_LOADED, result);
      emitEvent(replayEvents.DISPLAY_RELOADED, result);
      return result;
    } finally {
      loadingDisplayWindowKeys.delete(demandKey);
    }
  }

  async function projectDisplayForCursor({
    sessionId = getState().sessionId,
    displayTimeframe = getState().displayTimeframe || getState().session?.timeframe,
    cursorTimestamp = getState().cursorTimestamp,
  } = {}) {
    const sourceState = getState();
    const normalizedDisplayTimeframe = normalizeTimeframe(displayTimeframe, 'display timeframe');
    const normalizedReplayTimeframe = normalizeTimeframe(
      sourceState.replayTimeframe || sourceState.session?.timeframe,
      'replay timeframe'
    );
    if (normalizedDisplayTimeframe === normalizedReplayTimeframe) {
      return clone(sourceState);
    }
    return loadDisplayWindow({
      sessionId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: isoFromTimestamp(alignTimestampToTimeframe(cursorTimestamp, normalizedDisplayTimeframe)),
      direction: 'backward',
    });
  }

  async function setDisplayTimeframe({
    sessionId = getState().sessionId,
    paneId = 'primary',
    displayTimeframe,
    count,
  } = {}) {
    const sourceState = getState();
    const normalizedDisplayTimeframe = normalizeTimeframe(displayTimeframe, 'display timeframe');
    const targetPaneId = String(paneId || 'primary').trim() || 'primary';
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (sourceState.sessionId !== sessionId || sourceState.status === 'idle') {
      await ensureInitialSession({ sessionId });
    }
    const current = getState();
    if (targetPaneId !== 'primary') {
      return loadDisplayWindow({
        sessionId,
        paneId: targetPaneId,
        displayTimeframe: normalizedDisplayTimeframe,
        anchor: current.cursorTimestamp,
        direction: 'backward',
        count,
      });
    }
    if (current.displayTimeframe === normalizedDisplayTimeframe && current.status === 'display-loaded') {
      return displayContextSnapshot(current);
    }
    const nextState = setState({
      ...current,
      displayTimeframe: normalizedDisplayTimeframe,
    });
    emitEvent(replayEvents.DISPLAY_TIMEFRAME_CHANGED, displayContextSnapshot(nextState));
    return loadDisplayWindow({
      sessionId,
      paneId: targetPaneId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: nextState.cursorTimestamp,
      direction: 'backward',
      count,
    });
  }

  function reset() {
    loadingDisplayWindowKeys.clear();
  }

  return {
    displayContextSnapshot,
    loadDisplayWindow,
    projectDisplayForCursor,
    reset,
    setDisplayTimeframe,
  };
}
