import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const decision = (await readFile(
  'v6/docs/V6_THREE_MODE_SHARED_FOUNDATION_DECISION_STEP461.md',
  'utf8',
)).replaceAll(/\s+/g, ' ');
const semanticDraft = (await readFile(
  'v6/docs/V6_SEMANTIC_DRAWING_PLUGIN_SPEC_DRAFT.md',
  'utf8',
)).replaceAll(/\s+/g, ' ');

for (const required of [
  'three operating policies over one Backtesting/Journal workstation',
  'import/review workflow, not a live-trading runtime',
  'must not switch to a different state owner',
  'generic drawings remain secondary and are deferred',
  'No mode shell or Semantic Drawing implementation is authorized',
]) {
  assert.equal(decision.includes(required), true, required);
}

assert.equal(semanticDraft.includes('Status: Accepted with changes'), true);
assert.equal(
  semanticDraft.includes('Authorized next step: none for Semantic Drawing implementation'),
  true,
);

console.log('v6 three-mode shared foundation step461 smoke passed');
