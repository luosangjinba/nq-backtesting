import assert from 'node:assert/strict';
import { createProspectiveTradePlanRevision } from '../src/validation-trade-plan/trade-plan-domain.js';

const plan = createProspectiveTradePlanRevision({ createdAt: 1, direction: 'long', entry: 100, evidenceId: 'e', id: 'pr1', invalidation: 'Close below structure', observationId: 'o', stop: 90, target: 120, tradePlanId: 'p', trialId: 't' });
assert.equal(plan.revision, 1);
assert.equal(plan.revisionKind, 'prospective');
assert.equal(plan.perspective, 'prospective');
assert.throws(() => createProspectiveTradePlanRevision({ ...plan, id: 'bad', stop: 110 }), /geometry/);
assert.throws(() => createProspectiveTradePlanRevision({ ...plan, direction: 'flat' }), /long or short/);
console.log('v6 trade plan step466 smoke passed');
