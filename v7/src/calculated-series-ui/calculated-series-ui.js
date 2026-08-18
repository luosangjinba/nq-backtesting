import { createCalculatedSeriesAddDialog } from './add-dialog.js';
import { createCalculatedSeriesPaneView } from './pane-indicator-view.js';
import { createCalculatedSeriesSettingsDialog } from './settings-dialog.js';

function requireRuntime(value) {
  for (const method of ['execute', 'readLegend', 'snapshot', 'subscribe']) {
    if (typeof value?.[method] !== 'function') {
      throw new TypeError(`Calculated-series UI runtime requires ${method}().`);
    }
  }
  return value;
}

function requirePaneAddons(value) {
  if (typeof value?.register !== 'function') {
    throw new TypeError('Calculated-series UI requires a Pane add-on port.');
  }
  return value;
}

/** Compose one package-neutral Indicator UI over command/state-only ports. */
export function createCalculatedSeriesUi({ paneAddonPort, runtime } = {}) {
  const owner = requireRuntime(runtime);
  const addons = requirePaneAddons(paneAddonPort);
  const views = new Map();
  let disposed = false;
  let latest = owner.snapshot();
  const dispatch = (command) => owner.execute(Object.freeze(command));
  const addDialog = createCalculatedSeriesAddDialog({ dispatch });
  const settingsDialog = createCalculatedSeriesSettingsDialog({ dispatch });

  function renderView(paneId, view) {
    const displayEpochMs = view.readDisplayEpochMs();
    view.render(latest, owner.readLegend(paneId, displayEpochMs));
  }

  const registration = addons.register(Object.freeze({
    id: 'optional.calculated-series-ui',
    mount({ paneId, shell }) {
      const view = createCalculatedSeriesPaneView({
        dispatch,
        onAdd: (input) => addDialog.open(input),
        onSettings: (input) => settingsDialog.open(input),
        paneId,
        shell,
      });
      views.set(paneId, view);
      renderView(paneId, view);
      return Object.freeze({
        dispose() { views.delete(paneId); view.dispose(); },
        setCrosshairObservation(observation) {
          view.setCrosshairObservation(observation);
          renderView(paneId, view);
        },
        setWorkspaceDisabled: view.setWorkspaceDisabled,
      });
    },
  }));
  const subscription = owner.subscribe((snapshot) => {
    latest = snapshot;
    for (const [paneId, view] of views) renderView(paneId, view);
  });

  return Object.freeze({
    dispose() {
      if (disposed) return;
      disposed = true;
      subscription.unsubscribe();
      registration.unregister();
      settingsDialog.dispose();
      addDialog.dispose();
      views.clear();
    },
    snapshot() {
      return Object.freeze({ paneIds: Object.freeze([...views.keys()]), runtime: latest });
    },
  });
}
