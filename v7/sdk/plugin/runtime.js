/** Deep-freeze one portable SDK definition for trusted local tooling. */
function freeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
}

/**
 * Return an immutable definition value. Production V7 never imports this helper;
 * P1a's isolated synthetic host supplies the same narrow helper to candidate code.
 */
export function defineSemanticConstruction(definition) {
  if (definition?.schemaVersion !== 1 || definition?.kind !== 'semantic-construction') {
    throw new TypeError('Invalid semantic construction definition.');
  }
  if (definition.executionModel !== 'stateless-evidence-construction') {
    throw new TypeError('Unsupported semantic construction execution model.');
  }
  if (typeof definition.run !== 'function') {
    throw new TypeError('Semantic construction definition requires run().');
  }
  return freeze(definition);
}
