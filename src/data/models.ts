import type { ResolvedAudio } from '../../modules/newpipe-resolver';

export type SavedUrl = {
  url: string;
  title: string;
  thumbnailUrl: string | null;
  genres: string[];
};

export type PlaybackProgress = { positionSeconds: number; durationSeconds: number };

export type ProgressByUrl = Record<string, PlaybackProgress>;

export type CachedEntry = { audio: ResolvedAudio; expiresAt: number };

export type CacheEntries = Record<string, CachedEntry>;
