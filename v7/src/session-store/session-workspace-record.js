import { deserializeLayoutSync, serializeLayoutSync } from '../layout-sync-domain/public.js';
import {
  deserializePaneLayout,
  readPaneLayout,
  serializePaneLayout,
} from '../pane-layout-domain/public.js';
import {
  deserializeReplayNavigationSettings,
  serializeReplayNavigationSettings,
} from '../replay-navigation-settings/public.js';
import {
  deserializeWorkspaceCheckpoint,
  readWorkspaceCheckpoint,
  serializeWorkspaceCheckpoint,
} from '../workspace-checkpoint-domain/public.js';

function exact(value, version, fields) {
  return value?.schemaVersion === version && value.state === (version === 1 ? 'uninitialized' : 'configured')
    && Object.keys(value).sort().join(',') === fields;
}

function normalizeSimple(value, version) {
  return Object.freeze({
    paneLayout: serializePaneLayout(deserializePaneLayout(value.paneLayout)),
    schemaVersion: version,
    state: 'configured',
  });
}

export function requireSessionWorkspace(
  value = { schemaVersion: 1, state: 'uninitialized' },
  configuration,
  { fail, isStoreError },
) {
  if (exact(value, 1, 'schemaVersion,state')) {
    return Object.freeze({ schemaVersion: 1, state: 'uninitialized' });
  }
  try {
    if (exact(value, 2, 'paneLayout,schemaVersion,state')) return normalizeSimple(value, 2);
    if (exact(value, 3, 'paneLayout,replayNavigationSettings,schemaVersion,state')) {
      return Object.freeze({
        paneLayout: serializePaneLayout(deserializePaneLayout(value.paneLayout)),
        replayNavigationSettings: serializeReplayNavigationSettings(
          deserializeReplayNavigationSettings(value.replayNavigationSettings),
        ),
        schemaVersion: 3,
        state: 'configured',
      });
    }
    if (exact(value, 4, 'paneLayout,schemaVersion,state')) return normalizeSimple(value, 4);
    if (exact(value, 5, 'layoutSync,paneLayout,schemaVersion,state')) {
      return Object.freeze({
        layoutSync: serializeLayoutSync(deserializeLayoutSync(value.layoutSync)),
        paneLayout: serializePaneLayout(deserializePaneLayout(value.paneLayout)),
        schemaVersion: 5,
        state: 'configured',
      });
    }
    if (exact(value, 6, 'checkpoint,layoutSync,paneLayout,schemaVersion,state')) {
      const paneLayout = deserializePaneLayout(value.paneLayout);
      const checkpoint = deserializeWorkspaceCheckpoint(value.checkpoint, configuration);
      if (readPaneLayout(paneLayout).paneCount !== readWorkspaceCheckpoint(checkpoint).panes.length) {
        fail(
          'INVALID_SESSION_WORKSPACE',
          'Session workspace Pane layout and checkpoint Pane count must match.',
        );
      }
      return Object.freeze({
        checkpoint: serializeWorkspaceCheckpoint(checkpoint),
        layoutSync: serializeLayoutSync(deserializeLayoutSync(value.layoutSync)),
        paneLayout: serializePaneLayout(paneLayout),
        schemaVersion: 6,
        state: 'configured',
      });
    }
  } catch (cause) {
    if (isStoreError(cause)) throw cause;
    fail('INVALID_SESSION_WORKSPACE', 'Session workspace configuration is invalid.', { cause });
  }
  fail('INVALID_SESSION_WORKSPACE', 'Session workspace envelope is unsupported.');
}
