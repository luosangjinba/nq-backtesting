import { defineAnchorProjectionPolicy } from './anchor-policy-definition.js';
import { createAnchorProjectionPolicyRegistry } from './anchor-policy-registry.js';

export const ANCHOR_PROJECTION_POLICIES = Object.freeze({
  acceptedContainingBucket: 'projection.anchor.accepted-containing-bucket',
  exactInstant: 'projection.anchor.exact-instant',
});

function containing(values, epochMs) {
  return values.filter((value) => value.startEpochMs <= epochMs && epochMs < value.endEpochMs);
}

const EXACT_INSTANT = defineAnchorProjectionPolicy({
  policyId: ANCHOR_PROJECTION_POLICIES.exactInstant,
  version: '1.0.0',
  project({ anchor, pane, replayCutoffEpochMs }) {
    if (anchor.instrumentId !== pane.instrumentId || anchor.epochMs > replayCutoffEpochMs) return null;
    const target = pane.acceptedBuckets.find(({ startEpochMs }) => (
      startEpochMs === anchor.epochMs && startEpochMs <= replayCutoffEpochMs
    ));
    if (!target) return null;
    return {
      anchor,
      mapping: {
        canonicalEpochMs: anchor.epochMs,
        sourceBar: null,
        targetBucket: target,
        targetTimeframeId: pane.timeframeId,
      },
    };
  },
});

const ACCEPTED_CONTAINING_BUCKET = defineAnchorProjectionPolicy({
  policyId: ANCHOR_PROJECTION_POLICIES.acceptedContainingBucket,
  version: '1.0.0',
  project({ anchor, pane, replayCutoffEpochMs, sourceBars }) {
    if (anchor.instrumentId !== pane.instrumentId || anchor.epochMs > replayCutoffEpochMs) return null;
    const sources = containing(sourceBars, anchor.epochMs)
      .filter(({ instrumentId, startEpochMs }) => (
        instrumentId === anchor.instrumentId && startEpochMs <= replayCutoffEpochMs
      ));
    const targets = containing(pane.acceptedBuckets, anchor.epochMs)
      .filter(({ startEpochMs }) => startEpochMs <= replayCutoffEpochMs);
    if (sources.length !== 1 || targets.length !== 1) return null;
    const target = targets[0];
    return {
      anchor: { ...anchor, epochMs: target.startEpochMs },
      mapping: {
        canonicalEpochMs: anchor.epochMs,
        sourceBar: sources[0],
        targetBucket: target,
        targetTimeframeId: pane.timeframeId,
      },
    };
  },
});

/** Create the isolated R13.8 built-in policy registry. */
export function createInitialAnchorProjectionPolicyRegistry() {
  return createAnchorProjectionPolicyRegistry({
    definitions: [EXACT_INSTANT, ACCEPTED_CONTAINING_BUCKET],
  });
}
