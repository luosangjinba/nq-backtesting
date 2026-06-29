import assert from 'node:assert/strict';
import {
  DEFAULT_USER_ID,
  DEFAULT_WORKSPACE_ID,
  bootstrapDefaultWorkspace,
  createDefaultUser,
  createDefaultWorkspace,
} from '../src/domain/default-workspace.js';

const bootstrapped = bootstrapDefaultWorkspace();
assert.equal(bootstrapped.user.id, DEFAULT_USER_ID);
assert.equal(bootstrapped.workspace.id, DEFAULT_WORKSPACE_ID);
assert.equal(bootstrapped.workspace.userId, bootstrapped.user.id);

const customUser = createDefaultUser({ name: 'Local Tester' });
const customWorkspace = createDefaultWorkspace(customUser, { name: 'Replay Lab' });
assert.equal(customUser.id, DEFAULT_USER_ID);
assert.equal(customUser.name, 'Local Tester');
assert.equal(customWorkspace.id, DEFAULT_WORKSPACE_ID);
assert.equal(customWorkspace.name, 'Replay Lab');
assert.equal(customWorkspace.userId, DEFAULT_USER_ID);

const guardedWorkspace = createDefaultWorkspace(customUser, {
  userId: 'other-user',
});
assert.equal(guardedWorkspace.userId, customUser.id);

console.log('v5 default workspace smoke passed');
