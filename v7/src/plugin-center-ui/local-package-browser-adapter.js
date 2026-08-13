import {
  inspectLocalPluginPackageArchive,
  MAX_LOCAL_PLUGIN_ARCHIVE_BYTES,
} from '../plugin-contract/public.js';
import { failLocalPluginPackageBrowser } from './local-package-browser-error.js';
import { PLUGIN_PACKAGE_BROWSER_RELEASE } from './plugin-package-release-identity.js';

const REMOVED_DEVELOPER_PORTS = Object.freeze([
  'deviceStorage', 'pickDirectory', 'saveArchive',
]);

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
  if (!file || typeof file.name !== 'string' || typeof file.arrayBuffer !== 'function'
    || !Number.isSafeInteger(file.size) || file.size < 0) {
    failLocalPluginPackageBrowser(
      'V7DK_PACKAGE_PATH_INVALID',
      'Install from file could not read a regular local package file.',
    );
  }
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

function rejectRemovedDeveloperPorts(options) {
  if (REMOVED_DEVELOPER_PORTS.some((name) => Object.hasOwn(options, name))) {
    failLocalPluginPackageBrowser(
      'V7DK_DEVELOPER_MODE_REMOVED',
      'Developer Mode is not a production Plugin Center capability. Use the Developer Kit to inspect prepared candidates.',
    );
  }
}

/** Own one archive picker snapshot; no directory handle, preference, or development generation is retained. */
export function createLocalPluginPackageBrowserAdapter(options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('Local package browser adapter options are invalid.');
  }
  rejectRemovedDeveloperPorts(options);
  const {
    cryptoPort = globalThis.crypto,
    pickArchive = defaultArchivePicker,
    release = PLUGIN_PACKAGE_BROWSER_RELEASE,
  } = options;
  if (typeof pickArchive !== 'function' || !cryptoPort?.subtle) {
    throw new TypeError('Local package browser adapter ports are invalid.');
  }
  let disposed = false;

  return Object.freeze({
    dispose() { disposed = true; },
    async inspectArchiveSelection() {
      if (disposed) {
        failLocalPluginPackageBrowser(
          'V7DK_BROWSER_ADAPTER_DISPOSED',
          'Local package archive picker is disposed.',
        );
      }
      const handle = await pickArchive();
      if (disposed) {
        failLocalPluginPackageBrowser(
          'V7DK_BROWSER_ADAPTER_DISPOSED',
          'Local package archive picker is disposed.',
        );
      }
      if (handle === null) return null;
      const archiveBytes = await readArchive(handle);
      if (disposed) {
        failLocalPluginPackageBrowser(
          'V7DK_BROWSER_ADAPTER_DISPOSED',
          'Local package archive picker is disposed.',
        );
      }
      const inspected = await inspectLocalPluginPackageArchive(archiveBytes, { cryptoPort, release });
      if (disposed) {
        failLocalPluginPackageBrowser(
          'V7DK_BROWSER_ADAPTER_DISPOSED',
          'Local package archive picker is disposed.',
        );
      }
      return inspected;
    },
  });
}
