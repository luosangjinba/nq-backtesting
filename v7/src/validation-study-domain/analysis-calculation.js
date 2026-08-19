import {
  exactRecord,
  requireBoundedText,
  requireEnum,
  requireEpoch,
  requireSemver,
  requireUuid,
  sha256Canonical,
  strictPortableValue,
  withContentDigest,
} from './canonical-value.js';
import {
  METRIC_SET_ID,
  METRIC_SET_VERSION,
  OUTCOME_CLASSES,
  QUALIFICATION_CLASSES,
  VALIDATION_LIMITS,
  VALIDATION_SCHEMAS,
} from './constants.js';
import { caseRef } from './case-records.js';
import { cohortRef, readCaseRef } from './cohort-records.js';

function median(values) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  const value = ordered.length % 2 === 1
    ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
  return Object.is(value, -0) ? 0 : value;
}
function refs(cases) { return Object.freeze(cases.map(caseRef)); }

function availabilityEntries(values) {
  if (!Array.isArray(values)) throw new TypeError('Source availability snapshot must be an array.');
  return Object.freeze(values.map((entry) => {
    exactRecord(entry, [
      'caseRef', 'citationId', 'evidenceRole', 'providerId', 'providerVersion', 'status',
    ], 'Source availability entry');
    return strictPortableValue({
      caseRef: readCaseRef(entry.caseRef),
      citationId: requireUuid(entry.citationId, 'Availability citation id'),
      evidenceRole: requireEnum(entry.evidenceRole, ['context-sma', 'execution-fvg'], 'Evidence role'),
      providerId: entry.providerId,
      providerVersion: requireSemver(entry.providerVersion, 'Provider version'),
      status: requireEnum(entry.status, ['available', 'unavailable', 'incompatible'], 'Provider availability'),
    });
  }).sort((left, right) => (
    left.caseRef.caseId.localeCompare(right.caseRef.caseId)
      || left.caseRef.caseRevision - right.caseRef.caseRevision
      || left.citationId.localeCompare(right.citationId)
  )));
}

function drilldown(metricId, cases) {
  return strictPortableValue({ caseRefs: refs(cases), metricId });
}

