const DEFAULT_PLAN_STEPS = Object.freeze([
  'resolve-start-bar',
  'load-bounded-replay-context',
  'load-replay-state',
  'project-default-wall',
  'apply-chart-data-and-viewport',
]);

function normalizeSessionId(sessionId) {
  const normalized = String(sessionId || '').trim();
  if (!normalized) {
    throw new Error('Chart entry initialization plan requires a session id.');
  }
  return normalized;
}

function normalizeSource(source) {
  return String(source || 'chart-entry.activation').trim() || 'chart-entry.activation';
}

export function createChartEntryInitializationPlan({
  sessionId,
  source,
  steps = DEFAULT_PLAN_STEPS,
} = {}) {
  const normalizedSteps = steps.map((step) => String(step || '').trim()).filter(Boolean);
  if (!normalizedSteps.length) {
    throw new Error('Chart entry initialization plan requires at least one step.');
  }
  return Object.freeze({
    owner: 'runtime.chartEntry',
    sessionId: normalizeSessionId(sessionId),
    source: normalizeSource(source),
    status: 'planned',
    steps: Object.freeze([...normalizedSteps]),
  });
}

export function getDefaultChartEntryPlanSteps() {
  return [...DEFAULT_PLAN_STEPS];
}
