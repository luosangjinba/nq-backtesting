import {
  inspectLocalPluginPackageArchive,
  inspectLocalPluginPackageEntries,
  MAX_LOCAL_PLUGIN_ARCHIVE_BYTES,
  packLocalPluginPackageEntries,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
} from '../plugin-contract/public.js';
import { failLocalPluginPackageBrowser } from './local-package-browser-error.js';
import { snapshotLocalPluginPackageDirectory } from './local-package-directory-snapshot.js';
import { PLUGIN_PACKAGE_BROWSER_RELEASE } from './plugin-package-release-identity.js';

const MODE_KEY = 'v7.plugin-center:developer-mode';

function cancellation(error) {
  return error?.name === 'AbortError';
}

async function defaultArchivePicker() {
  if (typeof globalThis.showOpenFilePicker !== 'function') {
    failLocalPluginPackageBrowser('V7DK_PICKER_UNAVAILABLE', 'This browser cannot open local package files.');
  }
  try {
    const handles = await globalThis.showOpenFilePicker({
      excludeAcceptAllOption: true,
      multiple: false,
      types: [{
        accept: { 'application/vnd.replay-lab.v7-plugin+tar': ['.v7plugin'] },
        description: 'V7 local plugin package',
      }],
    });
    return handles[0] ?? null;
  } catch (error) {
    if (cancellation(error)) return null;
    throw error;
  }
}

async function defaultDirectoryPicker() {
  if (typeof globalThis.showDirectoryPicker !== 'function') {
    failLocalPluginPackageBrowser('V7DK_PICKER_UNAVAILABLE', 'This browser cannot retain a candidate directory for Reload.');
  }
  try { return await globalThis.showDirectoryPicker({ id: 'v7-plugin-candidate', mode: 'read' }); } catch (error) {
    if (cancellation(error)) return null;
    throw error;
  }
}

async function defaultArchiveSaver({ bytes, suggestedName }) {
  if (typeof globalThis.showSaveFilePicker !== 'function') {
    failLocalPluginPackageBrowser('V7DK_PICKER_UNAVAILABLE', 'This browser cannot save a packed local package.');
  }
  let handle;
  try {
    handle = await globalThis.showSaveFilePicker({
      excludeAcceptAllOption: true,
      suggestedName,
      types: [{
        accept: { 'application/vnd.replay-lab.v7-plugin+tar': ['.v7plugin'] },
        description: 'V7 local plugin package',
      }],
    });
  } catch (error) {
    if (cancellation(error)) return false;
    throw error;
  }
  const writable = await handle.createWritable();
  try { await writable.write(bytes); await writable.close(); } catch (error) {
    await writable.abort?.();
    throw error;
  }
  return true;
}

function preferencePort(storage) {
  return Object.freeze({
    read() {
      try { return storage?.getItem(MODE_KEY) === 'enabled'; } catch { return false; }
    },
    write(enabled) {
      try {
        if (enabled) storage?.setItem(MODE_KEY, 'enabled');
        else storage?.removeItem(MODE_KEY);
      } catch {
        failLocalPluginPackageBrowser(
          'V7DK_DEVELOPER_PREFERENCE_UNAVAILABLE',
          'Developer Mode preference could not be stored on this device.',
        );
      }
    },
  });
}

function requireArchiveHandle(handle) {
  if (!handle || handle.kind !== 'file' || handle.isSymbolicLink === true
    || typeof handle.getFile !== 'function') {
    failLocalPluginPackageBrowser(
      'V7DK_PACKAGE_PATH_INVALID',
      'Install from file requires one regular .v7plugin file.',
    );
  }
}

async function readArchive(handle) {
  requireArchiveHandle(handle);
  const file = await handle.getFile();
  if (!file.name.endsWith('.v7plugin')) {
    failLocalPluginPackageBrowser(
      'V7DK_PACKAGE_FORMAT_MISMATCH',
      'Install from file accepts only the .v7plugin suffix.',
    );
  }
  if (file.size > MAX_LOCAL_PLUGIN_ARCHIVE_BYTES) {
    failLocalPluginPackageBrowser('V7DK_RESOURCE_LIMIT', 'Local package archive exceeds its byte bound.');
  }
  return new Uint8Array(await file.arrayBuffer());
}

