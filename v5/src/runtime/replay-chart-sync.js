export function createReplayChartSync({
  getState,
  dispatchCommand,
  hasCommand,
  chartCommands,
}) {
  async function syncChartRightEdgeLimit(rightEdge) {
    if (hasCommand(chartCommands.SET_RIGHT_EDGE_LIMIT)) {
      await dispatchCommand(chartCommands.SET_RIGHT_EDGE_LIMIT, { rightEdge });
    }
  }

  async function syncChartDisplayContext({ displayTimeframe, bars }) {
    if (!hasCommand(chartCommands.SET_DISPLAY_CONTEXT)) return;
    const state = getState();
    const timestamps = (bars || [])
      .map((bar) => Number(bar?.timestamp))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
    await dispatchCommand(chartCommands.SET_DISPLAY_CONTEXT, {
      instrument: state.session?.instrument || null,
      displayTimeframe,
      loadedCoverage: timestamps.length
        ? { from: timestamps[0], to: timestamps[timestamps.length - 1] }
        : null,
    });
  }

  async function syncChartViewportFollow(cursorTimestamp, { resume = false } = {}) {
    if (!hasCommand(chartCommands.SET_VIEWPORT_FOLLOW)) return null;
    const state = getState();
    const metrics = hasCommand(chartCommands.GET_VIEWPORT_METRICS)
      ? await dispatchCommand(chartCommands.GET_VIEWPORT_METRICS).catch(() => null)
      : null;
    return dispatchCommand(chartCommands.SET_VIEWPORT_FOLLOW, {
      enabled: true,
      resume,
      cursorTimestamp,
      estimatedVisibleBars: metrics?.estimatedVisibleBars || state.viewportMetrics?.estimatedVisibleBars || null,
    });
  }

  async function renderDisplayBars(
    displayBars,
    cursorTimestamp,
    { resumeViewportFollow = false } = {}
  ) {
    await dispatchCommand(chartCommands.REPLACE_BARS, { bars: displayBars });
    await syncChartViewportFollow(cursorTimestamp, { resume: resumeViewportFollow });
  }

  return {
    renderDisplayBars,
    syncChartDisplayContext,
    syncChartRightEdgeLimit,
    syncChartViewportFollow,
  };
}