/** Calculate the exact descriptive metric set from frozen finalized Case revisions. */
export async function calculateValidationMetrics({
  cases,
  crypto = globalThis.crypto,
  sourceAvailabilitySnapshot,
}) {
  const availability = availabilityEntries(sourceAvailabilitySnapshot);
  const unavailableCaseKeys = new Set(availability
    .filter(({ status }) => status !== 'available')
    .map(({ caseRef: ref }) => `${ref.caseId}:${ref.caseRevision}`));
  const unavailableCases = cases.filter(({ caseId, caseRevision }) => (
    unavailableCaseKeys.has(`${caseId}:${caseRevision}`)
  ));
  const qualificationGroups = Object.fromEntries(QUALIFICATION_CLASSES.map((name) => [
    name, cases.filter(({ qualificationClass }) => qualificationClass === name),
  ]));
  const outcomeGroups = Object.fromEntries(OUTCOME_CLASSES.map((name) => [
    name, cases.filter(({ outcomeObservation }) => outcomeObservation?.outcomeClass === name),
  ]));
  const resolved = [...outcomeGroups['target-first'], ...outcomeGroups['invalidation-first']];
  const counts = strictPortableValue({
    ambiguous: qualificationGroups.ambiguous.length,
    horizonExpired: outcomeGroups['horizon-expired'].length,
    incomplete: qualificationGroups.incomplete.length,
    incompleteData: outcomeGroups['incomplete-data'].length,
    invalidationFirst: outcomeGroups['invalidation-first'].length,
    qualified: qualificationGroups.qualified.length,
    rejected: qualificationGroups.rejected.length,
    resolvedFirstTouchCount: resolved.length,
    sameBarAmbiguous: outcomeGroups['same-bar-ambiguous'].length,
    sourceUnavailableCount: unavailableCases.length,
    targetFirst: outcomeGroups['target-first'].length,
    total: cases.length,
  });
  const rateCases = outcomeGroups['target-first'];
  const rates = strictPortableValue({
    targetFirstRate: {
      denominator: resolved.length,
      numerator: rateCases.length,
      value: resolved.length === 0 ? null : rateCases.length / resolved.length,
    },
  });
  const eligible = (field) => cases.filter(({ outcomeObservation }) => (
    outcomeObservation?.[field] !== null && outcomeObservation?.[field] !== undefined
  ));
  const medianEntry = (field) => {
    const selected = eligible(field);
    return strictPortableValue({
      eligibleCaseRefs: refs(selected),
      value: median(selected.map(({ outcomeObservation }) => outcomeObservation[field])),
    });
  };
  const medians = strictPortableValue({
    maePoints: medianEntry('maePoints'),
    mfePoints: medianEntry('mfePoints'),
    timeToFirstTouchBars: medianEntry('timeToFirstTouchBars'),
  });
  const drilldownIndex = [
    drilldown('count.total', cases),
    ...QUALIFICATION_CLASSES.map((name) => drilldown(`count.qualification.${name}`, qualificationGroups[name])),
    ...OUTCOME_CLASSES.map((name) => drilldown(`count.outcome.${name}`, outcomeGroups[name])),
    drilldown('count.resolved-first-touch', resolved),
    drilldown('count.source-unavailable', unavailableCases),
    drilldown('rate.target-first', resolved),
    ...Object.entries({
      'median.mae-points': eligible('maePoints'),
      'median.mfe-points': eligible('mfePoints'),
      'median.time-to-first-touch-bars': eligible('timeToFirstTouchBars'),
    }).map(([metricId, selected]) => drilldown(metricId, selected)),
  ];
  const metricLineage = await Promise.all(drilldownIndex.map(async (entry) => strictPortableValue({
    denominatorCaseRefs: entry.caseRefs,
    excludedCaseRefs: Object.freeze([]),
    metricId: entry.metricId,
    metricVersion: METRIC_SET_VERSION,
    numeratorCaseRefs: entry.metricId === 'rate.target-first' ? refs(rateCases) : entry.caseRefs,
    resultDigest: await sha256Canonical(entry, crypto),
  })));
  return strictPortableValue({
    counts,
    drilldownIndex,
    medians,
    metricLineage,
    rates,
    sourceAvailabilitySnapshot: availability,
  });
}

export async function createAnalysisRun({
  analysisRunId,
  authorLabel,
  campaignId,
  cases,
  cohort,
  crypto = globalThis.crypto,
  nowEpochMs,
  sourceAvailabilitySnapshot,
}) {
  const metrics = await calculateValidationMetrics({ cases, crypto, sourceAvailabilitySnapshot });
  return withContentDigest({
    analysisRunId: requireUuid(analysisRunId, 'Analysis Run id'),
    analysisRunRevision: 1,
    authorLabel: requireBoundedText(authorLabel, 'Analysis author', {
      codePoints: VALIDATION_LIMITS.maximumShortTextCodePoints,
    }),
    campaignId: requireUuid(campaignId, 'Analysis Campaign id'),
    cohortRef: cohortRef(cohort),
    counts: metrics.counts,
    createdAtEpochMs: requireEpoch(nowEpochMs, 'Analysis creation time'),
    drilldownIndex: metrics.drilldownIndex,
    medians: metrics.medians,
    metricLineage: metrics.metricLineage,
    metricSetId: METRIC_SET_ID,
    metricSetVersion: METRIC_SET_VERSION,
    rates: metrics.rates,
    schema: VALIDATION_SCHEMAS.analysisRun,
    sourceAvailabilitySnapshot: metrics.sourceAvailabilitySnapshot,
    version: 1,
  }, crypto);
}
