import { getIsolatedSegment, getSegments } from './segment-store.js';

function getTimestamp(segment) {
  const value = Number(segment?.start?.timestamp ?? segment?.start?.time ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function getResponseDisplayMode(response) {
  return response?.displayMode || (response?.selected === false ? 'normal' : 'highlight');
}

export function getSortedSegments() {
  return [...getSegments()].sort((a, b) => {
    const startDiff = getTimestamp(a) - getTimestamp(b);
    if (startDiff !== 0) return startDiff;
    return Number(a?.end?.timestamp ?? a?.end?.time ?? 0) - Number(b?.end?.timestamp ?? b?.end?.time ?? 0);
  });
}

export function getIsolatePreviousCount(segment) {
  const value = Number(segment?.display?.isolatePreviousCount ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

export function getIsolatePreviousIncludePda(segment) {
  return Boolean(segment?.display?.isolatePreviousIncludePda);
}

export function getIsolateCompanionSegments(isolatedSegment = getIsolatedSegment()) {
  if (!isolatedSegment) return [];

  const count = getIsolatePreviousCount(isolatedSegment);
  if (!count) return [];

  const segments = getSortedSegments();
  const isolatedIndex = segments.findIndex((segment) => segment.id === isolatedSegment.id);
  if (isolatedIndex <= 0) return [];

  return segments.slice(Math.max(0, isolatedIndex - count), isolatedIndex);
}
