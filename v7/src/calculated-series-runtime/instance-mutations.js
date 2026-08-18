import { calculatedSeriesDefinitionRef, readCalculatedSeriesDefinition } from '../calculated-series-contract/public.js';
import { ensurePane, removeEmptyInternalRegions } from './document-topology.js';
import { failCalculatedSeriesRuntime } from './runtime-error.js';
import { resolveCalculatedSeriesInstanceSettings } from './settings-resolution.js';

const COMMANDS = new Set([
  'add-instance', 'apply-instance-settings', 'set-instance-visibility',
  'move-plot-group-to-main', 'move-plot-group-to-new-region', 'remove-instance',
]);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const COMMAND_FIELDS = Object.freeze({
  'add-instance': ['definitionRef', 'expectedDocumentRevision', 'instanceValues', 'kind', 'workspacePaneId'],
  'apply-instance-settings': [
    'expectedDocumentRevision', 'expectedInstanceRevision', 'instanceId',
    'instanceValues', 'kind', 'workspacePaneId',
  ],
  'set-instance-visibility': [
    'expectedDocumentRevision', 'expectedInstanceRevision', 'instanceId',
    'kind', 'visible', 'workspacePaneId',
  ],
  'move-plot-group-to-main': [
    'expectedDocumentRevision', 'expectedInstanceRevision', 'instanceId', 'kind', 'workspacePaneId',
  ],
  'move-plot-group-to-new-region': [
    'expectedDocumentRevision', 'expectedInstanceRevision', 'instanceId', 'kind', 'workspacePaneId',
  ],
  'remove-instance': [
    'expectedDocumentRevision', 'expectedInstanceRevision', 'instanceId', 'kind', 'workspacePaneId',
  ],
});

export function requireCalculatedSeriesCommand(command) {
  if (!command || typeof command !== 'object' || !COMMANDS.has(command.kind)
    || Object.keys(command).sort().join(',') !== [...COMMAND_FIELDS[command.kind]].sort().join(',')
    || typeof command.workspacePaneId !== 'string' || !ID.test(command.workspacePaneId)
    || !Number.isSafeInteger(command.expectedDocumentRevision)
    || command.expectedDocumentRevision < 1
    || (command.kind !== 'add-instance'
      && (!ID.test(command.instanceId) || !Number.isSafeInteger(command.expectedInstanceRevision)
        || command.expectedInstanceRevision < 1))
    || (['add-instance', 'apply-instance-settings'].includes(command.kind)
      && (!command.instanceValues || typeof command.instanceValues !== 'object'
        || Array.isArray(command.instanceValues)))
    || (command.kind === 'set-instance-visibility' && typeof command.visible !== 'boolean')) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_COMMAND_INVALID',
      'Calculated-series command shape is invalid.',
    );
  }
  return command;
}

function instanceFor(pane, command) {
  const instance = pane.resolvedInstances.find(({ instanceId }) => instanceId === command.instanceId);
  if (!instance) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_INSTANCE_UNKNOWN',
      'Calculated-series instance is unavailable in this Pane.',
    );
  }
  if (instance.instanceRevision !== command.expectedInstanceRevision) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_INSTANCE_STALE',
      'Calculated-series instance revision is stale.',
    );
  }
  return instance;
}

function unresolvedFor(pane, command) {
  return pane.unresolvedInstances.find(({ instanceId }) => instanceId === command.instanceId) ?? null;
}

function placementFor(plotGroupId, regionId, scaleGroupId) {
  return [{ order: 0, plotGroupId, regionId, scaleGroupId }];
}

function normalizedInstance(instance, registration, profileSnapshot) {
  const normalized = resolveCalculatedSeriesInstanceSettings({ instance, profileSnapshot, registration });
  instance.styleOverrides = structuredClone(normalized.styleOverrides);
  instance.visibility = normalized.visibility;
  return normalized;
}

function addInstance({ command, idFactory, pane, profileSnapshot, registration }) {
  const definition = readCalculatedSeriesDefinition(registration.definition);
  const matching = pane.resolvedInstances.filter(({ definitionRef }) => (
    JSON.stringify(definitionRef) === JSON.stringify(registration.reference)
  ));
  if (matching.length >= registration.instanceLimitPerPane) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_INSTANCE_LIMIT',
      'This Pane reached the selected Definition instance ceiling.',
    );
  }
  const instance = {
    definitionRef: calculatedSeriesDefinitionRef(registration.definition),
    instanceId: idFactory(),
    instanceRevision: 1,
    parameterOverrides: structuredClone(command.instanceValues ?? {}),
    plotGroupPlacements: placementFor(
      definition.plotGroups[0].plotGroupId,
      'region-main',
      'scale-price-main',
    ),
    styleOverrides: [],
    visibility: 'visible',
  };
  normalizedInstance(instance, registration, profileSnapshot);
  pane.resolvedInstances.push(instance);
  return { instance, recalculate: true, definition };
}

