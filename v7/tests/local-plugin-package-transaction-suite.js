import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createLocalPluginPackageCandidatePlan,
  defineLocalPluginPackageManifest,
  finalizeLocalPluginPackageManifest,
  readLocalPluginPackageCandidatePlan,
  readLocalPluginPackageManifest,
} from '../src/plugin-contract/public.js';
import {
  createPluginPackageStoreRuntime,
  readPluginPackageStorePreparation,
} from '../src/plugin-package-store/public.js';
import {
  digestPackageStoreBytes,
  digestPackageStoreValue,
} from '../src/plugin-package-store/portable-digest.js';
import { isReplicatedStateKey } from '../src/server-state-sync/snapshot.js';
import { createFakePluginPackageStorage } from './support/fake-plugin-package-storage.js';

const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const V7_ROOT = path.resolve(TEST_ROOT, '..');
const BASE_MANIFEST = JSON.parse(fs.readFileSync(path.join(
  V7_ROOT,
  'sdk/plugin/examples/local-lifecycle-v1/v7-package.json',
), 'utf8'));
const NEGATIVE_CASES = JSON.parse(fs.readFileSync(path.join(
  TEST_ROOT,
  'fixtures/local-plugin-package/transaction-negative/cases.json',
), 'utf8'));
const RECEIPTS = [1, 2, 3].map((value) => `sha256:${String(value).repeat(64)}`);

function clone(value) { return structuredClone(value); }

async function packageFixture({
  archiveLabel,
  mutate = () => {},
  version = '1.0.0',
} = {}) {
  const wire = clone(BASE_MANIFEST);
  wire.packageVersion = version;
  mutate(wire);
  const manifest = finalizeLocalPluginPackageManifest(
    defineLocalPluginPackageManifest(wire),
    RECEIPTS,
  );
  const manifestValue = readLocalPluginPackageManifest(manifest);
  const archiveBytes = new TextEncoder().encode(archiveLabel ?? `archive:${version}`);
  const archiveDigest = await digestPackageStoreBytes(archiveBytes);
  const manifestDigest = await digestPackageStoreValue(manifestValue);
  const candidateDigest = await digestPackageStoreValue({
    archiveDigest,
    candidateReceipt: 1,
    manifestDigest,
  });
  const candidate = createLocalPluginPackageCandidatePlan(manifest, {
    candidateDigest,
    contentDigest: await digestPackageStoreValue({ archiveLabel: archiveLabel ?? version }),
    hostApiVersion: '1.0.0',
    manifestDigest,
    source: { digest: archiveDigest, kind: 'local-archive' },
  });
  return Object.freeze({ archiveBytes, candidate, manifest });
}

function runtime(storage, prefix = 'transaction') {
  let sequence = 0;
  return createPluginPackageStoreRuntime({
    idFactory: () => `${prefix}-${++sequence}`,
    storage,
  });
}

async function prepareInstall(store, fixture, expectedRevision) {
  return store.prepareInstall({
    archiveBytes: fixture.archiveBytes,
    candidate: fixture.candidate,
    expectedRevision,
    manifest: fixture.manifest,
  });
}

async function commit(store, preparation, commandId) {
  const plan = readPluginPackageStorePreparation(preparation);
  return store.commitPrepared(preparation, {
    commandId,
    confirmationId: plan.confirmationId,
  });
}

async function failureCode(action) {
  try { await action(); } catch (error) { return error?.code ?? null; }
  assert.fail('Expected package store failure.');
}

async function currentStore(fixture, label = 'current') {
  const storage = createFakePluginPackageStorage();
  const store = runtime(storage, label);
  await store.initialize();
  const prepared = await prepareInstall(store, fixture, 0);
  await commit(store, prepared, `${label}-install`);
  return { storage, store };
}

async function restart(storage, label) {
  const store = runtime(storage, label);
  await store.initialize();
  return store;
}

