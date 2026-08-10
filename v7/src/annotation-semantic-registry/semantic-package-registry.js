import { SemanticArtifactDraftValue } from './semantic-artifact-draft.js';
import {
  createUnresolvedArtifactInspection,
  hiddenArtifactInspection,
  visibleArtifactInspection,
} from './semantic-artifact-inspector.js';
import { failSemanticPackage } from './semantic-package-error.js';
import { readSemanticPackageManifest } from './semantic-package-manifest.js';
import { exactRecord, portableValue } from './portable-value.js';

const HOST_CONTRACT_VERSION = '1.0.0';
const ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

function typeKey(typeId, typeVersion) { return `${typeId}@${typeVersion}`; }

function expectedPolicyRejection(error) {
  return error?.name === 'AnnotationSemanticPackageError'
    && ['SEMANTIC_ARTIFACT_INVALID', 'SEMANTIC_CONSTRUCTION_REJECTED'].includes(error.code);
}

function activeInstance(value) {
  exactRecord(
    value,
    ['dispose'],
    'SEMANTIC_PACKAGE_INSTANCE_INVALID',
    'Semantic package instance',
  );
  if (typeof value.dispose !== 'function') {
    failSemanticPackage('SEMANTIC_PACKAGE_INSTANCE_INVALID', 'Package dispose must be callable.');
  }
  return Object.freeze({ dispose: value.dispose });
}

function normalizeConstructionResult(value) {
  exactRecord(
    value,
    ['attributes', 'presentation', 'provenance', 'relations', 'sourceDrawing'],
    'SEMANTIC_CONSTRUCTION_RESULT_INVALID',
    'Semantic construction result',
  );
  let sourceDrawing = null;
  if (value.sourceDrawing !== null) {
    exactRecord(
      value.sourceDrawing,
      ['drawingId', 'revision'],
      'SEMANTIC_CONSTRUCTION_SOURCE_INVALID',
      'Semantic source Drawing',
    );
    if (typeof value.sourceDrawing.drawingId !== 'string'
      || !ARTIFACT_ID.test(value.sourceDrawing.drawingId)
      || !Number.isSafeInteger(value.sourceDrawing.revision)
      || value.sourceDrawing.revision < 1) {
      failSemanticPackage('SEMANTIC_CONSTRUCTION_SOURCE_INVALID', 'Source Drawing is invalid.');
    }
    sourceDrawing = Object.freeze({ ...value.sourceDrawing });
  }
  if (!Array.isArray(value.relations)) {
    failSemanticPackage('SEMANTIC_CONSTRUCTION_RESULT_INVALID', 'Artifact relations must be an array.');
  }
  return Object.freeze({
    attributes: portableValue(value.attributes, 'attributes'),
    presentation: value.presentation === null
      ? null : portableValue(value.presentation, 'presentation'),
    provenance: portableValue(value.provenance, 'provenance'),
    relations: portableValue(value.relations, 'relations'),
    sourceDrawing,
  });
}

class SemanticPackageRegistry {
  #activeOrder = [];
  #availableCapabilities;
  #definitions = new Map();
  #identity = Object.freeze({});
  #operation = null;
  #records = new Map();
  #status = 'ready';

