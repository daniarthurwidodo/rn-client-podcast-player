import { createStore } from 'zustand/vanilla';
import { getResumePosition, MIN_PLAYED_SECONDS } from '../lib/playbackProgress.ts';
import type { ProgressByUrl } from '../lib/playbackProgress.ts';
import type { SavedUrl } from '../lib/savedUrl';

const RESOLVE_ERROR_MESSAGE = 'Could not load audio for this URL';
const SEEK_ERROR_MESSAGE = 'Could not seek in this audio';
const EFFECT_ERROR_MESSAGE = 'That audio effect is not available on this device';
const PROGRESS_LOAD_ERROR_MESSAGE = 'Could not load your listening progress';
const PROGRESS_SAVE_ERROR_MESSAGE = 'Could not save your listening progress';

// The speed chip cycles through these in order.
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];
const DEFAULT_PLAYBACK_RATE = PLAYBACK_RATES[0];

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
  setPlaybackRate: (rate: number) => void;
  setEffectEnabled: (effect: AudioEffect, enabled: boolean) => Promise<void>;
  enableBackgroundPlayback: () => Promise<void>;
  showLockScreenControls: (metadata: LockScreenMetadata) => void;
  hideLockScreenControls: () => void;
  requestNotificationPermission: () => Promise<void>;
  subscribe: (listener: (status: PlaybackStatus) => void) => void;
};

export type ProgressStoragePort = {
  load: () => Promise<ProgressByUrl>;
  save: (progressByUrl: ProgressByUrl) => Promise<void>;
};

export type PlayerStoreDependencies = {
  resolveAudio: (videoUrl: string) => Promise<{ url: string }>;
  player: AudioPlayerPort;
  progressStorage: ProgressStoragePort;
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
  playbackRate: number;
  progressByUrl: ProgressByUrl;
};

type PlayerActions = {
  loadTrack: (track: SavedUrl) => Promise<void>;
  togglePlayback: () => void;
  seekToFraction: (fraction: number) => Promise<void>;
  skipBySeconds: (deltaSeconds: number) => Promise<void>;
  cyclePlaybackRate: () => void;
  stop: () => void;
  toggleEffect: (effect: AudioEffect) => Promise<void>;
};

export type PlayerState = PlayerData & PlayerActions;

// Effects, speed and saved progress belong to the player, so they survive track changes and stop().
const IDLE_DATA: Omit<PlayerData, 'enabledEffects' | 'playbackRate' | 'progressByUrl'> = {
  track: null,
  phase: 'idle',
  isLoaded: false,
  isBuffering: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  errorMessage: null,
};

export function createPlayerStore({ resolveAudio, player, progressStorage }: PlayerStoreDependencies) {
  // Only lock-screen controls need it, so it is asked for once per app session, after playback has started.
  let hasRequestedNotificationPermission = false;
  // While set, position updates are not saved: until the resume seek lands they report 0 and would overwrite the saved position.
  let resumeSeconds: number | null = null;
  let isResumeSeekIssued = false;

  const store = createStore<PlayerState>()((set, get) => ({
    ...IDLE_DATA,
    enabledEffects: { compressor: false, vocalBoost: false },
    playbackRate: DEFAULT_PLAYBACK_RATE,
    progressByUrl: {},

    loadTrack: async (track) => {
      const { track: currentTrack, phase } = get();
      if (currentTrack?.url === track.url && phase !== 'error') return;

      flushProgress();
      player.pause();
      const resumePosition = getResumePosition(get().progressByUrl[track.url]);
      resumeSeconds = resumePosition > 0 ? resumePosition : null;
      isResumeSeekIssued = false;
      set({ ...IDLE_DATA, track, phase: 'resolving' });
      try {
        const audio = await resolveAudio(track.url);
        if (get().track?.url !== track.url) return;
        await player.enableBackgroundPlayback();
        player.replace(audio.url);
        if (get().playbackRate !== DEFAULT_PLAYBACK_RATE) player.setPlaybackRate(get().playbackRate);
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
      if (isPlaying) {
        flushProgress();
        player.pause();
      } else player.play();
    },

    seekToFraction: (fraction) => seekWithinTrack(fraction * get().duration),

    skipBySeconds: (deltaSeconds) => seekWithinTrack(get().currentTime + deltaSeconds),

    cyclePlaybackRate: () => {
      const nextIndex = (PLAYBACK_RATES.indexOf(get().playbackRate) + 1) % PLAYBACK_RATES.length;
      const playbackRate = PLAYBACK_RATES[nextIndex];
      player.setPlaybackRate(playbackRate);
      set({ playbackRate });
    },

    stop: () => {
      flushProgress();
      resumeSeconds = null;
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

  const seekWithinTrack = async (targetSeconds: number) => {
    const { phase, isLoaded, duration } = store.getState();
    if (phase !== 'ready' || !isLoaded || duration <= 0) return;

    resumeSeconds = null;
    try {
      await player.seekTo(Math.min(Math.max(targetSeconds, 0), duration));
    } catch {
      store.setState({ errorMessage: SEEK_ERROR_MESSAGE });
    }
  };

  const recordProgress = async (url: string, positionSeconds: number, durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

    const progressByUrl = { ...store.getState().progressByUrl, [url]: { positionSeconds, durationSeconds } };
    store.setState({ progressByUrl });
    try {
      await progressStorage.save(progressByUrl);
    } catch {
      store.setState({ errorMessage: PROGRESS_SAVE_ERROR_MESSAGE });
    }
  };

  // Called before the player stops reporting this track, so the position is not credited to the next one.
  const flushProgress = () => {
    const { track, phase, isLoaded, currentTime, duration } = store.getState();
    if (!track || phase !== 'ready' || !isLoaded || resumeSeconds !== null) return;
    recordProgress(track.url, currentTime, duration);
  };

  const resumeFromSavedPosition = async (status: PlaybackStatus, targetSeconds: number) => {
    if (isResumeSeekIssued) {
      if (Math.abs(status.currentTime - targetSeconds) < MIN_PLAYED_SECONDS) resumeSeconds = null;
      return;
    }
    if (!status.isLoaded) return;

    isResumeSeekIssued = true;
    try {
      await player.seekTo(targetSeconds);
    } catch {
      resumeSeconds = null;
      store.setState({ errorMessage: SEEK_ERROR_MESSAGE });
    }
  };

  const saveProgressStep = (status: PlaybackStatus) => {
    const { track, progressByUrl } = store.getState();
    if (!track || !status.isLoaded) return;

    const savedPosition = progressByUrl[track.url]?.positionSeconds ?? 0;
    if (Math.abs(status.currentTime - savedPosition) < MIN_PLAYED_SECONDS) return;
    recordProgress(track.url, status.currentTime, status.duration);
  };

  const hydrateProgress = async () => {
    try {
      const savedProgress = await progressStorage.load();
      store.setState({ progressByUrl: { ...savedProgress, ...store.getState().progressByUrl } });
    } catch {
      store.setState({ errorMessage: PROGRESS_LOAD_ERROR_MESSAGE });
    }
  };

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

    if (resumeSeconds !== null) resumeFromSavedPosition(status, resumeSeconds);
    else saveProgressStep(status);
  });

  hydrateProgress();

  return store;
}
