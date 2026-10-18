import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createCachedResolveAudio,
  EXPIRY_SAFETY_MARGIN_MS,
  isFresh,
  parseCacheEntries,
  pruneStale,
  RESOLVED_AUDIO_TTL_MS,
} from './resolvedAudioCache.ts';
import type { CacheEntries } from './resolvedAudioCache.ts';

const URL_A = 'https://youtu.be/aaaaaaaaaaa';
const URL_B = 'https://youtu.be/bbbbbbbbbbb';
const START = 1_000_000;

const audioFor = (url: string) => ({ url: `stream:${url}`, title: url, mimeType: 'audio/mp4', contentLength: 10, thumbnailUrl: null });
const entryExpiringAt = (url: string, expiresAt: number) => ({ audio: audioFor(url), expiresAt });
const flush = () => new Promise((resolve) => setImmediate(resolve));

type FakeOptions = { stored?: CacheEntries; loadFails?: boolean; saveFails?: boolean; resolveFails?: boolean };

function createFakes({ stored = {}, loadFails = false, saveFails = false, resolveFails = false }: FakeOptions = {}) {
  const clock = { now: START };
  const resolvedUrls: string[] = [];
  const savedSnapshots: CacheEntries[] = [];
  const resolveCached = createCachedResolveAudio({
    resolve: async (url) => {
      if (resolveFails) throw new Error('offline');
      resolvedUrls.push(url);
      return audioFor(url);
    },
    storage: {
      load: async () => {
        if (loadFails) throw new Error('corrupt');
        return stored;
      },
      save: async (entries) => {
        if (saveFails) throw new Error('disk full');
        savedSnapshots.push(entries);
      },
    },
    now: () => clock.now,
  });
  return { resolveCached, clock, resolvedUrls, savedSnapshots };
}

test('an entry is fresh until the safety margin before it expires', () => {
  const entry = entryExpiringAt(URL_A, START + EXPIRY_SAFETY_MARGIN_MS);

  assert.equal(isFresh(entry, START - 1), true);
  assert.equal(isFresh(entry, START), false);
});

test('parseCacheEntries keeps valid entries and drops malformed ones', () => {
  const valid = entryExpiringAt(URL_A, START);
  const raw = { [URL_A]: valid, [URL_B]: { audio: { url: 1 }, expiresAt: START }, other: 'text', nan: { audio: audioFor('x'), expiresAt: NaN } };

  assert.deepEqual(parseCacheEntries(raw), { [URL_A]: valid });
});

test('parseCacheEntries treats non-object input as empty', () => {
  assert.deepEqual(parseCacheEntries(null), {});
  assert.deepEqual(parseCacheEntries('x'), {});
  assert.deepEqual(parseCacheEntries([entryExpiringAt(URL_A, START)]), {});
});

test('pruneStale drops entries that are expired or inside the margin', () => {
  const fresh = entryExpiringAt(URL_A, START + EXPIRY_SAFETY_MARGIN_MS + 1);
  const entries = { [URL_A]: fresh, [URL_B]: entryExpiringAt(URL_B, START + EXPIRY_SAFETY_MARGIN_MS) };

  assert.deepEqual(pruneStale(entries, START), { [URL_A]: fresh });
});

test('a miss resolves once and stores the entry with the TTL', async () => {
  const { resolveCached, resolvedUrls, savedSnapshots } = createFakes();

  const result = await resolveCached(URL_A);
  await flush();

  assert.equal(result.url, `stream:${URL_A}`);
  assert.equal(result.isFromCache, false);
  assert.deepEqual(resolvedUrls, [URL_A]);
  assert.equal(savedSnapshots.at(-1)?.[URL_A]?.expiresAt, START + RESOLVED_AUDIO_TTL_MS);
});

test('a fresh entry is returned without calling the resolver', async () => {
  const { resolveCached, resolvedUrls } = createFakes();
  await resolveCached(URL_A);

  const result = await resolveCached(URL_A);

  assert.equal(result.isFromCache, true);
  assert.deepEqual(resolvedUrls, [URL_A]);
});

test('an entry saved in an earlier session is used', async () => {
  const stored = { [URL_A]: entryExpiringAt(URL_A, START + RESOLVED_AUDIO_TTL_MS) };
  const { resolveCached, resolvedUrls } = createFakes({ stored });

  const result = await resolveCached(URL_A);

  assert.equal(result.isFromCache, true);
  assert.deepEqual(resolvedUrls, []);
});

test('an entry inside the safety margin is resolved again', async () => {
  const { resolveCached, clock, resolvedUrls } = createFakes();
  await resolveCached(URL_A);

  clock.now += RESOLVED_AUDIO_TTL_MS - EXPIRY_SAFETY_MARGIN_MS;
  const result = await resolveCached(URL_A);

  assert.equal(result.isFromCache, false);
  assert.deepEqual(resolvedUrls, [URL_A, URL_A]);
});

test('refresh resolves again even when the entry is fresh and replaces it', async () => {
  const { resolveCached, clock, resolvedUrls, savedSnapshots } = createFakes();
  await resolveCached(URL_A);

  clock.now += 1000;
  const result = await resolveCached(URL_A, { refresh: true });
  await flush();

  assert.equal(result.isFromCache, false);
  assert.deepEqual(resolvedUrls, [URL_A, URL_A]);
  assert.equal(savedSnapshots.at(-1)?.[URL_A]?.expiresAt, START + 1000 + RESOLVED_AUDIO_TTL_MS);
});

test('stale entries are dropped when the cache is written', async () => {
  const stored = { [URL_B]: entryExpiringAt(URL_B, START) };
  const { resolveCached, savedSnapshots } = createFakes({ stored });

  await resolveCached(URL_A);
  await flush();

  assert.deepEqual(Object.keys(savedSnapshots.at(-1) ?? {}), [URL_A]);
});

test('a resolver failure rejects and leaves the cache untouched', async () => {
  const stored = { [URL_A]: entryExpiringAt(URL_A, START + EXPIRY_SAFETY_MARGIN_MS) };
  const { resolveCached, savedSnapshots } = createFakes({ stored, resolveFails: true });

  await assert.rejects(resolveCached(URL_A));
  await flush();

  assert.deepEqual(savedSnapshots, []);
});

test('an unreadable cache is treated as empty', async () => {
  const { resolveCached, resolvedUrls } = createFakes({ loadFails: true });

  const result = await resolveCached(URL_A);

  assert.equal(result.isFromCache, false);
  assert.deepEqual(resolvedUrls, [URL_A]);
});

test('a failed save still returns the resolved audio', async () => {
  const { resolveCached } = createFakes({ saveFails: true });

  const result = await resolveCached(URL_A);
  await flush();

  assert.equal(result.url, `stream:${URL_A}`);
});

test('overlapping resolves for different URLs both end up stored', async () => {
  const { resolveCached, savedSnapshots } = createFakes();

  await Promise.all([resolveCached(URL_A), resolveCached(URL_B)]);
  await flush();

  assert.deepEqual(Object.keys(savedSnapshots.at(-1) ?? {}).sort(), [URL_A, URL_B]);
});
