import { failManualWorkflow } from './workflow-error.js';

const WORKFLOW_METHODS = Object.freeze(['annotationSurfaces']);

/** Validate the production-only ports before any Annotation owner is acquired. */
export function requireManualWorkflowOptions(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.moduleDescriptors)
    || typeof value.readModuleHostSnapshot !== 'function'
    || typeof value.idFactory !== 'function' || typeof value.nowEpochMs !== 'function'
    || typeof value.view?.setAnnotationWorkflow !== 'function') {
    failManualWorkflow('MANUAL_WORKFLOW_INPUT_INVALID', 'Production Manual Annotation options are invalid.');
  }
  for (const method of WORKFLOW_METHODS) {
    if (typeof value.chartSurfacePort?.[method] !== 'function') {
      failManualWorkflow('MANUAL_WORKFLOW_CHART_PORT_INVALID', `Chart surface requires ${method}().`);
    }
  }
  return value;
}
