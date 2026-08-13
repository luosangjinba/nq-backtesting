import { failChartApplication } from './application-error.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}

function same(left, right) {
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

function requireFactory(value) {
  if (typeof value?.bindChartOwner !== 'function') {
    failChartApplication(
      'CHART_CALCULATED_SERIES_FACTORY_INVALID',
      'Chart-owned calculated-series projection requires an owner-bindable factory.',
    );
  }
  return value;
}

function requireCurrentBinding(value) {
  if (typeof value !== 'function') {
    failChartApplication(
      'CHART_CALCULATED_SERIES_BINDING_PORT_INVALID',
      'Chart-owned calculated-series projection requires a current-binding port.',
    );
  }
  return value;
}

class ChartCalculatedSeriesProjectionControlsValue {
  #isBindingCurrent;
  #reportFault;
  constructor({ isBindingCurrent, reportFault }) {
    this.#isBindingCurrent = isBindingCurrent;
    this.#reportFault = reportFault;
    Object.freeze(this);
  }
  isBindingCurrent(candidate, mode) { return this.#isBindingCurrent(candidate, mode); }
  reportFault(evidence) { return this.#reportFault(evidence); }
}

/** Reject controls not privately created by the sole Chart projection owner. */
export function requireChartCalculatedSeriesProjectionControls(candidate) {
  if (!(candidate instanceof ChartCalculatedSeriesProjectionControlsValue)) {
    failChartApplication(
      'CHART_CALCULATED_SERIES_CONTROLS_REQUIRED',
      'Calculated-series projection requires branded Chart-owner controls.',
    );
  }
  return candidate;
}

/**
 * Construct the sole Chart-owned admission and sequencing boundary for the removable
 * calculated-series child transaction. This is not a Workspace transaction participant.
 */
export function createChartCalculatedSeriesProjectionOwner({
  currentBinding,
  projectionFactory,
  recoverFromAcceptedSnapshot = async () => false,
} = {}) {
  const bindingPort = requireCurrentBinding(currentBinding);
  const factory = requireFactory(projectionFactory);
  if (typeof recoverFromAcceptedSnapshot !== 'function') {
    failChartApplication(
      'CHART_CALCULATED_SERIES_RECOVERY_PORT_INVALID',
      'Chart projection recovery must be an explicit callback.',
    );
  }
  let disposed = false;
  let fault = null;
  let recoveryOutcome = null;
  let status = 'ready';

  const child = factory.bindChartOwner(new ChartCalculatedSeriesProjectionControlsValue({
    isBindingCurrent(candidate, mode) {
      if (disposed || status !== 'ready') return false;
      const expected = bindingPort(mode);
      return expected !== null && same(candidate, expected);
    },
    async reportFault(evidence) {
      fault = canonical(evidence);
      status = 'recovering';
      try {
        const recovered = await recoverFromAcceptedSnapshot(Object.freeze(fault));
        recoveryOutcome = recovered === true ? 'remounted-replacement-required' : 'activation-poisoned';
      } catch {
        recoveryOutcome = 'activation-poisoned';
      }
      status = 'poisoned';
    },
  }));

  return Object.freeze({
    async dispose() {
      if (disposed) return;
      const priorStatus = status;
      status = 'disposing';
      try {
        await child.dispose();
        disposed = true;
        status = 'disposed';
      } catch (error) {
        status = child.snapshot().status === 'poisoned' ? 'poisoned' : priorStatus;
        throw error;
      }
    },
    async prepare(candidate) {
      if (disposed) failChartApplication('CHART_APPLICATION_DISPOSED', 'Chart projection owner is disposed.');
      if (status === 'poisoned') {
        failChartApplication(
          'CHART_CALCULATED_SERIES_ACTIVATION_POISONED',
          'Chart activation rejects projection commands after unprovable native recovery.',
        );
      }
      if (status !== 'ready') {
        failChartApplication('CHART_CALCULATED_SERIES_BUSY', 'Chart projection owner is recovering.');
      }
      return child.prepare(candidate);
    },
    snapshot() {
      return Object.freeze({
        child: child.snapshot(),
        fault: fault === null ? null : Object.freeze(fault),
        recoveryOutcome,
        status,
      });
    },
  });
}
