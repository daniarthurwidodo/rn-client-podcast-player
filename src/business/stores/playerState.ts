import type { ProgressByUrl, SavedUrl } from '../../data/models.ts';
import type { AudioEffect, AudioPlayerPort, ProgressStoragePort } from '../../data/ports.ts';
import type { QueueState, RepeatMode } from '../playback/queue.ts';

// The speed chip cycles through these in order.
export const PLAYBACK_RATES = [1, 1.25, 1.5, 2, 0.75];
export const DEFAULT_PLAYBACK_RATE = PLAYBACK_RATES[0];

export type PlayerPhase = 'idle' | 'resolving' | 'ready' | 'error';

export type PlayerStoreDependencies = {
  resolveAudio: (videoUrl: string, options?: { refresh?: boolean }) => Promise<{ url: string }>;
  player: AudioPlayerPort;
  progressStorage: ProgressStoragePort;
  random: () => number;
};

export type PlayerData = {
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

export type PlayerActions = {
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

// The slices read and write the store through this, so they can be built before the store exists.
export type StoreAccess = {
  getState: () => PlayerState;
  setState: (partial: Partial<PlayerState>) => void;
};

// The part of the state that describes the current track. errorMessage is the fatal error that puts the track in
// the error phase; notice (not part of this) is a non-fatal one that expires.
export const IDLE_DATA: Pick<PlayerData, 'track' | 'phase' | 'isLoaded' | 'isBuffering' | 'isPlaying' | 'currentTime' | 'duration' | 'errorMessage'> = {
  track: null,
  phase: 'idle',
  isLoaded: false,
  isBuffering: false,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  errorMessage: null,
};

// Effects, speed, saved progress and the repeat mode belong to the player, so they survive track changes and stop().
// The queue is not part of IDLE_DATA on purpose: loading the next queue track must not reset it.
export const INITIAL_DATA: PlayerData = {
  ...IDLE_DATA,
  notice: null,
  enabledEffects: { compressor: false, vocalBoost: false },
  playbackRate: DEFAULT_PLAYBACK_RATE,
  progressByUrl: {},
  queue: null,
  queueSource: [],
  repeatMode: 'off',
  isShuffled: false,
};
