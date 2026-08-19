import {
  exactRecord,
  requireDigest,
  requireEnum,
  requireEpoch,
  requireFinite,
  requireOpaqueId,
  requireRevision,
  sha256CanonicalSync,
  strictPortableValue,
} from './canonical-value.js';
import { OUTCOME_CLASSES, OUTCOME_POLICY_ID } from './constants.js';

const OUTCOME_FIELDS = Object.freeze([
  'barWindowDigest', 'calculationDigest', 'coverageState', 'decisionCutoffEpochMs',
  'firstEligibleBarStartEpochMs', 'horizonBars', 'lastObservedBarStartEpochMs',
  'maePoints', 'mfePoints', 'observedBarCount', 'outcomeClass', 'outcomeCutoffEpochMs',
  'policyId', 'recordedAtEpochMs', 'terminalBarStartEpochMs', 'timeToFirstTouchBars',
]);
const TERMINAL_CLASSES = Object.freeze([
  'target-first', 'invalidation-first', 'same-bar-ambiguous',
]);

function optionalEpoch(value, label) {
  return value === null ? null : requireEpoch(value, label);
}

function validateWindow(result) {
  const hasBars = result.observedBarCount > 0;
  if (result.outcomeCutoffEpochMs <= result.decisionCutoffEpochMs
    || result.recordedAtEpochMs < result.outcomeCutoffEpochMs
    || result.observedBarCount > result.horizonBars
    || hasBars !== (result.firstEligibleBarStartEpochMs !== null)
    || hasBars !== (result.lastObservedBarStartEpochMs !== null)
    || (hasBars && (result.firstEligibleBarStartEpochMs > result.lastObservedBarStartEpochMs
      || result.firstEligibleBarStartEpochMs < result.decisionCutoffEpochMs
      || result.lastObservedBarStartEpochMs >= result.outcomeCutoffEpochMs))) {
    throw new TypeError('Outcome Bar-window chronology is inconsistent.');
  }
}

function validateClassification(result) {
  const terminal = TERMINAL_CLASSES.includes(result.outcomeClass);
  const firstTouch = ['target-first', 'invalidation-first'].includes(result.outcomeClass);
  const incomplete = result.outcomeClass === 'incomplete-data';
  if (terminal !== (result.terminalBarStartEpochMs !== null)
    || firstTouch !== (result.timeToFirstTouchBars !== null)
    || (result.timeToFirstTouchBars !== null
      && result.timeToFirstTouchBars > result.observedBarCount)
    || (incomplete && (result.coverageState !== 'incomplete'
      || result.observedBarCount >= result.horizonBars
      || result.mfePoints !== null || result.maePoints !== null))
    || (!incomplete && (result.coverageState !== 'complete'
      || result.mfePoints === null || result.maePoints === null))
    || (result.outcomeClass === 'horizon-expired'
      && result.observedBarCount !== result.horizonBars)) {
    throw new TypeError('Outcome terminal, coverage, or excursion shape is inconsistent.');
  }
}

/** Read one deterministic Outcome record and verify its self-contained calculation digest. */
export function readOutcomeObservation(value) {
  if (value === null) return null;
  exactRecord(value, OUTCOME_FIELDS, 'Outcome observation');
  const result = strictPortableValue({
    barWindowDigest: requireDigest(value.barWindowDigest, 'Bar window digest'),
    calculationDigest: requireDigest(value.calculationDigest, 'Outcome calculation digest'),
    coverageState: requireEnum(value.coverageState, ['complete', 'incomplete'], 'Outcome coverage'),
    decisionCutoffEpochMs: requireEpoch(value.decisionCutoffEpochMs, 'Decision cutoff'),
    firstEligibleBarStartEpochMs: optionalEpoch(
      value.firstEligibleBarStartEpochMs, 'First eligible Bar start',
    ),
    horizonBars: requireRevision(value.horizonBars, 'Outcome horizon'),
    lastObservedBarStartEpochMs: optionalEpoch(
      value.lastObservedBarStartEpochMs, 'Last observed Bar start',
    ),
    maePoints: value.maePoints === null ? null : requireFinite(value.maePoints, 'MAE'),
    mfePoints: value.mfePoints === null ? null : requireFinite(value.mfePoints, 'MFE'),
    observedBarCount: requireRevision(value.observedBarCount, 'Observed Bar count', { minimum: 0 }),
    outcomeClass: requireEnum(value.outcomeClass, OUTCOME_CLASSES, 'Outcome class'),
    outcomeCutoffEpochMs: requireEpoch(value.outcomeCutoffEpochMs, 'Outcome cutoff'),
    policyId: requireOpaqueId(value.policyId, 'Outcome policy id'),
    recordedAtEpochMs: requireEpoch(value.recordedAtEpochMs, 'Outcome record time'),
    terminalBarStartEpochMs: optionalEpoch(value.terminalBarStartEpochMs, 'Terminal Bar start'),
    timeToFirstTouchBars: value.timeToFirstTouchBars === null ? null
      : requireRevision(value.timeToFirstTouchBars, 'Time to first touch'),
  });
  if (result.policyId !== OUTCOME_POLICY_ID
    || (result.maePoints !== null && result.maePoints < 0)
    || (result.mfePoints !== null && result.mfePoints < 0)) {
    throw new TypeError('Outcome policy or excursion value is invalid.');
  }
  validateWindow(result);
  validateClassification(result);
  const { calculationDigest, ...calculation } = result;
  if (sha256CanonicalSync(calculation) !== calculationDigest) {
    throw new TypeError('Outcome calculation digest is stale.');
  }
  return result;
}
