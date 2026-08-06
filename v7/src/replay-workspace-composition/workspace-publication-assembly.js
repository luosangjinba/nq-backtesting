import { readViewportIntent } from '../viewport-runtime/public.js';
import { createWorkspacePublicationPort } from './workspace-publication-port.js';

/** Construct reversible UI/durable publication over one semantic Session state. */
export function createWorkspacePublicationAssembly({
  checkpointPersistence,
  data,
  presentation,
  session,
}) {
  const { replay, workspaceState } = session;
  const publicationValue = () => Object.freeze({
    layout: session.readPaneLayout(),
    layoutSync: session.readLayoutSync(),
  });

  function render(candidate) {
    const state = candidate.workspaceState;
    const replaySnapshot = candidate.replay;
    const workspaceSnapshot = candidate.workspace;
    session.setPaneLayout(candidate.publication.layout);
    const semanticWorkspace = workspaceState.read(state.paneWorkspace);
    const activePaneId = semanticWorkspace.activePaneId;
    const activeSemanticPane = semanticWorkspace.panes.find(({ paneId }) => paneId === activePaneId);
    const active = workspaceSnapshot?.panes.find(({ paneId }) => paneId === activePaneId)
      ?? workspaceSnapshot?.panes[0] ?? null;
    const readyPanes = workspaceSnapshot?.panes.filter(({ status }) => status === 'ready') ?? [];
    presentation.setCursor(replaySnapshot.visibleThroughEpochMs);
    presentation.setEvidence({ replayRevision: replaySnapshot.revision, workspaceRevision: candidate.revision });
    presentation.setReplay(replaySnapshot);
    presentation.setSelection({ sessionHoursMode: state.sessionHours.mode });
    presentation.setVisibleThrough({
      barCount: active?.status === 'ready' ? active.snapshot.bars.length : 0,
      paneCount: workspaceSnapshot?.panes.length ?? semanticWorkspace.panes.length,
      visibleThroughEpochMs: replaySnapshot.visibleThroughEpochMs,
    });
    presentation.setLayout(session.readPaneLayout(), semanticWorkspace.panes.map(({ paneId }) => paneId));
    presentation.setWorkspace(state.paneWorkspace);
    presentation.setWall(activePaneId, readViewportIntent(activeSemanticPane.viewportIntent).origin);
    presentation.setState(workspaceSnapshot === null ? 'loading' : readyPanes.length === 0 ? 'empty' : 'ready');
  }

  function restore(previous) {
    if (previous === null) return;
    const failures = [];
    try {
      checkpointPersistence.restore({
        checkpoint: previous.workspaceState.checkpoint,
        layout: previous.publication.layout,
        layoutSync: previous.publication.layoutSync,
      });
    } catch (error) {
      failures.push(error);
    }
    try {
      render(previous);
    } catch (error) {
      failures.push(error);
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Workspace publication rollback could not restore accepted state.');
    }
  }

  const initialSemanticState = session.semanticState();
  const initialAccepted = Object.freeze({
    identity: initialSemanticState.identity,
    operation: 'initial',
    publication: publicationValue(),
    replay: replay.snapshot(),
    revision: 0,
    schemaVersion: 1,
    workspace: null,
    workspaceState: initialSemanticState,
  });
  const publicationPort = createWorkspacePublicationPort({
    initialAccepted,
    onApply(candidate) {
      render(candidate);
      checkpointPersistence.save({
        layout: candidate.publication.layout,
        layoutSync: candidate.publication.layoutSync,
        rethrow: true,
        reversible: true,
      });
    },
    onFinalize(candidate) {
      const failures = [];
      try {
        checkpointPersistence.finalize();
      } catch (error) {
        failures.push(error);
      }
      try {
        data.paneData.finalize(
          candidate.identity,
          workspaceState.paneIds(candidate.workspaceState.paneWorkspace),
        );
      } catch (error) {
        failures.push(error);
      }
      if (failures.length > 0) {
        throw new AggregateError(failures, 'Workspace publication finalization was incomplete.');
      }
    },
    onReject: (identity) => data.paneData.reject(identity),
    onRollback: restore,
  });
  return Object.freeze({ publicationPort, publicationValue });
}
