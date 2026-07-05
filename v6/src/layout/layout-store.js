import {
  createLayoutRecord,
  setLayoutActivePane,
  setLayoutMode,
  setLayoutSync,
} from './layout-model.js';

function cloneLayout(layout) {
  return {
    activePaneId: layout.activePaneId,
    mode: layout.mode,
    panes: layout.panes.map((pane) => ({ ...pane })),
    sync: { ...layout.sync },
  };
}

export function createLayoutStore(initialLayout = {}) {
  let layout = createLayoutRecord(initialLayout);

  function snapshot() {
    return cloneLayout(layout);
  }

  function setMode(mode) {
    layout = setLayoutMode(layout, mode);
    return snapshot();
  }

  function setActivePane(paneId) {
    layout = setLayoutActivePane(layout, paneId);
    return snapshot();
  }

  function setSync(key, value) {
    layout = setLayoutSync(layout, key, value);
    return snapshot();
  }

  return {
    setActivePane,
    setMode,
    setSync,
    snapshot,
  };
}