  constructor({ availableCapabilities = [], hostContractVersion = HOST_CONTRACT_VERSION, packages = [] }) {
    if (hostContractVersion !== HOST_CONTRACT_VERSION || !Array.isArray(packages)
      || !Array.isArray(availableCapabilities)) {
      failSemanticPackage('SEMANTIC_REGISTRY_INPUT_INVALID', 'Semantic Registry input is invalid.');
    }
    this.#availableCapabilities = new Set(availableCapabilities);
    for (const candidate of packages) {
      const manifest = readSemanticPackageManifest(candidate);
      if (this.#records.has(manifest.packageId)) {
        failSemanticPackage('SEMANTIC_PACKAGE_ID_DUPLICATE', 'Semantic package ids must be unique.');
      }
      const compatible = manifest.hostContractVersion === hostContractVersion
        && manifest.requiredCapabilities.every((id) => this.#availableCapabilities.has(id));
      this.#records.set(manifest.packageId, {
        generation: 0,
        instance: null,
        manifest,
        state: compatible ? 'disabled' : 'incompatible',
      });
    }
  }

  #record(packageId) {
    const record = this.#records.get(packageId);
    if (!record) failSemanticPackage('SEMANTIC_PACKAGE_NOT_FOUND', `Package ${packageId} is unknown.`);
    return record;
  }

  #requireReady() {
    if (this.#status === 'disposed') {
      failSemanticPackage('SEMANTIC_REGISTRY_DISPOSED', 'Semantic Registry is disposed.');
    }
    if (this.#operation !== null) {
      failSemanticPackage('SEMANTIC_REGISTRY_BUSY', 'One package lifecycle operation is active.');
    }
  }

  #withdraw(record) {
    for (const definition of record.manifest.semanticTypes) {
      this.#definitions.delete(typeKey(definition.typeId, definition.version));
    }
    this.#activeOrder = this.#activeOrder.filter((id) => id !== record.manifest.packageId);
  }

  #start(execute) {
    try { this.#requireReady(); } catch (error) { return Promise.reject(error); }
    const operation = Promise.resolve().then(execute);
    this.#operation = operation;
    return operation.finally(() => {
      if (this.#operation === operation) this.#operation = null;
    });
  }

  async #failRecord(record, cause) {
    this.#withdraw(record);
    const instance = record.instance;
    record.instance = null;
    record.generation += 1;
    record.state = 'failed';
    try { if (instance) await instance.dispose(); } catch (disposeCause) {
      cause = new AggregateError([cause, disposeCause]);
    }
    failSemanticPackage(
      'SEMANTIC_PACKAGE_POLICY_FAILED',
      `Package ${record.manifest.packageId} failed in isolation.`,
      { cause },
    );
  }

  enablePackage(packageId) {
    return this.#start(async () => {
      const record = this.#record(packageId);
      if (record.state === 'incompatible') {
        failSemanticPackage('SEMANTIC_PACKAGE_INCOMPATIBLE', `Package ${packageId} is incompatible.`);
      }
      if (record.state === 'active') {
        failSemanticPackage('SEMANTIC_PACKAGE_ALREADY_ACTIVE', `Package ${packageId} is active.`);
      }
      for (const definition of record.manifest.semanticTypes) {
        if (this.#definitions.has(typeKey(definition.typeId, definition.version))) {
          failSemanticPackage('SEMANTIC_TYPE_COLLISION', `Type ${definition.typeId} collides.`);
        }
      }
      let instance;
      try { instance = activeInstance(await record.manifest.activate()); } catch (cause) {
        return this.#failRecord(record, cause);
      }
      record.instance = instance;
      record.generation += 1;
      record.state = 'active';
      for (const definition of record.manifest.semanticTypes) {
        this.#definitions.set(typeKey(definition.typeId, definition.version), { definition, record });
      }
      this.#activeOrder.push(packageId);
      return this.packageSnapshot(packageId);
    });
  }

  disablePackage(packageId) {
    return this.#start(async () => {
      const record = this.#record(packageId);
      if (record.state !== 'active') {
        failSemanticPackage('SEMANTIC_PACKAGE_NOT_ACTIVE', `Package ${packageId} is not active.`);
      }
      this.#withdraw(record);
      const instance = record.instance;
      record.instance = null;
      record.generation += 1;
      record.state = 'disabled';
      try { await instance.dispose(); } catch (cause) { return this.#failRecord(record, cause); }
      return this.packageSnapshot(packageId);
    });
  }

  constructArtifactDraft(input = {}) {
    this.#requireReady();
    exactRecord(
      input,
      ['artifactId', 'construction', 'typeId', 'typeVersion'],
      'SEMANTIC_CONSTRUCTION_INPUT_INVALID',
      'Semantic construction input',
    );
    if (typeof input.artifactId !== 'string' || !ARTIFACT_ID.test(input.artifactId)) {
      failSemanticPackage('SEMANTIC_ARTIFACT_ID_INVALID', 'Artifact id is invalid.');
    }
    const entry = this.#definitions.get(typeKey(input.typeId, input.typeVersion));
    if (!entry) failSemanticPackage('SEMANTIC_TYPE_UNRESOLVED', 'Semantic type is not active.');
    let constructed;
    try { constructed = normalizeConstructionResult(entry.definition.construct(input.construction)); }
    catch (cause) {
      if (expectedPolicyRejection(cause)) throw cause;
      return this.#failPolicySync(entry.record, cause);
    }
    return new SemanticArtifactDraftValue(this.#identity, Object.freeze({
      artifactId: input.artifactId,
      attributes: constructed.attributes,
      packageGeneration: entry.record.generation,
      packageId: entry.record.manifest.packageId,
      presentation: constructed.presentation,
      provenance: constructed.provenance,
      relations: constructed.relations,
      sourceDrawing: constructed.sourceDrawing,
      typeId: input.typeId,
      typeVersion: input.typeVersion,
    }));
  }

  #failPolicySync(record, cause) {
    this.#withdraw(record);
    const instance = record.instance;
    record.instance = null;
    record.generation += 1;
    record.state = 'failed';
    Promise.resolve().then(() => instance?.dispose()).catch(() => {});
    failSemanticPackage(
      'SEMANTIC_PACKAGE_POLICY_FAILED',
      `Package ${record.manifest.packageId} failed in isolation.`,
      { cause },
    );
  }

  readArtifactDraft(candidate) {
    this.#requireReady();
    if (!(candidate instanceof SemanticArtifactDraftValue)) {
      failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_REQUIRED', 'A branded Artifact draft is required.');
    }
    const value = candidate.read(this.#identity);
    const record = this.#records.get(value.packageId);
    if (!record || record.state !== 'active' || record.generation !== value.packageGeneration) {
      failSemanticPackage('SEMANTIC_ARTIFACT_DRAFT_STALE', 'Artifact draft package generation is stale.');
    }
    return value;
  }

  resolutionOf(artifact) {
    this.#requireReady();
    const entry = this.#definitions.get(typeKey(artifact?.typeId, artifact?.typeVersion));
    return Object.freeze(entry ? {
      packageId: entry.record.manifest.packageId,
      packageState: entry.record.state,
      packageVersion: entry.record.manifest.packageVersion,
      status: 'resolved',
    } : this.#unresolvedResolution(artifact));
  }

  #unresolvedResolution(artifact) {
    const record = [...this.#records.values()].find(({ manifest }) => (
      manifest.semanticTypes.some(({ typeId, version }) => (
        typeId === artifact?.typeId && version === artifact?.typeVersion
      ))
    ));
    return Object.freeze({
      packageId: record?.manifest.packageId ?? null,
      packageState: record?.state ?? 'missing',
      packageVersion: record?.manifest.packageVersion ?? null,
      status: 'unresolved',
    });
  }

  projectionInputsForArtifact(artifact) {
    this.#requireReady();
    if (artifact?.status !== 'active') return Object.freeze([]);
    const entry = this.#definitions.get(typeKey(artifact?.typeId, artifact?.typeVersion));
    if (!entry) return Object.freeze([]);
    try {
      const projected = entry.definition.project(artifact);
      if (!Array.isArray(projected)) throw new TypeError('Projection policy must return an array.');
      return portableValue(projected, 'projectionInputs');
    } catch (cause) {
      if (expectedPolicyRejection(cause)) throw cause;
      return this.#failPolicySync(entry.record, cause);
    }
  }

  inspectArtifact(artifact) {
    this.#requireReady();
    const entry = this.#definitions.get(typeKey(artifact?.typeId, artifact?.typeVersion));
    if (!entry) {
      const resolution = this.resolutionOf(artifact);
      return createUnresolvedArtifactInspection(artifact, resolution);
    }
    try {
      return Object.freeze({
        groups: portableValue(entry.definition.inspect(artifact), 'inspectorGroups'),
        resolution: this.resolutionOf(artifact),
      });
    } catch (cause) {
      if (expectedPolicyRejection(cause)) throw cause;
      return this.#failPolicySync(entry.record, cause);
    }
  }

  inspectArtifactAtReplayCutoff(artifact, replayCutoffEpochMs) {
    this.#requireReady();
    const hidden = hiddenArtifactInspection(artifact, replayCutoffEpochMs);
    return hidden ?? visibleArtifactInspection(this.inspectArtifact(artifact));
  }

  packageSnapshot(packageId) {
    const record = this.#record(packageId);
    return Object.freeze({
      generation: record.generation,
      packageId,
      packageVersion: record.manifest.packageVersion,
      state: record.state,
      typeIds: Object.freeze(record.manifest.semanticTypes.map(({ typeId }) => typeId).sort()),
    });
  }

  listSemanticTypes() {
    this.#requireReady();
    return Object.freeze([...this.#definitions.values()].map(({ definition, record }) => Object.freeze({
      displayMetadata: definition.displayMetadata,
      packageId: record.manifest.packageId,
      typeId: definition.typeId,
      version: definition.version,
    })).sort((left, right) => left.typeId.localeCompare(right.typeId)));
  }

  listTools() {
    this.#requireReady();
    return Object.freeze(this.#activeOrder.flatMap((packageId) => {
      const record = this.#records.get(packageId);
      return record.manifest.toolDescriptors.map((tool) => Object.freeze({
        ...tool,
        packageId,
        packageVersion: record.manifest.packageVersion,
      }));
    }));
  }

  snapshot() {
    return Object.freeze({
      activePackageCount: [...this.#records.values()].filter(({ state }) => state === 'active').length,
      packages: Object.freeze([...this.#records.keys()].sort().map((id) => this.packageSnapshot(id))),
      status: this.#status,
    });
  }

  async dispose() {
    if (this.#status === 'disposed') return this.snapshot();
    if (this.#operation !== null) await this.#operation.catch(() => {});
    for (const packageId of [...this.#activeOrder].reverse()) {
      const record = this.#records.get(packageId);
      this.#withdraw(record);
      try { await record.instance.dispose(); } catch { record.state = 'failed'; }
      record.instance = null;
      record.generation += 1;
    }
    this.#definitions.clear();
    for (const record of this.#records.values()) record.state = 'disposed';
    this.#status = 'disposed';
    return this.snapshot();
  }
}

/** Create one isolated trusted-build Semantic package lifecycle owner. */
export function createSemanticPackageRegistry(input = {}) {
  const registry = new SemanticPackageRegistry(input);
  return Object.freeze({
    constructArtifactDraft: registry.constructArtifactDraft.bind(registry),
    disablePackage: registry.disablePackage.bind(registry),
    dispose: registry.dispose.bind(registry),
    enablePackage: registry.enablePackage.bind(registry),
    inspectArtifact: registry.inspectArtifact.bind(registry),
    inspectArtifactAtReplayCutoff: registry.inspectArtifactAtReplayCutoff.bind(registry),
    listSemanticTypes: registry.listSemanticTypes.bind(registry),
    listTools: registry.listTools.bind(registry),
    packageSnapshot: registry.packageSnapshot.bind(registry),
    projectionInputsForArtifact: registry.projectionInputsForArtifact.bind(registry),
    readArtifactDraft: registry.readArtifactDraft.bind(registry),
    resolutionOf: registry.resolutionOf.bind(registry),
    snapshot: registry.snapshot.bind(registry),
  });
}