async function migrationFixture({
  archiveLabel = 'archive:v2-migration',
  expectedOutputDigest = null,
  version = '2.0.0',
} = {}) {
  const operation = {
    fromPointer: '/packageValues/lifecycleLabel',
    kind: 'rename',
    precondition: 'source-present-destination-absent',
    toPointer: '/packageValues/lifecycleName',
    value: null,
  };
  const digest = expectedOutputDigest ?? await digestPackageStoreValue({
    fromSchemaVersion: 1,
    operations: [operation],
    toSchemaVersion: 2,
  });
  return packageFixture({
    archiveLabel,
    version,
    mutate(wire) {
      wire.settings.tabs[0].source.fields[0].id = 'lifecycleName';
      wire.settings.tabs[0].source.fields[0].label = 'Lifecycle name';
      wire.persistence.schemaVersion = 2;
      wire.persistence.migrations = [{
        expectedOutputDigest: digest,
        fromSchemaVersion: 1,
        operations: [operation],
        toSchemaVersion: 2,
      }];
    },
  });
}

export async function runLocalPluginPackageTransactionSuite() {
  const packageSourceFiles = [
    ...fs.readdirSync(path.join(V7_ROOT, 'src/plugin-package-store'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => path.join(V7_ROOT, 'src/plugin-package-store', name)),
    ...fs.readdirSync(path.join(V7_ROOT, 'src/plugin-package-storage'))
      .filter((name) => name.endsWith('.js'))
      .map((name) => path.join(V7_ROOT, 'src/plugin-package-storage', name)),
  ];
  for (const sourceFile of packageSourceFiles) {
    const source = fs.readFileSync(sourceFile, 'utf8');
    assert.doesNotMatch(source, /\b(?:eval|Function)\s*\(|\bimport\s*\(/u,
      `${path.basename(sourceFile)} must not execute package code`);
    assert.doesNotMatch(source, /(?:module-host|core-plugin-profile)/u,
      `${path.basename(sourceFile)} must not reach ModuleHost or Core profile`);
    assert.doesNotMatch(source, /\b(?:fetch|localStorage|WebSocket|XMLHttpRequest)\b/u,
      `${path.basename(sourceFile)} must not use replicated storage or network authority`);
  }
  assert.equal(isReplicatedStateKey('v7.plugin-package-store'), false,
    'device-local package inventory must stay outside Server State Sync');

  const v1 = await packageFixture({ archiveLabel: 'archive:v1', version: '1.0.0' });
  const { storage, store } = await currentStore(v1, 'lifecycle');
  let snapshot = store.snapshot();
  assert.equal(snapshot.revision, 1);
  assert.equal(snapshot.installed.length, 1);
  assert.equal(snapshot.installed[0].state, 'installed-inactive');
  assert.equal(snapshot.installed[0].activated, false);
  assert.equal(snapshot.installed[0].publisherTrusted, false);
  assert.equal(snapshot.productionExecutionAuthorized, false);
  assert.equal(JSON.stringify(snapshot).includes('archive:v1'), false, 'public inventory must not expose package bytes');
  assert.equal(snapshot.installed[0].settings.effective[0].source, 'definition-default');

  let prepared = await store.prepareSettingsApply({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
    packageValues: { lifecycleLabel: 'preserved-user-value' },
    profileValues: {},
  });
  await commit(store, prepared, 'settings-apply');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].settings.effective[0].source, 'package');
  assert.equal(snapshot.installed[0].settings.effective[0].value, 'preserved-user-value');

  prepared = await store.prepareSettingsReset({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    fieldId: 'lifecycleLabel',
    packageId: snapshot.installed[0].packageId,
    scope: 'package',
  });
  await commit(store, prepared, 'settings-reset');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].settings.effective[0].source, 'definition-default');

  prepared = await store.prepareSettingsApply({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
    packageValues: { lifecycleLabel: 'migrate-me' },
    profileValues: {},
  });
  await commit(store, prepared, 'settings-before-upgrade');
  snapshot = store.snapshot();

  const v2 = await migrationFixture({ archiveLabel: 'archive:v2' });
  prepared = await prepareInstall(store, v2, snapshot.revision);
  assert.equal(readPluginPackageStorePreparation(prepared).operation, 'upgrade');
  const upgradeResult = await commit(store, prepared, 'upgrade-v2');
  assert.equal(upgradeResult.receipt.migrationEvidence.length, 1);
  assert.match(upgradeResult.receipt.migrationEvidence[0].actualOutputDigest, /^sha256:[0-9a-f]{64}$/u);
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].packageVersion, '2.0.0');
  assert.equal(snapshot.installed[0].settings.effective[0].value, 'migrate-me');
  assert.equal(snapshot.installed[0].retainedPrior !== null, true);

  prepared = await store.prepareRollback({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
  });
  await commit(store, prepared, 'rollback-v1');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].packageVersion, '1.0.0');
  assert.equal(snapshot.installed[0].settings.effective[0].value, 'migrate-me');
  const retainedV2 = snapshot.installed[0].retainedPrior;
  prepared = await prepareInstall(store, v2, snapshot.revision);
  assert.equal(readPluginPackageStorePreparation(prepared).operation, 'upgrade');
  storage.fail('commit:before');
  assert.equal(await failureCode(() => commit(
    store,
    prepared,
    'retained-record-reuse-failure',
  )), 'V7DK_STORAGE_COMMIT_FAILED');
  storage.clearFailure();
  snapshot = store.snapshot();
  assert.equal(snapshot.mode, 'normal');
  assert.equal(snapshot.pending, null);
  assert.equal(snapshot.installed[0].packageVersion, '1.0.0');
  assert.deepEqual(snapshot.installed[0].retainedPrior, retainedV2);
  assert.equal(storage.backend.generations.has(retainedV2.generationId), true,
    'rollback must not delete a reused retained generation');
  assert.equal(storage.backend.settings.has(retainedV2.settingsRecordId), true,
    'rollback must not delete reused retained settings');
  await commit(store, prepared, 'retained-record-reuse-success');
  snapshot = store.snapshot();
  assert.equal(snapshot.mode, 'normal');
  assert.equal(snapshot.installed[0].packageVersion, '2.0.0');
  assert.equal(storage.backend.generations.has(snapshot.installed[0].generationId), true,
    'finalization must not delete the selected reused generation');
  prepared = await store.prepareRollback({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
  });
  await commit(store, prepared, 'retained-record-reuse-rollback');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].packageVersion, '1.0.0');

  const v09 = await packageFixture({ archiveLabel: 'archive:v09', version: '0.9.0' });
  prepared = await prepareInstall(store, v09, snapshot.revision);
  assert.equal(readPluginPackageStorePreparation(prepared).operation, 'downgrade');
  await commit(store, prepared, 'downgrade-v09');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].packageVersion, '0.9.0');

  const v09Replacement = await packageFixture({ archiveLabel: 'archive:v09-replacement', version: '0.9.0' });
  prepared = await prepareInstall(store, v09Replacement, snapshot.revision);
  assert.equal(readPluginPackageStorePreparation(prepared).operation, 'replacement');
  await commit(store, prepared, 'replace-v09');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed[0].packageVersion, '0.9.0');

  const historicalOwners = structuredClone({
    annotation: { bytes: 'annotation-bytes', revision: 7 },
    coreProfile: { bytes: 'core-profile-bytes', revision: 3 },
    journal: { bytes: 'journal-bytes', revision: 4 },
    session: { bytes: 'session-bytes', revision: 9 },
  });
  const historicalBefore = structuredClone(historicalOwners);
  prepared = await store.prepareQuarantine({
    diagnosticCode: 'V7DK_INTEGRITY_MISMATCH',
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
  });
  await commit(store, prepared, 'quarantine-v09');
  snapshot = store.snapshot();
  assert.equal(snapshot.installed.length, 0);
  assert.equal(snapshot.quarantined[0].state, 'quarantined');
  prepared = await store.prepareUninstall({
    expectedGenerationId: snapshot.quarantined[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.quarantined[0].packageId,
  });
  await commit(store, prepared, 'uninstall-v09');
  snapshot = store.snapshot();
  assert.equal(snapshot.tombstones.length, 1);
  assert.equal(snapshot.tombstones[0].retainedData, true);
  assert.deepEqual(historicalOwners, historicalBefore, 'uninstall must not touch host-owned historical bytes');

  prepared = await prepareInstall(store, v1, snapshot.revision);
  await commit(store, prepared, 'reinstall-v1');
  snapshot = store.snapshot();
  prepared = await store.prepareUninstall({
    expectedGenerationId: snapshot.installed[0].generationId,
    expectedRevision: snapshot.revision,
    packageId: snapshot.installed[0].packageId,
  });
  await commit(store, prepared, 'reuninstall-v1');
  snapshot = store.snapshot();
  assert.equal(storage.backend.settings.size, 1,
    'a replaced tombstone must retain only its newest package-owned settings');

  store.dispose();
  assert.equal(storage.backend.generations.size, 0, 'uninstall cleanup must remove package payload generations');

  {
    const retainedTarget = await currentStore(v1, 'retained-tombstone-cleanup');
    let retainedSnapshot = retainedTarget.store.snapshot();
    let retainedPreparation = await retainedTarget.store.prepareUninstall({
      expectedGenerationId: retainedSnapshot.installed[0].generationId,
      expectedRevision: retainedSnapshot.revision,
      packageId: retainedSnapshot.installed[0].packageId,
    });
    await commit(retainedTarget.store, retainedPreparation, 'retained-tombstone-uninstall');
    retainedSnapshot = retainedTarget.store.snapshot();
    const retainedSettingsRecordId = retainedSnapshot.tombstones[0].retainedSettingsRecordId;
    retainedPreparation = await prepareInstall(retainedTarget.store, v1, retainedSnapshot.revision);
    await commit(retainedTarget.store, retainedPreparation, 'retained-tombstone-reinstall');
    const v11 = await packageFixture({ archiveLabel: 'archive:v11', version: '1.1.0' });
    retainedSnapshot = retainedTarget.store.snapshot();
    retainedPreparation = await prepareInstall(retainedTarget.store, v11, retainedSnapshot.revision);
    await commit(retainedTarget.store, retainedPreparation, 'retained-tombstone-upgrade-v11');
    const v12 = await packageFixture({ archiveLabel: 'archive:v12', version: '1.2.0' });
    retainedSnapshot = retainedTarget.store.snapshot();
    retainedPreparation = await prepareInstall(retainedTarget.store, v12, retainedSnapshot.revision);
    await commit(retainedTarget.store, retainedPreparation, 'retained-tombstone-upgrade-v12');
    assert.equal(retainedTarget.store.snapshot().mode, 'normal');
    assert.equal(retainedTarget.storage.backend.settings.has(retainedSettingsRecordId), true,
      'later generation cleanup must preserve tombstone-owned settings');
    retainedTarget.store.dispose();
  }

  const controls = {
    'stale-inventory-revision': async () => {
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'stale-revision');
      await target.initialize();
      const code = await failureCode(() => prepareInstall(target, v1, 1));
      assert.equal(target.snapshot().revision, 0);
      target.dispose();
      return code;
    },
    'stale-candidate-generation': async () => {
      const target = await currentStore(v1, 'stale-generation');
      const code = await failureCode(() => target.store.prepareQuarantine({
        diagnosticCode: 'V7DK_INTEGRITY_MISMATCH',
        expectedGenerationId: `sha256:${'0'.repeat(64)}`,
        expectedRevision: 1,
        packageId: 'community.lifecycle-proof',
      }));
      target.store.dispose();
      return code;
    },
    'confirmation-digest-revision': async () => {
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'confirmation');
      await target.initialize();
      const candidate = await prepareInstall(target, v1, 0);
      const code = await failureCode(() => target.commitPrepared(candidate, {
        commandId: 'confirmation-install',
        confirmationId: 'forged-confirmation',
      }));
      assert.equal(target.snapshot().revision, 0);
      target.dispose();
      return code;
    },
    'duplicate-replayed-command': async () => {
      const target = await currentStore(v1, 'replayed');
      const snapshotValue = target.store.snapshot();
      const candidate = await target.store.prepareSettingsApply({
        expectedGenerationId: snapshotValue.installed[0].generationId,
        expectedRevision: snapshotValue.revision,
        packageId: snapshotValue.installed[0].packageId,
        packageValues: { lifecycleLabel: 'new-value' },
        profileValues: {},
      });
      const code = await failureCode(() => target.store.commitPrepared(candidate, {
        commandId: 'replayed-install',
        confirmationId: null,
      }));
      assert.equal(target.store.snapshot().revision, 1);
      target.store.dispose();
      const reusedTransaction = await restart(target.storage, 'replayed');
      const reusedSnapshot = reusedTransaction.snapshot();
      const reusedCandidate = await reusedTransaction.prepareSettingsApply({
        expectedGenerationId: reusedSnapshot.installed[0].generationId,
        expectedRevision: reusedSnapshot.revision,
        packageId: reusedSnapshot.installed[0].packageId,
        packageValues: { lifecycleLabel: 'new-command-reused-transaction' },
        profileValues: {},
      });
      assert.equal(await failureCode(() => reusedTransaction.commitPrepared(reusedCandidate, {
        commandId: 'replayed-new-command',
        confirmationId: null,
      })), 'V7DK_TRANSACTION_RECEIPT_INVALID');
      reusedTransaction.dispose();
      return code;
    },
    'concurrent-command': async () => {
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'concurrent');
      await target.initialize();
      const candidate = await prepareInstall(target, v1, 0);
      const unsettled = commit(target, candidate, 'concurrent-install');
      const code = await failureCode(() => target.prepareInstall({
        archiveBytes: v1.archiveBytes,
        candidate: v1.candidate,
        expectedRevision: 0,
        manifest: v1.manifest,
      }));
      await unsettled;
      assert.equal(target.snapshot().revision, 1);
      target.dispose();
      return code;
    },
    'cancelled-before-commit': async () => {
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'cancelled');
      await target.initialize();
      const candidate = await prepareInstall(target, v1, 0);
      const controller = new AbortController();
      controller.abort();
      const code = await failureCode(() => target.commitPrepared(candidate, {
        commandId: 'cancelled-install',
        confirmationId: readPluginPackageStorePreparation(candidate).confirmationId,
        signal: controller.signal,
      }));
      assert.equal(target.snapshot().revision, 0);
      target.dispose();
      return code;
    },
    'stage-storage-write': async () => {
      let primary;
      for (const point of [
        'stage:before', 'stage:generation-put:0', 'stage:settings-put:0',
        'stage:journal-put:0', 'stage:inventory-put', 'stage:after-apply',
      ]) {
        const targetStorage = createFakePluginPackageStorage();
        const target = runtime(targetStorage, `stage-${point.replaceAll(':', '-')}`);
        await target.initialize();
        const candidate = await prepareInstall(target, v1, 0);
        targetStorage.fail(point);
        const code = await failureCode(() => commit(target, candidate, `command-${point}`));
        primary ??= code;
        assert.equal(code, 'V7DK_STORAGE_WRITE_FAILED', point);
        assert.equal(target.snapshot().installed.length, 0, point);
        target.dispose();
        targetStorage.clearFailure();
        const restored = await restart(targetStorage, `stage-restart-${point.replaceAll(':', '-')}`);
        assert.equal(restored.snapshot().revision, 0, point);
        assert.equal(restored.snapshot().pending, null, point);
        restored.dispose();
      }
      const readStorage = createFakePluginPackageStorage();
      const readTarget = runtime(readStorage, 'stage-read-failure');
      await readTarget.initialize();
      const readCandidate = await prepareInstall(readTarget, v1, 0);
      readStorage.fail('read:before', { code: 'PLUGIN_PACKAGE_STORAGE_READ_FAILED' });
      assert.equal(await failureCode(() => commit(
        readTarget,
        readCandidate,
        'stage-read-failure-command',
      )), 'V7DK_STORAGE_READ_FAILED');
      assert.equal(readTarget.snapshot().revision, 0);
      assert.equal(readTarget.snapshot().pending, null);
      readTarget.dispose();
      return primary;
    },
    'storage-quota': async () => {
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'quota');
      await target.initialize();
      const candidate = await prepareInstall(target, v1, 0);
      targetStorage.fail('stage:generation-put:0', { code: 'PLUGIN_PACKAGE_STORAGE_QUOTA' });
      const code = await failureCode(() => commit(target, candidate, 'quota-install'));
      assert.equal(target.snapshot().revision, 0);
      target.dispose();
      return code;
    },
    'commit-storage-write': async () => {
      let primary;
      for (const point of [
        'commit:before', 'commit:journal-put:0', 'commit:receipt-put:0', 'commit:inventory-put',
      ]) {
        const targetStorage = createFakePluginPackageStorage();
        const target = runtime(targetStorage, `commit-${point.replaceAll(':', '-')}`);
        await target.initialize();
        const candidate = await prepareInstall(target, v1, 0);
        targetStorage.fail(point);
        const code = await failureCode(() => commit(target, candidate, `command-${point}`));
        primary ??= code;
        assert.equal(code, 'V7DK_STORAGE_COMMIT_FAILED', point);
        assert.equal(target.snapshot().revision, 0, point);
        target.dispose();
      }
      const uncertainStorage = createFakePluginPackageStorage();
      const uncertain = runtime(uncertainStorage, 'uncertain-commit');
      await uncertain.initialize();
      const candidate = await prepareInstall(uncertain, v1, 0);
      uncertainStorage.fail('commit:after-apply');
      const result = await commit(uncertain, candidate, 'uncertain-install');
      assert.equal(result.commitWasUncertain, true);
      assert.equal(result.snapshot.revision, 1);
      assert.equal(result.snapshot.installed.length, 1);
      uncertain.dispose();
      return primary;
    },
    'migration-plan-digest': async () => {
      const target = await currentStore(v1, 'migration-digest');
      let snapshotValue = target.store.snapshot();
      let candidate = await target.store.prepareSettingsApply({
        expectedGenerationId: snapshotValue.installed[0].generationId,
        expectedRevision: snapshotValue.revision,
        packageId: snapshotValue.installed[0].packageId,
        packageValues: { lifecycleLabel: 'migrate' },
        profileValues: {},
      });
      await commit(target.store, candidate, 'migration-digest-settings');
      snapshotValue = target.store.snapshot();
      const invalid = await migrationFixture({
        archiveLabel: 'archive:v2-invalid-digest',
        expectedOutputDigest: `sha256:${'f'.repeat(64)}`,
      });
      const code = await failureCode(() => prepareInstall(target.store, invalid, snapshotValue.revision));
      assert.equal(target.store.snapshot().revision, snapshotValue.revision);
      target.store.dispose();
      return code;
    },
    'migration-precondition': async () => {
      const target = await currentStore(v1, 'migration-precondition');
      const code = await failureCode(() => prepareInstall(target.store, v2, 1));
      assert.equal(target.store.snapshot().revision, 1);
      target.store.dispose();
      return code;
    },
    'downgrade-schema-coercion': async () => {
      const target = await currentStore(v2, 'downgrade-schema');
      const code = await failureCode(() => prepareInstall(target.store, v1, 1));
      assert.equal(target.store.snapshot().revision, 1);
      target.store.dispose();
      return code;
    },
    'settings-schema-validation': async () => {
      const target = await currentStore(v1, 'settings-invalid');
      const snapshotValue = target.store.snapshot();
      const code = await failureCode(() => target.store.prepareSettingsApply({
        expectedGenerationId: snapshotValue.installed[0].generationId,
        expectedRevision: snapshotValue.revision,
        packageId: snapshotValue.installed[0].packageId,
        packageValues: { lifecycleLabel: 'x'.repeat(64) },
        profileValues: {},
      }));
      assert.equal(target.store.snapshot().revision, 1);
      target.store.dispose();
      return code;
    },
    'rollback-without-prior': async () => {
      const target = await currentStore(v1, 'rollback-absent');
      const snapshotValue = target.store.snapshot();
      const code = await failureCode(() => target.store.prepareRollback({
        expectedGenerationId: snapshotValue.installed[0].generationId,
        expectedRevision: snapshotValue.revision,
        packageId: snapshotValue.installed[0].packageId,
      }));
      target.store.dispose();
      return code;
    },
    'quarantine-stale-generation': async () => {
      const target = await currentStore(v1, 'quarantine-stale');
      const code = await failureCode(() => target.store.prepareQuarantine({
        diagnosticCode: 'V7DK_INTEGRITY_MISMATCH',
        expectedGenerationId: `sha256:${'e'.repeat(64)}`,
        expectedRevision: 1,
        packageId: 'community.lifecycle-proof',
      }));
      target.store.dispose();
      return code;
    },
    'installed-digest-corruption': async () => {
      const target = await currentStore(v1, 'digest-corruption');
      target.store.dispose();
      target.storage.tamper((backend) => {
        const generation = backend.generations.values().next().value;
        generation.archiveBytes[0] ^= 1;
      });
      const restored = await restart(target.storage, 'digest-corruption-restart');
      const snapshotValue = restored.snapshot();
      assert.equal(snapshotValue.mode, 'restricted');
      assert.equal(snapshotValue.installed.length, 0);
      const code = snapshotValue.diagnostics[0].code;
      restored.dispose();
      return code;
    },
    'unknown-inventory-schema': async () => {
      const target = await currentStore(v1, 'unknown-schema');
      target.store.dispose();
      target.storage.tamper((backend) => { backend.inventory.schema = 'v7.future-plugin-inventory'; });
      const restored = await restart(target.storage, 'unknown-schema-restart');
      const snapshotValue = restored.snapshot();
      assert.equal(snapshotValue.mode, 'restricted');
      const code = snapshotValue.diagnostics[0].code;
      const retry = restored.retryRecovery();
      assert.equal(await failureCode(() => restored.retryRecovery()), 'V7DK_TRANSACTION_CONCURRENT');
      assert.equal((await retry).mode, 'restricted');
      const recovered = await restored.removeRestrictedInventory({
        confirmationToken: snapshotValue.recoveryToken,
      });
      assert.equal(recovered.mode, 'normal');
      assert.equal(recovered.revision, 0);
      restored.dispose();
      return code;
    },
    'repeated-recovery-failure': async () => {
      const unavailableStorage = createFakePluginPackageStorage();
      const unavailable = runtime(unavailableStorage, 'read-unavailable');
      unavailableStorage.fail('read:before', { code: 'PLUGIN_PACKAGE_STORAGE_READ_FAILED' });
      const unavailableSnapshot = await unavailable.initialize();
      assert.equal(unavailableSnapshot.mode, 'restricted');
      assert.equal(unavailableSnapshot.diagnostics[0].code, 'V7DK_STORAGE_READ_FAILED');
      unavailable.dispose();
      const targetStorage = createFakePluginPackageStorage();
      const target = runtime(targetStorage, 'recovery-failure');
      await target.initialize();
      const candidate = await prepareInstall(target, v1, 0);
      targetStorage.fail('stage:after-apply');
      assert.equal(await failureCode(() => commit(target, candidate, 'recovery-stage')), 'V7DK_STORAGE_WRITE_FAILED');
      target.dispose();
      targetStorage.clearFailure();
      targetStorage.fail('rollback:before', { times: 4 });
      const restored = await restart(targetStorage, 'recovery-failure-restart');
      const snapshotValue = restored.snapshot();
      assert.equal(snapshotValue.mode, 'restricted');
      const code = snapshotValue.diagnostics[0].code;
      restored.dispose();
      const committedStorage = createFakePluginPackageStorage();
      const committed = runtime(committedStorage, 'missing-commit-receipt');
      await committed.initialize();
      const committedCandidate = await prepareInstall(committed, v1, 0);
      committedStorage.fail('finalize:before');
      const committedResult = await commit(
        committed, committedCandidate, 'missing-commit-receipt-command',
      );
      assert.equal(committedResult.snapshot.revision, 1);
      committed.dispose();
      committedStorage.clearFailure();
      committedStorage.tamper((backend) => backend.receipts.clear());
      const missingReceipt = await restart(committedStorage, 'missing-commit-receipt-restart');
      assert.equal(missingReceipt.snapshot().mode, 'restricted');
      assert.equal(missingReceipt.snapshot().diagnostics[0].code, 'V7DK_STORAGE_RECOVERY_FAILED');
      missingReceipt.dispose();
      return code;
    },
  };

  assert.deepEqual(Object.keys(controls).sort(), NEGATIVE_CASES.map(({ case: id }) => id).sort());
  const negativeEvidence = [];
  for (const testCase of NEGATIVE_CASES) {
    const actual = await controls[testCase.case]();
    assert.equal(actual, testCase.expectedDiagnostic, `${testCase.case} diagnostic mismatch`);
    negativeEvidence.push(Object.freeze({
      baselinePassed: true,
      case: testCase.case,
      diagnostic: actual,
      negativePassed: true,
    }));
  }

  for (const point of ['finalize:before', 'finalize:journal-delete:0', 'finalize:inventory-put', 'finalize:after-apply']) {
    const targetStorage = createFakePluginPackageStorage();
    const target = runtime(targetStorage, `cleanup-${point.replaceAll(':', '-')}`);
    await target.initialize();
    const candidate = await prepareInstall(target, v1, 0);
    targetStorage.fail(point);
    const result = await commit(target, candidate, `cleanup-command-${point}`);
    assert.equal(result.snapshot.revision, 1, point);
    assert.equal(result.snapshot.installed.length, 1, point);
    target.dispose();
    targetStorage.clearFailure();
    const restored = await restart(targetStorage, `cleanup-restart-${point.replaceAll(':', '-')}`);
    assert.equal(restored.snapshot().pending, null, point);
    assert.equal(restored.snapshot().installed.length, 1, point);
    restored.dispose();
  }
  {
    const target = await currentStore(v1, 'cleanup-generation-delete');
    const before = target.store.snapshot();
    const candidate = await target.store.prepareUninstall({
      expectedGenerationId: before.installed[0].generationId,
      expectedRevision: before.revision,
      packageId: before.installed[0].packageId,
    });
    target.storage.fail('finalize:generation-delete:0');
    const result = await commit(target.store, candidate, 'cleanup-generation-delete-command');
    assert.equal(result.snapshot.tombstones.length, 1);
    target.store.dispose();
    target.storage.clearFailure();
    const restored = await restart(target.storage, 'cleanup-generation-delete-restart');
    assert.equal(restored.snapshot().pending, null);
    assert.equal(target.storage.backend.generations.size, 0);
    restored.dispose();
  }
  {
    const target = await currentStore(v1, 'cleanup-settings-delete');
    const before = target.store.snapshot();
    const candidate = await target.store.prepareSettingsApply({
      expectedGenerationId: before.installed[0].generationId,
      expectedRevision: before.revision,
      packageId: before.installed[0].packageId,
      packageValues: { lifecycleLabel: 'cleanup-setting' },
      profileValues: {},
    });
    target.storage.fail('finalize:settings-delete:0');
    const result = await commit(target.store, candidate, 'cleanup-settings-delete-command');
    assert.equal(result.snapshot.installed[0].settings.effective[0].value, 'cleanup-setting');
    target.store.dispose();
    target.storage.clearFailure();
    const restored = await restart(target.storage, 'cleanup-settings-delete-restart');
    assert.equal(restored.snapshot().pending, null);
    assert.equal(target.storage.backend.settings.size, 1);
    restored.dispose();
  }

  return Object.freeze({
    negativeCases: NEGATIVE_CASES,
    negativeEvidence: Object.freeze(negativeEvidence),
    positive: Object.freeze({
      finalRevision: snapshot.revision,
      lifecycleOperations: Object.freeze([
        'install', 'settings-apply', 'settings-reset', 'upgrade', 'rollback',
        'downgrade', 'replacement', 'quarantine', 'uninstall', 'reinstall',
        'reuninstall',
      ]),
      tombstoneRetained: true,
    }),
  });
}
