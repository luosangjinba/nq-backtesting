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
  list.innerHTML = '';
  list.dataset.gateCount = String(gates.length);
}

function renderReadinessSurface(root, state) {
  const surface = root.querySelector('[data-v6-readiness-surface]');
  if (surface) {
    surface.dataset.ready = String(state.ready);
    surface.dataset.running = String(state.running);
    surface.hidden = state.ready;
    surface.setAttribute?.('aria-hidden', String(state.ready));
  }
  setText(root, '[data-v6-readiness-state]', state.statusLabel);
  setText(root, '[data-v6-readiness-runtime-count]', state.runtimeLabel);
  setText(root, '[data-v6-readiness-command-count]', state.commandLabel);
  setText(root, '[data-v6-readiness-gate-count]', state.ready ? 'Core checks passed' : 'Core checks pending');
  setText(root, '[data-v6-readiness-missing]', state.ready ? 'Replay workstation is ready' : 'Some services are still starting');
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
