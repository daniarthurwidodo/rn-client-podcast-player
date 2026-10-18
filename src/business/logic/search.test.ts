import assert from 'node:assert/strict';
import { test } from 'node:test';
import { searchItems } from './search.ts';

const item = (url: string, title: string, genres: string[] = []) => ({ url, title, thumbnailUrl: null, genres });

const INDIE = item('https://youtu.be/aaa', 'Most Indie Devs Release Too Late', ['Gaming', 'Talk']);
const CAFE = item('https://example.org/cafe', 'Café Talk', ['News']);
const OTHER = item('https://youtu.be/ccc', 'Cooking Basics');
const ITEMS = [INDIE, CAFE, OTHER];

const titlesOf = (items: { title: string }[]) => items.map((found) => found.title);

test('an empty or whitespace-only query returns every item', () => {
  assert.deepEqual(searchItems(ITEMS, ''), ITEMS);
  assert.deepEqual(searchItems(ITEMS, '   \t '), ITEMS);
});

test('matches the title ignoring case', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'COOKING')), ['Cooking Basics']);
});

test('ignores accents in both the query and the title', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'cafe')), ['Café Talk']);
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'café')), ['Café Talk']);
});

test('every typed word has to match, in any order', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'devs indie')), ['Most Indie Devs Release Too Late']);
  assert.deepEqual(searchItems(ITEMS, 'indie cooking'), []);
});

test('a word matches inside a longer word and extra spaces are ignored', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, '  inDie   dev ')), ['Most Indie Devs Release Too Late']);
});

test('matches a genre', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'gaming')), ['Most Indie Devs Release Too Late']);
});

test('matches the URL, including the host', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'example.org')), ['Café Talk']);
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'youtu.be')), ['Most Indie Devs Release Too Late', 'Cooking Basics']);
});

test('words may come from different fields', () => {
  assert.deepEqual(titlesOf(searchItems(ITEMS, 'cooking youtu.be')), ['Cooking Basics']);
});

test('returns nothing when nothing matches', () => {
  assert.deepEqual(searchItems(ITEMS, 'zzz'), []);
});

test('keeps the input order and does not change the input', () => {
  const copy = [...ITEMS];

  assert.deepEqual(titlesOf(searchItems(ITEMS, 'talk')), ['Most Indie Devs Release Too Late', 'Café Talk']);
  assert.deepEqual(ITEMS, copy);
});

test('an empty list stays empty', () => {
  assert.deepEqual(searchItems([], 'anything'), []);
});
