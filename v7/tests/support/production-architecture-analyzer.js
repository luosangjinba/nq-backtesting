import fs from 'node:fs';
import path from 'node:path';
import { validateProductionArchitectureSnapshot } from './production-architecture-validator.js';

const WRITER_DETECTORS = Object.freeze({
  'annotation-document-accepted-state': /\bthis\.#document\s*=\s*candidate\.document\b/,
  'annotation-document-bytes-commit': /\bstorage\.write\s*\(\s*annotationKey\s*,\s*candidateRaw\s*\)/,
  'calculated-series-document-accepted-state': /\bstate\.acceptedDocument\s*=\s*candidate\.document\b/,
  'calculated-series-document-bytes-commit': /\bport\.write\s*\(\s*record\.key\s*,\s*record\.candidateRaw\s*\)/,
  'calculated-series-dom-commit': /\bshell\.append\s*\(\s*root\s*\)/,
  'calendar-surface-dom-commit': /\breplaceChildren\s*\(\s*this\.nodes\.body\s*,/,
  'core-plugin-profile-commit': /\bport\.write\s*\(\s*storageKey\s*,\s*raw\s*\)/,
  'layout-sync-policy-commit': /\bsaveLayoutSync\s*\([^)]*\)\s*\{[\s\S]*?configuredWorkspace\s*\(\s*current\s*,\s*\{\s*layoutSync:/,
  'local-plugin-package-inventory-commit': /\bcommittedInventory:\s*prepared\.committedInventory\b/,
  'local-plugin-package-storage-commit': /\btransaction\.objectStore\(['"]inventory['"]\)\.put\s*\(/,
  'market-data-retention-ledger': /\bacceptedByConsumer\.set\s*\(/,
  'native-chart-series': /\b(?:series|futureTimeAxisSeries|acceptedSeries)\.(?:attachPrimitive|detachPrimitive|setData|update)\s*\(/,
  'pane-workspace-accepted-state': /\bsnapshot\s*=\s*candidateSnapshot\b/,
  'plugin-center-dom-commit': /\bdetail\.replaceChildren\s*\(\s*\)/,
  'raw-provider-request': /\bprovider\.(?:requestRawBars|requestProjectedHistory)\s*\(/,
  'replay-navigation-preferences-commit': /\bport\.write\s*\(\s*storageKey\s*,\s*JSON\.stringify\(wire\)\s*\)/,
  'replicated-state-put': /\bmethod:\s*['"]PUT['"]/,
  'replay-cursor-commit': /\bcursorEpochMs\s*=\s*(?:candidate|previous)\.cursorEpochMs\b/,
  'replay-workspace-dom-commit': /\boptions\.root\.replaceChildren\s*\(\s*view\.root\s*\)/,
  'session-browser-dom-commit': /\broot\.replaceChildren\s*\(\s*shell\s*\(/,
  'session-record-commit': /\bport\.(?:insert|compareAndSwap|remove)\s*\(\s*(?:record\.sessionId|sessionId)\b/,
  'viewport-intent-commit': /\bintent\s*=\s*(?:candidate|(?:move|promote|reset)ViewportIntent[A-Za-z]*)/,
  'validation-campaign-document-accepted-state': /\bstate\.documents\.set\s*\(\s*campaignId\s*,\s*document\s*\)/,
  'validation-campaign-storage-commit': /\bport\.write\s*\(\s*write\.key\s*,\s*write\.candidateRaw\s*\)/,
  'validation-campaign-dom-commit': /\bmounted\.replaceChildren\s*\(\s*view\s*\)/,
  'workspace-checkpoint-commit': /\bfunction\s+workspaceCheckpointUpdate\s*\([\s\S]*?configuredWorkspace\s*\(\s*current\s*,\s*\{[\s\S]*?checkpoint:/,
  'workspace-snapshot-commit': /#acceptedSnapshot\s*=/,
  'workstation-settings-commit': /\bport\.write\s*\(\s*storageKey\s*,\s*JSON\.stringify\(recordWire\s*\(/,
});

function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function unique(values) {
  return [...new Set(values)].sort();
}

function walk(directory, predicate = () => true) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(candidate, predicate) : (predicate(candidate) ? [candidate] : []);
  });
}

function repositoryPath(v7Root, absolutePath) {
  return path.relative(v7Root, absolutePath).split(path.sep).join('/');
}

function importedNames(clause) {
  if (typeof clause !== 'string') return [];
  const names = [];
  const trimmed = clause.trim();
  const defaultMatch = trimmed.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch) names.push(defaultMatch[1]);
  const namespaceMatch = trimmed.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
  if (namespaceMatch) names.push(namespaceMatch[1]);
  const namedMatch = trimmed.match(/\{([\s\S]*?)\}/);
  if (namedMatch) {
    for (const part of namedMatch[1].split(',')) {
      const match = part.trim().match(/^(?:[A-Za-z_$][\w$]*\s+as\s+)?([A-Za-z_$][\w$]*)$/);
      if (match) names.push(match[1]);
    }
  }
  return unique(names);
}

function parseImports(source) {
  const imports = [];
  const fromPattern = /^\s*(?:import|export)\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2\s*;?/gm;
  for (const match of source.matchAll(fromPattern)) {
    imports.push(Object.freeze({ names: importedNames(match[1]), specifier: match[3] }));
  }
  const sideEffectPattern = /^\s*import\s+(['"])([^'"]+)\1\s*;?/gm;
  for (const match of source.matchAll(sideEffectPattern)) {
    imports.push(Object.freeze({ names: [], specifier: match[2] }));
  }
  const dynamicPattern = /^\s*(?:const\s+(\{[^}]+\}|[A-Za-z_$][\w$]*)\s*=\s*)?(?:await\s+)?import\s*\(\s*(['"])([^'"]+)\2\s*\)\s*;?/gm;
  for (const match of source.matchAll(dynamicPattern)) {
    const clause = match[1];
    imports.push(Object.freeze({
      names: clause?.startsWith('{') ? importedNames(clause) : (clause ? [clause] : []),
      specifier: match[3],
    }));
  }
  return imports;
}

function moduleForPath(moduleRecords, absolutePath) {
  return moduleRecords.find(({ sourceDirectory }) => (
    absolutePath === sourceDirectory || absolutePath.startsWith(`${sourceDirectory}${path.sep}`)
  )) ?? null;
}

function resolveImport(sourceFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const unresolved = path.resolve(path.dirname(sourceFile), specifier);
  if (path.extname(unresolved)) return unresolved;
  if (fs.existsSync(`${unresolved}.js`)) return `${unresolved}.js`;
  return unresolved;
}

function importsForFile({ moduleRecords, sourceFile, v7Root }) {
  const source = fs.readFileSync(sourceFile, 'utf8');
  return parseImports(source).map((entry) => {
    const targetPath = resolveImport(sourceFile, entry.specifier);
    const targetModule = targetPath === null ? null : moduleForPath(moduleRecords, targetPath);
    return Object.freeze({
      importedNames: entry.names,
      source,
      sourceFile: repositoryPath(v7Root, sourceFile),
      targetFile: targetPath === null ? entry.specifier : repositoryPath(v7Root, targetPath),
      targetModuleId: targetModule?.descriptor.id ?? null,
      throughPublicEntry: targetModule === null
        ? null
        : path.resolve(targetPath) === path.resolve(v7Root, targetModule.descriptor.publicEntry),
    });
  });
}

function fixtureDirectories(harnessSource, v7Root) {
  const directories = [];
  const fixturePattern = /\/v7\/tests\/fixtures\/([^'"`?#]*)/g;
  for (const match of harnessSource.matchAll(fixturePattern)) {
    const fragment = match[1].replace(/^\/+|\/+$/g, '');
    if (!fragment) continue;
    const first = fragment.split('/')[0];
    directories.push(path.join(v7Root, 'tests/fixtures', first));
  }
  return unique(directories);
}

function harnessMode({ descriptor, harnessPath, moduleRecords, v7Root }) {
  const source = fs.readFileSync(harnessPath, 'utf8');
  if (/\/v7\/app\//.test(source) || /app\/index\.html/.test(source)) return 'app-shell';
  const publicEntry = path.resolve(v7Root, descriptor.publicEntry);
  const direct = importsForFile({ moduleRecords, sourceFile: harnessPath, v7Root })
    .some(({ targetFile }) => path.resolve(v7Root, targetFile) === publicEntry);
  if (direct) return 'public-entry-direct';
  for (const directory of fixtureDirectories(source, v7Root)) {
    const fixtureImports = walk(directory, (file) => file.endsWith('.js')).flatMap((sourceFile) => (
      importsForFile({ moduleRecords, sourceFile, v7Root })
    ));
    if (fixtureImports.some(({ targetFile }) => path.resolve(v7Root, targetFile) === publicEntry)) {
      return 'public-entry-fixture';
    }
  }
  return 'missing-public-entry';
}

function moduleSnapshot(record, moduleRecords, v7Root) {
  const { descriptor, descriptorPath, sourceDirectory } = record;
  const sourceFiles = walk(sourceDirectory, (file) => file.endsWith('.js'));
  const imports = sourceFiles.flatMap((sourceFile) => (
    importsForFile({ moduleRecords, sourceFile, v7Root })
  ));
  const crossModuleImports = imports.filter(({ targetModuleId }) => (
    targetModuleId !== null && targetModuleId !== descriptor.id
  ));
  const importSites = sorted(crossModuleImports.map((site) => Object.freeze({
    importedNames: site.importedNames,
    sourceFile: site.sourceFile,
    targetFile: site.targetFile,
    targetModuleId: site.targetModuleId,
    throughPublicEntry: site.throughPublicEntry,
  })));
  const disposeSites = sourceFiles.filter((file) => (
    /\bdispose\s*(?:\(\s*\)\s*\{|:\s*(?:\(\s*\)\s*=>|[A-Za-z_$]))/
      .test(fs.readFileSync(file, 'utf8'))
  )).map((file) => repositoryPath(v7Root, file));
  return Object.freeze({
    actualDependencies: unique(crossModuleImports.map(({ targetModuleId }) => targetModuleId)),
    declaredLifecycle: [...descriptor.lifecycle].sort(),
    declaredOptionalPorts: [...descriptor.optionalPorts].sort(),
    declaredRequiredPorts: [...descriptor.requiredPorts].sort(),
    descriptorPath: repositoryPath(v7Root, descriptorPath),
    id: descriptor.id,
    importSites,
    independentHarness: descriptor.independentHarness,
    independentHarnessMode: harnessMode({
      descriptor,
      harnessPath: path.join(v7Root, descriptor.independentHarness),
      moduleRecords,
      v7Root,
    }),
    kind: descriptor.kind,
    observedDisposeSites: disposeSites.sort(),
    owner: descriptor.owner,
    publicEntry: descriptor.publicEntry,
  });
}

function crossModuleConstructionSites({ moduleRecords, sourceFiles, sourceModuleId, v7Root }) {
  const sites = [];
  for (const sourceFile of sourceFiles) {
    const imports = importsForFile({ moduleRecords, sourceFile, v7Root });
    for (const imported of imports) {
      if (imported.targetModuleId === null || imported.targetModuleId === sourceModuleId) continue;
      for (const name of imported.importedNames.filter((value) => /^create[A-Z]/.test(value))) {
        const callCount = imported.source.match(new RegExp(`\\b${name}\\s*\\(`, 'g'))?.length ?? 0;
        if (callCount === 0) continue;
        sites.push(Object.freeze({
          callCount,
          factory: name,
          sourceFile: imported.sourceFile,
          sourceModuleId: sourceModuleId ?? 'application',
          targetModuleId: imported.targetModuleId,
        }));
      }
    }
  }
  return sites;
}

function compositionRoots({ moduleRecords, v7Root }) {
  const roots = [];
  for (const htmlFile of walk(path.join(v7Root, 'app'), (file) => file.endsWith('.html'))) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    const scriptPattern = /<script\b[^>]*\btype=['"]module['"][^>]*\bsrc=['"]([^'"]+)['"][^>]*>/g;
    for (const match of html.matchAll(scriptPattern)) {
      const sourceFile = path.resolve(path.dirname(htmlFile), match[1]);
      const source = fs.readFileSync(sourceFile, 'utf8');
      const imports = importsForFile({ moduleRecords, sourceFile, v7Root });
      roots.push(Object.freeze({
        constructedModuleIds: unique(crossModuleConstructionSites({
          moduleRecords,
          sourceFiles: [sourceFile],
          sourceModuleId: null,
          v7Root,
        }).map(({ targetModuleId }) => targetModuleId)),
        htmlFile: repositoryPath(v7Root, htmlFile),
        importedModuleIds: unique(imports.map(({ targetModuleId }) => targetModuleId).filter(Boolean)),
        path: repositoryPath(v7Root, sourceFile),
        usesModuleHost: /\bcreateModuleHost\s*\(/.test(source)
          && imports.some(({ targetModuleId }) => targetModuleId === 'core.module-host'),
      }));
    }
  }
  return sorted(roots);
}

function writerSites({ moduleRecords, policy, v7Root }) {
  const productionFiles = [
    ...walk(path.join(v7Root, 'src'), (file) => file.endsWith('.js')),
    ...walk(path.join(v7Root, 'app'), (file) => file.endsWith('.js')),
  ];
  const sites = [];
  for (const writerPolicy of policy.writerPolicies) {
    const detector = WRITER_DETECTORS[writerPolicy.detectorId];
    if (!detector) throw new TypeError(`Unknown writer detector ${writerPolicy.detectorId}.`);
    for (const sourceFile of productionFiles) {
      const source = fs.readFileSync(sourceFile, 'utf8');
      if (!detector.test(source)) continue;
      const sourceModule = moduleForPath(moduleRecords, sourceFile);
      sites.push(Object.freeze({
        detectorId: writerPolicy.detectorId,
        sourceFile: repositoryPath(v7Root, sourceFile),
        sourceModuleId: sourceModule?.descriptor.id ?? 'application',
        surface: writerPolicy.surface,
      }));
    }
  }
  return sorted(sites);
}

/**
 * Read every active production descriptor and source file into a deterministic
 * architecture snapshot, then validate that snapshot with explicit policy.
 */
export function analyzeProductionArchitecture({ manifest, policy, v7Root }) {
  const absoluteV7Root = path.resolve(v7Root);
  const moduleRecords = manifest.activeProductionModules.map((relativeDescriptorPath) => {
    const descriptorPath = path.join(absoluteV7Root, relativeDescriptorPath);
    const descriptor = JSON.parse(fs.readFileSync(descriptorPath, 'utf8'));
    return Object.freeze({
      descriptor,
      descriptorPath,
      sourceDirectory: path.dirname(path.resolve(absoluteV7Root, descriptor.publicEntry)),
    });
  });
  const modules = sorted(moduleRecords.map((record) => (
    moduleSnapshot(record, moduleRecords, absoluteV7Root)
  )));
  const constructionSites = sorted(moduleRecords.flatMap((record) => (
    crossModuleConstructionSites({
      moduleRecords,
      sourceFiles: walk(record.sourceDirectory, (file) => file.endsWith('.js')),
      sourceModuleId: record.descriptor.id,
      v7Root: absoluteV7Root,
    })
  )).concat(crossModuleConstructionSites({
    moduleRecords,
    sourceFiles: walk(path.join(absoluteV7Root, 'app'), (file) => file.endsWith('.js')),
    sourceModuleId: null,
    v7Root: absoluteV7Root,
  })));
  const snapshot = Object.freeze({
    compositionRoots: compositionRoots({ moduleRecords, v7Root: absoluteV7Root }),
    constructionSites,
    declaredWriterSurfaces: sorted(Object.entries(manifest.writerInventories).map(
      ([surface, moduleIds]) => Object.freeze({ moduleIds: [...moduleIds].sort(), surface }),
    )),
    modules,
    writerSites: writerSites({ moduleRecords, policy, v7Root: absoluteV7Root }),
  });
  return Object.freeze({
    snapshot,
    violations: validateProductionArchitectureSnapshot(snapshot, policy),
  });
}
