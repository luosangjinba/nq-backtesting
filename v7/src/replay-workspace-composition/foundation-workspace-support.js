import { FOUNDATION_IDS } from './foundation-capabilities.js';

export function supportsFoundationWorkspace(record) {
  const instrumentIds = record?.configuration?.instrumentIds;
  const supported = new Set(Object.values(FOUNDATION_IDS.instruments));
  return Array.isArray(instrumentIds) && instrumentIds.length > 0
    && instrumentIds.includes(FOUNDATION_IDS.instrument)
    && instrumentIds.every((id) => supported.has(id));
}
