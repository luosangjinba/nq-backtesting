import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStandaloneV7Runtime } from './support/standalone-v7-runtime-validator.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '../..');
const read = (relativePath) => fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const manifest = readJson('v7/docs/v7-deployed-runtime-manifest.json');
const regressionMatrix = readJson('v7/docs/v7-production-regression-matrix.json');
const installer = read('v7/deploy/linux/install.sh');

function productionFiles(relativeRoot, extensions) {
  const absoluteRoot = path.join(repositoryRoot, relativeRoot);
  return fs.readdirSync(absoluteRoot, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.posix.join(relativeRoot, entry.name);
    if (entry.isDirectory()) return productionFiles(relativePath, extensions);
    return extensions.includes(path.extname(entry.name)) ? [relativePath] : [];
  });
}

const legacyPattern = /(?:\/v4\/|\bv4\/|V4_|adapter\.v4|provider\.v4|service\.v4|replay-lab-api\.service)/;
const scannedFiles = [
  ...productionFiles('v7/src', ['.js', '.json']),
  ...productionFiles('v7/server', ['.py']),
  ...productionFiles('v7/scripts', ['.mjs']),
  ...productionFiles('v7/deploy/linux/caddy', ['.template']),
  ...productionFiles('v7/deploy/linux/systemd', ['.template']),
  'v7/docs/v7-deployed-runtime-manifest.json',
  'v7/docs/v7-production-regression-matrix.json',
];
const legacyTokenMatches = scannedFiles.flatMap((relativePath) => (
  read(relativePath).split(/\r?\n/).flatMap((line, index) => (
    legacyPattern.test(line) ? [`${relativePath}:${index + 1}: ${line.trim()}`] : []
  ))
));
for (const relativePath of [
  'v7/deploy/linux/deploy-public-ip.sh',
  'v7/deploy/linux/install.sh',
]) {
  legacyTokenMatches.push(...read(relativePath).split(/\r?\n/).flatMap((line, index) => {
    if (!legacyPattern.test(line)) return [];
    const isTransactionalUnitMigration = line.includes('replay-lab-api.service')
      && !line.includes('V4_')
      && !/\bv4\/(?!health)/.test(line);
    return isTransactionalUnitMigration
      ? [] : [`${relativePath}:${index + 1}: ${line.trim()}`];
  }));
}

const marketService = manifest.components.find(({ id }) => id === 'service.v7-market-data');
const marketUnit = manifest.serviceUnits.find(({ component }) => component === 'service.v7-market-data');
const marketRoute = manifest.proxyRoutes.find(({ id }) => id === 'caddy.v7-market-data');
const contract = {
  archiveCommandScopedToV7: installer.includes(
    'repo_git archive --format=tar --output="$archive_path" "$repository_commit" v7',
  ),
  legacyTokenMatches,
  marketRoute,
  marketService,
  marketUnit,
  productionRoots: manifest.productionRoots.map(({ path: rootPath }) => rootPath),
  regressionDependency: regressionMatrix.runtimeDependencies.v7MarketData,
  releaseContract: manifest.releaseContract,
};
assert.deepEqual(validateStandaloneV7Runtime(contract), []);

const negative = readJson('v7/tests/fixtures/standalone-v7-runtime/negative/cases.json');
assert.equal(negative.schemaVersion, 1);
for (const testCase of negative.cases) {
  const candidate = structuredClone(contract);
  const parent = testCase.path.slice(0, -1).reduce((current, key) => current[key], candidate);
  const key = testCase.path.at(-1);
  if (testCase.operation === 'append') {
    assert.ok(Array.isArray(parent[key]), `${testCase.id} append target must be an array`);
    parent[key].push(testCase.value);
  } else if (testCase.operation === 'set') {
    assert.ok(Object.hasOwn(parent, key), `${testCase.id} set target must exist`);
    parent[key] = testCase.value;
  } else {
    assert.fail(`unsupported standalone negative operation ${testCase.operation}`);
  }
  const codes = validateStandaloneV7Runtime(candidate).map(({ code }) => code);
  assert.ok(codes.includes(testCase.expectedFailureCode),
    `${testCase.id} must fail with ${testCase.expectedFailureCode}; got ${codes.join(', ')}`);
}

console.log('v7 standalone runtime harness passed', {
  negativeControls: negative.cases.length,
  productionFilesScanned: scannedFiles.length + 2,
  productionRoots: contract.productionRoots.length,
});
