const DEFAULT_FRAME_NOISE_MS = 16;
const DEFAULT_VISUAL_LATENCY_BUDGET_MS = 350;
const DEFAULT_DOMINANCE_RATIO = 0.65;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function percentile(values = [], percentileRank = 0.95) {
  const numbers = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!numbers.length) return null;
  const index = Math.min(
    numbers.length - 1,
    Math.max(0, Math.ceil(numbers.length * percentileRank) - 1),
  );
  return numbers[index];
}

function milestoneTime(record = {}, name) {
  const milestone = (record.milestones || []).find((item) => item?.name === name);
  return finiteNumber(milestone?.time);
}

function positiveDelta(end, start) {
  const resolvedEnd = finiteNumber(end);
  const resolvedStart = finiteNumber(start);
  if (resolvedEnd === null || resolvedStart === null) return null;
  return Math.max(0, resolvedEnd - resolvedStart);
}

function fieldOrMilestoneDelta(record = {}, field, endName, startName) {
  const fieldValue = finiteNumber(record[field]);
  if (fieldValue !== null) return fieldValue;
  return positiveDelta(milestoneTime(record, endName), milestoneTime(record, startName));
}

function summarizeRenderingRecords(records = []) {
  const normalized = records.filter(Boolean);
  const browserVisibleRecords = normalized.filter((record) => record.browserVisible === true);
  const targetRecords = browserVisibleRecords.filter((record) => record.path === 'target-history');
  return {
    browserVisibleCount: browserVisibleRecords.length,
    postLeftExtensionReadoutP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'postLeftExtensionReadoutMs', 'diagnostics-readout-visible', 'left-extension-loaded')
        ?? finiteNumber(record.applyLagMs)
    ))),
    postLeftExtensionSecondFrameP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'postLeftExtensionSecondFrameMs', 'second-animation-frame-after-readout', 'left-extension-loaded')
    ))),
    postReadoutSecondFrameP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'postReadoutSecondFrameMs', 'second-animation-frame-after-readout', 'diagnostics-readout-visible')
    ))),
    preLeftExtensionP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'preLeftExtensionMs', 'left-extension-loaded', 'target-history-apply-start')
    ))),
    targetCount: targetRecords.length,
    visualLatencyP95Ms: percentile(targetRecords.map((record) => finiteNumber(record.visualLatencyMs))),
  };
}

function ratio(value, total) {
  const resolvedValue = finiteNumber(value);
  const resolvedTotal = finiteNumber(total);
  if (resolvedValue === null || resolvedTotal === null || resolvedTotal <= 0) return null;
  return resolvedValue / resolvedTotal;
}

export function attributeHighTimeframeTargetHistoryBrowserRenderingVisibility({
  dominanceRatio = DEFAULT_DOMINANCE_RATIO,
  frameNoiseMs = DEFAULT_FRAME_NOISE_MS,
  records = [],
  visualLatencyBudgetMs = DEFAULT_VISUAL_LATENCY_BUDGET_MS,
} = {}) {
  const summary = summarizeRenderingRecords(records);
  const visualLatency = summary.visualLatencyP95Ms;
  const resolvedBudget = finiteNumber(visualLatencyBudgetMs) ?? DEFAULT_VISUAL_LATENCY_BUDGET_MS;
  const resolvedFrameNoise = finiteNumber(frameNoiseMs) ?? DEFAULT_FRAME_NOISE_MS;
  const resolvedDominanceRatio = finiteNumber(dominanceRatio) ?? DEFAULT_DOMINANCE_RATIO;

  if (!summary.targetCount || !summary.browserVisibleCount || visualLatency === null) {
    return {
      nextSlice: 'target-history-browser-rendering-visibility-attribution',
      ownerBoundary: 'target-history-browser-rendering-measurement',
      reason: 'browser-rendering-visibility-milestones-incomplete',
      status: 'measurement-incomplete',
      summary,
    };
  }

  if (visualLatency <= resolvedBudget) {
    return {
      nextSlice: 'replay-coordination-materialization-transition',
      ownerBoundary: 'target-history-responsive',
      reason: 'browser-rendering-visibility-within-budget',
      status: 'materialization-ready',
      summary,
    };
  }

  const postSecondFrame = summary.postLeftExtensionSecondFrameP95Ms;
  const postReadout = summary.postLeftExtensionReadoutP95Ms;
  const preLeftExtension = summary.preLeftExtensionP95Ms;
  const postRatio = ratio(postReadout, visualLatency);
  const preRatio = ratio(preLeftExtension, visualLatency);

  if (
    postReadout !== null &&
    postReadout > resolvedFrameNoise &&
    postRatio !== null &&
    postRatio >= resolvedDominanceRatio
  ) {
    return {
      nextSlice: 'target-history-browser-rendering-paint-visibility-plan',
      ownerBoundary: 'browser-rendering-or-chart-engine-paint-boundary',
      reason: 'post-left-extension-rendering-visibility-window-dominates-visual-latency',
      status: 'browser-rendering-visibility-attribution-needed',
      summary,
    };
  }

  if (
    preLeftExtension !== null &&
    preRatio !== null &&
    preRatio >= resolvedDominanceRatio &&
    (
      postReadout === null ||
      postReadout <= resolvedFrameNoise
    )
  ) {
    return {
      nextSlice: 'target-history-trigger-coordination-latency-attribution',
      ownerBoundary: 'target-history-trigger-or-coordination-boundary',
      reason: 'pre-left-extension-window-dominates-visual-latency',
      status: 'trigger-coordination-attribution-needed',
      summary,
    };
  }

  return {
    nextSlice: 'target-history-visual-latency-measurement-boundary-correction',
    ownerBoundary: 'target-history-visual-latency-measurement-boundary',
    reason: 'visual-latency-exceeds-budget-without-dominant-rendering-window',
    status: 'measurement-boundary-attribution-needed',
    summary,
  };
}
