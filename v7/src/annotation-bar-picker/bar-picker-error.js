export class AnnotationBarPickerError extends Error {
  constructor(code, message, options = undefined) {
    super(message, options);
    this.name = 'AnnotationBarPickerError';
    this.code = code;
  }
}

export function failBarPicker(code, message, options = undefined) {
  throw new AnnotationBarPickerError(code, message, options);
}
