import { failPluginPackageStore } from './store-error.js';

const PREPARATIONS = new WeakMap();

class PluginPackageStorePreparationValue {
  constructor(value) {
    PREPARATIONS.set(this, value);
    Object.freeze(this);
  }
}

export function createPluginPackageStorePreparation(value) {
  if (!value || typeof value !== 'object' || !value.publicPlan
    || !Number.isSafeInteger(value.publicPlan.baseRevision)) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'Package store preparation is invalid.');
  }
  return new PluginPackageStorePreparationValue(Object.freeze(value));
}

/** Read the immutable confirmation/impact plan without exposing staged bytes. */
export function readPluginPackageStorePreparation(candidate) {
  const value = PREPARATIONS.get(candidate);
  if (!value) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'A branded package store preparation is required.');
  }
  return value.publicPlan;
}

export function readPluginPackageStorePreparationInternal(candidate) {
  const value = PREPARATIONS.get(candidate);
  if (!value) {
    failPluginPackageStore('V7DK_CANDIDATE_STALE', 'A branded package store preparation is required.');
  }
  return value;
}