function publicGeneration(inspected) {
  const candidate = readLocalPluginPackageCandidatePlan(inspected.candidate);
  const manifest = readLocalPluginPackageManifest(inspected.manifest);
  return Object.freeze({
    activated: false,
    display: manifest.display,
    loadedDirectoryName: inspected.directoryName,
    packageId: candidate.packageId,
    packageVersion: candidate.packageVersion,
    productionExecutionAuthorized: false,
    publisher: candidate.publisher,
    publisherTrusted: false,
    snapshotDigest: inspected.summary.snapshotDigest,
    source: candidate.source,
    state: 'developer-inactive',
  });
}

/** Own explicit browser picker handles and session-scoped inactive Developer Mode generations. */
export function createLocalPluginPackageBrowserAdapter({
  cryptoPort = globalThis.crypto,
  deviceStorage = globalThis.localStorage,
  pickArchive = defaultArchivePicker,
  pickDirectory = defaultDirectoryPicker,
  release = PLUGIN_PACKAGE_BROWSER_RELEASE,
  saveArchive = defaultArchiveSaver,
} = {}) {
  if (typeof pickArchive !== 'function' || typeof pickDirectory !== 'function'
    || typeof saveArchive !== 'function' || !cryptoPort?.subtle) {
    throw new TypeError('Local package browser adapter ports are invalid.');
  }
  const preferences = preferencePort(deviceStorage);
  const generations = new Map();
  const listeners = new Set();
  let busy = false;
  let diagnostics = Object.freeze([]);
  let disposed = false;
  let enabled = preferences.read();
  let epoch = 0;

  function snapshot() {
    if (disposed) {
      failLocalPluginPackageBrowser('V7DK_DEVELOPER_MODE_DISABLED', 'Developer Mode adapter is disposed.');
    }
    return Object.freeze({
      busy,
      deviceLocal: true,
      diagnostics,
      enabled,
      generations: Object.freeze([...generations.values()].map(({ inspected }) => (
        publicGeneration(inspected)
      )).sort((left, right) => left.packageId.localeCompare(right.packageId))),
      productionExecutionAuthorized: false,
      synchronized: false,
      watched: false,
    });
  }

  function publish() {
    const value = snapshot();
    for (const listener of listeners) {
      try { listener(value); } catch { listeners.delete(listener); }
    }
    return value;
  }

  function diagnostic(error) {
    return Object.freeze({
      code: typeof error?.code === 'string' ? error.code : 'V7DK_DEVELOPER_DIRECTORY_INVALID',
      message: error?.message ?? 'Developer Mode operation failed.',
    });
  }

  function requireEnabled() {
    if (!enabled || disposed) {
      failLocalPluginPackageBrowser('V7DK_DEVELOPER_MODE_DISABLED', 'Enable Developer Mode explicitly first.');
    }
  }

  async function exclusive(action) {
    requireEnabled();
    if (busy) {
      failLocalPluginPackageBrowser('V7DK_TRANSACTION_CONCURRENT', 'Another Developer Mode read is unsettled.');
    }
    const operationEpoch = epoch;
    busy = true; diagnostics = Object.freeze([]); publish();
    const isCurrent = () => !disposed && enabled && epoch === operationEpoch;
    try { return await action(isCurrent); } catch (error) {
      if (isCurrent()) diagnostics = Object.freeze([diagnostic(error)]);
      throw error;
    } finally {
      if (isCurrent()) { busy = false; publish(); }
    }
  }

  async function inspectDirectory(handle, isCurrent) {
    const entries = await snapshotLocalPluginPackageDirectory(handle, { isCurrent });
    const inspected = await inspectLocalPluginPackageEntries(entries, { cryptoPort, release });
    if (!isCurrent()) requireEnabled();
    return Object.freeze({ ...inspected, directoryName: handle.name });
  }

  return Object.freeze({
    dispose() {
      if (disposed) return;
      epoch += 1; busy = false; disposed = true; generations.clear(); listeners.clear();
    },
    async inspectArchiveSelection() {
      if (disposed) failLocalPluginPackageBrowser('V7DK_DEVELOPER_MODE_DISABLED', 'Package browser adapter is disposed.');
      const handle = await pickArchive();
      if (handle === null) return null;
      const archiveBytes = await readArchive(handle);
      return inspectLocalPluginPackageArchive(archiveBytes, { cryptoPort, release });
    },
    async loadUnpacked() {
      return exclusive(async (isCurrent) => {
        const handle = await pickDirectory();
        if (handle === null) return null;
        const inspected = await inspectDirectory(handle, isCurrent);
        const packageId = readLocalPluginPackageCandidatePlan(inspected.candidate).packageId;
        generations.set(packageId, Object.freeze({ handle, inspected }));
        return publicGeneration(inspected);
      });
    },
    async reload(packageId) {
      return exclusive(async (isCurrent) => {
        const current = generations.get(packageId);
        if (!current) {
          failLocalPluginPackageBrowser('V7DK_DEVELOPER_DIRECTORY_INVALID', 'Selected development generation is absent.');
        }
        const inspected = await inspectDirectory(current.handle, isCurrent);
        const nextId = readLocalPluginPackageCandidatePlan(inspected.candidate).packageId;
        if (nextId !== packageId) {
          failLocalPluginPackageBrowser('V7DK_DEVELOPER_SNAPSHOT_STALE', 'Reload changed the package identity.');
        }
        generations.set(packageId, Object.freeze({ handle: current.handle, inspected }));
        return publicGeneration(inspected);
      });
    },
    async validatePack(packageId) {
      return exclusive(async (isCurrent) => {
        const current = generations.get(packageId);
        if (!current) {
          failLocalPluginPackageBrowser('V7DK_DEVELOPER_DIRECTORY_INVALID', 'Selected development generation is absent.');
        }
        const inspected = await inspectDirectory(current.handle, isCurrent);
        if (inspected.summary.snapshotDigest !== current.inspected.summary.snapshotDigest) {
          failLocalPluginPackageBrowser(
            'V7DK_DEVELOPER_SNAPSHOT_STALE',
            'Candidate changed after Load/Reload. Reload it before Validate/Pack.',
          );
        }
        const candidate = readLocalPluginPackageCandidatePlan(inspected.candidate);
        const bytes = packLocalPluginPackageEntries(inspected.entries);
        const saved = await saveArchive({
          bytes,
          suggestedName: `${candidate.packageId}-${candidate.packageVersion}.v7plugin`,
        });
        return Object.freeze({ byteLength: bytes.length, saved, snapshotDigest: inspected.summary.snapshotDigest });
      });
    },
    setEnabled(next) {
      if (disposed || typeof next !== 'boolean') {
        failLocalPluginPackageBrowser('V7DK_DEVELOPER_MODE_DISABLED', 'Developer Mode state is invalid.');
      }
      if (enabled === next) return snapshot();
      preferences.write(next);
      enabled = next; epoch += 1; busy = false; diagnostics = Object.freeze([]);
      if (!enabled) generations.clear();
      return publish();
    },
    snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Developer Mode listener is invalid.');
      listeners.add(listener);
      try { listener(snapshot()); } catch (error) { listeners.delete(listener); throw error; }
      return Object.freeze({ unsubscribe: () => listeners.delete(listener) });
    },
    unload(packageId) {
      requireEnabled();
      if (busy) {
        failLocalPluginPackageBrowser('V7DK_TRANSACTION_CONCURRENT', 'Another Developer Mode read is unsettled.');
      }
      generations.delete(packageId);
      return publish();
    },
  });
}
