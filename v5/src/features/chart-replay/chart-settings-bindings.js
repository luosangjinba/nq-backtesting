import { createChartSettingsCanvasBindings } from './chart-settings-canvas-bindings.js';
import { createChartSettingsScalesBindings } from './chart-settings-scales-bindings.js';
import { createChartSettingsStatusBindings } from './chart-settings-status-bindings.js';
import { createChartSettingsSymbolBindings } from './chart-settings-symbol-bindings.js';

export function createChartSettingsBindings({
  root,
  getDraft,
}) {
  const adapters = [
    createChartSettingsSymbolBindings({ root, getDraft }),
    createChartSettingsStatusBindings({ root, getDraft }),
    createChartSettingsScalesBindings({ root, getDraft }),
    createChartSettingsCanvasBindings({ root, getDraft }),
  ];

  function render(draft) {
    adapters.forEach((adapter) => adapter.render(draft));
  }

  function bindDraftEvents({ renderSettingsDraft }) {
    adapters.forEach((adapter) => {
      adapter.bindDraftEvents({ renderSettingsDraft });
    });
  }

  return {
    bindDraftEvents,
    render,
  };
}
