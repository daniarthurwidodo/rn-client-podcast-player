import type { ResolvedAudio } from '../modules/newpipe-resolver';

// Measured: YouTube stream URLs live 6 hours. Stay under that, and leave a margin so a URL is never handed out right before it dies.
export const RESOLVED_AUDIO_TTL_MS = 5 * 60 * 60 * 1000;
export const EXPIRY_SAFETY_MARGIN_MS = 10 * 60 * 1000;

export type CachedEntry = { audio: ResolvedAudio; expiresAt: number };
export type CacheEntries = Record<string, CachedEntry>;
export type CachedResolution = ResolvedAudio & { isFromCache: boolean };

export type ResolvedAudioStoragePort = {
  load: () => Promise<CacheEntries>;
  save: (entries: CacheEntries) => Promise<void>;
};

type CachedResolverDependencies = {
  resolve: (videoUrl: string) => Promise<ResolvedAudio>;
  storage: ResolvedAudioStoragePort;
  now: () => number;
};

type ResolveOptions = { refresh?: boolean };

function isResolvedAudio(value: unknown): value is ResolvedAudio {
  if (typeof value !== 'object' || value === null) return false;
  const audio = value as Record<string, unknown>;
  return (
    typeof audio.url === 'string' &&
    typeof audio.title === 'string' &&
    typeof audio.mimeType === 'string' &&
    typeof audio.contentLength === 'number' &&
    (audio.thumbnailUrl === null || typeof audio.thumbnailUrl === 'string')
  );
}

function isCachedEntry(value: unknown): value is CachedEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.expiresAt === 'number' && Number.isFinite(entry.expiresAt) && isResolvedAudio(entry.audio);
}

export function parseCacheEntries(raw: unknown): CacheEntries {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const validEntries = Object.entries(raw).filter(([, entry]) => isCachedEntry(entry));
  return Object.fromEntries(validEntries);
}

export function isFresh(entry: CachedEntry, now: number): boolean {
  return now < entry.expiresAt - EXPIRY_SAFETY_MARGIN_MS;
}

export function pruneStale(entries: CacheEntries, now: number): CacheEntries {
  const freshEntries = Object.entries(entries).filter(([, entry]) => isFresh(entry, now));
  return Object.fromEntries(freshEntries);
}

export function createCachedResolveAudio({ resolve, storage, now }: CachedResolverDependencies) {
  let entries: CacheEntries | null = null;
  let pendingSave: Promise<void> = Promise.resolve();

  // A cache that cannot be read is just empty: playback must never depend on it.
  const getEntries = async (): Promise<CacheEntries> => {
    if (entries !== null) return entries;
    const loaded = await storage.load().catch(() => ({}));
    entries ??= loaded;
    return entries;
  };

  // Saves run one after another so an older snapshot can never land after a newer one.
  // A failed save only costs a cache miss next time, so it must not fail the resolve.
  const persist = () => {
    const snapshot = entries ?? {};
    pendingSave = pendingSave.then(() => storage.save(snapshot)).catch(() => undefined);
  };

  return async (videoUrl: string, { refresh = false }: ResolveOptions = {}): Promise<CachedResolution> => {
    const cached = (await getEntries())[videoUrl];
    if (!refresh && cached && isFresh(cached, now())) return { ...cached.audio, isFromCache: true };

    const audio = await resolve(videoUrl);
    const entry = { audio, expiresAt: now() + RESOLVED_AUDIO_TTL_MS };
    entries = pruneStale({ ...(entries ?? {}), [videoUrl]: entry }, now());
    persist();
    return { ...audio, isFromCache: false };
  };
}
