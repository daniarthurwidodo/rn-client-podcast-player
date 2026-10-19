import type { SavedUrl } from '../../data/models.ts';
import { buildQueue, cycleRepeatMode, getNextStep, getPreviousStep, reorderQueue } from '../playback/queue.ts';
import type { QueueState } from '../playback/queue.ts';
import type { PlayerActions, StoreAccess } from './playerState.ts';
import type { QueueSideEffects } from './queueSideEffects.ts';

type QueueControllerDependencies = {
  store: StoreAccess;
  random: () => number;
  startTrack: (track: SavedUrl) => Promise<void>;
  seekWithinTrack: (targetSeconds: number) => Promise<void>;
  queueEffects: QueueSideEffects;
};

type QueueActions = Pick<
  PlayerActions,
  'loadTrack' | 'playQueue' | 'playNext' | 'playPrevious' | 'playQueueTrack' | 'cycleRepeat' | 'toggleShuffle'
>;

// The playlist: building it, moving through it, repeat and shuffle.
export function createQueueController({ store, random, startTrack, seekWithinTrack, queueEffects }: QueueControllerDependencies) {
  const moveToStep = async (step: QueueState) => {
    store.setState({ queue: step });
    await startTrack(step.tracks[step.index]);
  };

  // False when the queue has no further track.
  const moveToNext = async (): Promise<boolean> => {
    const { queue, repeatMode, isShuffled } = store.getState();
    const step = queue && getNextStep({ queue, repeatMode, isShuffled, random });
    if (!step) return false;

    await moveToStep(step);
    return true;
  };

  const advanceAfterFinish = async () => {
    if (!store.getState().queue) return;
    const hasNext = await moveToNext();
    if (!hasNext) store.setState({ queue: null });
  };

  const actions: QueueActions = {
    loadTrack: (track) => {
      // A manual pick of another track ends the playlist; reopening or retrying the current one keeps it.
      if (store.getState().track?.url !== track.url) store.setState({ queue: null });
      return startTrack(track);
    },

    playQueue: async (tracks, { shuffle }) => {
      if (tracks.length === 0) return;
      const orderedTracks = buildQueue(tracks, shuffle, random);
      store.setState({ queue: { tracks: orderedTracks, index: 0 }, queueSource: tracks, isShuffled: shuffle });
      await startTrack(orderedTracks[0]);
    },

    playNext: async () => {
      await moveToNext();
    },

    playQueueTrack: async (index) => {
      const { queue } = store.getState();
      if (!queue || index === queue.index || !queue.tracks[index]) return;
      await moveToStep({ tracks: queue.tracks, index });
    },

    playPrevious: async () => {
      const { queue, repeatMode } = store.getState();
      if (!queue) return;
      const step = getPreviousStep({ queue, repeatMode });
      if (step) await moveToStep(step);
      else await seekWithinTrack(0);
    },

    cycleRepeat: () => {
      store.setState({ repeatMode: cycleRepeatMode(store.getState().repeatMode) });
      queueEffects.syncLoop();
    },

    toggleShuffle: () => {
      const { queue, queueSource, isShuffled } = store.getState();
      if (!queue) return;
      const nextQueue = reorderQueue(queueSource, queue.tracks[queue.index], !isShuffled, random);
      store.setState({ queue: nextQueue, isShuffled: !isShuffled });
    },
  };

  return { actions, advanceAfterFinish };
}
