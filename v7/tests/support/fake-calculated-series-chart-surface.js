const clone = (value) => structuredClone(value);

function retainedCounts(previous, candidate) {
  const intersection = (prior, next, key) => {
    const priorIds = new Set((prior?.[key] ?? []).map((value) => value[key === 'regions'
      ? 'regionId' : key === 'scales' ? 'scaleGroupId' : 'resourceId']));
    return next[key].filter((value) => priorIds.has(value[key === 'regions'
      ? 'regionId' : key === 'scales' ? 'scaleGroupId' : 'resourceId'])).length;
  };
  return Object.freeze({
    bands: intersection(previous, candidate, 'bands'),
    plots: intersection(previous, candidate, 'plots'),
    referenceLines: intersection(previous, candidate, 'referenceLines'),
    regions: intersection(previous, candidate, 'regions'),
    scales: intersection(previous, candidate, 'scales'),
  });
}

/** Deterministic bounded native-surface double with reversible phase failure injection. */
export function createFakeCalculatedSeriesChartSurface() {
  let accepted = null;
  let active = null;
  let disposed = false;
  let failure = null;
  let mutationCount = 0;
  const events = [];

  function maybeFail(phase, recoveryUnproven = false) {
    if (failure?.phase !== phase) return;
    const unproven = recoveryUnproven || failure.recoveryUnproven === true;
    failure = null;
    throw Object.assign(new Error(`Injected ${phase} failure.`), { recoveryUnproven: unproven });
  }

  return Object.freeze({
    async apply(plan) {
      events.push('apply:start');
      const previous = accepted;
      mutationCount += 1;
      try {
        maybeFail('apply:mutation');
        const stage = { candidate: clone(plan), previous, state: 'applied' };
        active = stage;
        maybeFail('apply:readback');
        events.push('apply:painted');
        return Object.freeze({
          readback: Object.freeze({
            candleInvariant: true,
            logicalResourceCount: plan.resourceCount,
            matchedColorPixels: plan.resourceCount === 0 ? 0 : 1,
            paneCount: plan.regions.length,
            regions: Object.freeze(plan.regions.map(({ regionId }) => regionId)),
            retainedHandles: retainedCounts(previous, plan),
            resourceIds: Object.freeze([
              ...plan.plots, ...plan.bands, ...plan.referenceLines,
            ].map(({ resourceId }) => resourceId).sort()),
          }),
          stage,
        });
      } catch (error) {
        active = null;
        mutationCount -= 1;
        throw error;
      }
    },
    async dispose() {
      if (disposed) return;
      maybeFail('dispose', true);
      accepted = null;
      active = null;
      disposed = true;
      events.push('dispose');
    },
    failNext(phase, { recoveryUnproven = false } = {}) {
      failure = { phase, recoveryUnproven };
    },
    inspect: () => Object.freeze({
      accepted: accepted === null ? null : clone(accepted),
      active: active === null ? null : clone(active.candidate),
    }),
    async finalize(stage) {
      if (stage !== active) throw new Error('Foreign fake native stage.');
      accepted = stage.candidate;
      active = null;
      events.push('finalize:publish');
      maybeFail('finalize:cleanup', true);
    },
    preflight(plan) {
      if (disposed) throw new Error('Disposed fake surface.');
      if (!Array.isArray(plan?.regions)) throw new Error('Invalid fake plan.');
      events.push('preflight');
      maybeFail('preflight');
    },
    async rollback(stage) {
      if (stage !== active) throw new Error('Foreign fake native stage.');
      maybeFail('rollback', true);
      accepted = stage.previous;
      active = null;
      mutationCount -= 1;
      events.push('rollback');
    },
    snapshot: () => Object.freeze({
      accepted: accepted === null ? null : Object.freeze({
        logicalResourceCount: accepted.resourceCount,
        resourceIds: Object.freeze([
          ...accepted.plots, ...accepted.bands, ...accepted.referenceLines,
        ].map(({ resourceId }) => resourceId).sort()),
      }),
      active: active?.state ?? null,
      disposed,
      events: Object.freeze([...events]),
      mutationCount,
    }),
  });
}
