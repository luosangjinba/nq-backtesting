export const DEVELOPER_KIT_VERSION = '1.0.0';
export const SDK_VERSION = '1.0.0';
export const HOST_API_VERSION = '1.0.0';
export const CONTRACT_PROFILE = 'trusted-built-in-core-v1';
export const LOCAL_CONTRACT_PROFILE = 'local-declarative-package-v1';
export const OPERATION_VERSION = 1;
export const LOCAL_OPERATION_VERSION = 2;
export const SDK_SPECIFIER = '@replay-lab/v7-plugin-sdk';
export const TEMPLATE_ID = 'trusted-fvg-v1';
export const LOCAL_TEMPLATE_ID = 'local-lifecycle-v1';

export const CONTRACT_PROFILES = Object.freeze([CONTRACT_PROFILE, LOCAL_CONTRACT_PROFILE]);
export const TEMPLATE_IDS = Object.freeze([TEMPLATE_ID, LOCAL_TEMPLATE_ID]);

export const OPERATIONS = Object.freeze([
  'discover',
  'scaffold',
  'validate',
  'build',
  'test',
  'preview',
  'pack',
  'inspect',
]);

export const LIMITS = Object.freeze({
  archiveEntries: 512,
  archiveEntryBytes: 2 * 1024 * 1024,
  archiveUnpackedBytes: 8 * 1024 * 1024,
  candidateMemoryMiB: 64,
  candidateOutputBytes: 512 * 1024,
  candidateTaskCount: 1,
  candidateWallTimeMs: 2_000,
  fixtureCases: 64,
  sourceFiles: 128,
  workspaceBytes: 4 * 1024 * 1024,
  workspaceFileBytes: 1024 * 1024,
  workspaceFiles: 256,
});

export const LOCAL_ARCHIVE = Object.freeze({
  format: 'ustar',
  mediaType: 'application/vnd.replay-lab.v7-plugin+tar',
  suffix: '.v7plugin',
  version: 1,
});

export const DETERMINISM = Object.freeze({
  clockEpochMs: 1_700_000_000_000,
  locale: 'en-US',
  seed: 7_011_337,
  timezone: 'UTC',
});

export const EXIT = Object.freeze({
  blocked: 3,
  candidate: 1,
  internal: 4,
  passed: 0,
  request: 2,
});
