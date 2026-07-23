import { failPaneLayout } from './layout-error.js';

const LAYOUT_SCHEMA = 'v7.pane-layout';
const LAYOUT_VERSION = 1;
const DIVIDER_SIZE_PX = 5;
const MIN_PANE_WIDTH_PX = 280;
const MIN_PANE_HEIGHT_PX = 120;
const RATIO_MINIMUM = 0.05;
const RATIO_MAXIMUM = 0.95;

const leaf = (slot) => Object.freeze({ kind: 'leaf', slot });
const split = (id, axis, ratio, first, second) => Object.freeze({
  axis, first, id, kind: 'split', ratio, second,
});

function triplet(axis, id, slots) {
  return split(id, axis, 1 / 3, leaf(slots[0]), split(
    `${id}.rest`, axis, 1 / 2, leaf(slots[1]), leaf(slots[2]),
  ));
}

// A leaf slot is a stable Pane priority, not reading order: slot 0 is P1.
// Product geometry orders Panes by right edge first, then top edge. This makes
// P1 the right Pane in columns and the top Pane in rows, and lets count
// reduction retain P1..Pn without consulting focus, Replay, or chart state.
const DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'layout.single', label: 'Single', paneCount: 1, tree: leaf(0) }),
  Object.freeze({
    id: 'layout.two-columns', label: 'Two columns', paneCount: 2,
    tree: split('root', 'x', 1 / 2, leaf(1), leaf(0)),
  }),
  Object.freeze({
    id: 'layout.two-rows', label: 'Two rows', paneCount: 2,
    tree: split('root', 'y', 1 / 2, leaf(0), leaf(1)),
  }),
  Object.freeze({
    id: 'layout.three-columns', label: 'Three columns', paneCount: 3,
    tree: triplet('x', 'root', [2, 1, 0]),
  }),
  Object.freeze({
    id: 'layout.three-rows', label: 'Three rows', paneCount: 3,
    tree: triplet('y', 'root', [0, 1, 2]),
  }),
  Object.freeze({
    id: 'layout.three-left-stack', label: 'Two left, one right', paneCount: 3,
    tree: split('root', 'x', 1 / 2,
      split('root.first', 'y', 1 / 2, leaf(1), leaf(2)), leaf(0)),
  }),
  Object.freeze({
    id: 'layout.three-right-stack', label: 'One left, two right', paneCount: 3,
    tree: split('root', 'x', 1 / 2, leaf(2),
      split('root.second', 'y', 1 / 2, leaf(0), leaf(1))),
  }),
  Object.freeze({
    id: 'layout.four-grid', label: 'Four grid', paneCount: 4,
    tree: split('root', 'y', 1 / 2,
      split('root.first', 'x', 1 / 2, leaf(2), leaf(0)),
      split('root.second', 'x', 1 / 2, leaf(3), leaf(1))),
  }),
  Object.freeze({
    id: 'layout.four-left-stack', label: 'Three left, one right', paneCount: 4,
    tree: split('root', 'x', 1 / 2, triplet('y', 'root.first', [1, 2, 3]), leaf(0)),
  }),
  Object.freeze({
    id: 'layout.four-right-stack', label: 'One left, three right', paneCount: 4,
    tree: split('root', 'x', 1 / 2, leaf(3), triplet('y', 'root.second', [0, 1, 2])),
  }),
  Object.freeze({
    id: 'layout.four-one-over-three', label: 'One top, three bottom', paneCount: 4,
    tree: split('root', 'y', 1 / 2, leaf(0), triplet('x', 'root.second', [3, 2, 1])),
  }),
  Object.freeze({
    id: 'layout.four-three-over-one', label: 'Three top, one bottom', paneCount: 4,
    tree: split('root', 'y', 1 / 2, triplet('x', 'root.first', [3, 2, 0]), leaf(1)),
  }),
]);

const DEFINITIONS_BY_ID = new Map(DEFINITIONS.map((definition) => [definition.id, definition]));

export const PANE_LAYOUT_OPTIONS = Object.freeze(DEFINITIONS.map(({ id, label, paneCount }) => (
  Object.freeze({ id, label, paneCount })
)));

class PaneLayoutValue {
  #value;

  constructor(value) {
    this.#value = Object.freeze(value);
    Object.freeze(this);
  }

  read() { return this.#value; }
}

function definitionFor(variantId) {
  const definition = DEFINITIONS_BY_ID.get(variantId);
  if (!definition) failPaneLayout('PANE_LAYOUT_VARIANT_INVALID', 'Pane layout variant is unsupported.');
  return definition;
}

function collectSplits(node, target = new Map()) {
  if (node.kind === 'leaf') return target;
  target.set(node.id, node);
  collectSplits(node.first, target);
  collectSplits(node.second, target);
  return target;
}

function requireRatio(value, label = 'ratio') {
  if (!Number.isFinite(value) || value < RATIO_MINIMUM || value > RATIO_MAXIMUM) {
    failPaneLayout('PANE_LAYOUT_RATIO_INVALID', `${label} must be between ${RATIO_MINIMUM} and ${RATIO_MAXIMUM}.`);
  }
  return value;
}

function normalizedRatios(definition, candidate = {}) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    failPaneLayout('PANE_LAYOUT_RATIOS_INVALID', 'Pane layout ratios must be an object keyed by split id.');
  }
  const splits = collectSplits(definition.tree);
  for (const key of Object.keys(candidate)) {
    if (!splits.has(key)) failPaneLayout('PANE_LAYOUT_SPLIT_INVALID', 'Pane layout ratio references an unknown split.');
  }
  return Object.freeze(Object.fromEntries([...splits].map(([id, node]) => [
    id, requireRatio(Object.hasOwn(candidate, id) ? candidate[id] : node.ratio, `ratios.${id}`),
  ])));
}

