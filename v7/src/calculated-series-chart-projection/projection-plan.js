import { canonicalProjectionValue, readCalculatedSeriesPaneSurfaceCandidate } from './candidate-value.js';
import { failCalculatedSeriesChartProjection } from './projection-error.js';

export const CALCULATED_SERIES_CHART_PROJECTION_LIMITS = Object.freeze({
  bandsAndSeries: 64,
  logicalResources: 256,
  pointRecords: 100_000,
  referenceLines: 64,
  regions: 8,
  scales: 16,
});
const LIMITS = CALCULATED_SERIES_CHART_PROJECTION_LIMITS;

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function definitionRef(definition) {
  return Object.freeze({ ...definition.identity, profile: definition.profile });
}

function definitionKey(reference) {
  return [reference.packageId, reference.packageVersion, reference.contributionId,
    reference.contributionVersion, reference.definitionId, reference.definitionVersion,
    reference.profile.profileId, reference.profile.profileContractVersion].join('@');
}

function fail(code, message) {
  failCalculatedSeriesChartProjection(code, message);
}

function requireCandidateClosure(candidate) {
  const binding = candidate.chartBinding;
  const pane = candidate.workspaceDocument.workspacePanes
    .find(({ workspacePaneId }) => workspacePaneId === binding.workspacePaneId);
  if (!pane || candidate.workspaceDocument.workspacePanes
    .filter(({ workspacePaneId }) => workspacePaneId === binding.workspacePaneId).length !== 1) {
    fail('CALCULATED_SERIES_CHART_PANE_MISMATCH', 'Candidate must select exactly one Workspace Pane.');
  }
  if (candidate.workspaceDocument.sessionId !== binding.workspaceTransaction.sessionId.value) {
    fail('CALCULATED_SERIES_CHART_BINDING_MISMATCH', 'Document Session differs from the Chart binding.');
  }

  const definitions = new Map();
  for (const definition of candidate.definitions) {
    const key = definitionKey(definitionRef(definition));
    if (definitions.has(key)) {
      fail('CALCULATED_SERIES_CHART_DEFINITION_DUPLICATE', 'Candidate Definition evidence is duplicated.');
    }
    definitions.set(key, definition);
  }
  const requiredDefinitionKeys = new Set(pane.resolvedInstances
    .map(({ definitionRef: reference }) => definitionKey(reference)));
  if (definitions.size !== requiredDefinitionKeys.size
    || [...definitions.keys()].some((key) => !requiredDefinitionKeys.has(key))) {
    fail(
      'CALCULATED_SERIES_CHART_DEFINITION_SET_MISMATCH',
      'Candidate Definitions must close exactly over resolved instances in the selected Pane.',
    );
  }

  const frames = new Map();
  for (const frame of candidate.projectionFrames) {
    const instanceId = frame.frameIdentity.instanceId;
    if (frames.has(instanceId)) {
      fail('CALCULATED_SERIES_CHART_FRAME_DUPLICATE', 'Projection frame instance identity is duplicated.');
    }
    frames.set(instanceId, frame);
  }
  const visible = pane.resolvedInstances.filter(({ visibility }) => visibility === 'visible');
  if (frames.size !== visible.length) {
    fail('CALCULATED_SERIES_CHART_FRAME_SET_MISMATCH', 'Every visible resolved instance requires exactly one frame.');
  }
  for (const instance of pane.resolvedInstances) {
    const frame = frames.get(instance.instanceId);
    if (instance.visibility === 'hidden') {
      if (frame) fail('CALCULATED_SERIES_CHART_HIDDEN_FRAME', 'Hidden instances cannot carry a projection frame.');
      continue;
    }
    if (!frame) fail('CALCULATED_SERIES_CHART_FRAME_MISSING', 'Visible instance frame is missing.');
    const identity = frame.frameIdentity;
    if (identity.documentRevision !== candidate.workspaceDocument.documentRevision
      || identity.instanceRevision !== instance.instanceRevision
      || identity.workspacePaneId !== binding.workspacePaneId
      || identity.workspaceStateRevision !== binding.workspaceStateRevision
      || identity.projectedPaneSnapshotDigest !== binding.projectedPaneSnapshotDigest
      || identity.replayVisibleThroughEpochMs !== binding.replayVisibleThroughEpochMs
      || !same(identity.workspaceTransaction, binding.workspaceTransaction)
      || !same(identity.definitionRef, instance.definitionRef)) {
      fail(
        'CALCULATED_SERIES_CHART_FRAME_BINDING_MISMATCH',
        `Projection frame ${instance.instanceId} differs from the complete Chart/document binding.`,
      );
    }
  }
  for (const instanceId of frames.keys()) {
    if (!visible.some((instance) => instance.instanceId === instanceId)) {
      fail('CALCULATED_SERIES_CHART_FRAME_FOREIGN', 'Projection frame belongs to a foreign or hidden instance.');
    }
  }
  return Object.freeze({ definitions, frames, pane });
}

