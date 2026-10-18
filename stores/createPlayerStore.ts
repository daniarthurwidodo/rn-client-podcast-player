import { createStore } from 'zustand/vanilla';
import type { SavedUrl } from '../lib/savedUrl';

const RESOLVE_ERROR_MESSAGE = 'Could not load audio for this URL';
const SEEK_ERROR_MESSAGE = 'Could not seek in this audio';
const EFFECT_ERROR_MESSAGE = 'That audio effect is not available on this device';

export type PlayerPhase = 'idle' | 'resolving' | 'ready' | 'error';

export type AudioEffect = 'compressor' | 'vocalBoost';

export type PlaybackStatus = {
  isLoaded: boolean;
  isBuffering: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  error: string | null;
};

export type LockScreenMetadata = {
  title: string;
  artworkUrl: string | null;
};

export type AudioPlayerPort = {
  replace: (uri: string) => void;
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => Promise<void>;
  setEffectEnabled: (effect: AudioEffect, enabled: boolean) => Promise<void>;
  enableBackgroundPlayback: () => Promise<void>;
  showLockScreenControls: (metadata: LockScreenMetadata) => void;
  hideLockScreenControls: () => void;
  requestNotificationPermission: () => Promise<void>;
  subscribe: (listener: (status: PlaybackStatus) => void) => void;
};

export type PlayerStoreDependencies = {
  resolveAudio: (videoUrl: string) => Promise<{ url: string }>;
  player: AudioPlayerPort;
};

type PlayerData = {
  track: SavedUrl | null;
  phase: PlayerPhase;
  isLoaded: boolean;
  isBuffering: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  errorMessage: string | null;
  enabledEffects: Record<AudioEffect, boolean>;
};

type PlayerActions = {
  loadTrack: (track: SavedUrl) => Promise<void>;
  togglePlayback: () => void;
  seekToFraction: (fraction: number) => Promise<void>;
  stop: () => void;
  toggleEffect: (effect: AudioEffect) => Promise<void>;
};

export type PlayerState = PlayerData & PlayerActions;

// Effects belong to the player, so they survive track changes and stop().
const IDLE_DATA: Omit<PlayerData, 'enabledEffects'> = {
  track: null,
  phase: 'idle',
  isLoaded: false,
  isBuffering: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  errorMessage: null,
};

export function createPlayerStore({ resolveAudio, player }: PlayerStoreDependencies) {
  // Only lock-screen controls need it, so it is asked for once per app session, after playback has started.
  let hasRequestedNotificationPermission = false;

  const store = createStore<PlayerState>()((set, get) => ({
    ...IDLE_DATA,
    enabledEffects: { compressor: false, vocalBoost: false },

    loadTrack: async (track) => {
      const { track: currentTrack, phase } = get();
      if (currentTrack?.url === track.url && phase !== 'error') return;

      player.pause();
      set({ ...IDLE_DATA, track, phase: 'resolving' });
      try {
        const audio = await resolveAudio(track.url);
        if (get().track?.url !== track.url) return;
        await player.enableBackgroundPlayback();
        player.replace(audio.url);
        player.play();
        player.showLockScreenControls({ title: track.title, artworkUrl: track.thumbnailUrl });
        set({ phase: 'ready' });
      } catch {
        if (get().track?.url === track.url) set({ phase: 'error', errorMessage: RESOLVE_ERROR_MESSAGE });
        return;
      }

      if (hasRequestedNotificationPermission) return;
      hasRequestedNotificationPermission = true;
      await player.requestNotificationPermission();
    },

    togglePlayback: () => {
      const { phase, isPlaying } = get();
      if (phase !== 'ready') return;
      if (isPlaying) player.pause();
      else player.play();
    },

    seekToFraction: async (fraction) => {
      const { phase, isLoaded, duration } = get();
      if (phase !== 'ready' || !isLoaded || duration <= 0) return;

      const clampedFraction = Math.min(Math.max(fraction, 0), 1);
      try {
        await player.seekTo(clampedFraction * duration);
      } catch {
        set({ errorMessage: SEEK_ERROR_MESSAGE });
      }
    },

    stop: () => {
      player.pause();
      player.hideLockScreenControls();
      set(IDLE_DATA);
    },

    toggleEffect: async (effect) => {
      const { enabledEffects } = get();
      const nextEnabled = !enabledEffects[effect];
      try {
        await player.setEffectEnabled(effect, nextEnabled);
        set({ enabledEffects: { ...get().enabledEffects, [effect]: nextEnabled } });
      } catch {
        set({ errorMessage: EFFECT_ERROR_MESSAGE });
      }
    },
  }));

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
  });

  return store;
}
