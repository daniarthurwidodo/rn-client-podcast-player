import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSavedUrls } from './savedUrl.ts';

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

test('cleans up stored genres: drops non-strings, trims and removes duplicates', () => {
  const [item] = parseSavedUrls([{ url: 'a', genres: ['  Talk  show ', 'talk SHOW', 5, null, '', 'News'] }]);
  assert.deepEqual(item.genres, ['Talk show', 'News']);
});

test('ignores a genres value that is not a list', () => {
  assert.deepEqual(parseSavedUrls([{ url: 'a', genres: 'News' }])[0].genres, []);
});
