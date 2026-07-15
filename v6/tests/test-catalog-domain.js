import { findStep456TriageEntry } from './test-triage-manifest-step456.js';
import { hasExplicitSupportRole } from './test-role-manifest.js';

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
  const triage = findStep456TriageEntry(normalizedPath);
  if (triage?.disposition === 'quarantine-superseded') role = 'quarantine';
  else if (hasExplicitSupportRole(normalizedPath) ||
    /['"]v6\/(?:TODO|docs\/INDEX)\.md['"]/.test(source)
  ) role = 'support';
  else if (
    normalizedPath.includes('regression-pack') ||
    normalizedPath.endsWith('-pack.js') ||
    normalizedPath.endsWith('static-architecture-audit-step394.js')
  ) role = 'runner';

  return Object.freeze({ environment, path: normalizedPath, role });
}
