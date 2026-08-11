import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProductionArchitecture } from '../tests/support/production-architecture-analyzer.js';

const V7_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(V7_ROOT, relativePath), 'utf8'));
const previous = read('docs/v7-production-architecture-baseline.json');
const manifest = read('docs/v7-architecture-manifest.json');
const writerPolicy = read('docs/v7-production-writer-policy.json');
const harnessRules = read('docs/v7-harness-rules.json');
const analysisPolicy = Object.freeze({
  ...previous.analysisPolicy,
  writerPolicies: writerPolicy.writerPolicies,
});
const report = analyzeProductionArchitecture({ manifest, policy: analysisPolicy, v7Root: V7_ROOT });
if (report.violations.length > 0) {
  throw new Error(`Cannot refresh a violating production baseline:\n${JSON.stringify(report.violations, null, 2)}`);
}
const baseline = Object.freeze({
  analysisPolicy,
  deliveryStep: harnessRules.currentStep,
  knownViolations: Object.freeze([]),
  schemaVersion: 1,
  snapshot: report.snapshot,
  status: 'blocking-recovery-baseline',
});
fs.writeFileSync(
  path.join(V7_ROOT, 'docs/v7-production-architecture-baseline.json'),
  `${JSON.stringify(baseline, null, 2)}\n`,
);
console.log(
  `refreshed production architecture baseline (${report.snapshot.modules.length} modules, `
  + `${report.snapshot.constructionSites.length} construction sites, `
  + `${report.snapshot.writerSites.length} writer sites)`,
);
