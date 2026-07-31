export class WorkstationSettingsError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'WorkstationSettingsError';
    this.code = code;
  }
}

export function failWorkstationSettings(code, message, options) {
  throw new WorkstationSettingsError(code, message, options);
}
