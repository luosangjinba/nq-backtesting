import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createModuleHost } from '../../src/module-host/public.js';

function sorted(values) {
  return [...values].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function readProductionDescriptors(v7Root, manifest) {
  return manifest.activeProductionModules.map((descriptorPath) => JSON.parse(
    fs.readFileSync(path.join(v7Root, descriptorPath), 'utf8'),
  ));
}

async function readPublicApis(v7Root, descriptors) {
  const entries = await Promise.all(descriptors.map(async (descriptor) => [
    descriptor.id,
    await import(pathToFileURL(path.join(v7Root, descriptor.publicEntry)).href),
  ]));
  return new Map(entries);
}

function definitionFor(descriptor, publicApi, trace, observedPorts) {
  if (descriptor.lifecycle.length === 0) return { descriptor, publicApi };
  return {
    descriptor,
    instantiate(ports) {
      observedPorts.set(descriptor.id, Object.freeze({
        optional: Object.freeze(Object.keys(ports.optionalPorts).sort()),
        required: Object.freeze(Object.keys(ports.requiredPorts).sort()),
      }));
      const instance = { publicApi };
      for (const method of descriptor.lifecycle) {
        instance[method] = async () => { trace.push(`${method}:${descriptor.id}`); };
      }
      return instance;
    },
  };
}

async function boot({ descriptors, publicApis }) {
  const observedPorts = new Map();
  const trace = [];
  const host = createModuleHost(descriptors.map((descriptor) => definitionFor(
    descriptor,
    publicApis.get(descriptor.id),
    trace,
    observedPorts,
  )));
  const started = await host.start();
  for (const descriptor of descriptors) {
    if (host.getPublicApi(descriptor.id) !== publicApis.get(descriptor.id)) {
      throw new Error(`${descriptor.id} did not expose its production public entry.`);
    }
  }
  return { host, observedPorts, started, trace };
}

function optionalRemovalMatrix(descriptors) {
  return sorted(descriptors.flatMap((descriptor) => descriptor.optionalPorts.map((moduleId) => ({
    consumerModuleId: descriptor.id,
    omittedModuleId: moduleId,
  }))));
}

/**
 * Boot all active production descriptors with their real public entries, then
 * prove reverse disposal and every declared optional-port omission through the
 * real ModuleHost graph. Real application construction is additionally proven
 * by the production application host browser Harness.
 */
export async function verifyProductionModuleAssembly({ manifest, v7Root }) {
  const descriptors = readProductionDescriptors(v7Root, manifest);
  const descriptorsById = new Map(descriptors.map((descriptor) => [descriptor.id, descriptor]));
  const publicApis = await readPublicApis(v7Root, descriptors);
  const full = await boot({ descriptors, publicApis });
  const fullOrder = [...full.started.moduleIds];
  await full.host.stop();

  const expectedDisposeTrace = [...fullOrder].reverse()
    .filter((moduleId) => descriptorsById.get(moduleId).lifecycle.includes('dispose'))
    .map((moduleId) => `dispose:${moduleId}`);
  const disposeTrace = full.trace.filter((entry) => entry.startsWith('dispose:'));
  if (JSON.stringify(disposeTrace) !== JSON.stringify(expectedDisposeTrace)) {
    throw new Error('Production descriptor disposal did not run exactly once in reverse assembly order.');
  }
  if (full.host.snapshot().status !== 'stopped') {
    throw new Error('Production descriptor assembly did not stop cleanly.');
  }

  const removalMatrix = optionalRemovalMatrix(descriptors);
  for (const removal of removalMatrix) {
    const retained = descriptors.filter(({ id }) => id !== removal.omittedModuleId);
    const run = await boot({ descriptors: retained, publicApis });
    if (run.started.moduleIds.includes(removal.omittedModuleId)) {
      throw new Error(`${removal.omittedModuleId} remained in its optional-removal assembly.`);
    }
    const consumerPorts = run.observedPorts.get(removal.consumerModuleId);
    if (consumerPorts?.optional.includes(removal.omittedModuleId)) {
      throw new Error(`${removal.consumerModuleId} received omitted optional port ${removal.omittedModuleId}.`);
    }
    await run.host.stop();
  }

  return Object.freeze({
    lifecycleModuleIds: Object.freeze(descriptors
      .filter(({ lifecycle }) => lifecycle.length > 0)
      .map(({ id }) => id)
      .sort()),
    moduleIds: Object.freeze(descriptors.map(({ id }) => id).sort()),
    optionalRemovalMatrix: Object.freeze(removalMatrix),
  });
}
