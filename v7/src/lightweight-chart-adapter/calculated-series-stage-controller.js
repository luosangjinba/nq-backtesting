import { createChartCalculatedSeriesProjectionOwner } from '../chart-snapshot-application/public.js';
import { readCalculatedSeriesPaneSurfaceCandidate } from '../calculated-series-chart-projection/public.js';
import { failLightweightAdapter } from './adapter-error.js';

function requireWorkflowPort(value) {
  if (value === null || value === undefined) return null;
  for (const method of [
    'acceptWorkspaceSurface', 'prepareWorkspaceSurface', 'rollbackWorkspaceSurface',
  ]) {
    if (typeof value?.[method] !== 'function') {
      failLightweightAdapter(
        'CALCULATED_SERIES_WORKFLOW_PORT_INVALID',
        `Calculated-series workflow port requires ${method}().`,
      );
    }
  }
  return value;
}

/** Keep P1c.2 preparations inside the sole mounted Chart adapter transaction. */
export function createCalculatedSeriesStageController({
  chartOwnedSurfaces,
  port,
  readAdapterRevision,
}) {
  const workflow = requireWorkflowPort(port);
  let acceptedBinding = null;
  let expectedBinding = null;
  let finalizeFailure = null;
  let owner = null;
  let pendingFinalize = Promise.resolve();

  async function ensureOwner() {
    if (owner !== null) return owner;
    owner = createChartCalculatedSeriesProjectionOwner({
      currentBinding(mode) {
        return mode === 'same-snapshot-settlement'
          ? acceptedBinding : expectedBinding ?? acceptedBinding;
      },
      projectionFactory: await chartOwnedSurfaces.calculatedSeriesProjectionFactory(),
    });
    return owner;
  }

  async function stageCandidate(candidate, token = null) {
    await pendingFinalize;
    const record = readCalculatedSeriesPaneSurfaceCandidate(candidate);
    expectedBinding = record.chartBinding;
    const prepared = await (await ensureOwner()).prepare(candidate);
    return {
      binding: record.chartBinding,
      prepared,
      receipt: null,
      state: 'prepared',
      token,
    };
  }

  async function rollback(stage, notifyWorkflow) {
    if (stage === null || stage.state === 'rolled-back') return;
    try {
      if (stage.prepared !== null) {
        if (stage.state === 'applied') await stage.prepared.rollback(stage.receipt);
        else if (stage.state === 'prepared') await stage.prepared.dispose();
      }
    } finally {
      stage.state = 'rolled-back';
      expectedBinding = acceptedBinding;
      if (notifyWorkflow && stage.token !== null) workflow.rollbackWorkspaceSurface(stage.token);
    }
  }

  async function apply(stage) {
    if (stage === null) return;
    if (stage.state !== 'prepared') {
      failLightweightAdapter(
        'CALCULATED_SERIES_CHART_STAGE_INVALID',
        'Only a prepared calculated-series Chart stage may apply.',
      );
    }
    if (stage.prepared !== null) stage.receipt = await stage.prepared.apply();
    stage.state = 'applied';
  }

  function finalize(stage, notifyWorkflow) {
    if (stage === null) return;
    if (stage.state !== 'applied') {
      failLightweightAdapter(
        'CALCULATED_SERIES_CHART_STAGE_INVALID',
        'Only an applied calculated-series Chart stage may finalize.',
      );
    }
    if (stage.prepared === null) {
      stage.state = 'finalized';
      if (notifyWorkflow && stage.token !== null) workflow.acceptWorkspaceSurface(stage.token);
      return;
    }
    // P1c.2 native finalization mutates synchronously before its Promise settles.
    // The outer Workspace coordinator therefore keeps its required synchronous
    // final turn while any post-decision cleanup rejection remains observable.
    const settling = stage.prepared.finalize(stage.receipt);
    stage.state = 'finalized';
    acceptedBinding = stage.binding;
    expectedBinding = acceptedBinding;
    pendingFinalize = Promise.resolve(settling).then(() => {
      if (notifyWorkflow && stage.token !== null) workflow.acceptWorkspaceSurface(stage.token);
    }).catch((error) => { finalizeFailure = error; });
  }

  return Object.freeze({
    apply,
    async dispose() {
      try {
        await pendingFinalize;
      } finally {
        if (owner !== null) await owner.dispose();
        owner = null;
        acceptedBinding = null;
        expectedBinding = null;
      }
    },
    finalizeWorkspace(stage) { finalize(stage, true); },
    async prepareExternal(candidate) {
      const stage = await stageCandidate(candidate);
      return Object.freeze({
        apply: async () => { await apply(stage); return stage.receipt; },
        dispose: async () => rollback(stage, false),
        finalize(receipt) {
          if (receipt !== stage.receipt) {
            failLightweightAdapter(
              'CALCULATED_SERIES_CHART_RECEIPT_INVALID',
              'Calculated-series Chart receipt belongs to another preparation.',
            );
          }
          const settling = stage.prepared.finalize(stage.receipt);
          stage.state = 'finalized';
          acceptedBinding = stage.binding;
          expectedBinding = acceptedBinding;
          pendingFinalize = Promise.resolve(settling).catch((error) => {
            finalizeFailure = error;
            throw error;
          });
          return pendingFinalize;
        },
        rollback: async (receipt) => {
          if (receipt !== stage.receipt) {
            failLightweightAdapter(
              'CALCULATED_SERIES_CHART_RECEIPT_INVALID',
              'Calculated-series Chart rollback receipt is foreign.',
            );
          }
          return rollback(stage, false);
        },
      });
    },
    async prepareWorkspace(input) {
      if (workflow === null) return null;
      const acceptedSurfaceRevision = owner?.snapshot().child.acceptedSurfaceRevision ?? 0;
      const prepared = await workflow.prepareWorkspaceSurface({
        ...input,
        acceptedChartRevision: readAdapterRevision(),
        baseSurfaceRevision: acceptedSurfaceRevision,
        targetChartRevision: readAdapterRevision() + 1,
        targetSurfaceRevision: acceptedSurfaceRevision + 1,
        workspaceStateRevision: readAdapterRevision() + 1,
      });
      if (prepared.candidate === null) {
        return {
          binding: acceptedBinding,
          prepared: null,
          receipt: null,
          state: 'prepared',
          token: prepared.token,
        };
      }
      return stageCandidate(prepared.candidate, prepared.token);
    },
    rollbackWorkspace: (stage) => rollback(stage, true),
    snapshot() {
      return Object.freeze({
        acceptedBinding,
        acceptedChartRevision: readAdapterRevision(),
        acceptedSurfaceRevision: owner?.snapshot().child.acceptedSurfaceRevision ?? 0,
        finalizeFailure: finalizeFailure === null ? null : Object.freeze({
          code: finalizeFailure.code ?? finalizeFailure.name,
          message: finalizeFailure.message,
        }),
      });
    },
  });
}
