import * as barPickerContract from '../annotation-bar-picker/public.js';
import { activePaneId } from './accepted-workspace-evidence.js';
import { failManualWorkflow } from './workflow-error.js';

/** Acquire one exact active-Pane Bar Picker for a portable construction tool. */
export function armManualSemanticTool({
  chartProjection,
  chartSurfacePort,
  onError,
  onSelection,
  onStateChange,
  tool,
  workspace,
} = {}) {
  const paneId = activePaneId(workspace);
  const surface = chartSurfacePort.annotationSurfaces(chartProjection)
    .find((candidate) => candidate.paneId === paneId);
  if (!surface) {
    failManualWorkflow('MANUAL_WORKFLOW_PANE_UNAVAILABLE', 'Active Pane Chart surface is unavailable.');
  }
  const picker = barPickerContract.createExactAnnotationBarPickerController({
    interactionPort: surface.interactionPort,
    onError,
    onSelection,
    onStateChange,
  });
  picker.arm({ pickerId: `manual.${tool.id}` });
  return picker;
}
