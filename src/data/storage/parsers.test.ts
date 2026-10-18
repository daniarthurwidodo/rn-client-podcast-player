import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCacheEntries, parseProgressByUrl, parseSavedUrls } from './parsers.ts';

const URL_A = 'https://youtu.be/aaaaaaaaaaa';
const audioFor = (url: string) => ({ url: `stream:${url}`, title: url, mimeType: 'audio/mp4', contentLength: 10, thumbnailUrl: null });

test('keeps complete entries unchanged', () => {
  const entry = { url: 'https://youtu.be/a', title: 'Episode', thumbnailUrl: 'https://img.test/a.jpg', genres: ['Interview'] };
  assert.deepEqual(parseSavedUrls([entry]), [entry]);
});

test('migrates legacy plain-string entries, using the URL as the title', () => {
  assert.deepEqual(parseSavedUrls(['https://youtu.be/a']), [
    { url: 'https://youtu.be/a', title: 'https://youtu.be/a', thumbnailUrl: null, genres: [] },
  ]);
});

test('fills a missing title and thumbnail', () => {
  assert.deepEqual(parseSavedUrls([{ url: 'https://youtu.be/a' }]), [
    { url: 'https://youtu.be/a', title: 'https://youtu.be/a', thumbnailUrl: null, genres: [] },
  ]);
});

test('drops entries without a string url', () => {
  assert.deepEqual(parseSavedUrls([{ title: 'x' }, { url: 5 }, null, 7]), []);
});

test('returns an empty list for non-array input', () => {
  assert.deepEqual(parseSavedUrls(null), []);
  assert.deepEqual(parseSavedUrls({ url: 'https://youtu.be/a' }), []);
});

test('keeps order and mixes legacy and new entries', () => {
  const result = parseSavedUrls([{ url: 'b', title: 'B', thumbnailUrl: null, genres: [] }, 'a']);
  assert.deepEqual(result.map((item) => item.url), ['b', 'a']);
});

test('an entry saved before genres existed gets an empty genre list', () => {
  assert.deepEqual(parseSavedUrls([{ url: 'a', title: 'A', thumbnailUrl: null }])[0].genres, []);
});

test('keeps only the string genres and ignores a genres value that is not a list', () => {
  assert.deepEqual(parseSavedUrls([{ url: 'a', genres: ['News', 5, null, 'Talk'] }])[0].genres, ['News', 'Talk']);
  assert.deepEqual(parseSavedUrls([{ url: 'a', genres: 'News' }])[0].genres, []);
});

test('parses stored progress and drops malformed entries', () => {
  const raw = { good: { positionSeconds: 1, durationSeconds: 2 }, bad: { positionSeconds: 'x' }, worse: null };
  assert.deepEqual(parseProgressByUrl(raw), { good: { positionSeconds: 1, durationSeconds: 2 } });
});

test('parses non-object progress values as empty', () => {
  assert.deepEqual(parseProgressByUrl(null), {});
  assert.deepEqual(parseProgressByUrl([1]), {});
  assert.deepEqual(parseProgressByUrl('x'), {});
});

test('parseCacheEntries keeps valid entries and drops malformed ones', () => {
  const valid = { audio: audioFor(URL_A), expiresAt: 1000 };
  const raw = {
    [URL_A]: valid,
    broken: { audio: { url: 1 }, expiresAt: 1000 },
    other: 'text',
    nan: { audio: audioFor('x'), expiresAt: NaN },
  };

  assert.deepEqual(parseCacheEntries(raw), { [URL_A]: valid });
});

test('parseCacheEntries treats non-object input as empty', () => {
  assert.deepEqual(parseCacheEntries(null), {});
  assert.deepEqual(parseCacheEntries('x'), {});
  assert.deepEqual(parseCacheEntries([{ audio: audioFor(URL_A), expiresAt: 1000 }]), {});
});
