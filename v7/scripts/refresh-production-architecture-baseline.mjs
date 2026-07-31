import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProductionArchitecture } from '../tests/support/production-architecture-analyzer.js';

const V7_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(V7_ROOT, 'docs/v7-production-architecture-baseline.json');
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'),
  'utf8',
));
const report = analyzeProductionArchitecture({
  manifest,
  policy: baseline.analysisPolicy,
  v7Root: V7_ROOT,
});
if (report.violations.length > 0) {
  throw new Error(`Refusing to baseline production violations: ${JSON.stringify(report.violations)}`);
}
fs.writeFileSync(baselinePath, `${JSON.stringify({
  ...baseline,
  deliveryStep: 'R8.12',
  snapshot: report.snapshot,
}, null, 2)}\n`);
console.log(
  `refreshed production architecture baseline (${report.snapshot.modules.length} modules, `
    + `${report.snapshot.constructionSites.length} construction sites)`,
);
