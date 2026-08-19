import { failManualWorkflow } from './workflow-error.js';

export function requireActiveManualTool(tools, toolId) {
  const selected = tools.find(({ id }) => id === toolId);
  if (!selected) failManualWorkflow('MANUAL_WORKFLOW_TOOL_UNKNOWN', `Tool ${toolId} is unavailable.`);
  if (selected.state !== 'active') {
    failManualWorkflow('MANUAL_WORKFLOW_TOOL_INACTIVE', `Tool ${toolId} is not active.`);
  }
  return selected;
}
