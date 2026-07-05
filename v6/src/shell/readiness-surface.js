import { listCommands as listRuntimeCommands } from '../runtime/commands.js';
import { createReadinessSurfaceState } from './readiness-surface-model.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderGateList(root, gates = []) {
  const list = root.querySelector('[data-v6-readiness-gates]');
  if (!list) return;
  list.innerHTML = gates
    .map((gate) => `<li data-v6-readiness-gate="${gate.id}"><strong>${gate.label}</strong><span>${gate.test}</span></li>`)
    .join('');
}

function renderReadinessSurface(root, state) {
  const surface = root.querySelector('[data-v6-readiness-surface]');
  if (surface) {
    surface.dataset.ready = String(state.ready);
    surface.dataset.running = String(state.running);
  }
  setText(root, '[data-v6-readiness-state]', state.ready ? 'Ready' : 'Attention');
  setText(root, '[data-v6-readiness-runtime-count]', `${state.startedRuntimeCount} runtimes`);
  setText(root, '[data-v6-readiness-command-count]', `${state.commandCount} commands`);
  setText(root, '[data-v6-readiness-gate-count]', `${state.gateCount} gates`);
  setText(root, '[data-v6-readiness-missing]', state.missingCommands.length
    ? `Missing ${state.missingCommands.join(', ')}`
    : 'Commands ready');
  renderGateList(root, state.gates);
}

export function mountReadinessSurface(root, {
  listCommands = listRuntimeCommands,
  registry = null,
} = {}) {
  if (!root) {
    throw new Error('Readiness surface root is required.');
  }

  let state = createReadinessSurfaceState();

  function refresh() {
    state = createReadinessSurfaceState({
      commands: listCommands(),
      registrySnapshot: registry?.snapshot?.() || {},
    });
    renderReadinessSurface(root, state);
    return state;
  }

  refresh();

  return Object.freeze({
    getState() {
      return state;
    },
    refresh,
  });
}
