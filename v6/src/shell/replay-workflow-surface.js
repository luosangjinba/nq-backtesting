import {
  DEFAULT_WALL_COMMANDS,
  REPLAY_COMMANDS,
} from '../contracts/app-contracts.js';
import { dispatchCommand as dispatchRuntimeCommand } from '../runtime/commands.js';
import { createReplayWorkflowSurfaceState } from './replay-workflow-surface-model.js';
import { setWorkflowActionOpen } from './workflow-action-state.js';
import { bindWorkflowPanelClose } from './workflow-panel-close.js';

function setText(root, selector, value) {
  const element = root.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function renderReplayWorkflowSurface(root, state) {
  setText(root, '[data-v6-replay-workflow-state]', state.replayLabel);
  setText(root, '[data-v6-replay-workflow-wall]', state.wallLabel);
}

async function optionalCommand(dispatchCommand, command) {
  try {
    return await dispatchCommand(command);
  } catch {
    return null;
  }
}

export function mountReplayWorkflowSurface(root, {
  dispatchCommand = dispatchRuntimeCommand,
} = {}) {
  if (!root) {
    throw new Error('Replay workflow surface root is required.');
  }

  const panel = root.querySelector('[data-v6-replay-workflow-panel]');
  const toggle = root.querySelector('[data-v6-replay-workflow-toggle]');
  const closeButton = root.querySelector('[data-v6-replay-workflow-close]');
  const refreshButton = root.querySelector('[data-v6-replay-workflow-refresh]');
  const pauseButton = root.querySelector('[data-v6-replay-workflow-pause]');
  const resetButton = root.querySelector('[data-v6-replay-workflow-reset]');
  const unsubscriptions = [];
  let open = Boolean(panel && !panel.hidden);
  let state = createReplayWorkflowSurfaceState();

  function setOpen(nextOpen) {
    open = Boolean(nextOpen);
    if (panel) {
      panel.hidden = !open;
    }
    setWorkflowActionOpen(toggle, open);
    return getState();
  }

  async function refresh() {
    const [replayState, wallState] = await Promise.all([
      optionalCommand(dispatchCommand, REPLAY_COMMANDS.GET_STATE),
      optionalCommand(dispatchCommand, DEFAULT_WALL_COMMANDS.GET_STATE),
    ]);
    state = createReplayWorkflowSurfaceState({ replayState, wallState });
    renderReplayWorkflowSurface(root, state);
    return getState();
  }

  async function pause() {
    await optionalCommand(dispatchCommand, REPLAY_COMMANDS.PAUSE);
    return refresh();
  }

  async function reset() {
    await optionalCommand(dispatchCommand, REPLAY_COMMANDS.RESET);
    return refresh();
  }

  if (toggle) {
    const listener = () => setOpen(!open);
    toggle.addEventListener('click', listener);
    unsubscriptions.push(() => toggle.removeEventListener('click', listener));
  }
  if (refreshButton) {
    const listener = () => refresh();
    refreshButton.addEventListener('click', listener);
    unsubscriptions.push(() => refreshButton.removeEventListener('click', listener));
  }
  if (pauseButton) {
    const listener = () => pause();
    pauseButton.addEventListener('click', listener);
    unsubscriptions.push(() => pauseButton.removeEventListener('click', listener));
  }
  if (resetButton) {
    const listener = () => reset();
    resetButton.addEventListener('click', listener);
    unsubscriptions.push(() => resetButton.removeEventListener('click', listener));
  }
  bindWorkflowPanelClose({
    close: () => setOpen(false),
    closeButton,
    root,
    unsubscriptions,
  });

  refresh();

  function getState() {
    return {
      open,
      ...state,
    };
  }

  return Object.freeze({
    getState,
    pause,
    refresh,
    reset,
    setOpen,
    unmount() {
      while (unsubscriptions.length) {
        unsubscriptions.pop()();
      }
    },
  });
}
