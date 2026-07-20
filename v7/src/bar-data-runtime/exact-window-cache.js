/**
 * Owner: Bar Data Runtime.
 * Purpose: own bounded exact-request LRU storage without exposing mutable cache
 * entries or eviction policy to callers.
 * Inputs: positive entry bound and immutable raw batches keyed by request key.
 * Outputs: cache get/set/clear operations scoped to one runtime instance.
 * Side effects: mutates only the private instance Map.
 */
export function createExactWindowCache(maxEntries) {
  const entries = new Map();
  return Object.freeze({
    get(key) {
      if (!entries.has(key)) return null;
      const value = entries.get(key);
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key, value) {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, value);
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value);
    },
    clear() { entries.clear(); },
  });
}