function updateSettings({ command, instance, profileSnapshot, registration }) {
  const previous = resolveCalculatedSeriesInstanceSettings({ instance, profileSnapshot, registration });
  instance.parameterOverrides = structuredClone(command.instanceValues ?? {});
  instance.instanceRevision += 1;
  const next = normalizedInstance(instance, registration, profileSnapshot);
  return {
    instance,
    recalculate: JSON.stringify(previous.parameters) !== JSON.stringify(next.parameters),
  };
}

function setVisibility({ command, instance, profileSnapshot, registration }) {
  instance.parameterOverrides = {
    ...instance.parameterOverrides,
    [registration.visibilityFieldId]: command.visible === true,
  };
  instance.instanceRevision += 1;
  normalizedInstance(instance, registration, profileSnapshot);
  return { instance, recalculate: false };
}

function moveToRegion({ instance, pane }) {
  const regionId = `region-${instance.instanceId}`;
  const scaleGroupId = `scale-${instance.instanceId}`;
  if (!pane.chartRegions.some((region) => region.regionId === regionId)) {
    pane.chartRegions.push({
      collapsed: false, heightWeight: 30, kind: 'calculated-series',
      order: pane.chartRegions.length, regionId,
    });
    const mainScale = pane.scaleGroups.find(({ scaleGroupId: id }) => id === 'scale-price-main');
    pane.scaleGroups.push({ ...structuredClone(mainScale), regionId, scaleGroupId });
  }
  instance.plotGroupPlacements = instance.plotGroupPlacements.map((placement) => ({
    ...placement, regionId, scaleGroupId,
  }));
  instance.instanceRevision += 1;
  removeEmptyInternalRegions(pane);
  return { instance, recalculate: false };
}

function moveToMain(instance, pane) {
  instance.plotGroupPlacements = instance.plotGroupPlacements.map((placement) => ({
    ...placement, regionId: 'region-main', scaleGroupId: 'scale-price-main',
  }));
  instance.instanceRevision += 1;
  removeEmptyInternalRegions(pane);
  return { instance, recalculate: false };
}

/** Apply one exact command to a mutable candidate wire without publishing it. */
export function mutateCalculatedSeriesDocument({
  command: rawCommand,
  idFactory,
  profileSnapshot,
  registration,
  wire,
}) {
  const command = requireCalculatedSeriesCommand(rawCommand);
  if (wire.documentRevision !== command.expectedDocumentRevision) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_DOCUMENT_STALE',
      'Calculated-series document revision is stale.',
    );
  }
  const definition = registration === null ? null : readCalculatedSeriesDefinition(registration.definition);
  const existingPane = wire.workspacePanes.find(({ workspacePaneId }) => (
    workspacePaneId === command.workspacePaneId
  ));
  if (definition === null && existingPane === undefined) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_INSTANCE_UNKNOWN',
      'Calculated-series instance is unavailable in this Pane.',
    );
  }
  const pane = definition === null ? existingPane
    : ensurePane(wire, command.workspacePaneId, definition.plotGroups[0].scaleIntent);
  let result;
  if (command.kind === 'add-instance') {
    result = addInstance({ command, idFactory, pane, profileSnapshot, registration });
  } else {
    const unresolved = command.kind === 'remove-instance' ? unresolvedFor(pane, command) : null;
    if (unresolved !== null
      && unresolved.originalWire?.instanceRevision !== command.expectedInstanceRevision) {
      failCalculatedSeriesRuntime(
        'CALCULATED_SERIES_RUNTIME_INSTANCE_STALE',
        'Calculated-series unresolved instance revision is stale.',
      );
    }
    const instance = unresolved?.originalWire ?? instanceFor(pane, command);
    if (command.kind === 'apply-instance-settings') {
      result = updateSettings({ command, instance, profileSnapshot, registration });
    } else if (command.kind === 'set-instance-visibility') {
      result = setVisibility({ command, instance, profileSnapshot, registration });
    } else if (command.kind === 'move-plot-group-to-new-region') {
      result = moveToRegion({ instance, pane });
    } else if (command.kind === 'move-plot-group-to-main') {
      result = moveToMain(instance, pane);
    } else {
      if (unresolved !== null) {
        pane.unresolvedInstances = pane.unresolvedInstances
          .filter(({ instanceId }) => instanceId !== unresolved.instanceId);
      } else {
        pane.resolvedInstances = pane.resolvedInstances
          .filter(({ instanceId }) => instanceId !== instance.instanceId);
      }
      removeEmptyInternalRegions(pane);
      result = { instance, recalculate: false, removed: true, unresolved: unresolved !== null };
    }
  }
  wire.documentRevision += 1;
  return Object.freeze({ ...result, paneId: command.workspacePaneId });
}
