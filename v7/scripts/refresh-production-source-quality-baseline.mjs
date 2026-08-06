import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeProductionSourceQuality } from '../tests/support/production-source-quality-analyzer.js';

const V7_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deliveryStep = process.argv[2] ?? 'R10.9';
const manifest = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'), 'utf8'));
const policy = JSON.parse(fs.readFileSync(path.join(V7_ROOT, 'docs/v7-production-source-quality-policy.json'), 'utf8'));
const snapshot = analyzeProductionSourceQuality({ manifest, policy, v7Root: V7_ROOT });
const baseline = {
  ...snapshot,
  deliveryStep,
  generatedFromCommit: 'working-tree-r10.9',
};
fs.writeFileSync(
  path.join(V7_ROOT, 'docs/v7-production-source-quality-baseline.json'),
  `${JSON.stringify(baseline, null, 2)}\n`,
);
console.log(`refreshed production source-quality baseline (${snapshot.summary.files} files)`);
