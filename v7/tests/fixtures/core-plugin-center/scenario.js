import { createCorePluginProfileRuntime } from '../../../src/core-plugin-profile/public.js';
import {
  createBuiltInPluginPlan,
  createCorePluginBootSelection,
  planCorePluginApplicationImpact,
} from '../../../src/plugin-contract/public.js';
import { createCorePluginCenterControl } from '../../../src/plugin-center-ui/public.js';
import { FAIR_VALUE_GAP_PLUGIN_MANIFEST } from '../../../src/semantic-fair-value-gap/public.js';
import { createWorkstationSettings } from '../../../src/workstation-settings/public.js';
import { createWorkstationSettingsDialog } from '../../../src/replay-workspace-ui/workstation-settings-dialog.js';

const PROFILE_KEY = 'v7.core-plugin-profile:device';
const ARTIFACT_KEY = 'v7.annotation-document:session.p0b-fixture';
const FAILURE_KEY = 'v7.p0b-fixture:fail-attempt';
const descriptors = await Promise.all([
  '../../../src/plugin-contract/module.json',
  '../../../src/semantic-fair-value-gap/module.json',
  '../../../src/annotation-manual-workflow/module.json',
].map(async (url) => (await fetch(url)).json()));
const plan = createBuiltInPluginPlan({
  hostApiVersion: '1.0.0',
  hostCapabilities: [
    { id: 'annotation.evidence.bundle', version: '1.0.0' },
    { id: 'annotation.geometry.rectangle', version: '1.0.0' },
    { id: 'annotation.geometry.segment', version: '1.0.0' },
  ],
  manifests: [FAIR_VALUE_GAP_PLUGIN_MANIFEST],
  moduleDescriptors: descriptors,
});
if (localStorage.getItem(ARTIFACT_KEY) === null) {
  localStorage.setItem(ARTIFACT_KEY, '{"artifactId":"artifact.fvg.fixture","revision":7}');
}
const selection = createCorePluginBootSelection({ plan, rawRecord: localStorage.getItem(PROFILE_KEY) });
const failedAttemptId = localStorage.getItem(FAILURE_KEY);
let candidate = selection.candidates[0];
const failures = [];
if (candidate.source === 'pending' && candidate.attemptId === failedAttemptId) {
  failures.push(Object.freeze({
    attemptId: candidate.attemptId,
    code: 'MODULE_HOST_START_FAILED',
    moduleId: 'optional.semantic-fair-value-gap',
    packageId: 'first-party.fair-value-gap',
    phase: 'start',
  }));
  candidate = selection.candidates[1];
  localStorage.removeItem(FAILURE_KEY);
}
const impact = planCorePluginApplicationImpact(plan, candidate.profile, descriptors);
const moduleIds = descriptors.map(({ id }) => id).filter((id) => !impact.omittedModuleIds.includes(id));
const storage = Object.freeze({
  read: (key) => localStorage.getItem(key),
  remove: (key) => localStorage.removeItem(key),
  write: (key, value) => localStorage.setItem(key, value),
});
const runtime = createCorePluginProfileRuntime({
  idFactory: () => crypto.randomUUID(),
  moduleDescriptors: descriptors,
  plan,
  readModuleHostSnapshot: () => Object.freeze({ moduleIds: Object.freeze(moduleIds), status: 'running' }),
  storage,
});
runtime.initializeBoot({ candidate, failures, plan, selection });
runtime.acceptApplicationReady();

let latest = runtime.snapshot();
const evidence = {
  artifactRaw: localStorage.getItem(ARTIFACT_KEY),
  generationSource: candidate.source,
  impact,
  loadId: crypto.randomUUID(),
  restartRequested: false,
  snapshot: latest,
  status: 'ready',
};
globalThis.__corePluginCenterEvidence = evidence;
runtime.subscribe((snapshot) => {
  latest = snapshot;
  evidence.snapshot = snapshot;
  evidence.artifactRaw = localStorage.getItem(ARTIFACT_KEY);
  document.querySelector('#generation-state').textContent = `${snapshot.generationSource} · ${snapshot.hostStatus}`;
  document.querySelector('#profile-state').textContent = `revision ${snapshot.revision} · ${snapshot.restartRequired ? 'pending' : 'clean'}`;
  document.querySelector('#artifact-state').textContent = `unchanged revision 7 · ${evidence.artifactRaw.length} bytes`;
});

const pluginCenter = createCorePluginCenterControl({
  confirmDependencyImpact: () => true,
  onRestart(receipt) {
    runtime.validateRestartReceipt(receipt);
    evidence.restartRequested = true;
    location.reload();
  },
  profile: runtime,
});
const settings = createWorkstationSettings();
const dialog = createWorkstationSettingsDialog({
  getRecentColors: () => [],
  getSnapshot: () => Object.freeze({ recoveryCode: null, revision: 0, settings }),
  onCancelPreview: () => Object.freeze({ accepted: true }),
  onPreview: () => Object.freeze({ accepted: true }),
  onSave: () => Object.freeze({ accepted: true }),
  pluginCenter,
});
document.querySelector('#dialog-host').append(dialog.element);
function openCenter() {
  if (!dialog.element.open) dialog.open();
  dialog.element.querySelector('[data-settings-tab="core-plugins"]').click();
}
document.querySelector('#open-settings').addEventListener('click', openCenter);
globalThis.__failNextCorePluginRestart = () => {
  const wire = JSON.parse(localStorage.getItem(PROFILE_KEY));
  localStorage.setItem(FAILURE_KEY, wire.pending.attemptId);
};
openCenter();
document.body.dataset.status = 'ready';
