const BROWSER_SOURCE_PATTERN = /^import .*?(browser-cdp-client|v6-browser-harness)/m;

export function classifyTestFile({ path, source = '' } = {}) {
  const normalizedPath = String(path || '').replaceAll('\\', '/');
  if (!normalizedPath.endsWith('.js')) {
    throw new Error(`V6 test catalog requires a JavaScript path: ${normalizedPath}`);
  }

  let environment = 'node';
  if (/real-api-browser/.test(normalizedPath)) environment = 'browser-service';
  else if (
    normalizedPath.includes('browser') ||
    normalizedPath.includes('screenshot') ||
    BROWSER_SOURCE_PATTERN.test(source)
  ) environment = 'browser-local';

  let role = 'gate';
  if (
    normalizedPath.includes('/helpers/') ||
    normalizedPath.endsWith('/canonical-test-manifest.js') ||
    normalizedPath.endsWith('/test-catalog-domain.js')
  ) role = 'support';
  else if (
    normalizedPath.includes('regression-pack') ||
    normalizedPath.endsWith('-pack.js') ||
    normalizedPath.endsWith('static-architecture-audit-step394.js')
  ) role = 'runner';

  return Object.freeze({ environment, path: normalizedPath, role });
}
