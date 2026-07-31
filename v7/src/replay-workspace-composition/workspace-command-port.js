import { createPaneLayoutCommands } from './pane-layout-commands.js';
import { createWorkspaceFocusSyncCommands } from './workspace-focus-sync-commands.js';
import { createWorkspaceReplayCommands } from './workspace-replay-commands.js';
import { createWorkspaceReplacementCommands } from './workspace-replacement-commands.js';
import { createWorkspaceSettingsCommands } from './workspace-settings-commands.js';

/**
 * Assemble the public Replay Workspace command surface from focused command families.
 * Inputs are existing owner ports; this boundary constructs and owns no runtime state.
 */
export function createReplayWorkspaceCommandPort(context) {
  return Object.freeze({
    ...createPaneLayoutCommands(context),
    ...createWorkspaceFocusSyncCommands(context),
    ...createWorkspaceReplayCommands(context),
    ...createWorkspaceReplacementCommands(context),
    ...createWorkspaceSettingsCommands(context),
    dispose: context.disposeComposition,
    snapshot: context.snapshotComposition,
  });
}
