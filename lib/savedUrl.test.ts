import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSavedUrls } from './savedUrl.ts';

test('keeps complete entries unchanged', () => {
  const entry = { url: 'https://youtu.be/a', title: 'Episode', thumbnailUrl: 'https://img.test/a.jpg' };
  assert.deepEqual(parseSavedUrls([entry]), [entry]);
});

test('migrates legacy plain-string entries, using the URL as the title', () => {
  assert.deepEqual(parseSavedUrls(['https://youtu.be/a']), [
    { url: 'https://youtu.be/a', title: 'https://youtu.be/a', thumbnailUrl: null },
  ]);
});

test('fills a missing title and thumbnail', () => {
  assert.deepEqual(parseSavedUrls([{ url: 'https://youtu.be/a' }]), [
    { url: 'https://youtu.be/a', title: 'https://youtu.be/a', thumbnailUrl: null },
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
  const result = parseSavedUrls([{ url: 'b', title: 'B', thumbnailUrl: null }, 'a']);
  assert.deepEqual(result.map((item) => item.url), ['b', 'a']);
});
