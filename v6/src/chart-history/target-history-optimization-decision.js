function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values = []) {
  const numbers = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!numbers.length) return null;
  const middle = Math.floor(numbers.length / 2);
  if (numbers.length % 2) return numbers[middle];
  return (numbers[middle - 1] + numbers[middle]) / 2;
}

function summarizeDiagnostics(records = []) {
  const targetRecords = records.filter((record) => record?.path === 'target-history');
  const sourceRecords = records.filter((record) => record?.path === 'source-window');
  const fallbackRecords = records.filter((record) => String(record?.path || '').includes('fallback'));
  return {
    fallbackCount: fallbackRecords.length,
    sourceCount: sourceRecords.length,
    sourceMedianMs: median(sourceRecords.map((record) => record.sourceLoadMs ?? record.durationMs)),
    targetCount: targetRecords.length,
    targetMedianMs: median(targetRecords.map((record) => record.targetLoadMs ?? record.durationMs)),
  };
}

export function decideTargetHistoryOptimization({
  diagnostics = [],
  fallbackRateLimit = 0.2,
  targetSlowRatio = 1.25,
} = {}) {
  const summary = summarizeDiagnostics(diagnostics);
  const totalTargetAttempts = summary.targetCount + summary.fallbackCount;
  const fallbackRate = totalTargetAttempts > 0 ? summary.fallbackCount / totalTargetAttempts : null;
  const hasComparableLatency = summary.targetMedianMs !== null && summary.sourceMedianMs !== null;
  const targetToSourceRatio = hasComparableLatency && summary.sourceMedianMs > 0
    ? summary.targetMedianMs / summary.sourceMedianMs
    : null;

  if (fallbackRate !== null && fallbackRate > fallbackRateLimit) {
    return {
      decision: 'harden-fallback',
      reason: 'target-history-fallback-rate-high',
      summary: {
        ...summary,
        fallbackRate,
        targetToSourceRatio,
      },
    };
  }

  if (targetToSourceRatio !== null && targetToSourceRatio > targetSlowRatio) {
    return {
      decision: 'tune-activation-policy',
      reason: 'target-history-slower-than-source',
      summary: {
        ...summary,
        fallbackRate,
        targetToSourceRatio,
      },
    };
  }

  return {
    decision: 'add-diagnostic-readout',
    reason: 'target-history-diagnostics-need-operator-visibility',
    summary: {
      ...summary,
      fallbackRate,
      targetToSourceRatio,
    },
  };
}

export function reselectTargetHistoryOptimization({
  completed = [],
  diagnostics = [],
  fallbackRateLimit = 0.2,
  targetSlowRatio = 1.25,
} = {}) {
  const completedSet = new Set(completed.map((value) => String(value || '').trim()).filter(Boolean));
  const decision = decideTargetHistoryOptimization({
    diagnostics,
    fallbackRateLimit,
    targetSlowRatio,
  });
  if (decision.decision !== 'add-diagnostic-readout' || !completedSet.has('add-diagnostic-readout')) {
    return decision;
  }
  return {
    decision: 'tune-target-request-sizing',
    reason: 'target-history-readout-complete-next-size-requests',
    summary: decision.summary,
  };
}
