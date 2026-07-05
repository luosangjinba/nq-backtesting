export const VISIBLE_LATENCY_PHASES = Object.freeze([
  'input',
  'commandReceived',
  'barAvailable',
  'chartUpdateRequested',
  'candleVisible',
]);

const PHASE_SET = new Set(VISIBLE_LATENCY_PHASES);

export const VISIBLE_LATENCY_CAUSES = Object.freeze({
  chart: 'chart-latency',
  data: 'data-latency',
  incomplete: 'incomplete-trace',
  input: 'input-dispatch-latency',
  none: 'within-threshold',
});

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cloneMetadata(metadata = {}) {
  return Object.freeze({ ...metadata });
}

function cloneMarks(marks) {
  return Object.freeze(Object.fromEntries(
    Object.entries(marks).map(([phase, mark]) => [
      phase,
      Object.freeze({
        at: mark.at,
        metadata: mark.metadata,
      }),
    ]),
  ));
}

function assertKnownPhase(phase) {
  if (!PHASE_SET.has(phase)) {
    throw new Error(`Unknown visible latency phase: ${phase}`);
  }
}

export function createVisibleLatencyTrace({
  cacheHit = false,
  id = 'visible-latency-trace',
  metadata = {},
  now = () => performance.now(),
  thresholdMs = 120,
} = {}) {
  const marks = {};
  let dataFetchRequested = false;

  function mark(phase, phaseMetadata = {}) {
    assertKnownPhase(phase);
    const previousPhase = VISIBLE_LATENCY_PHASES
      .slice(0, VISIBLE_LATENCY_PHASES.indexOf(phase))
      .find((requiredPhase) => !marks[requiredPhase]);
    if (previousPhase) {
      throw new Error(`Cannot mark ${phase} before ${previousPhase}.`);
    }
    if (marks[phase]) {
      throw new Error(`Visible latency phase already marked: ${phase}`);
    }
    marks[phase] = {
      at: normalizeNumber(now()),
      metadata: cloneMetadata(phaseMetadata),
    };
    return snapshot();
  }

  function recordDataFetch(fetchMetadata = {}) {
    dataFetchRequested = true;
    return markDataPath('dataFetchRequested', fetchMetadata);
  }

  function markDataPath(name, pathMetadata = {}) {
    const phase = String(name);
    if (!phase) {
      throw new Error('Visible latency data path mark name is required.');
    }
    marks[phase] = {
      at: normalizeNumber(now()),
      metadata: cloneMetadata(pathMetadata),
    };
    return snapshot();
  }

  function snapshot() {
    return Object.freeze({
      cacheHit: Boolean(cacheHit),
      dataFetchRequested,
      id,
      marks: cloneMarks(marks),
      metadata: cloneMetadata(metadata),
      phases: [...VISIBLE_LATENCY_PHASES],
      thresholdMs: normalizeNumber(thresholdMs, 120),
    });
  }

  return Object.freeze({
    mark,
    markDataPath,
    recordDataFetch,
    snapshot,
  });
}

export function summarizeVisibleLatencyTrace(trace) {
  const marks = trace?.marks ?? {};
  const missingPhases = VISIBLE_LATENCY_PHASES.filter((phase) => !marks[phase]);
  const phaseDurations = {};
  for (let index = 1; index < VISIBLE_LATENCY_PHASES.length; index += 1) {
    const fromPhase = VISIBLE_LATENCY_PHASES[index - 1];
    const toPhase = VISIBLE_LATENCY_PHASES[index];
    if (marks[fromPhase] && marks[toPhase]) {
      phaseDurations[`${fromPhase}->${toPhase}`] = marks[toPhase].at - marks[fromPhase].at;
    }
  }
  const totalMs = marks.input && marks.candleVisible
    ? marks.candleVisible.at - marks.input.at
    : null;
  const thresholdMs = normalizeNumber(trace?.thresholdMs, 120);
  return Object.freeze({
    cacheHit: Boolean(trace?.cacheHit),
    dataFetchRequested: Boolean(trace?.dataFetchRequested),
    failureCause: classifyVisibleLatencyFailure({
      dataFetchRequested: Boolean(trace?.dataFetchRequested),
      missingPhases,
      phaseDurations,
      thresholdMs,
      totalMs,
    }),
    missingPhases: Object.freeze([...missingPhases]),
    phaseDurations: Object.freeze(phaseDurations),
    thresholdMs,
    totalMs,
    withinThreshold: totalMs !== null && totalMs <= thresholdMs,
  });
}

export function classifyVisibleLatencyFailure({
  dataFetchRequested = false,
  missingPhases = [],
  phaseDurations = {},
  thresholdMs = 120,
  totalMs = null,
} = {}) {
  if (missingPhases.length > 0 || totalMs === null) {
    return VISIBLE_LATENCY_CAUSES.incomplete;
  }
  if (totalMs <= thresholdMs) {
    return VISIBLE_LATENCY_CAUSES.none;
  }
  if (dataFetchRequested || phaseDurations['commandReceived->barAvailable'] > thresholdMs) {
    return VISIBLE_LATENCY_CAUSES.data;
  }
  if (phaseDurations['input->commandReceived'] > thresholdMs) {
    return VISIBLE_LATENCY_CAUSES.input;
  }
  return VISIBLE_LATENCY_CAUSES.chart;
}

export function assertCacheHitVisiblePath(summary) {
  if (!summary?.cacheHit) {
    throw new Error('Visible latency trace is not marked as a cache hit.');
  }
  if (summary.dataFetchRequested) {
    throw new Error('Cache-hit visible latency path requested data.');
  }
  if (summary.missingPhases?.length) {
    throw new Error(`Visible latency trace is missing phases: ${summary.missingPhases.join(', ')}`);
  }
  return summary;
}
