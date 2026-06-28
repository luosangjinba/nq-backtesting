import { handleLiveRecordHitAction } from './live-record-hit-actions.js';
import {
  LIVE_RECORD_CHART_ACTIONS,
  handleLiveRecordMutationAction,
} from './live-record-mutation-actions.js';

export { renderLiveRecordMenuItems } from './live-record-chart-menu.js';
export { LIVE_RECORD_CHART_ACTIONS };

export function handleLiveRecordChartAction(action, context = {}) {
  if (handleLiveRecordHitAction(action, {
    liveRecordId: context.liveRecordId,
    liveRecordElement: context.liveRecordElement,
  })) return true;
  return handleLiveRecordMutationAction(action, context);
}
