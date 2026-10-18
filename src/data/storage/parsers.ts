import type { ResolvedAudio } from '../../../modules/newpipe-resolver';
import type { CachedEntry, CacheEntries, PlaybackProgress, ProgressByUrl, SavedUrl } from '../models';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseStringList(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : [];
}

// Entries saved before titles existed are plain URL strings. Genres are only checked for shape here;
// they were normalised when written.
function parseSavedUrl(item: unknown): SavedUrl | null {
  if (typeof item === 'string') return { url: item, title: item, thumbnailUrl: null, genres: [] };
  if (!isRecord(item) || typeof item.url !== 'string') return null;

  const title = typeof item.title === 'string' ? item.title : item.url;
  const thumbnailUrl = typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null;
  return { url: item.url, title, thumbnailUrl, genres: parseStringList(item.genres) };
}

export function parseSavedUrls(raw: unknown): SavedUrl[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseSavedUrl).filter((item): item is SavedUrl => item !== null);
}

function isProgress(value: unknown): value is PlaybackProgress {
  if (!isRecord(value)) return false;
  return Number.isFinite(value.positionSeconds) && Number.isFinite(value.durationSeconds);
}

export function parseProgressByUrl(raw: unknown): ProgressByUrl {
  if (!isRecord(raw)) return {};
  const entries = Object.entries(raw).filter((entry): entry is [string, PlaybackProgress] => isProgress(entry[1]));
  return Object.fromEntries(entries);
}

function isResolvedAudio(value: unknown): value is ResolvedAudio {
  if (!isRecord(value)) return false;
  return (
    typeof value.url === 'string' &&
    typeof value.title === 'string' &&
    typeof value.mimeType === 'string' &&
    typeof value.contentLength === 'number' &&
    (value.thumbnailUrl === null || typeof value.thumbnailUrl === 'string')
  );
}

function isCachedEntry(value: unknown): value is CachedEntry {
  if (!isRecord(value)) return false;
  return typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) && isResolvedAudio(value.audio);
}

export function parseCacheEntries(raw: unknown): CacheEntries {
  if (!isRecord(raw)) return {};
  const entries = Object.entries(raw).filter((entry): entry is [string, CachedEntry] => isCachedEntry(entry[1]));
  return Object.fromEntries(entries);
}
