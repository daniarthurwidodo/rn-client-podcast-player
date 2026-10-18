import type { CacheEntries, ProgressByUrl } from './models';

export type AudioEffect = 'compressor' | 'vocalBoost';

export type PlaybackStatus = {
  isLoaded: boolean;
  isBuffering: boolean;
  playing: boolean;
  didJustFinish: boolean;
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
  setLoop: (isLooping: boolean) => void;
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

export type ResolvedAudioStoragePort = {
  load: () => Promise<CacheEntries>;
  save: (entries: CacheEntries) => Promise<void>;
};
