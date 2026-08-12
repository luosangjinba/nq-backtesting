import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReleaseCatalog } from '../tools/plugin-developer-kit/adapters/release-catalog.js';

const V7_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = loadReleaseCatalog({ refresh: true });
const { files: omittedFiles, ...conformance } = release.conformance;
if (omittedFiles.length < 1) throw new Error('Developer Kit conformance file identity is empty.');
const identity = {
  catalogDigest: release.catalogDigest,
  compiler: release.compiler,
  conformance,
  operationDigest: release.operationDigest,
  schemaDigest: release.schemaDigest,
  sdkDigest: release.sdkDigest,
  simulatorDigest: release.simulatorDigest,
  toolchain: release.toolchain,
  toolchainDigest: release.toolchainDigest,
};
const target = path.join(V7_ROOT, 'src/plugin-center-ui/plugin-package-release-identity.js');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `/** Generated current trusted-build identity for static browser inspection. */\n`
  + `export const PLUGIN_PACKAGE_BROWSER_RELEASE = Object.freeze(${JSON.stringify(identity)});\n`);
const exampleManifestPath = path.join(V7_ROOT, 'sdk/plugin/examples/local-lifecycle-v1/v7-package.json');
const exampleManifest = JSON.parse(fs.readFileSync(exampleManifestPath, 'utf8'));
exampleManifest.conformance.toolchainDigest = release.toolchainDigest;
fs.writeFileSync(exampleManifestPath, `${JSON.stringify(exampleManifest, null, 2)}\n`);
console.log(`refreshed browser plugin release and local example (${release.toolchainDigest})`);
