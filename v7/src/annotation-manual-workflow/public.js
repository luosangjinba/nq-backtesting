/**
 * Owner: annotation-workflow-composition.
 * Purpose: expose the removable production manual Semantic tool workflow.
 * Inputs: trusted ModuleHost/plugin metadata plus public Chart, storage, Session, and UI ports.
 * Outputs: one Session-scoped start/command/snapshot/dispose controller.
 * Side effects: only injected owner commands; this module owns no Chart, Replay, Bar, DOM, or durable bytes.
 * Lifecycle: start once after ModuleHost activation; dispose releases Picker, Inspector, projection, and Registry state.
 * Errors: AnnotationManualWorkflowError or stable injected-owner errors fail the visible workflow closed.
 * Concurrency/cancellation: Workspace reconciliation is serialized/latest-wins; owner operations remain exact-revision.
 */
export { AnnotationManualWorkflowError } from './workflow-error.js';
export { createProductionManualAnnotationWorkflow } from './production-manual-annotation-workflow.js';
