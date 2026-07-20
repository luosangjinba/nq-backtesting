/** Private revision cache; immutable entries never expire. */
export function createRevisionCache(now) {
  const entries = new Map();
  return Object.freeze({
    get(key, revisionPolicy) {
      const entry = entries.get(key);
      if (!entry) return null;
      if (revisionPolicy.mode === 'discover' && now() - entry.cachedAtEpochMs >= revisionPolicy.maxAgeMs) {
        entries.delete(key);
        return null;
      }
      return entry.datasetRevision;
    },
    set(key, datasetRevision) {
      entries.set(key, { datasetRevision, cachedAtEpochMs: now() });
    },
    clear() { entries.clear(); },
  });
}
