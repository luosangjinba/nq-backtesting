function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatDuration(value) {
  const number = finiteNumber(value);
  if (number === null) return '--ms';
  return `${Math.round(number)}ms`;
}

function formatPath(value) {
  const path = String(value || '').trim();
  if (!path) return 'idle';
  if (path === 'target-history') return 'target';
  if (path === 'target-history-fallback-source-window') return 'fallback';
  if (path === 'source-window') return 'source';
  return path;
}

export function createTargetHistoryDiagnosticsReadoutState(extension = null) {
  const diagnostics = extension?.diagnostics || null;
  if (!diagnostics) {
    return {
      fallbackReason: null,
      path: 'idle',
      prependedBarCount: 0,
      sourceRequestCount: 0,
      targetRequestCount: 0,
      text: 'History idle',
      title: 'No leftward history extension has completed for this pane.',
    };
  }

  const fallbackReason = diagnostics.fallbackReason || null;
  const path = formatPath(diagnostics.path);
  const prependedBarCount = finiteNumber(diagnostics.prependedBarCount) ?? 0;
  const sourceRequestCount = finiteNumber(diagnostics.sourceRequestCount) ?? 0;
  const targetRequestCount = finiteNumber(diagnostics.targetRequestCount) ?? 0;
  const duration = formatDuration(diagnostics.durationMs);
  const fallback = fallbackReason ? ` ${fallbackReason}` : '';

  return {
    fallbackReason,
    path,
    prependedBarCount,
    sourceRequestCount,
    targetRequestCount,
    text: `History ${path} ${duration} T${targetRequestCount}/S${sourceRequestCount} +${prependedBarCount}${fallback}`,
    title: [
      `Path: ${diagnostics.path || 'idle'}`,
      `Duration: ${duration}`,
      `Target requests: ${targetRequestCount}`,
      `Source requests: ${sourceRequestCount}`,
      `Prepended bars: ${prependedBarCount}`,
      `Fallback reason: ${fallbackReason || 'none'}`,
    ].join('\n'),
  };
}
