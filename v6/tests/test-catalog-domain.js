import { findStep456TriageEntry } from './test-triage-manifest-step456.js';
import {
  hasExplicitRunnerRole,
  hasExplicitSupportRole,
} from './test-role-manifest.js';
import { findStep457HistoricalLedgerDisposition } from './test-role-migration-step457.js';
import { findExplicitTestEnvironment } from './test-environment-migration-step459.js';

export function classifyTestFile({ path, source = '' } = {}) {
  const normalizedPath = String(path || '').replaceAll('\\', '/');
  if (!normalizedPath.endsWith('.js')) {
    throw new Error(`V6 test catalog requires a JavaScript path: ${normalizedPath}`);
  }

  const environment = findExplicitTestEnvironment(normalizedPath) || 'node';

  let role = 'gate';
  const triage = findStep456TriageEntry(normalizedPath);
  const historicalLedger = findStep457HistoricalLedgerDisposition(normalizedPath);
  if (triage?.disposition === 'quarantine-superseded') role = 'quarantine';
  else if (historicalLedger?.disposition === 'quarantine-superseded') role = 'quarantine';
  else if (hasExplicitSupportRole(normalizedPath)) role = 'support';
  else if (hasExplicitRunnerRole(normalizedPath)) role = 'runner';

  return Object.freeze({ environment, path: normalizedPath, role });
}
