import { markReplayTrace } from './replay-trace.js';

const DEFAULT_REPLAY_CHART_PANE_ID = 'primary';

function normalizePaneId(paneId) {
  return String(paneId ?? DEFAULT_REPLAY_CHART_PANE_ID).trim() || DEFAULT_REPLAY_CHART_PANE_ID;
}

function normalizeTimeframe(value, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number(fallback || 1);
}

function uniquePaneSnapshots(panes = []) {
  const source = Array.isArray(panes) && panes.length
    ? panes
    : [{ id: DEFAULT_REPLAY_CHART_PANE_ID }];
  const seen = new Set();
  const snapshots = [];
  source.forEach((pane) => {
    const paneId = normalizePaneId(pane?.id);
    if (seen.has(paneId)) return;
    seen.add(paneId);
    snapshots.push({ ...pane, id: paneId });
  });
  if (!seen.has(DEFAULT_REPLAY_CHART_PANE_ID)) {
    snapshots.unshift({ id: DEFAULT_REPLAY_CHART_PANE_ID });
  }
  return snapshots;
}

export function createReplayChartSync({
  getState,
  dispatchCommand,
  hasCommand,
  chartCommands,
}) {
  async function syncChartRightEdgeLimit(rightEdge, { paneId } = {}) {
    if (hasCommand(chartCommands.SET_RIGHT_EDGE_LIMIT)) {
      const normalizedPaneId = paneId == null ? null : normalizePaneId(paneId);
      markReplayTrace('chartSync.rightEdge.start', { paneId: normalizedPaneId || 'all', rightEdge });
      await dispatchCommand(chartCommands.SET_RIGHT_EDGE_LIMIT, {
        paneId: normalizedPaneId || undefined,
        rightEdge,
      });
      markReplayTrace('chartSync.rightEdge.end', { paneId: normalizedPaneId || 'all', rightEdge });
    }
  }

  async function syncChartDisplayContext({
    displayTimeframe,
    bars,
    paneId,
    expectedDisplayRevision,
    bumpDisplayRevision = false,
  }) {
    if (!hasCommand(chartCommands.SET_DISPLAY_CONTEXT)) return;
    const state = getState();
    const timestamps = (bars || [])
      .map((bar) => Number(bar?.timestamp))
      .filter(Number.isFinite)
      .sort((left, right) => left - right);
    return dispatchCommand(chartCommands.SET_DISPLAY_CONTEXT, {
      paneId: normalizePaneId(paneId),
      instrument: state.session?.instrument || null,
      displayTimeframe,
      expectedDisplayRevision,
      bumpDisplayRevision,
      loadedCoverage: timestamps.length
        ? { from: timestamps[0], to: timestamps[timestamps.length - 1] }
        : null,
    });
  }

  async function beginPaneDisplayLoad({ paneId, displayTimeframe, expectedDisplayRevision } = {}) {
    if (!hasCommand(chartCommands.SET_DISPLAY_CONTEXT)) return null;
    const state = getState();
    return dispatchCommand(chartCommands.SET_DISPLAY_CONTEXT, {
      paneId: normalizePaneId(paneId),
      instrument: state.session?.instrument || null,
      displayTimeframe,
      expectedDisplayRevision,
      bumpDisplayRevision: true,
    });
  }

  async function syncChartViewportFollow(cursorTimestamp, { resume = false, paneId } = {}) {
    if (!hasCommand(chartCommands.SET_VIEWPORT_FOLLOW)) return null;
    return dispatchCommand(chartCommands.SET_VIEWPORT_FOLLOW, {
      paneId: normalizePaneId(paneId),
      enabled: true,
      resume,
      cursorTimestamp,
    });
  }

  async function renderDisplayBars(
    displayBars,
    cursorTimestamp,
    {
      resumeViewportFollow = false,
      paneId,
      expectedDisplayRevision,
      syncViewportFollow = true,
    } = {}
  ) {
    const normalizedPaneId = normalizePaneId(paneId);
    const result = await dispatchCommand(chartCommands.REPLACE_BARS, {
      paneId: normalizedPaneId,
      bars: displayBars,
      expectedDisplayRevision,
    });
    if (syncViewportFollow) {
      await syncChartViewportFollow(cursorTimestamp, { resume: resumeViewportFollow, paneId: normalizedPaneId });
    }
    return result;
  }

  async function appendDisplayBars(
    appendedBars,
    cursorTimestamp,
    { paneId, fullDisplayBars = appendedBars, rightEdgeLimit } = {}
  ) {
    const normalizedPaneId = normalizePaneId(paneId);
    markReplayTrace('chartSync.append.start', {
      paneId: normalizedPaneId,
      appendedCount: appendedBars.length,
      cursorTimestamp,
    });
    if (!hasCommand(chartCommands.APPEND_BARS)) {
      await syncChartRightEdgeLimit(rightEdgeLimit || cursorTimestamp, { paneId: normalizedPaneId });
      const rendered = await renderDisplayBars(fullDisplayBars, cursorTimestamp, { paneId: normalizedPaneId });
      markReplayTrace('chartSync.append.end', {
        paneId: normalizedPaneId,
        mode: 'replace',
        cursorTimestamp,
      });
      return rendered;
    }
    markReplayTrace('chartSync.append.metrics.start', { paneId: normalizedPaneId });
    const metrics = hasCommand(chartCommands.GET_VIEWPORT_METRICS)
      ? await dispatchCommand(chartCommands.GET_VIEWPORT_METRICS, { paneId: normalizedPaneId }).catch(() => null)
      : null;
    markReplayTrace('chartSync.append.metrics.end', {
      paneId: normalizedPaneId,
      estimatedVisibleBars: metrics?.estimatedVisibleBars || '',
    });
    markReplayTrace('chartSync.append.command.start', {
      paneId: normalizedPaneId,
      appendedCount: appendedBars.length,
    });
    await dispatchCommand(chartCommands.APPEND_BARS, {
      paneId: normalizedPaneId,
      bars: appendedBars,
      rightEdgeLimit: rightEdgeLimit || cursorTimestamp,
      viewportFollow: {
        enabled: true,
        cursorTimestamp,
      },
    });
    markReplayTrace('chartSync.append.command.end', {
      paneId: normalizedPaneId,
      appendedCount: appendedBars.length,
    });
    markReplayTrace('chartSync.append.end', {
      paneId: normalizedPaneId,
      mode: 'append',
      cursorTimestamp,
    });
  }

  async function appendRevealedBarsToPanes({
    panes = [],
    revealedBars = [],
    cursorTimestamp,
    replayTimeframe,
    displayTimeframeFallback,
    rightEdgeLimit,
  } = {}) {
    const normalizedReplayTimeframe = normalizeTimeframe(replayTimeframe, displayTimeframeFallback || 1);
    const appended = [];
    const projected = [];
    const skipped = [];
    const paneSnapshots = uniquePaneSnapshots(panes);
    markReplayTrace('chartSync.fanout.start', {
      paneCount: paneSnapshots.length,
      revealedCount: revealedBars.length,
      cursorTimestamp,
      replayTimeframe: normalizedReplayTimeframe,
    });
    for (const pane of paneSnapshots) {
      const paneId = normalizePaneId(pane.id);
      const paneTimeframe = normalizeTimeframe(
        pane.displayTimeframe,
        displayTimeframeFallback || normalizedReplayTimeframe
      );
      if (paneTimeframe !== normalizedReplayTimeframe) {
        projected.push({ paneId, displayTimeframe: paneTimeframe });
        markReplayTrace('chartSync.fanout.project', { paneId, displayTimeframe: paneTimeframe });
        continue;
      }
      if (!revealedBars.length) {
        skipped.push({ paneId, reason: 'empty-revealed-bars' });
        markReplayTrace('chartSync.fanout.skip', { paneId, reason: 'empty-revealed-bars' });
        continue;
      }
      markReplayTrace('chartSync.fanout.append.start', { paneId, appendedCount: revealedBars.length });
      await appendDisplayBars(revealedBars, cursorTimestamp, {
        paneId,
        fullDisplayBars: revealedBars,
        rightEdgeLimit: rightEdgeLimit || cursorTimestamp,
      });
      appended.push({ paneId, displayTimeframe: paneTimeframe, appendedCount: revealedBars.length });
      markReplayTrace('chartSync.fanout.append.end', { paneId, appendedCount: revealedBars.length });
    }
    markReplayTrace('chartSync.fanout.end', {
      appendedCount: appended.length,
      projectedCount: projected.length,
      skippedCount: skipped.length,
    });
    return { appended, projected, skipped };
  }

  return {
    appendRevealedBarsToPanes,
    appendDisplayBars,
    renderDisplayBars,
    syncChartDisplayContext,
    beginPaneDisplayLoad,
    syncChartRightEdgeLimit,
    syncChartViewportFollow,
  };
}
