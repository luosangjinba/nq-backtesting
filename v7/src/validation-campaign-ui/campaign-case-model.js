export function latestCases(documentValue) {
  const byId = new Map();
  for (const record of documentValue.caseRevisions) {
    const current = byId.get(record.caseId);
    if (!current || current.caseRevision < record.caseRevision) byId.set(record.caseId, record);
  }
  return Object.freeze([...byId.values()].sort((left, right) => (
    right.updatedAtEpochMs - left.updatedAtEpochMs
  )));
}

export function revisionsForCase(documentValue, caseId) {
  return Object.freeze(documentValue.caseRevisions.filter((record) => (
    record.caseId === caseId
  )).sort((left, right) => right.caseRevision - left.caseRevision));
}

export function caseReference(record) {
  return Object.freeze({
    caseContentDigest: record.contentDigest,
    caseId: record.caseId,
    caseRevision: record.caseRevision,
  });
}