function styleFor(instance, groupId, targetKind, targetId, fallback) {
  return instance.styleOverrides.find((override) => (
    override.plotGroupId === groupId
      && override.targetKind === targetKind
      && override.targetId === targetId
  ))?.style ?? fallback;
}

function resourceId(instanceId, groupId, kind, id) {
  return `${instanceId}:${groupId}:${kind}:${id}`;
}

function requireSupportedPlotStyle(kind, style) {
  if (kind === 'baseline'
    && (style.topStroke.width !== style.bottomStroke.width
      || style.topStroke.pattern !== style.bottomStroke.pattern)) {
    fail(
      'CALCULATED_SERIES_CHART_BASELINE_STROKE_UNSUPPORTED',
      'Built-in Baseline cannot realize distinct top/bottom stroke width or pattern.',
    );
  }
  return style;
}

function nativeSeriesCount(kind, points) {
  if (!['area', 'baseline', 'line'].includes(kind)) return 1;
  let count = 0;
  let insideValueRun = false;
  for (const point of points) {
    if (point.state === 'whitespace') insideValueRun = false;
    else if (!insideValueRun) {
      count += 1;
      insideValueRun = true;
    }
  }
  return count;
}

function plotResource(instance, group, placement, plot, output) {
  const style = requireSupportedPlotStyle(
    plot.kind,
    styleFor(instance, group.plotGroupId, 'plot', plot.plotId, plot.style),
  );
  return Object.freeze({
    instanceId: instance.instanceId,
    kind: plot.kind,
    nativeSeriesCount: nativeSeriesCount(plot.kind, output.points),
    order: placement.order,
    plotGroupId: group.plotGroupId,
    plotId: plot.plotId,
    points: output.points,
    regionId: placement.regionId,
    resourceId: resourceId(instance.instanceId, group.plotGroupId, 'plot', plot.plotId),
    scaleGroupId: placement.scaleGroupId,
    style,
    title: plot.displayName,
  });
}

function referenceLineResource(instance, group, placement, line) {
  return Object.freeze({
    instanceId: instance.instanceId,
    order: placement.order,
    plotGroupId: group.plotGroupId,
    referenceLineId: line.referenceLineId,
    regionId: placement.regionId,
    resourceId: resourceId(
      instance.instanceId,
      group.plotGroupId,
      'reference-line',
      line.referenceLineId,
    ),
    scaleGroupId: placement.scaleGroupId,
    style: styleFor(
      instance,
      group.plotGroupId,
      'reference-line',
      line.referenceLineId,
      line.style,
    ),
    title: line.displayName,
    value: line.value,
  });
}

