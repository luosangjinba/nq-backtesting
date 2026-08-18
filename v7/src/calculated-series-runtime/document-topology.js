import {
  defineCalculatedSeriesWorkspaceDocument,
  readCalculatedSeriesWorkspaceDocument,
} from '../calculated-series-contract/public.js';

export const MAIN_REGION = Object.freeze({
  collapsed: false, heightWeight: 100, kind: 'main', order: 0, regionId: 'region-main',
});

export function mainPriceScale(scaleIntent) {
  return Object.freeze({
    axisIntent: 'primary', order: 0, regionId: 'region-main',
    scaleGroupId: 'scale-price-main', scaleIntent,
  });
}

export function emptyCalculatedSeriesDocument(sessionId) {
  return Object.freeze({
    documentRevision: 1, schemaVersion: 1, sessionId, workspacePanes: Object.freeze([]),
  });
}

export function emptyCalculatedSeriesPane(workspacePaneId, scaleIntent) {
  return Object.freeze({
    chartRegions: Object.freeze([MAIN_REGION]),
    resolvedInstances: Object.freeze([]),
    scaleGroups: Object.freeze([mainPriceScale(scaleIntent)]),
    unresolvedInstances: Object.freeze([]),
    workspacePaneId,
  });
}

export function cloneDocumentWire(document) {
  return structuredClone(readCalculatedSeriesWorkspaceDocument(document));
}

export function brandDocumentWire(wire, definitions) {
  return defineCalculatedSeriesWorkspaceDocument(wire, { definitions });
}

export function paneInDocument(wire, paneId) {
  return wire.workspacePanes.find(({ workspacePaneId }) => workspacePaneId === paneId) ?? null;
}

export function ensurePane(wire, paneId, scaleIntent) {
  let pane = paneInDocument(wire, paneId);
  if (pane) return pane;
  pane = structuredClone(emptyCalculatedSeriesPane(paneId, scaleIntent));
  wire.workspacePanes.push(pane);
  return pane;
}

export function removeEmptyInternalRegions(pane) {
  const used = new Set(pane.resolvedInstances.flatMap(({ plotGroupPlacements }) => (
    plotGroupPlacements.map(({ regionId }) => regionId)
  )));
  pane.chartRegions = pane.chartRegions.filter(({ kind, regionId }) => kind === 'main' || used.has(regionId));
  const regionIds = new Set(pane.chartRegions.map(({ regionId }) => regionId));
  pane.scaleGroups = pane.scaleGroups.filter(({ regionId }) => regionIds.has(regionId));
  const main = pane.chartRegions.find(({ kind }) => kind === 'main');
  main.heightWeight = pane.chartRegions.length === 1 ? 100 : 70;
}
