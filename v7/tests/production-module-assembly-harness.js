import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyProductionModuleAssembly } from './support/production-module-assembly.js';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_DIR, '..');
const manifest = JSON.parse(fs.readFileSync(
  path.join(V7_ROOT, 'docs/v7-architecture-manifest.json'),
  'utf8',
));
const expectedRemovalMatrix = JSON.parse(fs.readFileSync(
  path.join(TEST_DIR, 'fixtures/production-module-assembly/optional-removal-matrix.json'),
  'utf8',
));

assert.equal(expectedRemovalMatrix.schemaVersion, 1);
const result = await verifyProductionModuleAssembly({ manifest, v7Root: V7_ROOT });
assert.equal(result.moduleIds.length, manifest.activeProductionModules.length);
assert.equal(result.moduleIds.length, 42);
assert.equal(result.lifecycleModuleIds.length, 10);
assert.deepEqual(result.optionalRemovalMatrix, expectedRemovalMatrix.cases);

console.log(
  `v7 production module assembly harness passed (${result.moduleIds.length} public entries, `
  + `${result.lifecycleModuleIds.length} lifecycle modules, `
  + `${result.optionalRemovalMatrix.length} optional-removal case)`,
);
