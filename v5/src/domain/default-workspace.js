import {
  assertWorkspaceBelongsToUser,
  normalizeUser,
  normalizeWorkspace,
} from './session-model.js';

export const DEFAULT_USER_ID = 'default-user';
export const DEFAULT_WORKSPACE_ID = 'default-workspace';

export function createDefaultUser(input = {}) {
  return normalizeUser({
    id: DEFAULT_USER_ID,
    name: 'Default User',
    ...input,
  });
}

export function createDefaultWorkspace(user, input = {}) {
  const workspace = normalizeWorkspace({
    ...input,
    id: input.id || DEFAULT_WORKSPACE_ID,
    userId: user.id,
    name: input.name || 'Default Workspace',
  });
  assertWorkspaceBelongsToUser(workspace, user);
  return workspace;
}

export function bootstrapDefaultWorkspace(input = {}) {
  const user = createDefaultUser(input.user);
  const workspace = createDefaultWorkspace(user, input.workspace);
  return { user, workspace };
}
