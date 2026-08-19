import {
  canonicalJson,
  exactRecord,
  requireBoundedText,
  requireContractId,
  requireDigest,
  requireEnum,
  requireEpoch,
  requireFinite,
  requireRevision,
  requireSemver,
  requireUuid,
  sha256Canonical,
  strictPortableValue,
  verifyContentDigest,
} from './canonical-value.js';
import {
  METRIC_SET_ID,
  METRIC_SET_VERSION,
  OUTCOME_CLASSES,
  QUALIFICATION_CLASSES,
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from './constants.js';
import { readCaseRef, readCohortRef } from './cohort-records.js';

const ANALYSIS_FIELDS = Object.freeze([
  'analysisRunId', 'analysisRunRevision', 'authorLabel', 'campaignId', 'cohortRef',
  'contentDigest', 'counts', 'createdAtEpochMs', 'drilldownIndex', 'medians',
  'metricLineage', 'metricSetId', 'metricSetVersion', 'rates', 'schema',
  'sourceAvailabilitySnapshot', 'version',
]);
const COUNT_KEYS = Object.freeze([
  'ambiguous', 'horizonExpired', 'incomplete', 'incompleteData', 'invalidationFirst',
  'qualified', 'rejected', 'resolvedFirstTouchCount', 'sameBarAmbiguous',
  'sourceUnavailableCount', 'targetFirst', 'total',
]);
const COUNT_METRICS = Object.freeze([
  ['count.total', 'total'],
  ...QUALIFICATION_CLASSES.map((name) => [`count.qualification.${name}`, name]),
  ...OUTCOME_CLASSES.map((name) => [`count.outcome.${name}`, Object.freeze({
    'horizon-expired': 'horizonExpired',
    'incomplete-data': 'incompleteData',
    'invalidation-first': 'invalidationFirst',
    'same-bar-ambiguous': 'sameBarAmbiguous',
    'target-first': 'targetFirst',
  })[name]]),
  ['count.resolved-first-touch', 'resolvedFirstTouchCount'],
  ['count.source-unavailable', 'sourceUnavailableCount'],
]);
const MEDIAN_METRICS = Object.freeze({
  maePoints: 'median.mae-points',
  mfePoints: 'median.mfe-points',
  timeToFirstTouchBars: 'median.time-to-first-touch-bars',
});
const EXPECTED_METRIC_IDS = Object.freeze([
  ...COUNT_METRICS.map(([metricId]) => metricId),
  'rate.target-first',
  ...Object.values(MEDIAN_METRICS),
]);

function caseKey(ref) {
  return `${ref.caseId}:${ref.caseRevision}:${ref.caseContentDigest}`;
}

function caseRefs(values, label) {
  if (!Array.isArray(values)) throw new TypeError(`${label} must be an array.`);
  const refs = values.map(readCaseRef);
  const keys = refs.map(caseKey);
  if (new Set(keys).size !== keys.length) throw new TypeError(`${label} contains duplicate Cases.`);
  const ordered = [...refs].sort((left, right) => (
    left.caseId.localeCompare(right.caseId) || left.caseRevision - right.caseRevision
  ));
  if (canonicalJson(refs) !== canonicalJson(ordered)) {
    throw new TypeError(`${label} is not canonically ordered.`);
  }
  return Object.freeze(refs);
}

function availabilityEntries(values) {
  if (!Array.isArray(values)) throw new TypeError('Source availability snapshot must be an array.');
  const entries = values.map((entry) => {
    exactRecord(entry, [
      'caseRef', 'citationId', 'evidenceRole', 'providerId', 'providerVersion', 'status',
    ], 'Source availability entry');
    return strictPortableValue({
      caseRef: readCaseRef(entry.caseRef),
      citationId: requireUuid(entry.citationId, 'Availability citation id'),
      evidenceRole: requireEnum(
        entry.evidenceRole, ['context-sma', 'execution-fvg'], 'Evidence role',
      ),
      providerId: requireContractId(entry.providerId, 'Availability provider id'),
      providerVersion: requireSemver(entry.providerVersion, 'Provider version'),
      status: requireEnum(
        entry.status, ['available', 'unavailable', 'incompatible'], 'Provider availability',
      ),
    });
  });
  const ordered = [...entries].sort((left, right) => (
    left.caseRef.caseId.localeCompare(right.caseRef.caseId)
      || left.caseRef.caseRevision - right.caseRef.caseRevision
      || left.citationId.localeCompare(right.citationId)
  ));
  const keys = ordered.map((entry) => (
    `${caseKey(entry.caseRef)}:${entry.citationId}:${entry.evidenceRole}`
  ));
  if (new Set(keys).size !== keys.length || canonicalJson(entries) !== canonicalJson(ordered)) {
    throw new TypeError('Source availability entries are duplicated or unordered.');
  }
  return Object.freeze(entries);
}

function counts(value) {
  exactRecord(value, COUNT_KEYS, 'Analysis counts');
  const result = strictPortableValue(Object.fromEntries(COUNT_KEYS.map((key) => [
    key, requireRevision(value[key], `Analysis count ${key}`, { minimum: 0 }),
  ])));
  const qualifications = QUALIFICATION_CLASSES.reduce((total, key) => total + result[key], 0);
  const outcomes = result.targetFirst + result.invalidationFirst + result.sameBarAmbiguous
    + result.horizonExpired + result.incompleteData;
  if (qualifications !== result.total || outcomes !== result.total
    || result.resolvedFirstTouchCount !== result.targetFirst + result.invalidationFirst
    || result.sourceUnavailableCount > result.total) {
    throw new TypeError('Analysis counts are internally inconsistent.');
  }
  return result;
}

function rates(value, resultCounts) {
  exactRecord(value, ['targetFirstRate'], 'Analysis rates');
  exactRecord(value.targetFirstRate, ['denominator', 'numerator', 'value'], 'Target-first rate');
  const denominator = requireRevision(
    value.targetFirstRate.denominator, 'Target-first denominator', { minimum: 0 },
  );
  const numerator = requireRevision(
    value.targetFirstRate.numerator, 'Target-first numerator', { minimum: 0 },
  );
  const rate = value.targetFirstRate.value === null
    ? null : requireFinite(value.targetFirstRate.value, 'Target-first rate');
  const expected = denominator === 0 ? null : numerator / denominator;
  if (numerator > denominator || denominator !== resultCounts.resolvedFirstTouchCount
    || numerator !== resultCounts.targetFirst || rate !== expected) {
    throw new TypeError('Target-first rate is internally inconsistent.');
  }
  return strictPortableValue({ targetFirstRate: { denominator, numerator, value: rate } });
}

function medianEntry(value, label) {
  exactRecord(value, ['eligibleCaseRefs', 'value'], `${label} median`);
  const eligibleCaseRefs = caseRefs(value.eligibleCaseRefs, `${label} eligible Case references`);
  const result = value.value === null ? null : requireFinite(value.value, `${label} median value`);
  if ((eligibleCaseRefs.length === 0) !== (result === null)) {
    throw new TypeError(`${label} median emptiness is inconsistent.`);
  }
  return strictPortableValue({ eligibleCaseRefs, value: result });
}

function medians(value) {
  exactRecord(value, Object.keys(MEDIAN_METRICS), 'Analysis medians');
  return strictPortableValue(Object.fromEntries(Object.keys(MEDIAN_METRICS).map((field) => [
    field, medianEntry(value[field], field),
  ])));
}

function drilldowns(values) {
  if (!Array.isArray(values)) throw new TypeError('Analysis drilldown index must be an array.');
  const entries = values.map((entry) => {
    exactRecord(entry, ['caseRefs', 'metricId'], 'Analysis drilldown');
    return strictPortableValue({
      caseRefs: caseRefs(entry.caseRefs, `Drilldown ${entry.metricId} Case references`),
      metricId: requireContractId(entry.metricId, 'Drilldown metric id'),
    });
  });
  if (canonicalJson(entries.map(({ metricId }) => metricId)) !== canonicalJson(EXPECTED_METRIC_IDS)) {
    throw new TypeError('Analysis drilldown metric set is incomplete or unordered.');
  }
  return Object.freeze(entries);
}

async function metricLineage(values, drilldownEntries, resultCounts, resultRates) {
  if (!Array.isArray(values) || values.length !== drilldownEntries.length) {
    throw new TypeError('Analysis metric lineage is incomplete.');
  }
  const entries = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    exactRecord(value, [
      'denominatorCaseRefs', 'excludedCaseRefs', 'metricId', 'metricVersion',
      'numeratorCaseRefs', 'resultDigest',
    ], 'Analysis metric lineage');
    const denominatorCaseRefs = caseRefs(
      value.denominatorCaseRefs, `Lineage ${value.metricId} denominator`,
    );
    const numeratorCaseRefs = caseRefs(
      value.numeratorCaseRefs, `Lineage ${value.metricId} numerator`,
    );
    const excludedCaseRefs = caseRefs(value.excludedCaseRefs, `Lineage ${value.metricId} exclusions`);
    const drilldown = drilldownEntries[index];
    if (value.metricId !== drilldown.metricId || value.metricVersion !== METRIC_SET_VERSION
      || canonicalJson(denominatorCaseRefs) !== canonicalJson(drilldown.caseRefs)
      || excludedCaseRefs.length !== 0
      || requireDigest(value.resultDigest, 'Metric result digest')
        !== await sha256Canonical(drilldown)) {
      throw new TypeError('Analysis metric lineage does not close to its drilldown.');
    }
    const denominatorKeys = new Set(denominatorCaseRefs.map(caseKey));
    if (numeratorCaseRefs.some((ref) => !denominatorKeys.has(caseKey(ref)))) {
      throw new TypeError('Analysis metric numerator is outside its denominator.');
    }
    if (value.metricId === 'rate.target-first') {
      if (denominatorCaseRefs.length !== resultRates.targetFirstRate.denominator
        || numeratorCaseRefs.length !== resultRates.targetFirstRate.numerator) {
        throw new TypeError('Rate lineage cardinality is inconsistent.');
      }
    } else if (canonicalJson(numeratorCaseRefs) !== canonicalJson(denominatorCaseRefs)) {
      throw new TypeError('Non-rate metric lineage numerator must equal its denominator.');
    }
    entries.push(strictPortableValue({
      denominatorCaseRefs,
      excludedCaseRefs,
      metricId: value.metricId,
      metricVersion: value.metricVersion,
      numeratorCaseRefs,
      resultDigest: value.resultDigest,
    }));
  }
  for (const [metricId, countField] of COUNT_METRICS) {
    const entry = drilldownEntries.find((candidate) => candidate.metricId === metricId);
    if (entry.caseRefs.length !== resultCounts[countField]) {
      throw new TypeError(`Analysis ${metricId} drilldown count is inconsistent.`);
    }
  }
  return Object.freeze(entries);
}

