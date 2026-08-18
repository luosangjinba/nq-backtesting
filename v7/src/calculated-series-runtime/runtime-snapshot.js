import { readCalculatedSeriesWorkspaceDocument } from '../calculated-series-contract/public.js';
import { resolveCalculatedSeriesInstanceSettings } from './settings-resolution.js';
import { readRuntimeProfileSnapshot } from './runtime-state.js';

function latestValue(cache, displayEpochMs = null) {
  if (!cache || cache.state !== 'ready') return null;
  const points = cache.plotGroups.flatMap(({ plots }) => plots.flatMap((plot) => plot.points));
  const point = displayEpochMs === null
    ? [...points].reverse().find(({ state }) => state === 'value')
    : points.find((entry) => entry.displayEpochMs === displayEpochMs);
  return point?.state === 'value' ? point.value : null;
}

function instanceView(instance, registration, profileSnapshot, cache, displayEpochMs = null) {
  const normalized = resolveCalculatedSeriesInstanceSettings({
    instance, profileSnapshot, registration,
  });
  const inherited = resolveCalculatedSeriesInstanceSettings({
    instance: { ...instance, parameterOverrides: Object.freeze({}) },
    profileSnapshot,
    registration,
  });
  const placement = instance.plotGroupPlacements[0];
  const legendSuffix = registration.legendLabelFields
    .map((fieldId) => normalized.effectiveValues[fieldId])
    .filter((value) => value !== undefined)
    .join(' ');
  return Object.freeze({
    calculation: cache === null || cache === undefined ? null : Object.freeze({
      diagnostics: cache.diagnostics,
      provenance: cache.provenance,
      resourceUsage: cache.resourceUsage,
      state: cache.state,
    }),
    definitionRef: instance.definitionRef,
    displayName: registration.display.definitionName,
    effectiveSettings: normalized.effectiveValues,
    inheritedSettings: inherited.effectiveValues,
    inheritedSettingSources: inherited.sources,
    instanceId: instance.instanceId,
    instanceRevision: instance.instanceRevision,
    instanceValues: Object.freeze({ ...instance.parameterOverrides }),
    legendLabel: `${registration.display.shortName}${legendSuffix ? ` ${legendSuffix}` : ''}`,
    latestValue: latestValue(cache, displayEpochMs),
    placement: placement.regionId === 'region-main' ? 'main' : 'own-region',
    regionId: placement.regionId,
    shortName: registration.display.shortName,
    settingSources: normalized.sources,
    state: instance.visibility === 'hidden' ? 'hidden' : cache?.state ?? 'pending',
    visibility: instance.visibility,
  });
}

function paneView(state, pane, displayTimes, profileSnapshot) {
  const context = state.paneContexts.get(pane.workspacePaneId);
  return Object.freeze({
    instances: Object.freeze(pane.resolvedInstances.map((instance) => instanceView(
      instance,
      state.catalog.resolve(instance.definitionRef),
      profileSnapshot,
      context?.caches.get(instance.instanceId) ?? null,
      displayTimes.get(pane.workspacePaneId) ?? null,
    ))),
    unresolvedInstances: Object.freeze(pane.unresolvedInstances.map((instance) => Object.freeze({
      displayName: instance.displayMetadata.displayName,
      instanceId: instance.instanceId,
      instanceRevision: instance.originalWire?.instanceRevision ?? null,
      packageName: instance.displayMetadata.packageDisplayName,
      reasonCode: instance.reasonCode,
      state: 'unresolved',
    }))),
    workspacePaneId: pane.workspacePaneId,
  });
}

/** Expose immutable UI/readback state and one synchronous publication channel. */
export function createCalculatedSeriesRuntimePublication(state) {
  function snapshot(displayTimes = new Map()) {
    const wire = state.acceptedDocument === null ? null
      : readCalculatedSeriesWorkspaceDocument(state.acceptedDocument);
    const profileSnapshot = readRuntimeProfileSnapshot(state);
    return Object.freeze({
      busy: state.busy,
      calculationCount: state.calculationCount,
      catalog: Object.freeze(state.catalog.list().map((registration) => Object.freeze({
        definitionRef: registration.reference,
        displayName: registration.display.definitionName,
        packageName: registration.display.packageName,
        packageVersion: registration.reference.packageVersion,
        parameterSchema: registration.parameterSchema,
        shortName: registration.display.shortName,
        source: 'Core · first-party',
      }))),
      diagnostic: state.diagnostic,
      documentRevision: wire?.documentRevision ?? null,
      panes: Object.freeze((wire?.workspacePanes ?? []).map((pane) => (
        paneView(state, pane, displayTimes, profileSnapshot)
      ))),
      sessionId: state.scope.sessionToken,
      status: state.status,
    });
  }

  function publish() {
    const value = snapshot();
    for (const listener of state.listeners) listener(value);
    return value;
  }

  return Object.freeze({ publish, snapshot });
}
