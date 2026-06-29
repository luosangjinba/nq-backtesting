export const REPLAY_COMMANDS = Object.freeze({
  RESOLVE_START_BAR: 'replay.resolveStartBar',
  LOAD_INITIAL_PREFIX: 'replay.loadInitialPrefix',
  LOAD_INITIAL_SESSION: 'replay.loadInitialSession',
  LOAD_PREFIX_DEMAND: 'replay.loadPrefixDemand',
  APPLY_PREFIX_RETENTION: 'replay.applyPrefixRetention',
  NEXT: 'replay.next',
  PLAY: 'replay.play',
  PAUSE: 'replay.pause',
  GET_PLAYBACK_STATE: 'replay.getPlaybackState',
  GET_STATE: 'replay.getState',
});

export const REPLAY_EVENTS = Object.freeze({
  START_BAR_RESOLVED: 'replay:startBarResolved',
  PREFIX_LOADED: 'replay:prefixLoaded',
  PREFIX_CHUNK_LOADED: 'replay:prefixChunkLoaded',
  PREFIX_CHUNK_RELEASED: 'replay:prefixChunkReleased',
  INITIAL_LOADED: 'replay:initialLoaded',
  NEXT: 'replay:next',
  PLAYBACK_CHANGED: 'replay:playbackChanged',
});
