import { auditHighTimeframeTargetHistoryResponsiveness } from './high-timeframe-target-history-responsiveness-audit.js';

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function exceeds(value, limit) {
  const metric = finiteNumber(value);
  const budget = finiteNumber(limit);
  return metric !== null && budget !== null && metric > budget;
}

function collectBudgetFindings({ summary = {}, thresholds = {} } = {}) {
  const findings = [];
  if (exceeds(summary.fallbackRate, thresholds.fallbackRateLimit)) {
    findings.push({
      budget: thresholds.fallbackRateLimit,
      metric: 'fallbackRate',
      value: summary.fallbackRate,
    });
  }
  if (exceeds(summary.durationP95Ms, thresholds.maxDurationMs)) {
    findings.push({
      budget: thresholds.maxDurationMs,
      metric: 'durationP95Ms',
      value: summary.durationP95Ms,
    });
  }
  if (exceeds(summary.visualLatencyP95Ms, thresholds.maxVisualLatencyMs)) {
    findings.push({
      budget: thresholds.maxVisualLatencyMs,
      metric: 'visualLatencyP95Ms',
      value: summary.visualLatencyP95Ms,
    });
  }
  if (exceeds(summary.applyLagP95Ms, thresholds.maxApplyLagMs)) {
    findings.push({
      budget: thresholds.maxApplyLagMs,
      metric: 'applyLagP95Ms',
      value: summary.applyLagP95Ms,
    });
  }
  return findings;
}

function resolveDecision(audit) {
  if (audit.nextSlice === 'bounded-runtime-optimization') {
    return {
      implementationSlice: 'bounded-runtime-optimization',
      outcome: 'optimize-before-materialization',
    };
  }
  if (audit.nextSlice === 'replay-coordination-materialization-transition') {
    return {
      implementationSlice: 'replay-coordination-materialization-transition',
      outcome: 'materialization-transition-ready',
    };
  }
  return {
    implementationSlice: audit.nextSlice,
    outcome: 'measurement-incomplete',
  };
}

export function createHighTimeframeTargetHistoryResponsivenessBudgetReport({
  packCostControlsReady = true,
  records = [],
  targetHistoryCoverageComplete = true,
  thresholds = {},
} = {}) {
  const audit = auditHighTimeframeTargetHistoryResponsiveness({
    packCostControlsReady,
    records,
    targetHistoryCoverageComplete,
    thresholds,
  });
  const findings = collectBudgetFindings({
    summary: audit.summary,
    thresholds: audit.thresholds,
  });
  const decision = resolveDecision(audit);
  return {
    ...decision,
    auditReason: audit.reason,
    budgetFindings: findings,
    recordsAccepted: audit.summary.browserSampleCount >= audit.thresholds.minBrowserSamples,
    summary: audit.summary,
    thresholds: audit.thresholds,
  };
}