function materializeTree(node, ratios) {
  if (node.kind === 'leaf') return node;
  return Object.freeze({
    axis: node.axis,
    first: materializeTree(node.first, ratios),
    id: node.id,
    kind: 'split',
    ratio: ratios[node.id],
    second: materializeTree(node.second, ratios),
  });
}

function createValue(definition, ratios) {
  return new PaneLayoutValue({
    paneCount: definition.paneCount,
    ratios,
    schemaVersion: LAYOUT_VERSION,
    tree: materializeTree(definition.tree, ratios),
    variantId: definition.id,
  });
}

/**
 * Owner: Pane Layout Domain.
 * Purpose: create one immutable one-to-four Pane split-tree intent.
 * Inputs: registered variant id and optional persisted split ratios.
 * Outputs: branded immutable layout with deterministic leaf order.
 * Side effects/lifecycle: none.
 * Errors: PaneLayoutDomainError for unknown variants, splits, or unsafe ratios.
 */
export function createPaneLayout({ ratios = {}, variantId = 'layout.single' } = {}) {
  const definition = definitionFor(variantId);
  return createValue(definition, normalizedRatios(definition, ratios));
}

/** Read a branded Pane layout without accepting structural lookalikes. */
export function readPaneLayout(candidate) {
  if (!(candidate instanceof PaneLayoutValue)) {
    failPaneLayout('PANE_LAYOUT_REQUIRED', 'A branded Pane layout is required.');
  }
  return candidate.read();
}

/** Serialize a branded Pane layout for the Session-owned workspace envelope. */
export function serializePaneLayout(layout) {
  const value = readPaneLayout(layout);
  return Object.freeze({
    ratios: value.ratios,
    schema: LAYOUT_SCHEMA,
    variantId: value.variantId,
    version: LAYOUT_VERSION,
  });
}

/** Restore a persisted Pane layout through its exact versioned public schema. */
export function deserializePaneLayout(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'ratios,schema,variantId,version'
    || value.schema !== LAYOUT_SCHEMA || value.version !== LAYOUT_VERSION) {
    failPaneLayout('PANE_LAYOUT_WIRE_INVALID', 'Persisted Pane layout schema is unsupported.');
  }
  return createPaneLayout({ ratios: value.ratios, variantId: value.variantId });
}

function findSplit(node, splitId) {
  if (node.kind === 'leaf') return null;
  if (node.id === splitId) return node;
  return findSplit(node.first, splitId) ?? findSplit(node.second, splitId);
}

function minimumExtent(node, axis) {
  if (node.kind === 'leaf') return axis === 'x' ? MIN_PANE_WIDTH_PX : MIN_PANE_HEIGHT_PX;
  const first = minimumExtent(node.first, axis);
  const second = minimumExtent(node.second, axis);
  return node.axis === axis ? first + DIVIDER_SIZE_PX + second : Math.max(first, second);
}

/**
 * Constrain and apply one drag/keyboard resize without touching Pane, Replay,
 * chart, viewport, or persistence state. The caller supplies the measured
 * split-container extent so every descendant Pane retains its minimum size.
 */
export function resizePaneLayout({ containerSizePx, layout, ratio, splitId }) {
  const current = readPaneLayout(layout);
  const target = findSplit(current.tree, splitId);
  if (!target) failPaneLayout('PANE_LAYOUT_SPLIT_INVALID', 'Pane layout split does not exist.');
  if (!Number.isFinite(containerSizePx) || containerSizePx <= DIVIDER_SIZE_PX) {
    failPaneLayout('PANE_LAYOUT_CONTAINER_INVALID', 'Pane layout resize requires a measurable container.');
  }
  if (!Number.isFinite(ratio)) failPaneLayout('PANE_LAYOUT_RATIO_INVALID', 'Resize ratio must be finite.');
  const usable = containerSizePx - DIVIDER_SIZE_PX;
  const lower = minimumExtent(target.first, target.axis) / usable;
  const upper = 1 - (minimumExtent(target.second, target.axis) / usable);
  if (lower > upper) {
    failPaneLayout('PANE_LAYOUT_CONTAINER_TOO_SMALL', 'The split container cannot preserve minimum Pane sizes.');
  }
  const constrained = Math.min(upper, Math.max(lower, ratio));
  return createPaneLayout({
    ratios: { ...current.ratios, [splitId]: constrained },
    variantId: current.variantId,
  });
}

export const PANE_LAYOUT_METRICS = Object.freeze({
  dividerSizePx: DIVIDER_SIZE_PX,
  minimumPaneHeightPx: MIN_PANE_HEIGHT_PX,
  minimumPaneWidthPx: MIN_PANE_WIDTH_PX,
});
