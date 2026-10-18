import type { SavedUrl } from '../../data/models.ts';
import type { AudioPlayerPort } from '../../data/ports.ts';
import type { Notices } from './notices.ts';
import { RESOLVE_ERROR_MESSAGE } from './playerMessages.ts';
import { DEFAULT_PLAYBACK_RATE, IDLE_DATA } from './playerState.ts';
import type { PlayerStoreDependencies, StoreAccess } from './playerState.ts';
import type { ProgressTracker } from './progressTracker.ts';
import type { QueueSideEffects } from './queueSideEffects.ts';

type TrackLoaderDependencies = {
  store: StoreAccess;
  player: AudioPlayerPort;
  resolveAudio: PlayerStoreDependencies['resolveAudio'];
  progress: ProgressTracker;
  notices: Notices;
  queueEffects: QueueSideEffects;
};

// Resolves a track, hands it to the player and starts it.
export function createTrackLoader({ store, player, resolveAudio, progress, notices, queueEffects }: TrackLoaderDependencies) {
  // Only lock-screen controls need it, so it is asked for once per app session, after playback has started.
  let hasRequestedNotificationPermission = false;

  const playResolved = async (track: SavedUrl, audioUrl: string) => {
    await player.enableBackgroundPlayback();
    player.replace(audioUrl);
    queueEffects.syncLoop();
    const { playbackRate } = store.getState();
    if (playbackRate !== DEFAULT_PLAYBACK_RATE) player.setPlaybackRate(playbackRate);
    player.play();
    player.showLockScreenControls({ title: track.title, artworkUrl: track.thumbnailUrl });
    store.setState({ phase: 'ready' });
    queueEffects.prefetchNextTrack();
  };

  const startTrack = async (track: SavedUrl) => {
    const { track: currentTrack, phase } = store.getState();
    const isSameTrack = currentTrack?.url === track.url;
    if (isSameTrack && phase !== 'error') return;

    progress.flush();
    notices.clearNotice();
    player.pause();
    progress.beginTrack(track.url);
    store.setState({ ...IDLE_DATA, track, phase: 'resolving' });
    try {
      // Retrying a failed track must not reuse the cached stream URL that probably caused the failure.
      const audio = await resolveAudio(track.url, { refresh: isSameTrack });
      if (store.getState().track?.url !== track.url) return;
      await playResolved(track, audio.url);
    } catch {
      if (store.getState().track?.url === track.url) store.setState({ phase: 'error', errorMessage: RESOLVE_ERROR_MESSAGE });
      return;
    }

    if (hasRequestedNotificationPermission) return;
    hasRequestedNotificationPermission = true;
    await player.requestNotificationPermission();
  };

  return { startTrack };
}
