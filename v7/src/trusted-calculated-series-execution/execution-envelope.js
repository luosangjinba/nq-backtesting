import {
  readCalculatedSeriesDefinition,
  readCalculatedSeriesFrameIdentity,
} from '../calculated-series-contract/public.js';
import { failTrustedExecution } from './execution-error.js';

function exactRecord(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    failTrustedExecution('TRUSTED_CALCULATED_SERIES_ENVELOPE_INVALID', `${label} fields are invalid.`);
  }
  return value;
}

function normalizedBar(value, previous, label) {
  exactRecord(value, ['close', 'displayEpochMs'], label);
  if (!Number.isSafeInteger(value.displayEpochMs) || value.displayEpochMs < 0
    || value.displayEpochMs <= previous || !Number.isFinite(value.close)) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_INPUT_INVALID',
      `${label} values must be finite and strictly increasing.`,
    );
  }
  return Object.freeze({ close: value.close, displayEpochMs: value.displayEpochMs });
}

function bars(value, label, previousTime = -1) {
  if (!Array.isArray(value) || !Object.isFrozen(value)) {
    failTrustedExecution('TRUSTED_CALCULATED_SERIES_INPUT_INVALID', `${label} must be immutable.`);
  }
  const normalized = [];
  let previous = previousTime;
  for (const entry of value) {
    const bar = normalizedBar(entry, previous, label);
    previous = bar.displayEpochMs;
    normalized.push(bar);
  }
  return Object.freeze({ bars: Object.freeze(normalized), lastTime: previous });
}

function requireRegistration(value) {
  exactRecord(value, [
    'binding', 'definition', 'definitionDigest', 'display', 'executor', 'formula',
    'formulaDigest', 'instanceLimitPerPane', 'manifest', 'normalizeSettings',
    'legendLabelFields', 'packageDigest', 'reference', 'schemaVersion',
    'visibilityFieldId',
  ], 'Trusted registration');
  if (value.schemaVersion !== 1 || typeof value.formula !== 'function'
    || typeof value.normalizeSettings !== 'function') {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_REGISTRATION_INVALID',
      'Trusted registration callbacks or schema are invalid.',
    );
  }
  readCalculatedSeriesDefinition(value.definition);
  return value;
}

/** Close and freeze the only formula input accepted by the in-process executor. */
export function readTrustedExecutionEnvelope(value = {}) {
  exactRecord(value, [
    'displayBars', 'eligibleTimeline', 'frameIdentity', 'parameters', 'registration',
    'resultRevision', 'signal', 'warmupBars',
  ], 'Trusted execution envelope');
  const registration = requireRegistration(value.registration);
  const definition = readCalculatedSeriesDefinition(registration.definition);
  const frame = readCalculatedSeriesFrameIdentity(value.frameIdentity);
  if (frame.executor.executorId !== registration.executor.executorId
    || frame.executor.executorVersion !== registration.executor.executorVersion
    || JSON.stringify(frame.definitionRef) !== JSON.stringify(registration.reference)) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_IDENTITY_MISMATCH',
      'Executor, Definition, or registration identity differs from the frame.',
    );
  }
  if (!value.signal || typeof value.signal.aborted !== 'boolean') {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_SIGNAL_REQUIRED',
      'Trusted calculation requires an AbortSignal.',
    );
  }
  if (!Number.isSafeInteger(value.resultRevision) || value.resultRevision < 1
    || !value.parameters || typeof value.parameters !== 'object'
    || Array.isArray(value.parameters) || !Object.isFrozen(value.parameters)) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_ENVELOPE_INVALID',
      'Parameters or result revision are invalid.',
    );
  }
  const warmup = bars(value.warmupBars, 'Warmup Bars');
  const display = bars(value.displayBars, 'Display Bars', warmup.lastTime);
  if (!Array.isArray(value.eligibleTimeline) || !Object.isFrozen(value.eligibleTimeline)
    || value.eligibleTimeline.length !== display.bars.length
    || value.eligibleTimeline.some((time, index) => time !== display.bars[index].displayEpochMs)) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_TIMELINE_MISMATCH',
      'Eligible output timeline must exactly match display Bars.',
    );
  }
  const admittedInputBars = warmup.bars.length + display.bars.length;
  if (admittedInputBars > definition.resourceDeclaration.maximumInputBars
    || display.bars.length > definition.resourceDeclaration.maximumOutputPoints) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_RESOURCE_LIMIT',
      'Calculation input exceeds the Definition resource declaration.',
    );
  }
  if (warmup.bars.length > definition.inputRequirement.warmupBars) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_WARMUP_INVALID',
      'Provided warmup exceeds the Definition request.',
    );
  }
  return Object.freeze({
    definition: registration.definition,
    definitionWire: definition,
    displayBars: display.bars,
    eligibleTimeline: value.eligibleTimeline,
    frameIdentity: value.frameIdentity,
    frameWire: frame,
    parameters: value.parameters,
    registration,
    resultRevision: value.resultRevision,
    signal: value.signal,
    warmupBars: warmup.bars,
  });
}
