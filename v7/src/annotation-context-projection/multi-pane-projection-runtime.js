import { failContextProjection } from './context-projection-error.js';
import {
  mountProjectionSurfaces,
  settlePaneProjectionSets,
} from './multi-pane-settlement.js';
import {
  deriveAnnotationPaneProjectionSets,
  requireContextProjectionFactory,
  requireContextProjectionGeometryContract,
} from './projection-assembly.js';
import { readAnnotationProjectionFrame } from './projection-frame.js';

class MultiPaneAnnotationProjectionRuntime {
  #acceptedAnnotationRevision = null;
  #acceptedReconciliationRevision = null;
  #createProjection;
  #geometryContract;
  #operation = null;
  #policyRegistry;
  #status = 'ready';

  constructor({ createProjection, geometryContract, policyRegistry }) {
    this.#createProjection = requireContextProjectionFactory(createProjection);
    this.#geometryContract = requireContextProjectionGeometryContract(geometryContract);
    if (!policyRegistry || typeof policyRegistry.project !== 'function') {
      failContextProjection(
        'CONTEXT_PROJECTION_POLICY_REGISTRY_INVALID',
        'Context projection requires one Anchor policy registry.',
      );
    }
    this.#policyRegistry = policyRegistry;
  }

  #requireReady(frame) {
    if (this.#status === 'disposed') {
      failContextProjection('CONTEXT_PROJECTION_RUNTIME_DISPOSED', 'Projection Runtime is disposed.');
    }
    if (this.#status === 'poisoned') {
      failContextProjection('CONTEXT_PROJECTION_RUNTIME_POISONED', 'Projection Runtime requires reconstruction.');
    }
    if (this.#operation !== null) {
      failContextProjection('CONTEXT_PROJECTION_RUNTIME_BUSY', 'One projection reconciliation is active.');
    }
    const value = readAnnotationProjectionFrame(frame);
    if (this.#acceptedReconciliationRevision !== null
      && value.reconciliationRevision <= this.#acceptedReconciliationRevision) {
      failContextProjection('CONTEXT_PROJECTION_REVISION_STALE', 'Reconciliation revision is stale.');
    }
    if (this.#acceptedAnnotationRevision !== null
      && value.annotationRevision < this.#acceptedAnnotationRevision) {
      failContextProjection('CONTEXT_PROJECTION_ANNOTATION_STALE', 'Annotation revision is stale.');
    }
    return value;
  }

  async #reconcile({ frame, subjects, surfaces }) {
    const frameValue = readAnnotationProjectionFrame(frame);
    const mounted = mountProjectionSurfaces(surfaces, frameValue);
    const sets = deriveAnnotationPaneProjectionSets({
      createProjection: this.#createProjection,
      frame,
      geometryContract: this.#geometryContract,
      policyRegistry: this.#policyRegistry,
      subjects,
    });
    try {
      await settlePaneProjectionSets({
        accept: () => {
          this.#acceptedAnnotationRevision = frameValue.annotationRevision;
          this.#acceptedReconciliationRevision = frameValue.reconciliationRevision;
        },
        frame: frameValue,
        mounted,
        sets,
      });
    } catch (error) {
      if (['CONTEXT_PROJECTION_ROLLBACK_FAILED', 'CONTEXT_PROJECTION_FINALIZE_FAILED']
        .includes(error.code)) this.#status = 'poisoned';
      throw error;
    }
    return Object.freeze({
      annotationRevision: frameValue.annotationRevision,
      mountedPaneCount: mounted.length,
      paneSets: sets,
      reconciliationRevision: frameValue.reconciliationRevision,
      sessionId: frameValue.sessionId,
    });
  }

  reconcile(input = {}) {
    try {
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).sort().join(',') !== 'frame,subjects,surfaces') {
        failContextProjection(
          'CONTEXT_PROJECTION_RECONCILE_INPUT_INVALID',
          'Projection reconciliation fields must be exact.',
        );
      }
      this.#requireReady(input.frame);
    } catch (error) { return Promise.reject(error); }
    const operation = Promise.resolve().then(() => this.#reconcile(input));
    this.#operation = operation;
    return operation.finally(() => {
      if (this.#operation === operation) this.#operation = null;
    });
  }

  snapshot() {
    return Object.freeze({
      acceptedAnnotationRevision: this.#acceptedAnnotationRevision,
      acceptedReconciliationRevision: this.#acceptedReconciliationRevision,
      active: this.#operation !== null,
      status: this.#status,
    });
  }

  async dispose() {
    if (this.#status === 'disposed') return this.snapshot();
    if (this.#operation !== null) await this.#operation.catch(() => {});
    this.#createProjection = null;
    this.#geometryContract = null;
    this.#policyRegistry = null;
    this.#status = 'disposed';
    return this.snapshot();
  }
}

/** Create one isolated read-only multi-Pane Annotation projection coordinator. */
export function createMultiPaneAnnotationProjectionRuntime(input = {}) {
  const runtime = new MultiPaneAnnotationProjectionRuntime(input);
  return Object.freeze({
    dispose: runtime.dispose.bind(runtime),
    reconcile: runtime.reconcile.bind(runtime),
    snapshot: runtime.snapshot.bind(runtime),
  });
}