function collectResources(candidate, closure) {
  const plots = [];
  const bands = [];
  const referenceLines = [];
  const states = [];
  const usedScales = new Set();
  let pointRecords = 0;

  for (const instance of closure.pane.resolvedInstances) {
    if (instance.visibility !== 'visible') continue;
    const frame = closure.frames.get(instance.instanceId);
    states.push(Object.freeze({ instanceId: instance.instanceId, state: frame.state }));
    if (frame.state !== 'ready') continue;
    const definition = closure.definitions.get(definitionKey(instance.definitionRef));
    const outputByGroup = new Map(frame.plotGroups.map((group) => [group.plotGroupId, group]));
    const placementByGroup = new Map(instance.plotGroupPlacements
      .map((placement) => [placement.plotGroupId, placement]));
    for (const group of definition.plotGroups) {
      const output = outputByGroup.get(group.plotGroupId);
      const placement = placementByGroup.get(group.plotGroupId);
      const outputByPlot = new Map(output.plots.map((plot) => [plot.plotId, plot]));
      for (const plot of group.plots) {
        if (!plot.visibleByDefault) continue;
        const record = plotResource(instance, group, placement, plot, outputByPlot.get(plot.plotId));
        pointRecords += record.points.length;
        usedScales.add(record.scaleGroupId);
        (plot.kind === 'band' ? bands : plots).push(record);
      }
      for (const line of group.referenceLines) {
        if (!line.visibleByDefault) continue;
        const record = referenceLineResource(instance, group, placement, line);
        referenceLines.push(record);
        usedScales.add(record.scaleGroupId);
      }
    }
  }
  const identities = [...plots, ...bands, ...referenceLines].map(({ resourceId: id }) => id);
  if (new Set(identities).size !== identities.length) {
    fail('CALCULATED_SERIES_CHART_NATIVE_IDENTITY_COLLISION', 'Logical native resource identity collides.');
  }
  return Object.freeze({ bands, plots, pointRecords, referenceLines, states, usedScales });
}

function scalarValues(resource) {
  if (resource.kind === 'band') return resource.points.flatMap((point) => (
    point.state === 'value' ? [point.lower, point.upper] : []
  ));
  return resource.points.flatMap((point) => (point.state === 'value' ? [point.value] : []));
}

function mainPrimaryCompatible(intent) {
  return intent.dimension.dimensionId === 'market.instrument-price'
    && intent.dimension.dimensionVersion === '1.0.0'
    && intent.unit.unitId === 'market.instrument-price'
    && intent.unit.unitVersion === '1.0.0'
    && intent.transform === 'linear'
    && intent.domain.kind === 'auto'
    && intent.formatter.formatterId === 'host.price'
    && intent.formatter.formatterVersion === '1.0.0'
    && intent.zeroPolicy === 'not-required';
}

function materializeScales(candidate, closure, resources) {
  const scales = [];
  const allSeries = [...resources.plots, ...resources.bands];
  for (const region of closure.pane.chartRegions) {
    if (region.kind !== 'main' && region.collapsed) {
      fail('CALCULATED_SERIES_CHART_COLLAPSE_UNSUPPORTED', 'Collapsed calculated-series regions are not supported by P1c.2.');
    }
    const local = closure.pane.scaleGroups
      .filter(({ regionId }) => regionId === region.regionId)
      .sort((left, right) => left.order - right.order || left.scaleGroupId.localeCompare(right.scaleGroupId));
    const primary = local.filter(({ axisIntent }) => axisIntent === 'primary');
    const auxiliary = local.filter(({ axisIntent }) => axisIntent === 'auxiliary');
    const usedLocal = local.filter(({ scaleGroupId }) => resources.usedScales.has(scaleGroupId));
    if (usedLocal.length > 0 && region.kind !== 'main'
      && (primary.length !== 1 || primary[0].order !== 0)) {
      fail('CALCULATED_SERIES_CHART_SCALE_TOPOLOGY_UNSUPPORTED', 'Internal output requires one order-zero primary Scale Group.');
    }
    if (region.kind === 'main' && (primary.length > 1 || primary.some(({ order }) => order !== 0))) {
      fail('CALCULATED_SERIES_CHART_SCALE_TOPOLOGY_UNSUPPORTED', 'Main supports at most one order-zero calculated-series primary Scale Group.');
    }
    for (const scale of usedLocal) {
      let nativeRole;
      if (scale.axisIntent === 'primary') nativeRole = 'right';
      else nativeRole = auxiliary[0]?.scaleGroupId === scale.scaleGroupId ? 'left' : 'overlay';
      if (region.kind === 'main' && scale.axisIntent === 'primary'
        && !mainPrimaryCompatible(scale.scaleIntent)) {
        fail('CALCULATED_SERIES_CHART_MAIN_SCALE_INCOMPATIBLE', 'Main primary output is incompatible with the candle Scale.');
      }
      const fixedOverlayDomain = scale.scaleIntent.domain.kind === 'fixed'
        || (scale.scaleIntent.domain.kind === 'symmetric-around-zero'
          && scale.scaleIntent.domain.magnitude !== 'auto');
      if (nativeRole === 'overlay' && fixedOverlayDomain) {
        fail('CALCULATED_SERIES_CHART_FIXED_OVERLAY_UNSUPPORTED', 'Overlay Scales cannot realize fixed or fixed-symmetric domains.');
      }
      const attachedSeries = allSeries.filter(({ scaleGroupId }) => scaleGroupId === scale.scaleGroupId);
      const attachedLines = resources.referenceLines
        .filter(({ scaleGroupId }) => scaleGroupId === scale.scaleGroupId);
      const values = [
        ...attachedSeries.flatMap(scalarValues),
        ...attachedLines.map(({ value }) => value),
      ];
      if ((scale.scaleIntent.transform === 'logarithmic'
        || scale.scaleIntent.zeroPolicy === 'forbid-nonpositive')
        && values.some((value) => value <= 0)) {
        fail('CALCULATED_SERIES_CHART_LOG_VALUE_INVALID', 'Logarithmic Scale output contains a nonpositive value.');
      }
      const times = [...new Set(attachedSeries.flatMap(({ points }) => (
        points.map(({ displayEpochMs }) => displayEpochMs)
      )))].sort((left, right) => left - right);
      if (times.length === 0 && attachedLines.length > 0) {
        times.push(candidate.chartBinding.replayVisibleThroughEpochMs);
      }
      const minimum = values.length === 0 ? null : Math.min(...values);
      const maximum = values.length === 0 ? null : Math.max(...values);
      scales.push(Object.freeze({
        axisIntent: scale.axisIntent,
        extent: Object.freeze({ maximum, minimum }),
        intent: scale.scaleIntent,
        nativeRole,
        order: scale.order,
        regionId: scale.regionId,
        scaleGroupId: scale.scaleGroupId,
        times: Object.freeze(times),
      }));
    }
  }
  return scales;
}

