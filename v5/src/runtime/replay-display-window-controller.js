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
  filterDisplayBarsForCursor,
  isoFromTimestamp,
  mergeDisplayBarsForCursor,
  normalizeTimeframe,
  previousWindowAnchor,
  shouldSeekEarlierDisplayWindow,
} from './replay-runtime-state.js';
import {
  displayWindowDemandKey,
  normalizeReplayPaneId,
  resolvePaneDisplayWindowBase,
  summarizeDisplayWindowAttempt,
} from './replay-pane-display-window-state.js';

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
  const defaultRightOffsetBars = 10;

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
    resumeViewportFollow = false,
  } = {}) {
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (getState().sessionId !== sessionId || getState().status === 'idle') {
      await ensureInitialSession({ sessionId });
    }

    const sourceState = getState();
    const targetPaneId = normalizeReplayPaneId(paneId);
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
    const minimumDisplayBars = Math.max(
      1,
      Math.floor(Math.max(1, Number(metrics?.estimatedVisibleBars || 0) - defaultRightOffsetBars))
    );
    const normalizedAnchor = missingWindow.anchor
      || isoFromTimestamp(alignTimestampToTimeframe(anchor, normalizedDisplayTimeframe));
    const normalizedDirection = missingWindow.direction || viewportDemand?.direction || direction;
    const demandKey = displayWindowDemandKey({
      sessionId,
      instrument: sourceState.session.instrument,
      paneId: targetPaneId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: normalizedAnchor,
      direction: normalizedDirection,
      count: normalizedCount,
    });
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
      const {
        baseDisplayBars,
        baseDisplayRevision,
        currentEarliestTimestamp,
        shouldMergeDisplayBars,
      } = await resolvePaneDisplayWindowBase({
        targetPaneId,
        normalizedDisplayTimeframe,
        dispatchCommand,
        chartCommands,
      });
      const displayLoadContext = await chartSync.beginPaneDisplayLoad?.({
        paneId: targetPaneId,
        displayTimeframe: normalizedDisplayTimeframe,
        expectedDisplayRevision: baseDisplayRevision,
      });
      const expectedDisplayRevision = displayLoadContext?.staleWrite
        ? null
        : displayLoadContext?.displayContext?.displayRevision;
      if (displayLoadContext?.staleWrite) {
        return {
          ...clone(getState()),
          paneId: targetPaneId,
          loaded: false,
          reason: 'stale-display-context',
        };
      }
      const displayWindowAttempts = [];
      let nextAnchor = normalizedAnchor;
      let window = null;
      let windowDisplayBars = [];
      let accumulatedWindowDisplayBars = [];
      let displayBars = baseDisplayBars;

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
          ? mergeDisplayBarsForCursor(baseDisplayBars, accumulatedWindowDisplayBars, displayContext)
          : accumulatedWindowDisplayBars;
        displayWindowAttempts.push(summarizeDisplayWindowAttempt({ window, windowDisplayBars }));

        if (!shouldSeekEarlierDisplayWindow({
          direction: normalizedDirection,
          attempt,
          displayTimeframe: normalizedDisplayTimeframe,
          replayTimeframe: sourceState.replayTimeframe || sourceState.session.timeframe,
          minimumDisplayBars,
          displayBars,
          missingWindow,
          currentEarliestTimestamp,
          window,
          windowDisplayBars,
        })) {
          break;
        }
        nextAnchor = previousWindowAnchor(window, normalizedDisplayTimeframe);
      }

      const displayBarsChanged = !displayBarsEqual(baseDisplayBars, displayBars);
      if (displayBarsChanged) {
        if (resumeViewportFollow && chartCommands.RESUME_VIEWPORT_FOLLOW) {
          await dispatchCommand(chartCommands.RESUME_VIEWPORT_FOLLOW, { paneId: targetPaneId });
        }
        const rendered = await chartSync.renderDisplayBars(displayBars, sourceState.cursorTimestamp, {
          paneId: targetPaneId,
          expectedDisplayRevision,
          resumeViewportFollow,
          syncViewportFollow: !viewportDemand,
        });
        if (rendered?.staleWrite) {
          return {
            ...clone(getState()),
            paneId: targetPaneId,
            loaded: false,
            reason: 'stale-display-bars',
          };
        }
        await chartSync.syncChartRightEdgeLimit(sourceState.cursorTimestamp, { paneId: targetPaneId });
        const syncedContext = await chartSync.syncChartDisplayContext({
          paneId: targetPaneId,
          displayTimeframe: normalizedDisplayTimeframe,
          bars: displayBars,
          expectedDisplayRevision,
        });
        if (syncedContext?.staleWrite) {
          return {
            ...clone(getState()),
            paneId: targetPaneId,
            loaded: false,
            reason: 'stale-display-context',
          };
        }
        if (
          viewportDemand
          && Number.isFinite(Number(viewportDemand.visibleFrom))
          && Number.isFinite(Number(viewportDemand.visibleTo))
        ) {
          await dispatchCommand(chartCommands.SET_MANUAL_VISIBLE_RANGE, {
            paneId: targetPaneId,
            from: Number(viewportDemand.visibleFrom),
            to: Number(viewportDemand.visibleTo),
          });
        }
      } else if (resumeViewportFollow && chartCommands.RESUME_VIEWPORT_FOLLOW) {
        await dispatchCommand(chartCommands.RESUME_VIEWPORT_FOLLOW, { paneId: targetPaneId });
        await chartSync.syncChartViewportFollow(sourceState.cursorTimestamp, {
          paneId: targetPaneId,
          resume: true,
        });
      }

      const currentState = getState();
      const nextState = targetPaneId === normalizeReplayPaneId()
        ? setState({
          ...currentState,
          displayTimeframe: normalizedDisplayTimeframe,
          displayBarsTimeframe: normalizedDisplayTimeframe,
          displayBars: clone(displayBars),
          viewportMetrics: clone(metrics),
          status: currentState.status,
        })
        : {
          ...clone(currentState),
          paneId: targetPaneId,
          displayTimeframe: normalizedDisplayTimeframe,
          displayBarsTimeframe: normalizedDisplayTimeframe,
          displayBars: clone(displayBars),
          viewportMetrics: clone(metrics),
          status: currentState.status,
        };
      const result = {
        ...clone(nextState),
        paneId: targetPaneId,
        displayWindow: {
          key: window.key,
          instrument: window.instrument,
          timeframe: window.timeframe,
          paneId: targetPaneId,
          start: window.start,
          end: window.end,
          anchor: window.anchor,
          direction: window.direction,
          estimatedBars: window.estimatedBars,
          cached: Boolean(window.cached),
          rendered: displayBarsChanged,
          baseBarCount: baseDisplayBars.length,
          mergedBarCount: displayBars.length,
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
    resumeViewportFollow = false,
  } = {}) {
    const sourceState = getState();
    const normalizedDisplayTimeframe = normalizeTimeframe(displayTimeframe, 'display timeframe');
    const targetPaneId = normalizeReplayPaneId(paneId);
    if (!sessionId) {
      throw new Error('replay sessionId is required.');
    }
    if (sourceState.sessionId !== sessionId || sourceState.status === 'idle') {
      await ensureInitialSession({ sessionId });
    }
    const current = getState();
    const defaultReplayPaneId = normalizeReplayPaneId();
    let nextState = current;
    if (targetPaneId === defaultReplayPaneId) {
      nextState = setState({
        ...current,
        displayTimeframe: normalizedDisplayTimeframe,
      });
      emitEvent(replayEvents.DISPLAY_TIMEFRAME_CHANGED, displayContextSnapshot(nextState));
    }
    return loadDisplayWindow({
      sessionId,
      paneId: targetPaneId,
      displayTimeframe: normalizedDisplayTimeframe,
      anchor: nextState.cursorTimestamp,
      direction: 'backward',
      count,
      resumeViewportFollow,
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
