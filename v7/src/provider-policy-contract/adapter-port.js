import { failProviderPolicy } from './policy-error.js';
import { defineProviderPolicy } from './policy-contract.js';

/** Validate the transport-neutral port without invoking a concrete provider. */
export function requireProviderAdapter(value, policyValue) {
  const policy = defineProviderPolicy(policyValue);
  if (!value || typeof value !== 'object' || value.providerId !== policy.providerId
    || typeof value.resolveDatasetRevision !== 'function'
    || typeof value.requestRawBars !== 'function') {
    failProviderPolicy(
      'INVALID_PROVIDER_ADAPTER_PORT',
      'Adapter must match providerId and expose resolveDatasetRevision()/requestRawBars().',
    );
  }
  return value;
}
