import {
  defineLocalPluginPackageManifest,
  readLocalPluginPackageManifest,
} from '../../../src/plugin-contract/public.js';
import { fail } from '../domain/diagnostic.js';

const CODE_MAP = Object.freeze({
  PLUGIN_LOCAL_PACKAGE_CONTRIBUTION_UNAVAILABLE: 'V7DK_CONTRIBUTION_UNAVAILABLE',
  PLUGIN_LOCAL_PACKAGE_EXECUTION_UNAVAILABLE: 'V7DK_EXECUTION_UNAVAILABLE',
  PLUGIN_LOCAL_PACKAGE_IDENTITY_FORGED: 'V7DK_DISTRIBUTION_UNAUTHORIZED',
  PLUGIN_LOCAL_PACKAGE_PERMISSION_UNAUTHORIZED: 'V7DK_PERMISSION_UNSUPPORTED',
  PLUGIN_LOCAL_PACKAGE_PROFILE_UNSUPPORTED: 'V7DK_PROFILE_UNSUPPORTED',
  PLUGIN_LOCAL_PACKAGE_SETTINGS_INVALID: 'V7DK_MANIFEST_INVALID',
});

/** Reuse the production pure Manifest V2 reader without importing package payload. */
export function readLocalProfileManifest(value, logicalPath = 'v7-package.json') {
  try {
    return Object.freeze({
      graph: Object.freeze({ packageOrder: Object.freeze([]), providers: Object.freeze([]) }),
      manifest: readLocalPluginPackageManifest(defineLocalPluginPackageManifest(value)),
    });
  } catch (error) {
    const sourceCode = error?.code ?? '';
    fail(
      'candidate',
      CODE_MAP[sourceCode] ?? (sourceCode.includes('MIGRATION')
        ? 'V7DK_MIGRATION_INVALID' : 'V7DK_MANIFEST_INVALID'),
      'manifest',
      'Plugin manifest does not satisfy the local declarative Manifest V2 contract.',
      { logicalPath, related: sourceCode ? [{ sourceCode }] : [] },
    );
  }
}
