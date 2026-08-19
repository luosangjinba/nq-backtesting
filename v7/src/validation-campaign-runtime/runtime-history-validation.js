import {
  assertEvidenceCampaignClosure,
  calculateValidationMetrics,
  canonicalJson,
} from '../validation-study-domain/public.js';

function exactReferencedCase(retained, ref, label) {
  const entry = retained.get(`${ref.caseId}:${ref.caseRevision}`);
  if (!entry || entry.contentDigest !== ref.caseContentDigest) {
    throw new TypeError(`${label} does not close to one exact retained Case.`);
  }
  return entry;
}

function uniqueRecordIds(values, idField, label) {
  const ids = values.map((entry) => entry[idField]);
  if (new Set(ids).size !== ids.length) {
    throw new TypeError(`${label} identities are duplicated.`);
  }
}

function retainedCases(document) {
  const byId = new Map();
  for (const entry of document.caseRevisions) {
    if (entry.campaignId !== document.campaign.campaignId
      || entry.acceptedDocumentRevision > document.documentRevision
      || canonicalJson(entry.setupDefinitionRef)
        !== canonicalJson(document.campaign.setupDefinitionRef)
      || canonicalJson(entry.outcomeDefinitionRef)
        !== canonicalJson(document.campaign.outcomeDefinitionRef)) {
      throw new TypeError('Study Case does not belong to its Campaign Definitions.');
    }
    entry.evidenceCitations.forEach((citation) => assertEvidenceCampaignClosure(
      citation, document.campaign, document.setupDefinitions[0],
    ));
    const revisions = byId.get(entry.caseId) ?? [];
    revisions.push(entry);
    byId.set(entry.caseId, revisions);
  }
  for (const revisions of byId.values()) {
    revisions.sort((left, right) => left.caseRevision - right.caseRevision);
    if (revisions.some((entry, index) => entry.caseRevision !== index + 1
      || (index === 0 ? entry.supersedesCaseRevision !== null
        : entry.supersedesCaseRevision !== revisions[index - 1].caseRevision))) {
      throw new TypeError('Study Case revision history is impossible.');
    }
  }
  return new Map(document.caseRevisions.map((entry) => [
    `${entry.caseId}:${entry.caseRevision}`, entry,
  ]));
}

function validatedCohorts(document, retained) {
  uniqueRecordIds(document.cohorts, 'cohortId', 'Cohort');
  const cohorts = new Map(document.cohorts.map((entry) => [
    `${entry.cohortId}:${entry.cohortRevision}`, entry,
  ]));
  for (const cohort of document.cohorts) {
    if (cohort.campaignId !== document.campaign.campaignId
      || canonicalJson(cohort.setupDefinitionRef)
        !== canonicalJson(document.campaign.setupDefinitionRef)
      || canonicalJson(cohort.outcomeDefinitionRef)
        !== canonicalJson(document.campaign.outcomeDefinitionRef)) {
      throw new TypeError('Cohort does not belong to its Campaign Definitions.');
    }
    for (const ref of cohort.memberCaseRefs) {
      if (exactReferencedCase(retained, ref, 'Cohort member').lifecycleState !== 'finalized') {
        throw new TypeError('Cohort member is not one exact retained finalized Case.');
      }
    }
    cohort.excludedCaseRefs.forEach((ref) => {
      if (exactReferencedCase(retained, ref, 'Cohort exclusion').lifecycleState !== 'finalized') {
        throw new TypeError('Cohort exclusion is not one exact retained finalized Case.');
      }
    });
    if (cohort.parentCohortRef !== null) {
      const parent = cohorts.get(
        `${cohort.parentCohortRef.cohortId}:${cohort.parentCohortRef.cohortRevision}`,
      );
      if (!parent || parent.contentDigest !== cohort.parentCohortRef.cohortContentDigest
        || parent.cohortId === cohort.cohortId) {
        throw new TypeError('Cohort parent reference is stale or cyclic.');
      }
    }
  }
  for (const cohort of document.cohorts) {
    const visited = new Set([`${cohort.cohortId}:${cohort.cohortRevision}`]);
    let parentRef = cohort.parentCohortRef;
    while (parentRef !== null) {
      const key = `${parentRef.cohortId}:${parentRef.cohortRevision}`;
      if (visited.has(key)) throw new TypeError('Cohort parent references contain a cycle.');
      visited.add(key);
      parentRef = cohorts.get(key)?.parentCohortRef ?? null;
    }
  }
  return cohorts;
}

