import type { AudioPlayerPort } from '../../data/ports.ts';
import { isLoopingTrack } from '../playback/queue.ts';
import type { PlayerStoreDependencies, StoreAccess } from './playerState.ts';

type QueueSideEffectsDependencies = {
  store: StoreAccess;
  player: AudioPlayerPort;
  resolveAudio: PlayerStoreDependencies['resolveAudio'];
};

export type QueueSideEffects = ReturnType<typeof createQueueSideEffects>;

// What the player has to do because of the queue's state, apart from loading tracks.
export function createQueueSideEffects({ store, player, resolveAudio }: QueueSideEffectsDependencies) {
  let isLooping = false;

  // The player loops by itself, so repeating one track never reloads it; only changes are sent to the player.
  const syncLoop = () => {
    const { queue, repeatMode } = store.getState();
    const shouldLoop = isLoopingTrack(queue, repeatMode);
    if (shouldLoop === isLooping) return;
    isLooping = shouldLoop;
    player.setLoop(shouldLoop);
  };

  // Warms the resolve cache so the next track starts without the fetch delay. Best effort: nothing depends on the
  // result, so a failure is ignored and the track is simply resolved when its turn comes.
  const prefetchNextTrack = () => {
    const { queue } = store.getState();
    const nextTrack = queue?.tracks[queue.index + 1];
    if (nextTrack) resolveAudio(nextTrack.url).catch(() => undefined);
  };

  return { syncLoop, prefetchNextTrack };
}
