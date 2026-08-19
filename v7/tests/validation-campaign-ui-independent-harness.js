import assert from 'node:assert/strict';
import { createValidationCampaignUi } from '../src/validation-campaign-ui/public.js';

const runtime = Object.freeze({
  execute() {},
  getCampaign() {},
  listCampaigns() { return Object.freeze([]); },
  prepareAuditExport() {},
  prepareCaseObservation() {},
  prepareRawContextIntent() {},
  readAnalysisDrilldown() {},
  snapshot() { return Object.freeze({ status: 'ready' }); },
  subscribe() { return Object.freeze({ unsubscribe() {} }); },
});

const ui = createValidationCampaignUi({
  download() {},
  onRawContextIntent() {},
  runtime,
});
assert.deepEqual(ui.snapshot(), {
  disposed: false,
  replayAttachmentCount: 0,
  started: false,
});
ui.dispose();
assert.deepEqual(ui.snapshot(), {
  disposed: true,
  replayAttachmentCount: 0,
  started: false,
});

console.log('v7 validation campaign UI independent harness passed');
