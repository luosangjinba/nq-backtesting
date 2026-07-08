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
    variant: layout.variant,
  };
}

export function createLayoutStore(initialLayout = {}) {
  let layout = createLayoutRecord(initialLayout);

  function snapshot() {
    return cloneLayout(layout);
  }

  function setMode(mode, variant = null) {
    layout = setLayoutMode(layout, mode, variant);
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
