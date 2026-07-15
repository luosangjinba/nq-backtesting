export const EXPLICIT_SUPPORT_FILES = Object.freeze([
  'v6/tests/canonical-test-manifest.js',
  'v6/tests/canonical-test-runner-domain.js',
  'v6/tests/test-catalog-domain.js',
  'v6/tests/test-role-manifest.js',
  'v6/tests/test-triage-manifest-step456.js',
]);

export const EXPLICIT_SUPPORT_PREFIXES = Object.freeze([
  'v6/tests/governance/helpers/',
  'v6/tests/helpers/',
]);

export function hasExplicitSupportRole(path) {
  const normalizedPath = String(path || '').replaceAll('\\', '/');
  return EXPLICIT_SUPPORT_FILES.includes(normalizedPath)
    || EXPLICIT_SUPPORT_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}
