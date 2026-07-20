/** Test-only Web Storage double shared by persistence and Session Store harnesses. */
export function createMemoryWebStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return Object.freeze({
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    keys() {
      return Object.freeze([...values.keys()].sort());
    },
    snapshot() {
      return Object.freeze(Object.fromEntries(values));
    },
  });
}
