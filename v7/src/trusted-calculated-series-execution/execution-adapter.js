import { defineCalculatedSeriesResult } from '../calculated-series-contract/public.js';
import { failTrustedExecution } from './execution-error.js';
import { readTrustedExecutionEnvelope } from './execution-envelope.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonical(value[key])]),
  );
  return Object.is(value, -0) ? 0 : value;
}

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(canonical(value))).byteLength;
}

function pointCount(groups) {
  return groups.reduce((total, group) => total
    + group.plots.reduce((count, plot) => count + plot.points.length, 0), 0);
}

function requireActive(signal) {
  if (signal.aborted) {
    failTrustedExecution(
      'TRUSTED_CALCULATED_SERIES_CANCELLED',
      'Trusted calculation was cancelled before publication.',
    );
  }
}

/** Invoke one already-admitted trusted pure formula and close its P1c.1 result evidence. */
export function createTrustedCalculatedSeriesExecutionAdapter({ now = () => performance.now() } = {}) {
  if (typeof now !== 'function') {
    failTrustedExecution('TRUSTED_CALCULATED_SERIES_CLOCK_INVALID', 'Execution clock is invalid.');
  }
  return Object.freeze({
    execute(input) {
      const envelope = readTrustedExecutionEnvelope(input);
      requireActive(envelope.signal);
      const startedAt = now();
      let plotGroups;
      try {
        plotGroups = envelope.eligibleTimeline.length === 0 ? Object.freeze([])
          : envelope.registration.formula(Object.freeze({
            displayBars: envelope.displayBars,
            parameters: envelope.parameters,
            warmupBars: envelope.warmupBars,
          }));
      } catch (cause) {
        failTrustedExecution(
          'TRUSTED_CALCULATED_SERIES_FORMULA_FAILED',
          'Trusted formula rejected its immutable input.',
          { cause },
        );
      }
      requireActive(envelope.signal);
      const durationMs = Math.max(0, now() - startedAt);
      const outputPoints = Array.isArray(plotGroups) ? pointCount(plotGroups) : 0;
      const outputBytes = Array.isArray(plotGroups) ? byteLength(plotGroups) : 0;
      return defineCalculatedSeriesResult({
        diagnostics: [],
        frameIdentity: envelope.frameIdentity,
        plotGroups,
        provenance: {
          calculationMode: 'full',
          datasetDigest: envelope.frameWire.datasetProvenance.datasetDigest,
          definitionDigest: envelope.registration.definitionDigest,
          executor: envelope.registration.executor,
          formulaDigest: envelope.registration.formulaDigest,
          inputTimelineDigest: envelope.frameWire.inputDigest,
          packageDigest: envelope.registration.packageDigest,
          parameterDigest: envelope.frameWire.effectiveParameterDigest,
          resultAncestry: [],
          warmupCoverage: {
            providedBars: envelope.warmupBars.length,
            requestedBars: envelope.definitionWire.inputRequirement.warmupBars,
          },
        },
        resourceUsage: {
          actualInputBars: envelope.warmupBars.length + envelope.displayBars.length,
          admittedInputBars: envelope.warmupBars.length + envelope.displayBars.length,
          durationMs,
          incrementalStateBytes: 0,
          outputBytes,
          outputPoints,
        },
        resultRevision: envelope.resultRevision,
        schemaVersion: 1,
        state: envelope.eligibleTimeline.length === 0 ? 'empty' : 'ready',
      }, {
        definition: envelope.definition,
        eligibleTimeline: envelope.eligibleTimeline,
      });
    },
  });
}
