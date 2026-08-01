import { retargetProjectedPaneSnapshot } from '../projection-domain/public.js';

function sameValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Share deterministic per-transaction Pane projection output only across exact inputs. */
export function createPaneProjectionMemo() {
  let currentIdentity = null;
  let entries = [];

  return Object.freeze({
    project({ acceptedBars, compute, identity, kind, paneId, requestKeys, selection }) {
      if (currentIdentity !== identity) {
        currentIdentity = identity;
        entries = [];
      }
      const reused = entries.find((entry) => entry.kind === kind
        && entry.acceptedBars === acceptedBars
        && entry.selection === selection
        && sameValues(entry.requestKeys, requestKeys));
      if (reused) return retargetProjectedPaneSnapshot(reused.snapshot, paneId);
      const snapshot = compute();
      entries.push(Object.freeze({ acceptedBars, kind, requestKeys, selection, snapshot }));
      return snapshot;
    },
  });
}
