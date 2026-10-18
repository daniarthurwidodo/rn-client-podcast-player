import { createStore } from 'zustand/vanilla';
import { createNotices } from './notices.ts';
import { createPlaybackControls } from './playbackControls.ts';
import { INITIAL_DATA } from './playerState.ts';
import type { PlayerState, PlayerStoreDependencies, StoreAccess } from './playerState.ts';
import { createProgressTracker } from './progressTracker.ts';
import { createQueueController } from './queueController.ts';
import { createQueueSideEffects } from './queueSideEffects.ts';
import { createTrackLoader } from './trackLoader.ts';

export { PLAYBACK_RATES } from './playerState.ts';
export type { PlayerPhase, PlayerState, PlayerStoreDependencies } from './playerState.ts';

// Composition: each concern lives in its own module and they are wired together here.
export function createPlayerStore({ resolveAudio, player, progressStorage, random }: PlayerStoreDependencies) {
  // The slices only touch the store when called later, so they can be built before it exists.
  const access: StoreAccess = { getState: () => store.getState(), setState: (partial) => store.setState(partial) };

  const notices = createNotices(access);
  const progress = createProgressTracker({ store: access, player, progressStorage, notices });
  const queueEffects = createQueueSideEffects({ store: access, player, resolveAudio });
  const loader = createTrackLoader({ store: access, player, resolveAudio, progress, notices, queueEffects });
  const controls = createPlaybackControls({ store: access, player, progress, notices, queueEffects });
  const queue = createQueueController({
    store: access,
    random,
    startTrack: loader.startTrack,
    seekWithinTrack: controls.seekWithinTrack,
    queueEffects,
  });

  const store = createStore<PlayerState>()(() => ({ ...INITIAL_DATA, ...controls.actions, ...queue.actions }));

  player.subscribe((status) => {
    if (store.getState().phase !== 'ready') return;
    store.setState({
      isLoaded: status.isLoaded,
      isBuffering: status.isBuffering,
      isPlaying: status.playing,
      currentTime: status.currentTime,
      duration: status.duration,
      ...(status.error ? { phase: 'error' as const, errorMessage: status.error } : {}),
    });
    if (status.error) return;

    progress.handleStatus(status);
    if (status.didJustFinish) queue.advanceAfterFinish();
  });

  progress.hydrate();

  return store;
}
