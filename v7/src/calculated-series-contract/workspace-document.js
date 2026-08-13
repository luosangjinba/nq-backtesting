import { failCalculatedSeries } from './contract-error.js';
import {
  calculatedSeriesDefinitionRef,
  readCalculatedSeriesDefinition,
} from './definition.js';
import { CALCULATED_SERIES_LIMITS } from './limits.js';
import { definePlot, defineReferenceLine } from './plot-definition.js';
import {
  assertByteCeiling,
  digest,
  displayLabel,
  enumValue,
  exactArray,
  exactRecord,
  opaqueId,
  portableValue,
  safeInteger,
  semver,
  uniqueIds,
} from './portable-value.js';
import { assessScaleIntentCompatibility, defineScaleIntent } from './scale-catalog.js';

class CalculatedSeriesWorkspaceDocumentValue {
  #wire;
  constructor(wire) { this.#wire = wire; Object.freeze(this); }
  read() { return this.#wire; }
}

function definitionKey(ref) {
  return [ref.packageId, ref.packageVersion, ref.contributionId, ref.contributionVersion,
    ref.definitionId, ref.definitionVersion, ref.profile.profileId,
    ref.profile.profileContractVersion].join('@');
}

function definitionIndex(definitions) {
  exactArray(
    definitions,
    { maximum: CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries },
    'CALCULATED_SERIES_DEFINITION_INVALID',
    'Definition evidence',
  );
  const entries = definitions.map((definition) => {
    const wire = readCalculatedSeriesDefinition(definition);
    return [definitionKey(calculatedSeriesDefinitionRef(definition)), wire];
  });
  if (new Set(entries.map(([key]) => key)).size !== entries.length) {
    failCalculatedSeries('CALCULATED_SERIES_DEFINITION_DUPLICATE', 'Definition evidence is duplicated.');
  }
  return new Map(entries);
}

function normalizeDefinitionRef(value) {
  exactRecord(value, [
    'contributionId', 'contributionVersion', 'definitionId', 'definitionVersion',
    'packageId', 'packageVersion', 'profile',
  ], 'CALCULATED_SERIES_DEFINITION_REF_INVALID', 'Definition reference');
  exactRecord(value.profile, ['profileContractVersion', 'profileId'],
    'CALCULATED_SERIES_DEFINITION_REF_INVALID', 'Definition Profile reference');
  if (value.profile.profileId !== 'analysis.calculated-series'
    || value.profile.profileContractVersion !== '1.0.0') {
    failCalculatedSeries(
      'CALCULATED_SERIES_DEFINITION_REF_INVALID',
      'Definition reference must use the exact calculated-series Profile.',
    );
  }
  return Object.freeze({
    contributionId: opaqueId(value.contributionId, 'Definition contribution id'),
    contributionVersion: semver(value.contributionVersion, 'Definition contribution version'),
    definitionId: opaqueId(value.definitionId, 'Definition id'),
    definitionVersion: semver(value.definitionVersion, 'Definition version'),
    packageId: opaqueId(value.packageId, 'Definition package id'),
    packageVersion: semver(value.packageVersion, 'Definition package version'),
    profile: Object.freeze({
      profileContractVersion: '1.0.0',
      profileId: 'analysis.calculated-series',
    }),
  });
}

function normalizeRegion(value) {
  exactRecord(value, ['collapsed', 'heightWeight', 'kind', 'order', 'regionId'],
    'CALCULATED_SERIES_REGION_INVALID', 'Chart Region');
  if (typeof value.collapsed !== 'boolean') {
    failCalculatedSeries('CALCULATED_SERIES_REGION_INVALID', 'Region collapsed flag is invalid.');
  }
  const kind = enumValue(value.kind, ['main', 'calculated-series'], 'CALCULATED_SERIES_REGION_INVALID', 'Region kind');
  const region = Object.freeze({
    collapsed: value.collapsed,
    heightWeight: safeInteger(value.heightWeight, 'Region height weight', { minimum: 1, maximum: 100 }),
    kind,
    order: safeInteger(value.order, 'Region order', { maximum: 7 }),
    regionId: opaqueId(value.regionId, 'Region id'),
  });
  if (kind === 'main' && (region.order !== 0 || region.collapsed)) {
    failCalculatedSeries('CALCULATED_SERIES_MAIN_REGION_INVALID', 'Main region must be order zero and expanded.');
  }
  return region;
}

function normalizeScaleGroup(value) {
  exactRecord(value, ['axisIntent', 'order', 'regionId', 'scaleGroupId', 'scaleIntent'],
    'CALCULATED_SERIES_SCALE_GROUP_INVALID', 'Scale Group');
  return Object.freeze({
    axisIntent: enumValue(value.axisIntent, ['primary', 'auxiliary'], 'CALCULATED_SERIES_SCALE_GROUP_INVALID', 'Axis intent'),
    order: safeInteger(value.order, 'Scale Group order', { maximum: 3 }),
    regionId: opaqueId(value.regionId, 'Scale Group region id'),
    scaleGroupId: opaqueId(value.scaleGroupId, 'Scale Group id'),
    scaleIntent: defineScaleIntent(value.scaleIntent),
  });
}

function scaleGroupRegionForCeiling(value) {
  exactRecord(value, ['axisIntent', 'order', 'regionId', 'scaleGroupId', 'scaleIntent'],
    'CALCULATED_SERIES_SCALE_GROUP_INVALID', 'Scale Group');
  return opaqueId(value.regionId, 'Scale Group region id');
}

function normalizePlacement(value) {
  exactRecord(value, ['order', 'plotGroupId', 'regionId', 'scaleGroupId'],
    'CALCULATED_SERIES_PLACEMENT_INVALID', 'Plot Group placement');
  return Object.freeze({
    order: safeInteger(value.order, 'Placement order', { maximum: 31 }),
    plotGroupId: opaqueId(value.plotGroupId, 'Placed Plot Group id'),
    regionId: opaqueId(value.regionId, 'Placement region id'),
    scaleGroupId: opaqueId(value.scaleGroupId, 'Placement Scale Group id'),
  });
}

function replaceStyle(target, style) {
  if ('plotId' in target) return definePlot({ ...target, style }).style;
  return defineReferenceLine({ ...target, style }).style;
}

function normalizeStyleOverrides(values, definition) {
  exactArray(
    values,
    { maximum: CALCULATED_SERIES_LIMITS.maximumPortableCollectionEntries },
    'CALCULATED_SERIES_STYLE_OVERRIDE_INVALID',
    'Style overrides',
  );
  const targets = new Map();
  for (const group of definition.plotGroups) {
    for (const plot of group.plots) targets.set(`${group.plotGroupId}:plot:${plot.plotId}`, plot);
    for (const line of group.referenceLines) {
      targets.set(`${group.plotGroupId}:reference-line:${line.referenceLineId}`, line);
    }
  }
  const normalized = values.map((value) => {
    exactRecord(value, ['plotGroupId', 'style', 'targetId', 'targetKind'],
      'CALCULATED_SERIES_STYLE_OVERRIDE_INVALID', 'Style override');
    const targetKind = enumValue(value.targetKind, ['plot', 'reference-line'], 'CALCULATED_SERIES_STYLE_OVERRIDE_INVALID', 'Style target kind');
    const base = targets.get(`${value.plotGroupId}:${targetKind}:${value.targetId}`);
    if (!base) failCalculatedSeries('CALCULATED_SERIES_STYLE_OVERRIDE_INVALID', 'Style target is unknown.');
    return Object.freeze({
      plotGroupId: opaqueId(value.plotGroupId),
      style: replaceStyle(base, value.style),
      targetId: opaqueId(value.targetId),
      targetKind,
    });
  });
  const keys = normalized.map((value) => `${value.plotGroupId}:${value.targetKind}:${value.targetId}`);
  if (new Set(keys).size !== keys.length) {
    failCalculatedSeries('CALCULATED_SERIES_STYLE_OVERRIDE_INVALID', 'Style targets must be unique.');
  }
  return Object.freeze(normalized.sort((left, right) => (
    `${left.plotGroupId}:${left.targetKind}:${left.targetId}`
      .localeCompare(`${right.plotGroupId}:${right.targetKind}:${right.targetId}`)
  )));
}

function validatePlacements(placements, definition, regions, scales) {
  const groupIds = definition.plotGroups.map(({ plotGroupId }) => plotGroupId);
  const orderKeys = placements.map(({ order, regionId }) => `${regionId}:${order}`);
  if (placements.length !== groupIds.length
    || new Set(placements.map(({ plotGroupId }) => plotGroupId)).size !== placements.length
    || placements.some(({ plotGroupId }) => !groupIds.includes(plotGroupId))) {
    failCalculatedSeries('CALCULATED_SERIES_PLACEMENT_INCOMPLETE', 'Every Plot Group must be placed exactly once.');
  }
  if (new Set(orderKeys).size !== orderKeys.length) {
    failCalculatedSeries(
      'CALCULATED_SERIES_PLACEMENT_ORDER_DUPLICATE',
      'Plot Group placement order must be unique within each Chart Region.',
    );
  }
  for (const placement of placements) {
    const region = regions.find(({ regionId }) => regionId === placement.regionId);
    const scale = scales.find(({ scaleGroupId }) => scaleGroupId === placement.scaleGroupId);
    const group = definition.plotGroups.find(({ plotGroupId }) => plotGroupId === placement.plotGroupId);
    if (!region || !scale || scale.regionId !== region.regionId
      || !assessScaleIntentCompatibility(group.scaleIntent, scale.scaleIntent).compatible) {
      failCalculatedSeries('CALCULATED_SERIES_PLACEMENT_INCOMPATIBLE', 'Placement Region/Scale is missing or incompatible.');
    }
  }
}

function normalizeResolved(value, definitions, regions, scales) {
  exactRecord(value, [
    'definitionRef', 'instanceId', 'instanceRevision', 'parameterOverrides',
    'plotGroupPlacements', 'styleOverrides', 'visibility',
  ], 'CALCULATED_SERIES_INSTANCE_INVALID', 'Resolved instance');
  const definitionRef = normalizeDefinitionRef(value.definitionRef);
  const definition = definitions.get(definitionKey(definitionRef));
  if (!definition) {
    failCalculatedSeries('CALCULATED_SERIES_DEFINITION_UNKNOWN', 'Resolved instance definition is unavailable.');
  }
  exactArray(
    value.plotGroupPlacements,
    { maximum: CALCULATED_SERIES_LIMITS.maximumPlotGroupsPerDefinition },
    'CALCULATED_SERIES_PLACEMENT_INVALID',
    'Plot Group placements',
  );
  if (!value.parameterOverrides || typeof value.parameterOverrides !== 'object'
    || Array.isArray(value.parameterOverrides)
    || Object.getPrototypeOf(value.parameterOverrides) !== Object.prototype) {
    failCalculatedSeries('CALCULATED_SERIES_INSTANCE_INVALID', 'Parameter overrides must be a portable record.');
  }
  const placements = value.plotGroupPlacements.map(normalizePlacement)
    .sort((left, right) => left.regionId.localeCompare(right.regionId)
      || left.scaleGroupId.localeCompare(right.scaleGroupId)
      || left.order - right.order
      || left.plotGroupId.localeCompare(right.plotGroupId));
  validatePlacements(placements, definition, regions, scales);
  return Object.freeze({
    definitionRef,
    instanceId: opaqueId(value.instanceId, 'Instance id'),
    instanceRevision: safeInteger(value.instanceRevision, 'Instance revision', { minimum: 1 }),
    parameterOverrides: portableValue(value.parameterOverrides, 'Parameter overrides'),
    plotGroupPlacements: Object.freeze(placements),
    styleOverrides: normalizeStyleOverrides(value.styleOverrides, definition),
    visibility: enumValue(value.visibility, ['visible', 'hidden'], 'CALCULATED_SERIES_INSTANCE_INVALID', 'Instance visibility'),
  });
}

function normalizeUnresolved(value) {
  exactRecord(value, [
    'displayMetadata', 'instanceId', 'lastKnownDefinitionRef', 'originalDigest',
    'originalWire', 'reasonCode',
  ], 'CALCULATED_SERIES_UNRESOLVED_INVALID', 'Unresolved instance');
  exactRecord(value.displayMetadata, ['displayName', 'packageDisplayName'],
    'CALCULATED_SERIES_UNRESOLVED_INVALID', 'Unresolved display metadata');
  const originalWire = portableValue(value.originalWire, 'Unresolved original wire');
  assertByteCeiling(originalWire, CALCULATED_SERIES_LIMITS.maximumUnresolvedInstanceBytes, 'Unresolved instance');
  return Object.freeze({
    displayMetadata: Object.freeze({
      displayName: displayLabel(value.displayMetadata.displayName),
      packageDisplayName: displayLabel(value.displayMetadata.packageDisplayName),
    }),
    instanceId: opaqueId(value.instanceId, 'Unresolved instance id'),
    lastKnownDefinitionRef: value.lastKnownDefinitionRef === null
      ? null : normalizeDefinitionRef(value.lastKnownDefinitionRef),
    originalDigest: digest(value.originalDigest, 'Unresolved original digest'),
    originalWire,
    reasonCode: opaqueId(value.reasonCode, 'Unresolved reason code'),
  });
}

function validatePaneTopology(regions, scales) {
  if (regions.length < 1 || regions.length > CALCULATED_SERIES_LIMITS.maximumRegionsPerWorkspacePane
    || regions.filter(({ kind }) => kind === 'main').length !== 1
    || !regions.some(({ kind, order }) => kind === 'main' && order === 0)
    || new Set(regions.map(({ order }) => order)).size !== regions.length) {
    failCalculatedSeries('CALCULATED_SERIES_MAIN_REGION_INVALID', 'Pane must have exactly one ordered Main region.');
  }
  for (const region of regions) {
    const local = scales.filter(({ regionId }) => regionId === region.regionId);
    if (local.length > CALCULATED_SERIES_LIMITS.maximumScaleGroupsPerRegion) {
      failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Region Scale Groups exceed their ceiling.');
    }
    if (new Set(local.map(({ order }) => order)).size !== local.length) {
      failCalculatedSeries('CALCULATED_SERIES_SCALE_GROUP_INVALID', 'Region Scale Groups exceed bounds or duplicate order.');
    }
  }
  if (scales.some(({ regionId }) => !regions.some((region) => region.regionId === regionId))) {
    failCalculatedSeries('CALCULATED_SERIES_SCALE_GROUP_INVALID', 'Scale Group references an unknown Region.');
  }
}

function normalizePane(value, definitions) {
  exactRecord(value, [
    'chartRegions', 'resolvedInstances', 'scaleGroups', 'unresolvedInstances', 'workspacePaneId',
  ], 'CALCULATED_SERIES_WORKSPACE_PANE_INVALID', 'Calculated-series Workspace Pane');
  exactArray(
    value.chartRegions,
    { minimum: 1, maximum: CALCULATED_SERIES_LIMITS.maximumRegionsPerWorkspacePane },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Chart Regions',
  );
  exactArray(
    value.scaleGroups,
    {
      maximum: CALCULATED_SERIES_LIMITS.maximumRegionsPerWorkspacePane
        * CALCULATED_SERIES_LIMITS.maximumScaleGroupsPerRegion,
    },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Scale Groups',
  );
  exactArray(
    value.resolvedInstances,
    { maximum: CALCULATED_SERIES_LIMITS.maximumInstancesPerWorkspacePane },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Resolved calculated-series instances',
  );
  exactArray(
    value.unresolvedInstances,
    { maximum: CALCULATED_SERIES_LIMITS.maximumInstancesPerWorkspacePane },
    'CALCULATED_SERIES_RESOURCE_LIMIT',
    'Unresolved calculated-series instances',
  );
  const scaleRegionIds = value.scaleGroups.map(scaleGroupRegionForCeiling);
  if (scaleRegionIds.some((regionId) => scaleRegionIds.filter((candidate) => (
    candidate === regionId
  )).length > CALCULATED_SERIES_LIMITS.maximumScaleGroupsPerRegion)) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Pane Scale Group ceiling is exceeded.');
  }
  const regions = uniqueIds(value.chartRegions.map(normalizeRegion), 'regionId', 'Region')
    .sort((left, right) => left.order - right.order);
  const scales = uniqueIds(value.scaleGroups.map(normalizeScaleGroup), 'scaleGroupId', 'Scale Group')
    .sort((left, right) => left.regionId.localeCompare(right.regionId)
      || left.order - right.order
      || left.scaleGroupId.localeCompare(right.scaleGroupId));
  validatePaneTopology(regions, scales);
  if (value.resolvedInstances.length + value.unresolvedInstances.length
    > CALCULATED_SERIES_LIMITS.maximumInstancesPerWorkspacePane) {
    failCalculatedSeries('CALCULATED_SERIES_RESOURCE_LIMIT', 'Pane has too many calculated-series instances.');
  }
  const resolved = value.resolvedInstances
    .map((entry) => normalizeResolved(entry, definitions, regions, scales))
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  const unresolved = value.unresolvedInstances.map(normalizeUnresolved)
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  const ids = [...resolved, ...unresolved].map(({ instanceId }) => instanceId);
  if (new Set(ids).size !== ids.length) {
    failCalculatedSeries('CALCULATED_SERIES_ID_DUPLICATE', 'Pane instance ids must be unique.');
  }
  return Object.freeze({
    chartRegions: Object.freeze(regions),
    resolvedInstances: Object.freeze(resolved),
    scaleGroups: Object.freeze(scales),
    unresolvedInstances: Object.freeze(unresolved),
    workspacePaneId: opaqueId(value.workspacePaneId, 'Workspace Pane id'),
  });
}

/** Define a pure host-owned calculated-series placement document with no live owners. */
export function defineCalculatedSeriesWorkspaceDocument(value = {}, { definitions = [] } = {}) {
  exactRecord(value, ['documentRevision', 'schemaVersion', 'sessionId', 'workspacePanes'],
    'CALCULATED_SERIES_DOCUMENT_INVALID', 'Calculated-series Workspace document');
  if (value.schemaVersion !== 1) {
    failCalculatedSeries('CALCULATED_SERIES_DOCUMENT_INVALID', 'Document version or Pane count is invalid.');
  }
  exactArray(
    value.workspacePanes,
    { maximum: CALCULATED_SERIES_LIMITS.maximumWorkspacePanes },
    'CALCULATED_SERIES_DOCUMENT_INVALID',
    'Workspace Panes',
  );
  const index = definitionIndex(definitions);
  const panes = uniqueIds(
    value.workspacePanes.map((pane) => normalizePane(pane, index)),
    'workspacePaneId',
    'Workspace Pane',
  ).sort((left, right) => left.workspacePaneId.localeCompare(right.workspacePaneId));
  const wire = Object.freeze({
    documentRevision: safeInteger(value.documentRevision, 'Document revision', { minimum: 1 }),
    schemaVersion: 1,
    sessionId: opaqueId(value.sessionId, 'Session id'),
    workspacePanes: Object.freeze(panes),
  });
  assertByteCeiling(wire, CALCULATED_SERIES_LIMITS.maximumDocumentBytes, 'Workspace document');
  return new CalculatedSeriesWorkspaceDocumentValue(wire);
}

/** Read a branded Workspace placement document as canonical immutable portable state. */
export function readCalculatedSeriesWorkspaceDocument(candidate) {
  if (!(candidate instanceof CalculatedSeriesWorkspaceDocumentValue)) {
    failCalculatedSeries('CALCULATED_SERIES_DOCUMENT_REQUIRED', 'A branded calculated-series Workspace document is required.');
  }
  return candidate.read();
}

/** Verify every inert unresolved envelope against its retained canonical digest. */
export async function verifyCalculatedSeriesUnresolvedIntegrity(
  document,
  { digestCanonical } = {},
) {
  const wire = readCalculatedSeriesWorkspaceDocument(document);
  if (typeof digestCanonical !== 'function') {
    failCalculatedSeries('CALCULATED_SERIES_UNRESOLVED_DIGEST_PORT_REQUIRED', 'Unresolved verification requires a pure digest port.');
  }
  const verifiedInstanceIds = [];
  for (const pane of wire.workspacePanes) {
    for (const instance of pane.unresolvedInstances) {
      const actualDigest = await digestCanonical(instance.originalWire);
      if (actualDigest !== instance.originalDigest) {
        failCalculatedSeries('CALCULATED_SERIES_UNRESOLVED_DIGEST_MISMATCH', 'Unresolved original wire differs from its digest.');
      }
      verifiedInstanceIds.push(instance.instanceId);
    }
  }
  return Object.freeze({
    status: 'verified',
    verifiedInstanceIds: Object.freeze(verifiedInstanceIds.sort()),
  });
}
