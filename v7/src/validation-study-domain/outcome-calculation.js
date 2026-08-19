import {
  exactRecord,
  requireEnum,
  requireEpoch,
  requireFinite,
  requireOpaqueId,
  sha256Canonical,
  strictPortableValue,
  utf8Bytes,
} from './canonical-value.js';
import { OUTCOME_POLICY_ID, VALIDATION_LIMITS } from './constants.js';
import { readPathPlan } from './case-records.js';
import { failValidation } from './validation-error.js';

const BAR_FIELDS = Object.freeze(['close', 'high', 'low', 'open', 'startEpochMs']);

function normalizedBars(values, decisionCutoffEpochMs, outcomeCutoffEpochMs) {
  if (!Array.isArray(values) || values.length > VALIDATION_LIMITS.maximumOutcomeBars) {
    failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', 'Outcome window exceeds 2,000 Bars.', {
      operation: 'record-case-outcome',
    });
  }
  let previous = -1;
  const bars = values.map((value) => {
    exactRecord(value, BAR_FIELDS, 'Outcome Bar');
    const startEpochMs = requireEpoch(value.startEpochMs, 'Outcome Bar start');
    const open = requireFinite(value.open, 'Outcome Bar open');
    const high = requireFinite(value.high, 'Outcome Bar high');
    const low = requireFinite(value.low, 'Outcome Bar low');
    const close = requireFinite(value.close, 'Outcome Bar close');
    if (startEpochMs <= previous || startEpochMs < decisionCutoffEpochMs
      || startEpochMs >= outcomeCutoffEpochMs
      || low > Math.min(open, close) || high < Math.max(open, close) || low > high) {
      throw new TypeError('Outcome Bar order, envelope, or no-future window is invalid.');
    }
    previous = startEpochMs;
    return strictPortableValue({ close, high, low, open, startEpochMs });
  });
  if (utf8Bytes(bars) > VALIDATION_LIMITS.maximumOutcomeBytes) {
    failValidation('VALIDATION_CAMPAIGN_RESOURCE_LIMIT', 'Outcome input exceeds 512,000 bytes.', {
      operation: 'record-case-outcome',
    });
  }
  return Object.freeze(bars);
}
function touches(bar, plan) {
  const long = plan.direction === 'long';
  return Object.freeze({
    invalidation: long
      ? bar.low <= plan.invalidationPrice : bar.high >= plan.invalidationPrice,
    target: long ? bar.high >= plan.targetPrice : bar.low <= plan.targetPrice,
  });
}

function excursion(bars, plan) {
  if (bars.length === 0) return Object.freeze({ maePoints: 0, mfePoints: 0 });
  if (plan.direction === 'long') {
    return Object.freeze({
      maePoints: Math.max(0, ...bars.map(({ low }) => plan.referencePrice - low)),
      mfePoints: Math.max(0, ...bars.map(({ high }) => high - plan.referencePrice)),
    });
  }
  return Object.freeze({
    maePoints: Math.max(0, ...bars.map(({ high }) => high - plan.referencePrice)),
    mfePoints: Math.max(0, ...bars.map(({ low }) => plan.referencePrice - low)),
  });
}

/** Apply the accepted exact first-touch algorithm without inventing intrabar order. */
export async function calculateOutcomeObservation({
  bars: inputBars,
  coverageProof,
  crypto = globalThis.crypto,
  datasetIdentity,
  decisionCutoffEpochMs,
  outcomeCutoffEpochMs,
  pathPlan,
  recordedAtEpochMs,
}) {
  const decision = requireEpoch(decisionCutoffEpochMs, 'Decision cutoff');
  const cutoff = requireEpoch(outcomeCutoffEpochMs, 'Outcome cutoff');
  if (cutoff <= decision) throw new TypeError('Outcome cutoff must follow the decision cutoff.');
  const plan = readPathPlan(pathPlan);
  const bars = normalizedBars(inputBars, decision, cutoff).slice(0, plan.horizonBars);
  const proof = requireEnum(
    coverageProof,
    ['complete-window', 'irrecoverable-incomplete', 'not-yet-revealed'],
    'Outcome coverage proof',
  );
  let terminalIndex = -1;
  let outcomeClass = null;
  for (let index = 0; index < bars.length; index += 1) {
    const touch = touches(bars[index], plan);
    if (!touch.target && !touch.invalidation) continue;
    terminalIndex = index;
    outcomeClass = touch.target && touch.invalidation ? 'same-bar-ambiguous'
      : touch.target ? 'target-first' : 'invalidation-first';
    break;
  }
  let included;
  if (terminalIndex >= 0) included = bars.slice(0, terminalIndex + 1);
  else if (bars.length >= plan.horizonBars) {
    outcomeClass = 'horizon-expired';
    included = bars.slice(0, plan.horizonBars);
  } else if (proof === 'irrecoverable-incomplete') {
    outcomeClass = 'incomplete-data';
    included = bars;
  } else {
    failValidation(
      'VALIDATION_CAMPAIGN_OUTCOME_NOT_REVEALED',
      'The declared Outcome horizon is not revealed and no terminal Bar has occurred.',
      { operation: 'record-case-outcome' },
    );
  }
  const incomplete = outcomeClass === 'incomplete-data';
  const barWindowDigest = await sha256Canonical({
    bars: included,
    coverageProof: proof,
    datasetIdentity: strictPortableValue(datasetIdentity),
    decisionCutoffEpochMs: decision,
    outcomeCutoffEpochMs: cutoff,
  }, crypto);
  const excursions = incomplete ? { maePoints: null, mfePoints: null } : excursion(included, plan);
  const result = strictPortableValue({
    barWindowDigest,
    coverageState: incomplete ? 'incomplete' : 'complete',
    decisionCutoffEpochMs: decision,
    firstEligibleBarStartEpochMs: included[0]?.startEpochMs ?? null,
    horizonBars: plan.horizonBars,
    lastObservedBarStartEpochMs: included.at(-1)?.startEpochMs ?? null,
    maePoints: excursions.maePoints,
    mfePoints: excursions.mfePoints,
    observedBarCount: included.length,
    outcomeClass,
    outcomeCutoffEpochMs: cutoff,
    policyId: OUTCOME_POLICY_ID,
    recordedAtEpochMs: requireEpoch(recordedAtEpochMs, 'Outcome record time'),
    terminalBarStartEpochMs: terminalIndex >= 0 ? bars[terminalIndex].startEpochMs : null,
    timeToFirstTouchBars: ['target-first', 'invalidation-first'].includes(outcomeClass)
      ? terminalIndex + 1 : null,
  });
  return strictPortableValue({
    ...result,
    calculationDigest: await sha256Canonical(result, crypto),
  });
}
