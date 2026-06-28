import { runMaintenanceRequest } from './maintenance-api-client.js';
import { initEconomicCalendarPanel } from './economic-calendar-panel.js';
import { initEnvironmentPanel } from './environment-panel.js';
import {
  appendOutput,
  bindOutputControls,
  formatResult,
  renderEnvironmentStatus,
  setMaintenanceState,
  setValue,
} from './output-panel.js';
import { initRefreshRangePanel } from './refresh-range-panel.js';
import { initRollCalendarPanel } from './roll-calendar-panel.js';
import { initTradovateImportPanel } from './tradovate-import-panel.js';

function run(payload) {
  return runMaintenanceRequest(payload, {
    append: appendOutput,
    formatResult,
    renderEnvironmentStatus,
    setState: setMaintenanceState,
    setValue,
  });
}

initEnvironmentPanel({ run });
initRefreshRangePanel({ run });
initRollCalendarPanel({ run });
initEconomicCalendarPanel({ run });
initTradovateImportPanel();
bindOutputControls();

run({ action: 'environment_status' });
