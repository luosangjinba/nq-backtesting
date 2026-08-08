import { requireAnnotationPrimitiveHandle } from './primitive-adapter-port.js';

function projectedRecord(candidate, handle) {
  return Object.freeze({
    handle,
    projection: candidate.projection,
    projectionId: candidate.snapshot.projectionId,
    projectionRevision: candidate.snapshot.revision,
    signature: candidate.signature,
  });
}

/** Apply one inert projection plan while retaining an exact reverse mutation log. */
export async function applyAnnotationProjectionPlan(adapter, plan, mutations) {
  const nextRecords = new Map();
  for (const operation of plan.operations) {
    if (operation.kind === 'retain') {
      nextRecords.set(operation.current.projectionId, operation.current);
      continue;
    }
    if (operation.kind === 'attach') {
      const handle = requireAnnotationPrimitiveHandle(await adapter.create(operation.candidate.projection));
      mutations.push({ handle, kind: 'attach' });
      await adapter.attach(handle);
      nextRecords.set(operation.candidate.snapshot.projectionId, projectedRecord(operation.candidate, handle));
      continue;
    }
    if (operation.kind === 'update') {
      mutations.push({
        handle: operation.current.handle,
        kind: 'update',
        previousProjection: operation.current.projection,
      });
      await adapter.update(operation.current.handle, operation.candidate.projection);
      nextRecords.set(
        operation.candidate.snapshot.projectionId,
        projectedRecord(operation.candidate, operation.current.handle),
      );
      continue;
    }
    mutations.push({ handle: operation.current.handle, kind: 'detach' });
    await adapter.detach(operation.current.handle);
  }
  return Object.freeze({ mutations, nextRecords });
}

/** Reverse every applied primitive mutation in exact reverse order. */
export async function rollbackAnnotationProjectionMutations(adapter, mutations) {
  const failures = [];
  for (const mutation of [...mutations].reverse()) {
    try {
      if (mutation.kind === 'attach') {
        await adapter.detach(mutation.handle);
        await adapter.destroy(mutation.handle);
      } else if (mutation.kind === 'update') {
        await adapter.update(mutation.handle, mutation.previousProjection);
      } else await adapter.attach(mutation.handle);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Primitive rollback failed.');
}

/** Destroy only obsolete handles after the replacement set becomes accepted. */
export async function destroyDetachedAnnotationPrimitives(adapter, mutations) {
  const failures = [];
  for (const mutation of mutations) {
    if (mutation.kind !== 'detach') continue;
    try { await adapter.destroy(mutation.handle); } catch (error) { failures.push(error); }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Detached primitive cleanup failed.');
}

/** Detach and destroy all currently accepted primitive handles during owner disposal. */
export async function disposeAnnotationPrimitiveRecords(adapter, records) {
  const failures = [];
  for (const record of [...records.values()].sort((left, right) => (
    left.projectionId.localeCompare(right.projectionId)
  )).reverse()) {
    try { await adapter.detach(record.handle); } catch (error) { failures.push(error); }
    try { await adapter.destroy(record.handle); } catch (error) { failures.push(error); }
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Primitive disposal failed.');
}
