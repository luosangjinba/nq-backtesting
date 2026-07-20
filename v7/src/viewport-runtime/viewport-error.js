/** Stable validation failure for the Viewport Runtime public contract. */
export class ViewportRuntimeError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ViewportRuntimeError';
    this.code = code;
  }
}

export function failViewport(code, message) {
  throw new ViewportRuntimeError(code, message);
}
