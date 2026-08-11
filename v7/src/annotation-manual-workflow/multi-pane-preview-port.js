import { failManualWorkflow } from './workflow-error.js';

function requireSurface(value) {
  if (!value || typeof value.paneId !== 'string'
    || typeof value.previewPort?.replace !== 'function'
    || typeof value.previewPort?.clear !== 'function'
    || typeof value.previewPort?.snapshot !== 'function') {
    failManualWorkflow(
      'MANUAL_WORKFLOW_PREVIEW_SURFACE_INVALID',
      'Multi-Pane Preview requires bounded Chart Preview surfaces.',
    );
  }
  return value;
}

function subjectsFrom(candidates, contextProjection) {
  if (!Array.isArray(candidates) || candidates.length > 8) {
    failManualWorkflow(
      'MANUAL_WORKFLOW_PREVIEW_INPUT_INVALID',
      'Semantic Preview candidates must be a bounded array.',
    );
  }
  return Object.freeze(candidates.map((candidate) => (
    contextProjection.createAnnotationProjectionSubject(candidate?.subject)
  )));
}

async function settleAll(operations, label) {
  const settled = await Promise.allSettled(operations);
  const failures = settled
    .filter(({ status }) => status === 'rejected')
    .map(({ reason }) => reason);
  if (failures.length > 0) throw new AggregateError(failures, label);
}

/** Own one package-neutral, rollback-protected multi-Pane transient Preview. */
export function createMultiPaneSemanticPreviewPort({
  chartProjection,
  contextProjection,
  createFrame,
  geometryContract,
  listSurfaces,
  policyRegistry,
} = {}) {
  if (typeof createFrame !== 'function' || typeof listSurfaces !== 'function') {
    failManualWorkflow(
      'MANUAL_WORKFLOW_PREVIEW_PORT_INVALID',
      'Multi-Pane Preview requires frame and surface readers.',
    );
  }
  let current = null;
  let disposed = false;
  let operation = null;

  function surfaces() {
    const values = listSurfaces();
    if (!Array.isArray(values)) {
      failManualWorkflow('MANUAL_WORKFLOW_PREVIEW_SURFACE_INVALID', 'Preview surfaces must be an array.');
    }
    return values.map(requireSurface);
  }

  function projectionSets(candidates) {
    return contextProjection.deriveAnnotationPaneProjectionSets({
      createProjection: chartProjection.createAnnotationProjection,
      frame: createFrame(),
      geometryContract,
      policyRegistry,
      subjects: subjectsFrom(candidates, contextProjection),
    });
  }

  function start(work) {
    if (disposed) {
      return Promise.reject(Object.assign(new Error('Multi-Pane Preview is disposed.'), {
        code: 'MANUAL_WORKFLOW_PREVIEW_DISPOSED',
      }));
    }
    if (operation !== null) {
      return Promise.reject(Object.assign(new Error('Multi-Pane Preview is busy.'), {
        code: 'MANUAL_WORKFLOW_PREVIEW_BUSY',
      }));
    }
    operation = Promise.resolve().then(work);
    return operation.finally(() => { operation = null; });
  }

  async function restore(identity, previous, activeSurfaces) {
    if (previous === null) {
      await settleAll(activeSurfaces.map((surface) => surface.previewPort.clear(identity)),
        'Multi-Pane Preview rollback could not clear candidate projections.');
      return;
    }
    const priorByPane = new Map(previous.sets.map((set) => [set.paneId, set.projections]));
    await settleAll(activeSurfaces.map((surface) => surface.previewPort.replace(
      previous.identity,
      priorByPane.get(surface.paneId) ?? Object.freeze([]),
    )), 'Multi-Pane Preview rollback could not restore prior projections.');
  }

  return Object.freeze({
    clear(identity) {
      return start(async () => {
        const activeSurfaces = surfaces().filter(({ previewPort }) => (
          previewPort.snapshot().activePreviewId !== null
        ));
        await settleAll(
          activeSurfaces.map((surface) => surface.previewPort.clear(identity)),
          'Multi-Pane Preview could not clear every Pane.',
        );
        current = null;
        return Object.freeze({ paneCount: activeSurfaces.length, status: 'cleared' });
      });
    },
    async dispose() {
      if (disposed) return;
      if (operation !== null) await operation.catch(() => {});
      if (current !== null) {
        const activeSurfaces = surfaces().filter(({ previewPort }) => (
          previewPort.snapshot().activePreviewId !== null
        ));
        await Promise.allSettled(activeSurfaces.map((surface) => (
          surface.previewPort.clear(current.identity)
        )));
      }
      current = null;
      disposed = true;
    },
    replace(identity, candidates) {
      return start(async () => {
        const activeSurfaces = surfaces();
        const sets = projectionSets(candidates);
        const byPane = new Map(sets.map((set) => [set.paneId, set.projections]));
        const previous = current;
        try {
          await settleAll(activeSurfaces.map((surface) => surface.previewPort.replace(
            identity,
            byPane.get(surface.paneId) ?? Object.freeze([]),
          )), 'Multi-Pane Preview could not settle every Pane.');
        } catch (cause) {
          try { await restore(identity, previous, activeSurfaces); } catch (rollbackCause) {
            failManualWorkflow(
              'MANUAL_WORKFLOW_PREVIEW_ROLLBACK_FAILED',
              'Semantic Preview failed and exact multi-Pane rollback was not proven.',
              { cause: new AggregateError([cause, rollbackCause]) },
            );
          }
          failManualWorkflow(
            'MANUAL_WORKFLOW_PREVIEW_APPLY_FAILED',
            'Semantic Preview failed and restored the prior transient projections.',
            { cause },
          );
        }
        current = Object.freeze({ identity, sets });
        return Object.freeze({ paneCount: activeSurfaces.length, status: 'applied' });
      });
    },
    snapshot: () => Object.freeze({
      active: current !== null,
      busy: operation !== null,
      disposed,
      paneIds: Object.freeze(current?.sets.map(({ paneId }) => paneId) ?? []),
    }),
  });
}
