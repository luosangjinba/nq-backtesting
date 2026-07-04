import { markReplayTrace } from './replay-trace.js';

function normalizePaneId(paneId) {
  return String(paneId || 'primary').trim() || 'primary';
}

function normalizeTimeframe(value, fallback = 1) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number(fallback || 1);
}

function uniquePaneSnapshots(panes = []) {
  const source = Array.isArray(panes) && panes.length
    ? panes
    : [{ id: 'primary' }];
  const seen = new Set();
  const snapshots = [];
  source.forEach((pane) => {
    const paneId = normalizePaneId(pane?.id);
    if (seen.has(paneId)) return;
    seen.add(paneId);
    snapshots.push({ ...pane, id: paneId });
  });
  if (!seen.has('primary')) {
    snapshots.unshift({ id: 'primary' });
  }
  return snapshots;
}

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
      paneId,
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
      paneId,
      instrument: state.session?.instrument || null,
      displayTimeframe,
      expectedDisplayRevision,
      bumpDisplayRevision: true,
    });
  }

  async function syncChartViewportFollow(cursorTimestamp, { resume = false, paneId } = {}) {
    if (!hasCommand(chartCommands.SET_VIEWPORT_FOLLOW)) return null;
    return dispatchCommand(chartCommands.SET_VIEWPORT_FOLLOW, {
      paneId,
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
    const result = await dispatchCommand(chartCommands.REPLACE_BARS, {
      paneId,
      bars: displayBars,
      expectedDisplayRevision,
    });
    if (syncViewportFollow) {
      await syncChartViewportFollow(cursorTimestamp, { resume: resumeViewportFollow, paneId });
    }
    return result;
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
    await dispatchCommand(chartCommands.APPEND_BARS, {
      paneId,
      bars: appendedBars,
      viewportFollow: {
        enabled: true,
        cursorTimestamp,
      },
    });
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

  async function appendRevealedBarsToPanes({
    panes = [],
    revealedBars = [],
    cursorTimestamp,
    replayTimeframe,
    displayTimeframeFallback,
    primaryFullDisplayBars,
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
        fullDisplayBars: paneId === 'primary'
          ? primaryFullDisplayBars || revealedBars
          : revealedBars,
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