function validateAvailability(analysis, cohort, retained) {
  const expectedKeys = [];
  for (const availability of analysis.sourceAvailabilitySnapshot) {
    const record = exactReferencedCase(retained, availability.caseRef, 'Availability Case');
    if (!cohort.memberCaseRefs.some((ref) => (
      ref.caseId === availability.caseRef.caseId
        && ref.caseRevision === availability.caseRef.caseRevision
    ))) throw new TypeError('Availability Case is outside its frozen Cohort.');
    const citation = record.evidenceCitations.find(({ citationId }) => (
      citationId === availability.citationId
    ));
    if (!citation || citation.evidenceRole !== availability.evidenceRole
      || citation.providerIdentity.providerId !== availability.providerId
      || citation.providerIdentity.providerVersion !== availability.providerVersion) {
      throw new TypeError('Availability entry does not close to its citation.');
    }
  }
  for (const ref of cohort.memberCaseRefs) {
    const record = exactReferencedCase(retained, ref, 'Availability Case');
    for (const citation of record.evidenceCitations) {
      expectedKeys.push(`${ref.caseId}:${ref.caseRevision}:${citation.citationId}`);
    }
  }
  const actualKeys = analysis.sourceAvailabilitySnapshot.map(({ caseRef: ref, citationId }) => (
    `${ref.caseId}:${ref.caseRevision}:${citationId}`
  ));
  if (canonicalJson([...actualKeys].sort()) !== canonicalJson(expectedKeys.sort())) {
    throw new TypeError('Availability snapshot does not cover every frozen citation exactly.');
  }
}

async function validateAnalyses(document, retained, cohorts, crypto) {
  uniqueRecordIds(document.analysisRuns, 'analysisRunId', 'Analysis Run');
  for (const analysis of document.analysisRuns) {
    if (analysis.campaignId !== document.campaign.campaignId) {
      throw new TypeError('Analysis Run belongs to another Campaign.');
    }
    const cohort = cohorts.get(`${analysis.cohortRef.cohortId}:${analysis.cohortRef.cohortRevision}`);
    if (!cohort || cohort.contentDigest !== analysis.cohortRef.cohortContentDigest) {
      throw new TypeError('Analysis Run Cohort reference is stale.');
    }
    const cases = cohort.memberCaseRefs.map((ref) => exactReferencedCase(
      retained, ref, 'Analysis member',
    ));
    validateAvailability(analysis, cohort, retained);
    const metrics = await calculateValidationMetrics({
      cases, crypto, sourceAvailabilitySnapshot: analysis.sourceAvailabilitySnapshot,
    });
    for (const field of [
      'counts', 'drilldownIndex', 'medians', 'metricLineage', 'rates',
      'sourceAvailabilitySnapshot',
    ]) {
      if (canonicalJson(metrics[field]) !== canonicalJson(analysis[field])) {
        throw new TypeError(`Analysis Run ${field} differs from its frozen inputs.`);
      }
    }
  }
}

function validateVerifications(document, retained) {
  uniqueRecordIds(document.sourceVerifications, 'verificationId', 'Source verification');
  for (const verification of document.sourceVerifications) {
    if (verification.campaignId !== document.campaign.campaignId) {
      throw new TypeError('Source verification belongs to another Campaign.');
    }
    const record = exactReferencedCase(retained, verification.caseRef, 'Verification Case');
    const citation = record.evidenceCitations.find(({ citationId, citationRevision, contentDigest }) => (
      citationId === verification.citationRef.citationId
        && citationRevision === verification.citationRef.citationRevision
        && contentDigest === verification.citationRef.citationContentDigest
    ));
    if (!citation || citation.providerIdentity.providerId !== verification.providerId
      || citation.providerIdentity.providerVersion !== verification.providerVersion
      || verification.checkedAtEpochMs < citation.capturedAtEpochMs
      || (verification.result === 'match'
        && canonicalJson(verification.observedSourceReference)
          !== canonicalJson(citation.sourceReference))) {
      throw new TypeError('Source verification does not close to its frozen citation.');
    }
  }
}

/** Validate cross-record revision, Definition, Cohort, Analysis, and verification topology. */
export async function validateCampaignDocumentHistory(document, crypto) {
  const retained = retainedCases(document);
  const cohorts = validatedCohorts(document, retained);
  await validateAnalyses(document, retained, cohorts, crypto);
  validateVerifications(document, retained);
}
