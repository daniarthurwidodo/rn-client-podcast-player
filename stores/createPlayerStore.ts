import { createStore } from 'zustand/vanilla';
import type { AudioEffect, AudioPlayerPort, PlaybackStatus, ProgressStoragePort } from '../src/data/ports.ts';
import { createNoticeTimer } from '../lib/noticeTimer.ts';
import { getResumePosition, MIN_PLAYED_SECONDS } from '../lib/playbackProgress.ts';
import type { ProgressByUrl, SavedUrl } from '../src/data/models.ts';
import { buildQueue, cycleRepeatMode, getNextStep, getPreviousStep, isLoopingTrack, reorderQueue } from '../lib/queue.ts';
import type { QueueState, RepeatMode } from '../lib/queue.ts';

const RESOLVE_ERROR_MESSAGE = 'Could not load audio for this URL';
const SEEK_ERROR_MESSAGE = 'Could not seek in this audio';
const EFFECT_ERROR_MESSAGE = 'That audio effect is not available on this device';
const PROGRESS_LOAD_ERROR_MESSAGE = 'Could not load your listening progress';
const PROGRESS_SAVE_ERROR_MESSAGE = 'Could not save your listening progress';

// The speed chip cycles through these in order.
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];
const DEFAULT_PLAYBACK_RATE = PLAYBACK_RATES[0];

export type PlayerPhase = 'idle' | 'resolving' | 'ready' | 'error';

export type PlayerStoreDependencies = {
  resolveAudio: (videoUrl: string, options?: { refresh?: boolean }) => Promise<{ url: string }>;
  player: AudioPlayerPort;
  progressStorage: ProgressStoragePort;
  random: () => number;
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
  notice: string | null;
  enabledEffects: Record<AudioEffect, boolean>;
  playbackRate: number;
  progressByUrl: ProgressByUrl;
  queue: QueueState | null;
  queueSource: SavedUrl[];
  repeatMode: RepeatMode;
  isShuffled: boolean;
};

type PlayerActions = {
  loadTrack: (track: SavedUrl) => Promise<void>;
  playQueue: (tracks: SavedUrl[], options: { shuffle: boolean }) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  playQueueTrack: (index: number) => Promise<void>;
  cycleRepeat: () => void;
  toggleShuffle: () => void;
  togglePlayback: () => void;
  seekToFraction: (fraction: number) => Promise<void>;
  skipBySeconds: (deltaSeconds: number) => Promise<void>;
  cyclePlaybackRate: () => void;
  stop: () => void;
  clearNotice: () => void;
  toggleEffect: (effect: AudioEffect) => Promise<void>;
};

export type PlayerState = PlayerData & PlayerActions;

// errorMessage is the fatal error that puts the track in the error phase; notice is a non-fatal one that expires.
// Effects, speed, saved progress and the repeat mode belong to the player, so they survive track changes and stop().
// The queue is left out on purpose: loading the next queue track must not reset it.
const IDLE_DATA: Omit<PlayerData, 'notice' | 'enabledEffects' | 'playbackRate' | 'progressByUrl' | 'queue' | 'queueSource' | 'repeatMode' | 'isShuffled'> = {
  track: null,
  phase: 'idle',
  isLoaded: false,
  isBuffering: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  errorMessage: null,
};

