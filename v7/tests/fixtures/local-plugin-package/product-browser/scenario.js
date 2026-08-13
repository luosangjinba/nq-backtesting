import {
  createLocalPluginPackageBrowserAdapter,
  createPluginCenterWorkspaceControl,
} from '../../../../src/plugin-center-ui/public.js';
import { createIndexedDbPluginPackageStorage } from '../../../../src/plugin-package-storage/public.js';
import { createPluginPackageStoreRuntime } from '../../../../src/plugin-package-store/public.js';

function archiveBytes() {
  const base64 = globalThis.__h117PackageArchiveBase64;
  if (typeof base64 !== 'string' || base64.length < 10) throw new Error('H117 archive injection is missing.');
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function fileHandle(name, bytes) {
  return Object.freeze({
    kind: 'file',
    name,
    async getFile() { return new File([bytes], name); },
  });
}

function profilePort() {
  const value = Object.freeze({
    lastFailure: null,
    packages: Object.freeze([]),
    recoveryCode: null,
    restartRequired: false,
    revision: 0,
  });
  return Object.freeze({
    discardPending() {},
    prepare() { throw new Error('No Core package exists in this focused fixture.'); },
    restartReceipt() { throw new Error('No Core restart exists in this focused fixture.'); },
    snapshot: () => value,
    stage() {},
    subscribe(listener) { listener(value); return Object.freeze({ unsubscribe() {} }); },
    validateRestartReceipt() {},
  });
}

function restrictedSnapshot(current) {
  return Object.freeze({
    diagnostics: Object.freeze([Object.freeze({
      code: 'V7DK_INTEGRITY_MISMATCH',
      message: 'Sanitized fixture mismatch; package bytes remain undisclosed.',
    })]),
    externalContributions: Object.freeze([]),
    installed: Object.freeze([]),
    mode: 'restricted',
    pending: null,
    productionExecutionAuthorized: false,
    quarantined: Object.freeze(current.installed.map(({ generationId }) => ({ generationId }))),
    recoveryToken: 'sha256:fixture-recovery-token',
    revision: current.revision,
    tombstones: Object.freeze([]),
  });
}

function controlledStore(store) {
  const listeners = new Set();
  let failNextCommit = false;
  let restricted = null;
  const subscription = store.subscribe(() => publish());
  function snapshot() { return restricted ?? store.snapshot(); }
  function publish() {
    const value = snapshot();
    for (const listener of listeners) listener(value);
  }
  const port = Object.freeze({
    async commitPrepared(...args) {
      if (failNextCommit) {
        failNextCommit = false;
        const error = new Error('Injected product-surface commit failure.');
        error.code = 'V7DK_STORAGE_COMMIT_FAILED';
        throw error;
      }
      return store.commitPrepared(...args);
    },
    describePreparation: (candidate) => store.describePreparation(candidate),
    exportDiagnostics: () => restricted === null ? store.exportDiagnostics() : Object.freeze({
      diagnostics: restricted.diagnostics,
      mode: restricted.mode,
      packageIdentities: restricted.quarantined,
      productionExecutionAuthorized: false,
      revision: restricted.revision,
    }),
    prepareInstall: (input) => store.prepareInstall(input),
    prepareQuarantine: (input) => store.prepareQuarantine(input),
    prepareRollback: (input) => store.prepareRollback(input),
    prepareSettingsApply: (input) => store.prepareSettingsApply(input),
    prepareSettingsReset: (input) => store.prepareSettingsReset(input),
    prepareUninstall: (input) => store.prepareUninstall(input),
    async removeRestrictedInventory() { restricted = null; publish(); return snapshot(); },
    async retryRecovery() { restricted = null; publish(); return snapshot(); },
    snapshot,
    subscribe(listener) {
      listeners.add(listener); listener(snapshot());
      return Object.freeze({ unsubscribe: () => listeners.delete(listener) });
    },
  });
  return Object.freeze({
    dispose: () => subscription.unsubscribe(),
    failCommit() { failNextCommit = true; },
    forceRestricted() { restricted = restrictedSnapshot(store.snapshot()); publish(); },
    port,
  });
}

function mountManualReviewControls({ controlled, evidence, bytes }) {
  if (new URL(location.href).searchParams.get('manual') !== '1') return;
  const controls = document.createElement('section');
  controls.className = 'fixture-controls';
  controls.setAttribute('aria-label', 'Focused human review controls');
  const heading = document.createElement('h2');
  heading.textContent = 'Review controls';
  const instructions = document.createElement('p');
  instructions.textContent = 'Queue one bounded fixture action, then complete it in the host-rendered Plugin Center below.';
  const feedback = document.createElement('p');
  feedback.className = 'fixture-control-feedback';
  feedback.setAttribute('aria-live', 'polite');
  const actions = [
    ['Queue install archive', () => evidence.archiveSelections.push(fileHandle(
      'community.lifecycle-proof-1.0.0.v7plugin', bytes,
    ))],
    ['Fail next install commit', () => controlled.failCommit()],
    ['Enter Restricted Mode', () => controlled.forceRestricted()],
  ];
  const actionList = document.createElement('div');
  actionList.className = 'fixture-control-actions';
  for (const [label, action] of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      action();
      feedback.textContent = `${label} is ready.`;
    });
    actionList.append(button);
  }
  controls.append(heading, instructions, actionList, feedback);
  document.querySelector('.fixture-heading').after(controls);
}

const evidence = {
  archiveSelections: [],
  status: 'starting',
};
globalThis.__h117PluginCenterEvidence = evidence;

async function run() {
  const bytes = archiveBytes();
  const token = new URL(location.href).searchParams.get('token') ?? crypto.randomUUID();
  const storage = createIndexedDbPluginPackageStorage({
    databaseName: `v7.h117.plugin-center.${token}`,
    indexedDB,
  });
  const store = createPluginPackageStoreRuntime({
    idFactory: () => `transaction-${crypto.randomUUID()}`,
    storage,
  });
  await store.initialize();
  const controlled = controlledStore(store);
  const browser = createLocalPluginPackageBrowserAdapter({
    pickArchive: async () => evidence.archiveSelections.shift() ?? null,
  });
  const control = createPluginCenterWorkspaceControl({
    browser,
    confirmDependencyImpact: () => true,
    confirmPlan: () => true,
    idFactory: () => `command-${crypto.randomUUID()}`,
    onExportDiagnostics: (value) => { evidence.exportedDiagnostics = value; },
    onRestart() {},
    profile: profilePort(),
    store: controlled.port,
  });
  document.querySelector('#plugin-center').replaceChildren(control.root);
  Object.assign(globalThis, {
    __h117FailNextCommit: () => controlled.failCommit(),
    __h117ForceRestricted: () => controlled.forceRestricted(),
    __h117QueueArchive: () => evidence.archiveSelections.push(fileHandle(
      'community.lifecycle-proof-1.0.0.v7plugin', bytes,
    )),
    __h117StoreSnapshot: () => controlled.port.snapshot(),
  });
  mountManualReviewControls({ controlled, evidence, bytes });
  evidence.status = 'ready';
  document.body.dataset.status = 'ready';
}

run().catch((error) => {
  evidence.status = 'error';
  evidence.error = error?.stack ?? String(error);
  document.body.dataset.status = 'error';
});
