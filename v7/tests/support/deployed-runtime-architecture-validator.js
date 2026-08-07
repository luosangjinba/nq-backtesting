import fs from 'node:fs';
import path from 'node:path';

const SERVICE_KINDS = new Set(['read-only-service', 'service']);
const ROUTE_ACTIVATIONS = new Set(['always', 'authenticated', 'authenticated-bootstrap']);
const SMOKE_RUNTIMES = new Set(['node', 'python']);
const READ_ONLY_SMOKE_CAPABILITIES = Object.freeze([
  'dataset-revision',
  'read-only-boundary',
]);

function violation(code, subject, detail = '') {
  return Object.freeze({ code, detail, subject });
}

function values(value) {
  return Array.isArray(value) ? value : [];
}

function owned(component, candidate) {
  return values(component.ownedPaths).some((ownedPath) => (
    ownedPath.endsWith('/') ? candidate.startsWith(ownedPath) : candidate === ownedPath
  ));
}

function walk(root, relativeRoot, extensions) {
  const absolute = path.join(root, relativeRoot);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return extensions.includes(path.extname(absolute)) ? [relativeRoot] : [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(relativeRoot, entry.name);
    return entry.isDirectory() ? walk(root, relative, extensions)
      : (extensions.includes(path.extname(entry.name)) ? [relative] : []);
  });
}

function sortedUnique(valuesToSort) {
  return [...new Set(valuesToSort)].sort();
}

function equalStringSets(left, right) {
  return JSON.stringify(sortedUnique(left)) === JSON.stringify(sortedUnique(right));
}

function isUniqueStringList(value) {
  return Array.isArray(value)
    && value.every((entry) => typeof entry === 'string' && entry.length > 0)
    && new Set(value).size === value.length;
}

function directiveTokens(source, directive) {
  return source.split(/\r?\n/)
    .filter((line) => line.startsWith(`${directive}=`))
    .flatMap((line) => line.slice(directive.length + 1).trim().split(/\s+/).filter(Boolean));
}

