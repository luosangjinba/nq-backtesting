/** Stable failure raised by the headless Chart Snapshot Application boundary. */
export class ChartSnapshotApplicationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ChartSnapshotApplicationError';
    this.code = code;
  }
}

export function failChartApplication(code, message) {
  throw new ChartSnapshotApplicationError(code, message);
}
