import { markReplayTrace } from './replay-trace.js';

export function createReplayChartSync({
  getState,
  dispatchCommand,
  hasCommand,
  chartCommands,
}) {
  async function syncChartRightEdgeLimit(rightEdge) {
    if (hasCommand(chartCommands.SET_RIGHT_EDGE_LIMIT)) {
      markReplayTrace('chartSync.rightEdge.start', { rightEdge });
      await dispatchCommand(chartCommands.SET_RIGHT_EDGE_LIMIT, { rightEdge });
      markReplayTrace('chartSync.rightEdge.end', { rightEdge });
    }
  }

  async function syncChartDisplayContext({ displayTimeframe, bars, paneId }) {
    if (!hasCommand(chartCommands.SET_DISPLAY_CONTEXT)) return;
    const state = getState();
    const timestamps = (bars || [])
      .map((bar) => Number(bar?.timestamp))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
    await dispatchCommand(chartCommands.SET_DISPLAY_CONTEXT, {
      paneId,
      instrument: state.session?.instrument || null,
      displayTimeframe,
      loadedCoverage: timestamps.length
        ? { from: timestamps[0], to: timestamps[timestamps.length - 1] }
        : null,
    });
  }

  async function syncChartViewportFollow(cursorTimestamp, { resume = false } = {}) {
    if (!hasCommand(chartCommands.SET_VIEWPORT_FOLLOW)) return null;
    return dispatchCommand(chartCommands.SET_VIEWPORT_FOLLOW, {
      enabled: true,
      resume,
      cursorTimestamp,
    });
  }

  async function renderDisplayBars(
    displayBars,
    cursorTimestamp,
    { resumeViewportFollow = false, paneId } = {}
  ) {
    await dispatchCommand(chartCommands.REPLACE_BARS, { paneId, bars: displayBars });
    if (!paneId || paneId === 'primary') {
      await syncChartViewportFollow(cursorTimestamp, { resume: resumeViewportFollow });
    }
  }

  async function appendDisplayBars(
    appendedBars,
    cursorTimestamp,
    { paneId, fullDisplayBars = appendedBars, rightEdgeLimit } = {}
  ) {
    markReplayTrace('chartSync.append.start', {
      paneId: paneId || 'primary',
      appendedCount: appendedBars.length,
      cursorTimestamp,
    });
    if (!hasCommand(chartCommands.APPEND_BARS)) {
      if (!paneId || paneId === 'primary') {
        await syncChartRightEdgeLimit(rightEdgeLimit || cursorTimestamp);
      }
      const rendered = await renderDisplayBars(fullDisplayBars, cursorTimestamp, { paneId });
      markReplayTrace('chartSync.append.end', {
        paneId: paneId || 'primary',
        mode: 'replace',
        cursorTimestamp,
      });
      return rendered;
    }
    if (!paneId || paneId === 'primary') {
      markReplayTrace('chartSync.append.metrics.start', { paneId: paneId || 'primary' });
      const metrics = hasCommand(chartCommands.GET_VIEWPORT_METRICS)
        ? await dispatchCommand(chartCommands.GET_VIEWPORT_METRICS).catch(() => null)
        : null;
      markReplayTrace('chartSync.append.metrics.end', {
        paneId: paneId || 'primary',
        estimatedVisibleBars: metrics?.estimatedVisibleBars || '',
      });
      markReplayTrace('chartSync.append.command.start', {
        paneId: paneId || 'primary',
        appendedCount: appendedBars.length,
      });
      await dispatchCommand(chartCommands.APPEND_BARS, {
        paneId,
        bars: appendedBars,
        rightEdgeLimit: rightEdgeLimit || cursorTimestamp,
        viewportFollow: {
          enabled: true,
          cursorTimestamp,
        },
      });
      markReplayTrace('chartSync.append.command.end', {
        paneId: paneId || 'primary',
        appendedCount: appendedBars.length,
      });
      markReplayTrace('chartSync.append.end', {
        paneId: paneId || 'primary',
        mode: 'append',
        cursorTimestamp,
      });
      return;
    }
    markReplayTrace('chartSync.append.command.start', {
      paneId,
      appendedCount: appendedBars.length,
    });
    await dispatchCommand(chartCommands.APPEND_BARS, { paneId, bars: appendedBars });
    markReplayTrace('chartSync.append.command.end', {
      paneId,
      appendedCount: appendedBars.length,
    });
    markReplayTrace('chartSync.append.end', {
      paneId,
      mode: 'append',
      cursorTimestamp,
    });
  }

  return {
    appendDisplayBars,
    renderDisplayBars,
    syncChartDisplayContext,
    syncChartRightEdgeLimit,
    syncChartViewportFollow,
  };
}
