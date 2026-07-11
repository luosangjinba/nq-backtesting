const DEFAULT_FRAME_NOISE_MS = 16;
const DEFAULT_DOMINANCE_RATIO = 0.65;

const STATUS_BY_PHASE = Object.freeze({
  displayApply: {
    nextSlice: 'target-history-display-timeframe-apply-coordination-attribution',
    ownerBoundary: 'runtime.display-timeframe',
    reason: 'display-timeframe-apply-window-dominates-pre-left-extension-latency',
    status: 'display-apply-coordination-attribution-needed',
  },
  eventEmission: {
    nextSlice: 'target-history-event-emission-boundary-attribution',
    ownerBoundary: 'runtime.leftward-history-extension',
    reason: 'post-chart-data-left-extension-event-window-dominates-pre-left-extension-latency',
    status: 'event-emission-boundary-attribution-needed',
  },
  scheduling: {
    nextSlice: 'target-history-leftward-request-scheduling-plan',
    ownerBoundary: 'chart-history.leftward-history-input-bridge',
    reason: 'post-apply-target-fetch-start-window-dominates-pre-left-extension-latency',
    status: 'leftward-request-scheduling-attribution-needed',
  },
  targetRuntime: {
    nextSlice: 'target-history-runtime-request-application-attribution',
    ownerBoundary: 'runtime.leftward-history-extension',
    reason: 'target-fetch-to-left-extension-window-dominates-pre-left-extension-latency',
    status: 'target-history-runtime-attribution-needed',
  },
});

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

function summarize(records = []) {
  const targetRecords = records
    .filter(Boolean)
    .filter((record) => record.browserVisible === true && record.path === 'target-history');
  return {
    displayApplyP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'displayApplyMs', 'display-apply-returned', 'target-history-apply-start')
    ))),
    eventEmissionP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'eventEmissionMs', 'left-extension-loaded', 'chart-data-applied')
    ))),
    postApplyTargetFetchStartP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'postApplyTargetFetchStartMs', 'target-fetch-started', 'display-apply-returned')
    ))),
    preLeftExtensionP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'preLeftExtensionMs', 'left-extension-loaded', 'target-history-apply-start')
    ))),
    targetCount: targetRecords.length,
    targetRuntimeP95Ms: percentile(targetRecords.map((record) => (
      fieldOrMilestoneDelta(record, 'targetRuntimeMs', 'left-extension-loaded', 'target-fetch-started')
    ))),
  };
}

function dominantPhase(summary = {}) {
  return [
    ['displayApply', summary.displayApplyP95Ms],
    ['eventEmission', summary.eventEmissionP95Ms],
    ['scheduling', summary.postApplyTargetFetchStartP95Ms],
    ['targetRuntime', summary.targetRuntimeP95Ms],
  ].reduce((winner, [phase, value]) => {
    const number = finiteNumber(value);
    if (number === null) return winner;
    if (!winner || number > winner.value) return { phase, value: number };
    return winner;
  }, null);
}

export function attributeHighTimeframeTargetHistoryTriggerCoordinationLatency({
  dominanceRatio = DEFAULT_DOMINANCE_RATIO,
  frameNoiseMs = DEFAULT_FRAME_NOISE_MS,
  records = [],
} = {}) {
  const summary = summarize(records);
  const preLeftExtension = finiteNumber(summary.preLeftExtensionP95Ms);
  const resolvedFrameNoise = finiteNumber(frameNoiseMs) ?? DEFAULT_FRAME_NOISE_MS;
  const resolvedDominanceRatio = finiteNumber(dominanceRatio) ?? DEFAULT_DOMINANCE_RATIO;

  if (!summary.targetCount || preLeftExtension === null) {
    return {
      nextSlice: 'target-history-trigger-coordination-latency-attribution',
      ownerBoundary: 'target-history-trigger-coordination-measurement',
      reason: 'trigger-coordination-milestones-incomplete',
      selectedPhase: null,
      status: 'measurement-incomplete',
      summary,
    };
  }

  const winner = dominantPhase(summary);
  if (
    winner &&
    winner.value > resolvedFrameNoise &&
    winner.value / Math.max(1, preLeftExtension) >= resolvedDominanceRatio
  ) {
    return {
      ...STATUS_BY_PHASE[winner.phase],
      selectedPhase: winner.phase,
      summary,
    };
  }

  return {
    nextSlice: 'target-history-trigger-coordination-milestone-refinement',
    ownerBoundary: 'target-history-trigger-coordination-measurement-boundary',
    reason: 'pre-left-extension-latency-exceeds-without-dominant-trigger-phase',
    selectedPhase: winner?.phase || null,
    status: 'measurement-boundary-attribution-needed',
    summary,
  };
}