function observedProxyRoutes(repositoryRoot, configurationPaths) {
  return configurationPaths.flatMap((configurationPath) => {
    const absolute = path.join(repositoryRoot, configurationPath);
    if (!fs.existsSync(absolute)) return [];
    const source = fs.readFileSync(absolute, 'utf8');
    const matcherPaths = new Map();
    const matcherPattern = /(@[A-Za-z0-9_-]+)\s+path\s+(\/[^\s'\\]+)/g;
    for (const match of source.matchAll(matcherPattern)) matcherPaths.set(match[1], match[2]);
    const proxies = [];
    const proxyPattern = /reverse_proxy\s+(?:(@[A-Za-z0-9_-]+)\s+)?(127\.0\.0\.1:\d+)/g;
    for (const match of source.matchAll(proxyPattern)) {
      proxies.push(Object.freeze({
        configurationPath,
        matcher: match[1] ?? null,
        pathPattern: match[1] ? (matcherPaths.get(match[1]) ?? null) : '/*',
        targetEndpoint: match[2],
      }));
    }
    return proxies;
  });
}

function proxyRouteKey(route) {
  return [
    route.configurationPath,
    route.matcher ?? '',
    route.pathPattern,
    route.targetEndpoint,
  ].join('|');
}

/** Validate the complete deployed-runtime ownership, topology, and writer closure. */
export function validateDeployedRuntimeArchitecture(model, repositoryRoot) {
  const violations = [];
  if (model?.schemaVersion !== 2 || model?.status !== 'standalone-v7') {
    violations.push(violation('DEPLOYED_RUNTIME_HEADER_INVALID', 'manifest'));
  }
  const releaseContract = model?.releaseContract;
  if (!equalStringSets(values(releaseContract?.repositoryArchiveRoots), ['v7'])
    || releaseContract?.marketDatabase?.delivery !== 'external-file'
    || releaseContract?.marketDatabase?.environmentVariable !== 'V7_MARKET_DATA_DB'
    || releaseContract?.marketDatabase?.releaseContainsDatabase !== false) {
    violations.push(violation('DEPLOYED_RUNTIME_RELEASE_CONTRACT_INVALID', 'releaseContract'));
  }
  const components = values(model?.components);
  const byId = new Map();
  for (const component of components) {
    if (typeof component?.id !== 'string' || byId.has(component.id)) {
      violations.push(violation('DEPLOYED_RUNTIME_COMPONENT_ID_INVALID', component?.id ?? 'missing'));
      continue;
    }
    byId.set(component.id, component);
    if (typeof component.owner !== 'string' || component.owner.length === 0
      || typeof component.entry !== 'string' || !fs.existsSync(path.join(repositoryRoot, component.entry))) {
      violations.push(violation('DEPLOYED_RUNTIME_COMPONENT_CONTRACT_INVALID', component.id));
    } else if (!owned(component, component.entry)) {
      violations.push(violation('DEPLOYED_RUNTIME_COMPONENT_ENTRY_UNOWNED', component.id));
    }
    const required = values(component.requiredComponents);
    const optional = values(component.optionalComponents);
    if (!isUniqueStringList(component.requiredComponents)
      || !isUniqueStringList(component.optionalComponents)
      || required.some((dependency) => optional.includes(dependency))) {
      violations.push(violation('DEPLOYED_RUNTIME_DEPENDENCY_CONTRACT_INVALID', component.id));
    }
    if (component.kind === 'read-only-service' && values(component.writerSurfaces).length > 0) {
      violations.push(violation('DEPLOYED_RUNTIME_READ_ONLY_WRITER_SURFACE', component.id));
    }
    for (const harness of values(component.independentHarnesses)) {
      if (!fs.existsSync(path.join(repositoryRoot, harness))) {
        violations.push(violation('DEPLOYED_RUNTIME_HARNESS_MISSING', `${component.id}:${harness}`));
      }
    }
  }

  const productionFiles = values(model?.productionRoots).flatMap((root) => (
    walk(repositoryRoot, root.path, values(root.extensions))
  )).sort();
  for (const file of productionFiles) {
    const owners = components.filter((component) => owned(component, file));
    if (owners.length === 0) violations.push(violation('DEPLOYED_RUNTIME_FILE_UNOWNED', file));
    if (owners.length > 1) {
      violations.push(violation(
        'DEPLOYED_RUNTIME_FILE_MULTIPLE_OWNERS', file, owners.map(({ id }) => id).sort().join(', '),
      ));
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(componentId) {
    if (visiting.has(componentId)) {
      violations.push(violation('DEPLOYED_RUNTIME_DEPENDENCY_CYCLE', componentId));
      return;
    }
    if (visited.has(componentId)) return;
    const component = byId.get(componentId);
    if (!component) return;
    visiting.add(componentId);
    const dependencies = [
      ...values(component.requiredComponents),
      ...values(component.optionalComponents),
    ];
    for (const dependency of dependencies) {
      if (!byId.has(dependency)) {
        violations.push(violation('DEPLOYED_RUNTIME_DEPENDENCY_MISSING', `${componentId}:${dependency}`));
      } else {
        visit(dependency);
      }
    }
    visiting.delete(componentId);
    visited.add(componentId);
  }
  for (const componentId of byId.keys()) visit(componentId);

  const unitDirectory = typeof model?.serviceUnitDirectory === 'string'
    ? model.serviceUnitDirectory : '';
  const actualUnitTemplates = unitDirectory.length > 0
    ? walk(repositoryRoot, unitDirectory, ['.template'])
      .filter((candidate) => candidate.endsWith('.service.template')).sort()
    : [];
  const serviceUnits = values(model?.serviceUnits);
  const unitByComponent = new Map();
  const unitNames = new Set();
  const endpoints = new Set();
  const declaredUnitTemplates = [];
  for (const unit of serviceUnits) {
    const component = byId.get(unit?.component);
    const subject = unit?.unitName ?? unit?.component ?? 'missing';
    if (typeof unit?.unitName !== 'string' || unitNames.has(unit.unitName)
      || typeof unit?.component !== 'string' || unitByComponent.has(unit.component)) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_UNIT_ID_INVALID', subject));
      continue;
    }
    unitNames.add(unit.unitName);
    unitByComponent.set(unit.component, unit);
    if (!component || !SERVICE_KINDS.has(component.kind)) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_UNIT_COMPONENT_INVALID', subject));
    }
    const template = typeof unit.template === 'string' ? unit.template : '';
    const templateAbsolute = path.join(repositoryRoot, template);
    declaredUnitTemplates.push(template);
    if (!actualUnitTemplates.includes(template) || path.basename(template) !== `${unit.unitName}.template`) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_UNIT_TEMPLATE_INVALID', subject));
      continue;
    }
    const unitSource = fs.readFileSync(templateAbsolute, 'utf8');
    const expectedEntry = component ? `@@CURRENT_RELEASE@@/${component.entry}` : '';
    const execLines = unitSource.match(/^ExecStart=.*$/gm) ?? [];
    if (execLines.length !== 1 || !execLines[0].includes(expectedEntry)) {
      violations.push(violation('DEPLOYED_RUNTIME_SYSTEMD_EXEC_ENTRY_MISMATCH', subject));
    }
    if (typeof unit.listenEndpoint !== 'string'
      || !/^127\.0\.0\.1:\d+$/.test(unit.listenEndpoint)
      || endpoints.has(unit.listenEndpoint)) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_ENDPOINT_INVALID', subject));
    } else {
      endpoints.add(unit.listenEndpoint);
    }
    const evidencePath = unit?.listenEvidence?.path;
    const evidenceText = unit?.listenEvidence?.text;
    const evidenceAbsolute = path.join(repositoryRoot, evidencePath ?? '');
    if (typeof evidencePath !== 'string' || typeof evidenceText !== 'string'
      || !fs.existsSync(evidenceAbsolute)
      || !fs.readFileSync(evidenceAbsolute, 'utf8').includes(evidenceText)
      || !components.some((candidate) => owned(candidate, evidencePath))) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_LISTEN_EVIDENCE_MISSING', subject));
    }
  }
  if (!equalStringSets(actualUnitTemplates, declaredUnitTemplates)) {
    violations.push(violation('DEPLOYED_RUNTIME_SERVICE_UNIT_INVENTORY_OPEN', unitDirectory || 'missing'));
  }
  for (const component of components.filter(({ kind }) => SERVICE_KINDS.has(kind))) {
    if (!unitByComponent.has(component.id)) {
      violations.push(violation('DEPLOYED_RUNTIME_SERVICE_UNIT_MISSING', component.id));
    }
  }
  for (const [componentId, unit] of unitByComponent) {
    const component = byId.get(componentId);
    if (!component) continue;
    const unitSource = fs.readFileSync(path.join(repositoryRoot, unit.template), 'utf8');
    const wants = directiveTokens(unitSource, 'Wants');
    const after = directiveTokens(unitSource, 'After');
    const requires = directiveTokens(unitSource, 'Requires');
    for (const dependency of [
      ...values(component.requiredComponents),
      ...values(component.optionalComponents),
    ]) {
      const dependencyUnit = unitByComponent.get(dependency);
      if (!dependencyUnit) continue;
      if (!wants.includes(dependencyUnit.unitName) || !after.includes(dependencyUnit.unitName)) {
        violations.push(violation(
          'DEPLOYED_RUNTIME_SYSTEMD_DEPENDENCY_WIRING_MISSING', `${componentId}:${dependency}`,
        ));
      }
    }
    for (const dependency of values(component.optionalComponents)) {
      const dependencyUnit = unitByComponent.get(dependency);
      if (dependencyUnit && requires.includes(dependencyUnit.unitName)) {
        violations.push(violation(
          'DEPLOYED_RUNTIME_SYSTEMD_OPTIONAL_DEPENDENCY_REQUIRED', `${componentId}:${dependency}`,
        ));
      }
    }
  }

  const configurationPaths = values(model?.proxyConfigurationPaths);
  const actualConfigurationPaths = productionFiles.filter((candidate) => {
    try {
      return fs.readFileSync(path.join(repositoryRoot, candidate), 'utf8').includes('reverse_proxy');
    } catch {
      return false;
    }
  });
  if (!isUniqueStringList(model?.proxyConfigurationPaths)
    || !equalStringSets(configurationPaths, actualConfigurationPaths)) {
    violations.push(violation('DEPLOYED_RUNTIME_PROXY_CONFIGURATION_INVENTORY_OPEN', 'proxyConfigurationPaths'));
  }
  const observedRoutes = observedProxyRoutes(repositoryRoot, actualConfigurationPaths);
  const observedByKey = new Map(observedRoutes.map((route) => [proxyRouteKey(route), route]));
  const declaredRouteKeys = new Set();
  const routeIds = new Set();
  const routePaths = new Set();
  const routedComponents = new Set();
  for (const route of values(model?.proxyRoutes)) {
    const subject = route?.id ?? 'missing';
    if (typeof route?.id !== 'string' || routeIds.has(route.id)) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_ID_INVALID', subject));
      continue;
    }
    routeIds.add(route.id);
    const source = byId.get(route.sourceComponent);
    const target = byId.get(route.targetComponent);
    const targetUnit = unitByComponent.get(route.targetComponent);
    if (!source || !target || !targetUnit
      || !configurationPaths.includes(route.configurationPath)
      || !owned(source, route.configurationPath ?? '')) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_COMPONENT_INVALID', subject));
    }
    if (route.targetEndpoint !== targetUnit?.listenEndpoint) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_TARGET_ENDPOINT_MISMATCH', subject));
    }
    if (!ROUTE_ACTIVATIONS.has(route.activation)
      || typeof route.pathPattern !== 'string' || !route.pathPattern.startsWith('/')
      || (route.matcher !== null && !/^@[A-Za-z0-9_-]+$/.test(route.matcher ?? ''))) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_CONTRACT_INVALID', subject));
    }
    const layerPath = `caddy:${route.pathPattern}`;
    if (routePaths.has(layerPath)) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_PATH_DUPLICATE', route.pathPattern));
    }
    routePaths.add(layerPath);
    const routeKey = proxyRouteKey(route);
    declaredRouteKeys.add(routeKey);
    routedComponents.add(route.targetComponent);
    if (!observedByKey.has(routeKey)) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_ROUTE_WIRING_MISSING', subject));
    }
  }
  for (const observed of observedRoutes) {
    if (!declaredRouteKeys.has(proxyRouteKey(observed))) {
      violations.push(violation(
        'DEPLOYED_RUNTIME_PROXY_ROUTE_UNINVENTORIED', proxyRouteKey(observed),
      ));
    }
  }
  for (const unit of serviceUnits) {
    if (!routedComponents.has(unit.component)) {
      violations.push(violation('DEPLOYED_RUNTIME_PROXY_TARGET_UNROUTED', unit.component));
    }
  }
  const web = byId.get('service.v7-web');
  if (web) {
    const conditionalTargets = values(model?.proxyRoutes)
      .filter(({ activation }) => activation !== 'always')
      .map(({ targetComponent }) => targetComponent);
    if (!equalStringSets(conditionalTargets, values(web.optionalComponents))) {
      violations.push(violation('DEPLOYED_RUNTIME_WEB_OPTIONAL_DEPENDENCY_INVENTORY_OPEN', web.id));
    }
  }

  const smokeCapabilities = new Map();
  for (const smoke of values(model?.crossRuntimeSmokes)) {
    const subject = `${smoke?.component ?? 'missing'}:${smoke?.capability ?? 'missing'}`;
    const component = byId.get(smoke?.component);
    if (!component || component.kind !== 'read-only-service'
      || !SMOKE_RUNTIMES.has(smoke.runtime)
      || typeof smoke.path !== 'string'
      || !values(component.independentHarnesses).includes(smoke.path)
      || !fs.existsSync(path.join(repositoryRoot, smoke.path))
      || typeof smoke.successText !== 'string' || smoke.successText.length === 0) {
      violations.push(violation('DEPLOYED_RUNTIME_CROSS_RUNTIME_SMOKE_INVALID', subject));
      continue;
    }
    if (!smokeCapabilities.has(component.id)) smokeCapabilities.set(component.id, new Set());
    const capabilities = smokeCapabilities.get(component.id);
    if (capabilities.has(smoke.capability)) {
      violations.push(violation('DEPLOYED_RUNTIME_CROSS_RUNTIME_SMOKE_DUPLICATE', subject));
    }
    capabilities.add(smoke.capability);
  }
  for (const component of components.filter(({ kind }) => kind === 'read-only-service')) {
    const capabilities = smokeCapabilities.get(component.id) ?? new Set();
    for (const capability of READ_ONLY_SMOKE_CAPABILITIES) {
      if (!capabilities.has(capability)) {
        violations.push(violation(
          'DEPLOYED_RUNTIME_READ_ONLY_SMOKE_CAPABILITY_MISSING', `${component.id}:${capability}`,
        ));
      }
    }
  }

  const inventories = model?.writerInventories ?? {};
  const declared = new Map();
  for (const component of components) {
    for (const surface of values(component.writerSurfaces)) {
      if (declared.has(surface)) {
        violations.push(violation('DEPLOYED_RUNTIME_WRITER_MULTIPLE_OWNERS', surface));
      }
      declared.set(surface, component.id);
    }
  }
  const inventoryNames = Object.keys(inventories).sort();
  const declaredNames = [...declared.keys()].sort();
  if (JSON.stringify(inventoryNames) !== JSON.stringify(declaredNames)) {
    violations.push(violation('DEPLOYED_RUNTIME_WRITER_INVENTORY_OPEN', 'writerInventories'));
  }
  for (const surface of inventoryNames) {
    if (inventories[surface] !== declared.get(surface)) {
      violations.push(violation('DEPLOYED_RUNTIME_WRITER_OWNER_MISMATCH', surface));
    }
  }
  const evidenceBySurface = new Map();
  for (const evidence of values(model?.writerEvidence)) {
    if (!evidenceBySurface.has(evidence.surface)) evidenceBySurface.set(evidence.surface, []);
    evidenceBySurface.get(evidence.surface).push(evidence);
    const owner = byId.get(inventories[evidence.surface]);
    const absolute = path.join(repositoryRoot, evidence.path ?? '');
    if (!owner || !owned(owner, evidence.path ?? '') || !fs.existsSync(absolute)) {
      violations.push(violation('DEPLOYED_RUNTIME_WRITER_EVIDENCE_OWNER_INVALID', evidence.surface));
      continue;
    }
    let matched = false;
    try {
      matched = new RegExp(evidence.pattern, 'm').test(fs.readFileSync(absolute, 'utf8'));
    } catch {
      matched = false;
    }
    if (!matched) violations.push(violation('DEPLOYED_RUNTIME_WRITER_EVIDENCE_MISSING', evidence.surface));
  }
  for (const surface of inventoryNames) {
    if (!evidenceBySurface.has(surface)) {
      violations.push(violation('DEPLOYED_RUNTIME_WRITER_ZERO_OBSERVED_SITES', surface));
    }
  }
  return Object.freeze(violations.sort((left, right) => (
    `${left.code}:${left.subject}`.localeCompare(`${right.code}:${right.subject}`)
  )));
}
