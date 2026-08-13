import { failCalculatedSeries } from './contract-error.js';
import { readCalculatedSeriesDefinition } from './definition.js';
import { readCalculatedSeriesFrameIdentity } from './frame-identity.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';
import {
  assertByteCeiling,
  assertRawByteCeiling,
  boundedText,
  canonicalBytes,
  digest,
  enumValue,
  exactArray,
  exactRecord,
  finiteNumber,
  opaqueId,
  safeInteger,
} from './portable-value.js';

const RESULT_STATES = Object.freeze(['ready', 'empty', 'unavailable', 'error']);
const FRAME_STATES = Object.freeze(['pending', ...RESULT_STATES]);

class CalculatedSeriesOutputValue {
  #kind;
  #wire;
  constructor(kind, wire) { this.#kind = kind; this.#wire = wire; Object.freeze(this); }
  kind() { return this.#kind; }
  read() { return this.#wire; }
}

function normalizeScalarPoint(value, eligible, cutoff) {
  if (value?.state === 'whitespace') {
    exactRecord(value, ['displayEpochMs', 'state'], 'CALCULATED_SERIES_POINT_INVALID', 'Scalar whitespace point');
    return Object.freeze({ displayEpochMs: pointTime(value.displayEpochMs, eligible, cutoff), state: 'whitespace' });
  }
  exactRecord(value, ['displayEpochMs', 'state', 'value'], 'CALCULATED_SERIES_POINT_INVALID', 'Scalar value point');
  if (value.state !== 'value') failCalculatedSeries('CALCULATED_SERIES_POINT_INVALID', 'Scalar point state is invalid.');
  return Object.freeze({
    displayEpochMs: pointTime(value.displayEpochMs, eligible, cutoff),
    state: 'value',
    value: finiteNumber(value.value, 'Scalar point value'),
  });
}

function normalizeBandPoint(value, eligible, cutoff) {
  if (value?.state === 'whitespace') {
    exactRecord(value, ['displayEpochMs', 'state'], 'CALCULATED_SERIES_POINT_INVALID', 'Band whitespace point');
    return Object.freeze({ displayEpochMs: pointTime(value.displayEpochMs, eligible, cutoff), state: 'whitespace' });
  }
  exactRecord(value, ['displayEpochMs', 'lower', 'state', 'upper'], 'CALCULATED_SERIES_POINT_INVALID', 'Band value point');
  const lower = finiteNumber(value.lower, 'Band lower value');
  const upper = finiteNumber(value.upper, 'Band upper value');
  if (value.state !== 'value' || lower > upper) {
    failCalculatedSeries('CALCULATED_SERIES_BAND_INVALID', 'Band point bounds or state are invalid.');
  }
  return Object.freeze({ displayEpochMs: pointTime(value.displayEpochMs, eligible, cutoff), lower, state: 'value', upper });
}

function pointTime(value, eligible, cutoff) {
  const time = safeInteger(value, 'Point display time');
  if (time > cutoff) failCalculatedSeries('CALCULATED_SERIES_FUTURE_POINT', 'Point exceeds Replay cutoff.');
  if (!eligible.has(time)) failCalculatedSeries('CALCULATED_SERIES_POINT_TIME_INVALID', 'Point is outside the eligible input timeline.');
  return time;
}

function normalizePoints(values, plot, eligible, cutoff) {
  exactArray(
    values,
    { maximum: CALCULATED_SERIES_LIMITS.maximumOutputPointsPerPlot },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Plot points',
  );
  const normalizer = plot.kind === 'band' ? normalizeBandPoint : normalizeScalarPoint;
  const points = values.map((value) => normalizer(value, eligible.members, cutoff));
  if (points.some((point, index) => index > 0
    && point.displayEpochMs <= points[index - 1].displayEpochMs)) {
    failCalculatedSeries('CALCULATED_SERIES_POINT_ORDER_INVALID', 'Plot points must be strictly increasing and unique.');
  }
  if (points.length !== eligible.ordered.length
    || points.some((point, index) => point.displayEpochMs !== eligible.ordered[index])) {
    failCalculatedSeries(
      'CALCULATED_SERIES_POINT_COVERAGE_INCOMPLETE',
      'Every eligible input time requires one value or explicit whitespace point.',
    );
  }
  return Object.freeze(points);
}

function normalizeReadyGroups(values, definition, eligible, cutoff) {
  exactArray(
    values,
    { minimum: definition.plotGroups.length, maximum: definition.plotGroups.length },
    'CALCULATED_SERIES_RESULT_PARTIAL',
    'Ready output Plot Groups',
  );
  const byId = new Map(values.map((value) => [value?.plotGroupId, value]));
  if (byId.size !== values.length) failCalculatedSeries('CALCULATED_SERIES_RESULT_PARTIAL', 'Output Plot Groups duplicate identity.');
  return Object.freeze(definition.plotGroups.map((group) => {
    const value = byId.get(group.plotGroupId);
    exactRecord(value, ['plotGroupId', 'plots'], 'CALCULATED_SERIES_RESULT_PARTIAL', 'Result Plot Group');
    exactArray(
      value.plots,
      { minimum: group.plots.length, maximum: group.plots.length },
      'CALCULATED_SERIES_RESULT_PARTIAL',
      'Ready output Plots',
    );
    const plotsById = new Map(value.plots.map((plot) => [plot?.plotId, plot]));
    if (plotsById.size !== value.plots.length) failCalculatedSeries('CALCULATED_SERIES_RESULT_PARTIAL', 'Output Plots duplicate identity.');
    return Object.freeze({
      plotGroupId: group.plotGroupId,
      plots: Object.freeze(group.plots.map((plot) => {
        const output = plotsById.get(plot.plotId);
        exactRecord(output, ['kind', 'plotId', 'points'], 'CALCULATED_SERIES_RESULT_PARTIAL', 'Result Plot');
        if (output.kind !== plot.kind) failCalculatedSeries('CALCULATED_SERIES_PLOT_KIND_MISMATCH', 'Output Plot kind differs from definition.');
        return Object.freeze({ kind: plot.kind, plotId: plot.plotId, points: normalizePoints(output.points, plot, eligible, cutoff) });
      })),
    });
  }));
}

function normalizeTimeline(value, cutoff) {
  exactArray(
    value,
    { maximum: 100_000 },
    'CALCULATED_SERIES_INPUT_TIMELINE_INVALID',
    'Eligible input timeline',
  );
  const times = value.map((time) => safeInteger(time, 'Eligible display time'));
  if (times.some((time, index) => time > cutoff || (index > 0 && time <= times[index - 1]))) {
    failCalculatedSeries('CALCULATED_SERIES_INPUT_TIMELINE_INVALID', 'Eligible timeline must be increasing and no-future.');
  }
  return Object.freeze({ members: new Set(times), ordered: Object.freeze(times) });
}

function normalizeProvenance(value, frame, definition, state) {
  exactRecord(value, [
    'calculationMode', 'datasetDigest', 'definitionDigest', 'executor', 'formulaDigest',
    'inputTimelineDigest', 'packageDigest', 'parameterDigest', 'resultAncestry', 'warmupCoverage',
  ], 'CALCULATED_SERIES_PROVENANCE_INVALID', 'Result provenance');
  exactRecord(value.executor, ['executorId', 'executorVersion'], 'CALCULATED_SERIES_PROVENANCE_INVALID', 'Provenance executor');
  exactRecord(value.warmupCoverage, ['providedBars', 'requestedBars'], 'CALCULATED_SERIES_PROVENANCE_INVALID', 'Warmup coverage');
  exactArray(
    value.resultAncestry,
    { maximum: 128 },
    'CALCULATED_SERIES_PROVENANCE_INVALID',
    'Result ancestry',
  );
  if (value.datasetDigest !== frame.datasetProvenance.datasetDigest
    || value.parameterDigest !== frame.effectiveParameterDigest
    || value.inputTimelineDigest !== frame.inputDigest
    || value.executor.executorId !== frame.executor.executorId
    || value.executor.executorVersion !== frame.executor.executorVersion) {
    failCalculatedSeries('CALCULATED_SERIES_PROVENANCE_MISMATCH', 'Provenance does not close to frame identity.');
  }
  const requestedBars = safeInteger(value.warmupCoverage.requestedBars, 'Requested warmup Bars');
  const providedBars = safeInteger(value.warmupCoverage.providedBars, 'Provided warmup Bars');
  if (providedBars > requestedBars) failCalculatedSeries('CALCULATED_SERIES_PROVENANCE_INVALID', 'Provided warmup exceeds requested warmup.');
  if (requestedBars !== definition.inputRequirement.warmupBars
    || (value.calculationMode === 'incremental'
      && definition.executionSemantics.incrementalMode === 'none')) {
    failCalculatedSeries('CALCULATED_SERIES_PROVENANCE_MISMATCH', 'Warmup or calculation mode differs from definition.');
  }
  if (providedBars < requestedBars
    && definition.inputRequirement.insufficientWarmup === 'unavailable'
    && (state === 'ready' || state === 'empty')) {
    failCalculatedSeries(
      'CALCULATED_SERIES_WARMUP_POLICY_VIOLATION',
      'Insufficient warmup requires an unavailable result.',
    );
  }
  return Object.freeze({
    calculationMode: enumValue(value.calculationMode, ['full', 'incremental'], 'CALCULATED_SERIES_PROVENANCE_INVALID', 'Calculation mode'),
    datasetDigest: digest(value.datasetDigest),
    definitionDigest: digest(value.definitionDigest, 'Definition digest'),
    executor: frame.executor,
    formulaDigest: digest(value.formulaDigest, 'Formula digest'),
    inputTimelineDigest: digest(value.inputTimelineDigest, 'Input timeline digest'),
    packageDigest: digest(value.packageDigest, 'Package digest'),
    parameterDigest: digest(value.parameterDigest, 'Parameter digest'),
    resultAncestry: Object.freeze(value.resultAncestry.map((entry) => digest(entry, 'Result ancestry digest'))),
    warmupCoverage: Object.freeze({ providedBars, requestedBars }),
  });
}

function normalizeResourceUsage(value, pointCount, outputBytes, definition) {
  exactRecord(value, [
    'actualInputBars', 'admittedInputBars', 'durationMs', 'incrementalStateBytes',
    'outputBytes', 'outputPoints',
  ], 'CALCULATED_SERIES_RESOURCE_USAGE_INVALID', 'Resource usage');
  const usage = Object.freeze({
    actualInputBars: safeInteger(value.actualInputBars, 'Actual input Bars'),
    admittedInputBars: safeInteger(value.admittedInputBars, 'Admitted input Bars'),
    durationMs: finiteNumber(value.durationMs, 'Calculation duration', { minimum: 0 }),
    incrementalStateBytes: safeInteger(value.incrementalStateBytes, 'Incremental-state bytes'),
    outputBytes: safeInteger(value.outputBytes, 'Output bytes'),
    outputPoints: safeInteger(value.outputPoints, 'Output points'),
  });
  if (usage.actualInputBars > usage.admittedInputBars
    || usage.admittedInputBars > definition.resourceDeclaration.maximumInputBars
    || usage.outputPoints !== pointCount
    || usage.outputBytes !== outputBytes
    || usage.outputPoints > definition.resourceDeclaration.maximumOutputPoints
    || usage.outputBytes > definition.resourceDeclaration.maximumOutputBytes
    || usage.incrementalStateBytes > definition.resourceDeclaration.maximumIncrementalStateBytes) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_USAGE_MISMATCH', 'Resource usage exceeds declaration or output evidence.');
  }
  return usage;
}

function normalizeDiagnostic(value) {
  exactRecord(value, ['code', 'jsonPointer', 'logicalIdentity', 'message', 'phase', 'related', 'severity'],
    'CALCULATED_SERIES_DIAGNOSTIC_INVALID', 'Diagnostic');
  exactArray(
    value.related,
    { maximum: 128 },
    'CALCULATED_SERIES_DIAGNOSTIC_INVALID',
    'Related diagnostic identities',
  );
  if (typeof value.message !== 'string' || value.message.length < 1
    || value.message.length > CALCULATED_SERIES_LIMITS.maximumMessageCharacters) {
    failCalculatedSeries('CALCULATED_SERIES_DIAGNOSTIC_INVALID', 'Diagnostic content is invalid.');
  }
  return Object.freeze({
    code: opaqueId(value.code, 'Diagnostic code'),
    jsonPointer: value.jsonPointer === null ? null : boundedText(value.jsonPointer, 'Diagnostic JSON pointer'),
    logicalIdentity: value.logicalIdentity === null ? null : opaqueId(value.logicalIdentity, 'Diagnostic logical identity'),
    message: value.message,
    phase: opaqueId(value.phase, 'Diagnostic phase'),
    related: Object.freeze(value.related.map((entry) => opaqueId(entry, 'Related diagnostic identity')).sort()),
    severity: enumValue(value.severity, ['error', 'warning', 'info'], 'CALCULATED_SERIES_DIAGNOSTIC_INVALID', 'Diagnostic severity'),
  });
}

function normalizeDiagnostics(value) {
  exactArray(
    value,
    { maximum: CALCULATED_SERIES_LIMITS.maximumDiagnostics },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Diagnostics',
  );
  return Object.freeze(value.map(normalizeDiagnostic).sort((left, right) => (
    [left.phase, left.logicalIdentity ?? '', left.jsonPointer ?? '', left.code].join('|')
      .localeCompare([right.phase, right.logicalIdentity ?? '', right.jsonPointer ?? '', right.code].join('|'))
  )));
}

function createOutput(kind, value, definition, eligibleTimeline) {
  const definitionWire = readCalculatedSeriesDefinition(definition);
  const frame = readCalculatedSeriesFrameIdentity(value.frameIdentity);
  const expectedRef = JSON.stringify({ ...definitionWire.identity, profile: definitionWire.profile });
  if (expectedRef !== JSON.stringify(frame.definitionRef)) {
    failCalculatedSeries('CALCULATED_SERIES_RESULT_FOREIGN_IDENTITY', 'Output definition differs from frame identity.');
  }
  const states = kind === 'result' ? RESULT_STATES : FRAME_STATES;
  const state = enumValue(value.state, states, 'CALCULATED_SERIES_OUTPUT_STATE_INVALID', 'Output state');
  const eligible = normalizeTimeline(eligibleTimeline, frame.replayVisibleThroughEpochMs);
  if ((state === 'empty' && eligible.ordered.length !== 0)
    || (state === 'ready' && eligible.ordered.length === 0)) {
    failCalculatedSeries(
      'CALCULATED_SERIES_EMPTY_TIMELINE_MISMATCH',
      'Empty state and an empty eligible output timeline must coincide.',
    );
  }
  exactArray(
    value.plotGroups,
    { maximum: CALCULATED_SERIES_LIMITS.maximumPlotGroupsPerDefinition },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Output Plot Groups',
  );
  if (state !== 'ready' && value.plotGroups.length !== 0) {
    failCalculatedSeries('CALCULATED_SERIES_STALE_OUTPUT_FORBIDDEN', 'Only ready output may carry Plot points.');
  }
  const plotGroups = state === 'ready'
    ? normalizeReadyGroups(value.plotGroups, definitionWire, eligible, frame.replayVisibleThroughEpochMs)
    : Object.freeze([]);
  const pointCount = plotGroups.reduce((sum, group) => sum
    + group.plots.reduce((subtotal, plot) => subtotal + plot.points.length, 0), 0);
  if (pointCount > CALCULATED_SERIES_LIMITS.maximumTotalOutputPoints) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Output exceeds total point ceiling.');
  }
  const outputBytes = canonicalBytes(plotGroups);
  const revisionField = kind === 'result' ? 'resultRevision' : 'projectionRevision';
  const wire = Object.freeze({
    diagnostics: normalizeDiagnostics(value.diagnostics),
    frameIdentity: frame,
    plotGroups,
    provenance: normalizeProvenance(value.provenance, frame, definitionWire, state),
    resourceUsage: normalizeResourceUsage(value.resourceUsage, pointCount, outputBytes, definitionWire),
    [revisionField]: safeInteger(value[revisionField], `${kind} revision`, { minimum: 1 }),
    schemaVersion: 1,
    state,
  });
  assertByteCeiling(wire, CALCULATED_SERIES_LIMITS.maximumResultBytes, kind === 'result' ? 'Result' : 'Projection frame');
  return new CalculatedSeriesOutputValue(kind, wire);
}

function validateOutputFields(value, revisionField) {
  exactRecord(value, [
    'diagnostics', 'frameIdentity', 'plotGroups', 'provenance', revisionField,
    'resourceUsage', 'schemaVersion', 'state',
  ], 'CALCULATED_SERIES_OUTPUT_INVALID', 'Calculated-series output');
  const { frameIdentity: ignoredFrameIdentity, ...unbrandedWire } = value;
  assertRawByteCeiling(unbrandedWire, CALCULATED_SERIES_LIMITS.maximumResultBytes, 'Output');
  if (value.schemaVersion !== 1) failCalculatedSeries('CALCULATED_SERIES_SCHEMA_UNSUPPORTED', 'Output schema is unsupported.');
}

/** Define one executor result; pending and partial outputs are impossible. */
export function defineCalculatedSeriesResult(value = {}, { definition, eligibleTimeline = [] } = {}) {
  validateOutputFields(value, 'resultRevision');
  return createOutput('result', value, definition, eligibleTimeline);
}

/** Define one host projection frame; this remains portable and never writes a Chart. */
export function defineCalculatedSeriesProjectionFrame(value = {}, { definition, eligibleTimeline = [] } = {}) {
  validateOutputFields(value, 'projectionRevision');
  return createOutput('projection-frame', value, definition, eligibleTimeline);
}

/** Read a branded executor result as a canonical immutable record. */
export function readCalculatedSeriesResult(candidate) {
  if (!(candidate instanceof CalculatedSeriesOutputValue) || candidate.kind() !== 'result') {
    failCalculatedSeries('CALCULATED_SERIES_RESULT_REQUIRED', 'A branded calculated-series result is required.');
  }
  return candidate.read();
}

/** Read a branded projection frame without granting Chart publication authority. */
export function readCalculatedSeriesProjectionFrame(candidate) {
  if (!(candidate instanceof CalculatedSeriesOutputValue) || candidate.kind() !== 'projection-frame') {
    failCalculatedSeries('CALCULATED_SERIES_PROJECTION_FRAME_REQUIRED', 'A branded calculated-series projection frame is required.');
  }
  return candidate.read();
}
