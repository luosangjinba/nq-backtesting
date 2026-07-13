import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [doc, index, todo, handoff] = await Promise.all([
  readFile('v6/docs/V6_ARCHITECTURE_REMEDIATION_STEP392.md', 'utf8'),
  readFile('v6/docs/INDEX.md', 'utf8'),
  readFile('v6/TODO.md', 'utf8'),
  readFile('v6/docs/V6_HANDOFF.md', 'utf8'),
]);

assert.match(doc, /Status\s+Accepted/);
assert.match(doc, /source bar before committing one final replay cursor/);
assert.match(doc, /target bars remain display materialization inputs only/i);
assert.match(index, /V6_ARCHITECTURE_REMEDIATION_STEP392\.md/);
assert.match(todo, /### Step 392 - V6 Architecture Remediation/);
assert.match(todo, /### Step 393 - Production Complexity Reduction/);
assert.match(handoff, /Latest completed step: Step 392/);

console.log('v6 architecture remediation step392 static smoke passed');
