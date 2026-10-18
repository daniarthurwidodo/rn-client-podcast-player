import type { AudioPlayerPort } from '../../data/ports.ts';
import type { Notices } from './notices.ts';
import { EFFECT_ERROR_MESSAGE, SEEK_ERROR_MESSAGE } from './playerMessages.ts';
import { IDLE_DATA, PLAYBACK_RATES } from './playerState.ts';
import type { PlayerActions, StoreAccess } from './playerState.ts';
import type { ProgressTracker } from './progressTracker.ts';
import type { QueueSideEffects } from './queueSideEffects.ts';

type PlaybackControlsDependencies = {
  store: StoreAccess;
  player: AudioPlayerPort;
  progress: ProgressTracker;
  notices: Notices;
  queueEffects: QueueSideEffects;
};

type ControlActions = Pick<
  PlayerActions,
  'togglePlayback' | 'seekToFraction' | 'skipBySeconds' | 'cyclePlaybackRate' | 'stop' | 'toggleEffect' | 'clearNotice'
>;

// Play/pause, seeking, speed, effects and stopping: what the transport buttons do to the current track.
export function createPlaybackControls({ store, player, progress, notices, queueEffects }: PlaybackControlsDependencies) {
  const seekWithinTrack = async (targetSeconds: number) => {
    const { phase, isLoaded, duration } = store.getState();
    if (phase !== 'ready' || !isLoaded || duration <= 0) return;

    progress.cancelResume();
    try {
      await player.seekTo(Math.min(Math.max(targetSeconds, 0), duration));
      notices.clearNoticeIfShowing(SEEK_ERROR_MESSAGE);
    } catch {
      notices.showNotice(SEEK_ERROR_MESSAGE);
    }
  };

  const actions: ControlActions = {
    togglePlayback: () => {
      const { phase, isPlaying } = store.getState();
      if (phase !== 'ready') return;
      if (isPlaying) {
        progress.flush();
        player.pause();
      } else player.play();
    },

    seekToFraction: (fraction) => seekWithinTrack(fraction * store.getState().duration),

    skipBySeconds: (deltaSeconds) => seekWithinTrack(store.getState().currentTime + deltaSeconds),

    cyclePlaybackRate: () => {
      const nextIndex = (PLAYBACK_RATES.indexOf(store.getState().playbackRate) + 1) % PLAYBACK_RATES.length;
      const playbackRate = PLAYBACK_RATES[nextIndex];
      player.setPlaybackRate(playbackRate);
      store.setState({ playbackRate });
    },

    stop: () => {
      progress.flush();
      notices.clearNotice();
      progress.cancelResume();
      player.pause();
      player.hideLockScreenControls();
      store.setState({ ...IDLE_DATA, queue: null });
      queueEffects.syncLoop();
    },

    clearNotice: notices.clearNotice,

    toggleEffect: async (effect) => {
      const nextEnabled = !store.getState().enabledEffects[effect];
      try {
        await player.setEffectEnabled(effect, nextEnabled);
        store.setState({ enabledEffects: { ...store.getState().enabledEffects, [effect]: nextEnabled } });
        notices.clearNoticeIfShowing(EFFECT_ERROR_MESSAGE);
      } catch {
        notices.showNotice(EFFECT_ERROR_MESSAGE);
      }
    },
  };

  return { actions, seekWithinTrack };
}
