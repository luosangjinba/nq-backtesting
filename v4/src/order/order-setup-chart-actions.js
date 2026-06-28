// Chart context-menu actions for creating and editing the active Order Setup.

import { handleOrderSetupHitAction } from './order-setup-hit-actions.js';
import { handleOrderSetupMutationAction } from './order-setup-mutation-actions.js';

export { renderOrderSetupMenuItems } from './order-setup-chart-menu.js';

export function handleOrderSetupChartAction(action, context = {}) {
  if (handleOrderSetupHitAction(action, context)) return true;
  return handleOrderSetupMutationAction(action, context);
}
