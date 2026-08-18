import { defineCalculatedSeriesWorkspaceDocument } from '../calculated-series-contract/public.js';
import { digestCalculatedSeriesValue } from './canonical-digest.js';
import { emptyCalculatedSeriesDocument } from './document-topology.js';

function portableClone(value) { return JSON.parse(JSON.stringify(value)); }

function unresolvedFrom(instance, registration, originalDigest, reasonCode) {
  return {
    displayMetadata: {
      displayName: registration?.display?.definitionName ?? 'Unavailable indicator',
      packageDisplayName: registration?.display?.packageName ?? instance.definitionRef?.packageId
        ?? 'Unavailable package',
    },
    instanceId: instance.instanceId,
    lastKnownDefinitionRef: instance.definitionRef ?? null,
    originalDigest,
    originalWire: instance,
    reasonCode,
  };
}

function plausiblePayload(value, sessionId) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.schemaVersion === 1 && value.sessionId === sessionId
    && Number.isSafeInteger(value.documentRevision) && value.documentRevision >= 1
    && Array.isArray(value.workspacePanes);
}

async function convertUnavailable(payload, catalog, cryptoPort) {
  const wire = portableClone(payload);
  let changed = false;
  for (const pane of wire.workspacePanes) {
    if (!Array.isArray(pane.resolvedInstances) || !Array.isArray(pane.unresolvedInstances)) continue;
    const retained = [];
    for (const instance of pane.resolvedInstances) {
      const registration = instance?.definitionRef ? catalog.resolve(instance.definitionRef) : null;
      if (registration !== null) {
        retained.push(instance);
        continue;
      }
      pane.unresolvedInstances.push(unresolvedFrom(
        instance,
        registration,
        await digestCalculatedSeriesValue(instance, cryptoPort),
        'CALCULATED_SERIES_DEFINITION_UNKNOWN',
      ));
      changed = true;
    }
    pane.resolvedInstances = retained;
  }
  if (changed) wire.documentRevision += 1;
  return Object.freeze({ changed, wire });
}

async function restoreResolvable(wire, catalog, cryptoPort) {
  let changed = false;
  for (const pane of wire.workspacePanes) {
    const retained = [];
    for (const unresolved of pane.unresolvedInstances) {
      const registration = unresolved.lastKnownDefinitionRef
        ? catalog.resolve(unresolved.lastKnownDefinitionRef) : null;
      if (registration === null) {
        retained.push(unresolved);
        continue;
      }
      const actual = await digestCalculatedSeriesValue(unresolved.originalWire, cryptoPort);
      if (actual !== unresolved.originalDigest) {
        retained.push({ ...unresolved, reasonCode: 'CALCULATED_SERIES_UNRESOLVED_DIGEST_MISMATCH' });
        continue;
      }
      pane.resolvedInstances.push(portableClone(unresolved.originalWire));
      changed = true;
    }
    pane.unresolvedInstances = retained;
  }
  if (changed) wire.documentRevision += 1;
  return changed;
}

/** Restore exact state, preserving unavailable registrations as inert unresolved envelopes. */
export async function restoreCalculatedSeriesDocument({
  catalog,
  cryptoPort,
  payload,
  sessionId,
}) {
  if (payload === null) {
    const wire = emptyCalculatedSeriesDocument(sessionId);
    return Object.freeze({
      changed: false,
      diagnostic: null,
      document: defineCalculatedSeriesWorkspaceDocument(wire, { definitions: catalog.definitions }),
    });
  }
  if (!plausiblePayload(payload, sessionId)) {
    return Object.freeze({
      changed: false,
      diagnostic: Object.freeze({
        code: 'CALCULATED_SERIES_PERSISTENCE_DOCUMENT_INVALID',
        message: 'Persisted calculated-series document is structurally invalid.',
      }),
      document: defineCalculatedSeriesWorkspaceDocument(
        emptyCalculatedSeriesDocument(sessionId), { definitions: catalog.definitions },
      ),
    });
  }
  try {
    const converted = await convertUnavailable(payload, catalog, cryptoPort);
    const wire = portableClone(converted.wire);
    const resolved = await restoreResolvable(wire, catalog, cryptoPort);
    const document = defineCalculatedSeriesWorkspaceDocument(wire, {
      definitions: catalog.definitions,
    });
    return Object.freeze({ changed: converted.changed || resolved, diagnostic: null, document });
  } catch (error) {
    return Object.freeze({
      changed: false,
      diagnostic: Object.freeze({
        code: error?.code ?? 'CALCULATED_SERIES_PERSISTENCE_DOCUMENT_INVALID',
        message: error?.message ?? 'Persisted calculated-series document could not be restored.',
      }),
      document: defineCalculatedSeriesWorkspaceDocument(
        emptyCalculatedSeriesDocument(sessionId), { definitions: catalog.definitions },
      ),
    });
  }
}