export function createPlayerStore({ resolveAudio, player, progressStorage, random }: PlayerStoreDependencies) {
  // Only lock-screen controls need it, so it is asked for once per app session, after playback has started.
  let hasRequestedNotificationPermission = false;
  // While set, position updates are not saved: until the resume seek lands they report 0 and would overwrite the saved position.
  let resumeSeconds: number | null = null;
  let isResumeSeekIssued = false;
  let isLooping = false;
  const noticeTimer = createNoticeTimer(() => clearNotice());

  const store = createStore<PlayerState>()((set, get) => ({
    ...IDLE_DATA,
    notice: null,
    enabledEffects: { compressor: false, vocalBoost: false },
    playbackRate: DEFAULT_PLAYBACK_RATE,
    progressByUrl: {},
    queue: null,
    queueSource: [],
    repeatMode: 'off',
    isShuffled: false,

    loadTrack: (track) => {
      // A manual pick of another track ends the playlist; reopening or retrying the current one keeps it.
      if (get().track?.url !== track.url) set({ queue: null });
      return startTrack(track);
    },

    playQueue: async (tracks, { shuffle }) => {
      if (tracks.length === 0) return;
      const orderedTracks = buildQueue(tracks, shuffle, random);
      set({ queue: { tracks: orderedTracks, index: 0 }, queueSource: tracks, isShuffled: shuffle });
      await startTrack(orderedTracks[0]);
    },

    playNext: async () => {
      await moveToNext();
    },

    playQueueTrack: async (index) => {
      const { queue } = get();
      if (!queue || index === queue.index || !queue.tracks[index]) return;
      await moveToStep({ tracks: queue.tracks, index });
    },

    cycleRepeat: () => {
      set({ repeatMode: cycleRepeatMode(get().repeatMode) });
      syncLoop();
    },

    toggleShuffle: () => {
      const { queue, queueSource, isShuffled } = get();
      if (!queue) return;
      const nextQueue = reorderQueue(queueSource, queue.tracks[queue.index], !isShuffled, random);
      set({ queue: nextQueue, isShuffled: !isShuffled });
    },

    playPrevious: async () => {
      const { queue, repeatMode } = get();
      if (!queue) return;
      const step = getPreviousStep({ queue, repeatMode });
      if (step) await moveToStep(step);
      else await seekWithinTrack(0);
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
      clearNotice();
      resumeSeconds = null;
      player.pause();
      player.hideLockScreenControls();
      set({ ...IDLE_DATA, queue: null });
      syncLoop();
    },

    clearNotice: () => clearNotice(),

    toggleEffect: async (effect) => {
      const { enabledEffects } = get();
      const nextEnabled = !enabledEffects[effect];
      try {
        await player.setEffectEnabled(effect, nextEnabled);
        set({ enabledEffects: { ...get().enabledEffects, [effect]: nextEnabled } });
        clearNoticeIfShowing(EFFECT_ERROR_MESSAGE);
      } catch {
        showNotice(EFFECT_ERROR_MESSAGE);
      }
    },
  }));

  const startTrack = async (track: SavedUrl) => {
    const { track: currentTrack, phase } = store.getState();
    const isSameTrack = currentTrack?.url === track.url;
    if (isSameTrack && phase !== 'error') return;

    flushProgress();
    clearNotice();
    player.pause();
    const resumePosition = getResumePosition(store.getState().progressByUrl[track.url]);
    resumeSeconds = resumePosition > 0 ? resumePosition : null;
    isResumeSeekIssued = false;
    store.setState({ ...IDLE_DATA, track, phase: 'resolving' });
    try {
      // Retrying a failed track must not reuse the cached stream URL that probably caused the failure.
      const audio = await resolveAudio(track.url, { refresh: isSameTrack });
      if (store.getState().track?.url !== track.url) return;
      await player.enableBackgroundPlayback();
      player.replace(audio.url);
      syncLoop();
      if (store.getState().playbackRate !== DEFAULT_PLAYBACK_RATE) player.setPlaybackRate(store.getState().playbackRate);
      player.play();
      player.showLockScreenControls({ title: track.title, artworkUrl: track.thumbnailUrl });
      store.setState({ phase: 'ready' });
      prefetchNextTrack();
    } catch {
      if (store.getState().track?.url === track.url) store.setState({ phase: 'error', errorMessage: RESOLVE_ERROR_MESSAGE });
      return;
    }

    if (hasRequestedNotificationPermission) return;
    hasRequestedNotificationPermission = true;
    await player.requestNotificationPermission();
  };

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

  const clearNotice = () => {
    noticeTimer.cancel();
    store.setState({ notice: null });
  };

  const showNotice = (message: string) => {
    store.setState({ notice: message });
    noticeTimer.start();
  };

  const clearNoticeIfShowing = (message: string) => {
    if (store.getState().notice === message) clearNotice();
  };

  const seekWithinTrack = async (targetSeconds: number) => {
    const { phase, isLoaded, duration } = store.getState();
    if (phase !== 'ready' || !isLoaded || duration <= 0) return;

    resumeSeconds = null;
    try {
      await player.seekTo(Math.min(Math.max(targetSeconds, 0), duration));
      clearNoticeIfShowing(SEEK_ERROR_MESSAGE);
    } catch {
      showNotice(SEEK_ERROR_MESSAGE);
    }
  };

  const recordProgress = async (url: string, positionSeconds: number, durationSeconds: number) => {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return;

    const progressByUrl = { ...store.getState().progressByUrl, [url]: { positionSeconds, durationSeconds } };
    store.setState({ progressByUrl });
    try {
      await progressStorage.save(progressByUrl);
      clearNoticeIfShowing(PROGRESS_SAVE_ERROR_MESSAGE);
    } catch {
      showNotice(PROGRESS_SAVE_ERROR_MESSAGE);
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
      showNotice(SEEK_ERROR_MESSAGE);
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
      showNotice(PROGRESS_LOAD_ERROR_MESSAGE);
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
    if (status.didJustFinish) advanceAfterFinish();
  });

  hydrateProgress();

  return store;
}
