export class AnnotationManualWorkflowError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnnotationManualWorkflowError';
    this.code = code;
  }
}

export function failManualWorkflow(code, message, options = {}) {
  throw new AnnotationManualWorkflowError(code, message, options);
}

/** Normalize an owner failure without leaking browser- or library-specific error shapes. */
export function stableManualWorkflowError(error, fallbackCode) {
  return Object.freeze({
    code: typeof error?.code === 'string' ? error.code : fallbackCode,
    message: typeof error?.message === 'string' ? error.message : String(error),
  });
}
