import { exactRecord } from './contract-value.js';
import { readBuiltInPluginPlan } from './built-in-plugin-plan.js';
import {
  corePluginProfilesEqual,
  createKernelSafeCorePluginProfile,
  inspectStoredCorePluginProfile,
  readCorePluginProfileRecord,
} from './core-plugin-profile-value.js';

function packageIdForModule(plan, moduleId) {
  return readBuiltInPluginPlan(plan).packages
    .find(({ manifest }) => manifest.module.id === moduleId)?.manifest.packageId ?? null;
}

/** Create the bounded pending/active/Kernel-safe candidate sequence without writing storage. */
export function createCorePluginBootSelection({ plan, rawRecord } = {}) {
  exactRecord(
    { plan, rawRecord },
    ['plan', 'rawRecord'],
    'CORE_PLUGIN_BOOT_INVALID',
    'Core Plugin boot input',
  );
  if (rawRecord !== null && typeof rawRecord !== 'string') {
    throw new TypeError('Core Plugin stored record must be a string or null.');
  }
  const inspected = inspectStoredCorePluginProfile(plan, rawRecord);
  const recordValue = readCorePluginProfileRecord(inspected.record);
  const candidates = [];
  if (recordValue.pending !== null) {
    candidates.push(Object.freeze({
      attemptId: recordValue.pending.attemptId,
      profile: recordValue.pending.profile,
      source: 'pending',
    }));
  }
  candidates.push(Object.freeze({
    attemptId: `boot.${inspected.kind === 'missing' ? 'default' : 'active'}.r${recordValue.revision}`,
    profile: recordValue.active,
    source: inspected.kind === 'missing' || inspected.kind === 'invalid' ? 'build-default' : 'active',
  }));
  const kernelSafe = createKernelSafeCorePluginProfile(plan, recordValue.active);
  if (!candidates.some(({ profile }) => corePluginProfilesEqual(profile, kernelSafe))) {
    candidates.push(Object.freeze({
      attemptId: `boot.kernel-safe.r${recordValue.revision}`,
      profile: kernelSafe,
      source: 'kernel-safe',
    }));
  }
  return Object.freeze({
    candidates: Object.freeze(candidates),
    kind: inspected.kind,
    rawRecord,
    record: inspected.record,
    recoveryCode: inspected.recoveryCode,
  });
}

/** Normalize one failed boot attempt into the stable portable diagnostic contract. */
export function createCorePluginBootFailure({ attemptId, error, phase, plan } = {}) {
  const stablePhase = ['instantiate', 'plan', 'rollback', 'start'].includes(error?.phase)
    ? error.phase
    : phase;
  const moduleId = typeof error?.moduleId === 'string' ? error.moduleId : null;
  return Object.freeze({
    attemptId,
    code: typeof error?.code === 'string' && /^[A-Z][A-Z0-9_]+$/.test(error.code)
      ? error.code : 'CORE_PLUGIN_GENERATION_FAILED',
    moduleId,
    packageId: moduleId === null ? null : packageIdForModule(plan, moduleId),
    phase: ['instantiate', 'plan', 'rollback', 'start'].includes(stablePhase) ? stablePhase : 'plan',
  });
}
