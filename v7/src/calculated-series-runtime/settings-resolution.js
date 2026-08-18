import { failCalculatedSeriesRuntime } from './runtime-error.js';

function lowerLayers(profileSnapshot, registration) {
  const plugin = profileSnapshot?.packages?.find(({ packageId }) => (
    packageId === registration.reference.packageId
  ));
  const setting = plugin?.settings?.find(({ contributionId }) => (
    contributionId === registration.reference.contributionId
  ));
  return Object.freeze({
    packageValues: setting?.packageValues ?? Object.freeze({}),
    profileValues: setting?.profileValues ?? Object.freeze({}),
  });
}

/** Resolve lower P0b layers plus the portable instance override record. */
export function resolveCalculatedSeriesInstanceSettings({
  instance,
  profileSnapshot,
  registration,
}) {
  if (!instance || !registration) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_SETTINGS_INVALID',
      'Instance settings require a resolved trusted registration.',
    );
  }
  const lower = lowerLayers(profileSnapshot, registration);
  let normalized;
  try {
    normalized = registration.normalizeSettings({
      ...lower,
      instanceValues: instance.parameterOverrides,
    });
  } catch (cause) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_SETTINGS_INVALID',
      'Calculated-series settings could not be normalized.',
      { cause },
    );
  }
  if (!normalized || !Object.isFrozen(normalized)
    || !Object.isFrozen(normalized.parameters)
    || !Array.isArray(normalized.styleOverrides)
    || !['visible', 'hidden'].includes(normalized.visibility)) {
    failCalculatedSeriesRuntime(
      'CALCULATED_SERIES_RUNTIME_SETTINGS_NORMALIZER_INVALID',
      'Trusted settings normalizer returned an invalid result.',
    );
  }
  return normalized;
}

/** Reconcile durable presentation fields with the active restart-bound Profile generation. */
export function reconcileCalculatedSeriesDocumentSettings({ catalog, profileSnapshot, wire }) {
  let changed = false;
  for (const pane of wire.workspacePanes) {
    for (const instance of pane.resolvedInstances) {
      const registration = catalog.resolve(instance.definitionRef);
      if (registration === null) continue;
      const normalized = resolveCalculatedSeriesInstanceSettings({
        instance, profileSnapshot, registration,
      });
      if (JSON.stringify(instance.styleOverrides) === JSON.stringify(normalized.styleOverrides)
        && instance.visibility === normalized.visibility) continue;
      instance.styleOverrides = structuredClone(normalized.styleOverrides);
      instance.visibility = normalized.visibility;
      instance.instanceRevision += 1;
      changed = true;
    }
  }
  if (changed) wire.documentRevision += 1;
  return changed;
}
