/**
 * Owner: annotation-interaction-controller.
 * Purpose: expose a removable one-shot exact Bar Picker over the shared Chart interaction lease.
 * Inputs: normalized Chart-owned Bar candidate/select events containing only Pane and exact Bar start.
 * Outputs: branded immutable exact Bar selections and disposable controller snapshots.
 * Side effects: calls only injected callbacks; never receives Chart, Series, Bar cache, Replay, or Annotation handles.
 * Lifecycle: arm one Picker explicitly; selection/cancel returns idle and dispose releases an active lease.
 * Errors: AnnotationBarPickerError rejects malformed ports, events, selections, or overlapping sessions.
 * Concurrency/cancellation: one shared Chart lease; Escape/right-click/blur cancel with zero selection.
 */
export { AnnotationBarPickerError } from './bar-picker-error.js';
export { createExactAnnotationBarPickerController } from './exact-bar-picker-controller.js';
export {
  createExactAnnotationBarSelection,
  readExactAnnotationBarSelection,
} from './exact-bar-selection.js';