/** Read one fully closed immutable Analysis Run record. */
export async function readAnalysisRun(value, crypto = globalThis.crypto) {
  exactRecord(value, ANALYSIS_FIELDS, 'Analysis Run');
  if (value.schema !== VALIDATION_SCHEMAS.analysisRun || value.version !== 1
    || value.metricSetId !== METRIC_SET_ID || value.metricSetVersion !== METRIC_SET_VERSION) {
    throw new TypeError('Analysis Run schema is invalid.');
  }
  requireUuid(value.analysisRunId, 'Analysis Run id');
  requireRevision(value.analysisRunRevision, 'Analysis Run revision');
  requireUuid(value.campaignId, 'Analysis Campaign id');
  readCohortRef(value.cohortRef);
  requireBoundedText(value.authorLabel, 'Analysis author', {
    codePoints: VALIDATION_LIMITS.maximumShortTextCodePoints,
  });
  const resultCounts = counts(value.counts);
  const resultRates = rates(value.rates, resultCounts);
  const resultMedians = medians(value.medians);
  const availability = availabilityEntries(value.sourceAvailabilitySnapshot);
  const unavailable = new Set(availability.filter(({ status }) => status !== 'available')
    .map(({ caseRef: ref }) => caseKey(ref)));
  if (unavailable.size !== resultCounts.sourceUnavailableCount) {
    throw new TypeError('Analysis unavailable-source count is inconsistent.');
  }
  const drilldownEntries = drilldowns(value.drilldownIndex);
  await metricLineage(value.metricLineage, drilldownEntries, resultCounts, resultRates);
  for (const [field, metricId] of Object.entries(MEDIAN_METRICS)) {
    const drilldown = drilldownEntries.find((entry) => entry.metricId === metricId);
    if (canonicalJson(drilldown.caseRefs)
      !== canonicalJson(resultMedians[field].eligibleCaseRefs)) {
      throw new TypeError(`Analysis ${field} median drilldown is inconsistent.`);
    }
  }
  requireEpoch(value.createdAtEpochMs, 'Analysis creation time');
  await verifyContentDigest(value, crypto);
  return strictPortableValue(value);
}
