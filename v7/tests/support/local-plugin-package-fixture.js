import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runDeveloperKit } from '../../tools/plugin-developer-kit/public.js';
import { parseTar } from '../../tools/plugin-developer-kit/adapters/tar.js';

const PROFILE = 'local-declarative-package-v1';

function request(operation, { output, workspace }, options = {}) {
  return {
    contractProfile: PROFILE,
    operation,
    operationVersion: ['pack', 'inspect'].includes(operation) ? 2 : 1,
    options,
    schemaVersion: 2,
    ...(['scaffold', 'validate', 'build', 'test', 'preview', 'pack'].includes(operation)
      ? { workspaceRoot: workspace } : {}),
    ...(['build', 'test', 'preview', 'pack'].includes(operation)
      ? { outputRoot: output } : {}),
  };
}

function pass(operation, context, options = {}) {
  const result = runDeveloperKit(request(operation, context, options));
  if (result.status !== 'passed') {
    throw new Error(`${operation} failed: ${JSON.stringify(result.diagnostics)}`);
  }
  return result;
}

/** Build one current real Developer Kit archive and prepared-entry snapshot for H117. */
export function createLocalPluginPackageFixture({
  mutateManifest = () => {},
  packageId = null,
  sourceSuffix = '',
} = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'v7-h117-product-fixture-'));
  const context = {
    base,
    output: path.join(base, 'output'),
    workspace: path.join(base, 'workspace'),
  };
  try {
    pass('scaffold', context, { templateId: 'local-lifecycle-v1' });
    const manifestPath = path.join(context.workspace, 'v7-package.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    mutateManifest(manifest);
    if (packageId !== null) {
      manifest.packageId = packageId;
      const provenancePath = path.join(context.workspace, 'provenance.json');
      const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
      provenance.packageId = packageId;
      fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);
      const sourcePath = path.join(context.workspace, 'src/index.ts');
      fs.writeFileSync(sourcePath, fs.readFileSync(sourcePath, 'utf8')
        .replaceAll('community.lifecycle-proof', packageId));
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    if (sourceSuffix) {
      fs.appendFileSync(path.join(context.workspace, 'src/index.ts'), `\n${sourceSuffix}\n`);
    }
    for (const operation of ['validate', 'build', 'test', 'preview']) pass(operation, context);
    const packed = pass('pack', context, {
      outputKind: 'local-install-archive',
      profile: PROFILE,
    });
    const logicalPath = packed.artifacts.find(({ kind }) => kind === 'local-install-archive').logicalPath;
    const archiveBytes = fs.readFileSync(path.join(context.output, ...logicalPath.split('/')));
    const entries = parseTar(archiveBytes).map(({ bytes, path: entryPath }) => Object.freeze({
      bytes: new Uint8Array(bytes),
      path: entryPath,
    }));
    return Object.freeze({
      archiveBytes: new Uint8Array(archiveBytes),
      dispose() { fs.rmSync(base, { force: true, recursive: true }); },
      entries: Object.freeze(entries),
      manifest,
    });
  } catch (error) {
    fs.rmSync(base, { force: true, recursive: true });
    throw error;
  }
}
