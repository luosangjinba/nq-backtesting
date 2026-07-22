const STABLE_CODE_PATTERN = /^[a-z][a-z0-9.-]{0,127}$/;
const PROVIDER_FAILURE_KINDS = new Set([
  'authorization',
  'invalid-request',
  'invalid-response',
  'rate-limited',
  'revision-mismatch',
  'timeout',
  'unavailable',
  'unsupported',
]);

function normalizedCode(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const code = value.toLowerCase().replaceAll('_', '-');
  return STABLE_CODE_PATTERN.test(code) ? code : null;
}

/** Preserve stable owner failures while keeping provider transport detail bounded. */
export function workspaceTransactionFailureCode(error) {
  if (PROVIDER_FAILURE_KINDS.has(error?.kind)) return `provider-${error.kind}`;
  return normalizedCode(error?.code) ?? 'workspace-transaction-failed';
}