function enforceLimits(regions, scales, resources) {
  const totalResources = Math.max(0, regions.length - 1) + scales.length
    + resources.plots.length + resources.bands.length + resources.referenceLines.length;
  if (regions.length > LIMITS.regions || scales.length > LIMITS.scales
    || resources.plots.reduce((count, plot) => count + plot.nativeSeriesCount, 0)
      + resources.bands.length > LIMITS.bandsAndSeries
    || resources.referenceLines.length > LIMITS.referenceLines
    || resources.pointRecords > LIMITS.pointRecords
    || totalResources > LIMITS.logicalResources) {
    fail('CALCULATED_SERIES_CHART_RESOURCE_LIMIT', 'Pane-surface candidate exceeds a native projection ceiling.');
  }
  return totalResources;
}

/** Build the deterministic, vendor-neutral native-resource plan during inert preparation. */
export function planCalculatedSeriesChartProjection(candidateValue) {
  const candidate = readCalculatedSeriesPaneSurfaceCandidate(candidateValue);
  const closure = requireCandidateClosure(candidate);
  const resources = collectResources(candidate, closure);
  const regions = Object.freeze([...closure.pane.chartRegions]
    .sort((left, right) => left.order - right.order || left.regionId.localeCompare(right.regionId)));
  const scales = Object.freeze(materializeScales(candidate, closure, resources)
    .sort((left, right) => left.regionId.localeCompare(right.regionId)
      || left.order - right.order || left.scaleGroupId.localeCompare(right.scaleGroupId)));
  const resourceCount = enforceLimits(regions, scales, resources);
  const ordered = (values) => Object.freeze([...values].sort((left, right) => (
    left.regionId.localeCompare(right.regionId) || left.order - right.order
      || left.resourceId.localeCompare(right.resourceId)
  )));
  const plan = Object.freeze({
    bands: ordered(resources.bands),
    binding: candidate.chartBinding,
    logicalStates: Object.freeze([...resources.states]
      .sort((left, right) => left.instanceId.localeCompare(right.instanceId))),
    plots: ordered(resources.plots),
    referenceLines: ordered(resources.referenceLines),
    regions,
    resourceCount,
    scales,
    schemaVersion: 1,
  });
  return Object.freeze({
    canonical: canonicalProjectionValue({
      candidate,
      plan,
    }),
    candidate,
    plan,
  });
}
