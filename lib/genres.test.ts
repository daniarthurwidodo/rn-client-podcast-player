import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  addGenre,
  collectGenres,
  filterByGenre,
  normalizeGenre,
  removeGenre,
  resolveSelectedGenre,
  splitVisibleGenres,
  VISIBLE_GENRE_COUNT,
} from './genres.ts';

const itemWith = (url: string, genres: string[]) => ({ url, title: url, thumbnailUrl: null, genres });

test('normalizeGenre trims and collapses inner whitespace', () => {
  assert.equal(normalizeGenre('  Talk   show \n'), 'Talk show');
});

test('normalizeGenre rejects empty and whitespace-only input', () => {
  assert.equal(normalizeGenre(''), null);
  assert.equal(normalizeGenre('   \t '), null);
});

test('addGenre appends a new genre', () => {
  assert.deepEqual(addGenre(['News'], ' Interview '), ['News', 'Interview']);
});

test('addGenre ignores duplicates regardless of case and keeps the first spelling', () => {
  assert.deepEqual(addGenre(['News'], 'nEWS'), ['News']);
});

test('addGenre ignores empty input', () => {
  assert.deepEqual(addGenre(['News'], '  '), ['News']);
});

test('addGenre has no limit on how many genres an item can have', () => {
  const many = Array.from({ length: 50 }, (_, position) => `Genre ${position}`);
  assert.equal(many.reduce(addGenre, []).length, 50);
});

test('removeGenre removes a genre regardless of case', () => {
  assert.deepEqual(removeGenre(['News', 'Talk'], 'news'), ['Talk']);
});

test('collectGenres counts items per genre, merges spellings and sorts by name', () => {
  const items = [itemWith('1', ['Talk', 'news']), itemWith('2', ['News']), itemWith('3', [])];

  assert.deepEqual(collectGenres(items), [
    { name: 'news', count: 2 },
    { name: 'Talk', count: 1 },
  ]);
});

test('collectGenres returns nothing for an empty library', () => {
  assert.deepEqual(collectGenres([]), []);
});

test('filterByGenre keeps only items with that genre, ignoring case', () => {
  const items = [itemWith('1', ['News']), itemWith('2', ['Talk'])];

  assert.deepEqual(filterByGenre(items, 'news').map((item) => item.url), ['1']);
});

test('filterByGenre without a genre returns every item', () => {
  const items = [itemWith('1', ['News']), itemWith('2', [])];

  assert.equal(filterByGenre(items, null).length, 2);
});

const namesUpTo = (count: number) => Array.from({ length: count }, (_, position) => `G${position}`);

test('splitVisibleGenres shows everything when there are few genres', () => {
  const names = namesUpTo(VISIBLE_GENRE_COUNT);

  assert.deepEqual(splitVisibleGenres(names, false, null), { visible: names, canToggle: false });
});

test('splitVisibleGenres collapses to the first five when there are more', () => {
  const names = namesUpTo(VISIBLE_GENRE_COUNT + 3);

  assert.deepEqual(splitVisibleGenres(names, false, null), { visible: names.slice(0, VISIBLE_GENRE_COUNT), canToggle: true });
});

test('splitVisibleGenres shows all genres once expanded', () => {
  const names = namesUpTo(VISIBLE_GENRE_COUNT + 3);

  assert.deepEqual(splitVisibleGenres(names, true, null), { visible: names, canToggle: true });
});

test('splitVisibleGenres keeps a selected genre visible even when it would be hidden', () => {
  const names = namesUpTo(VISIBLE_GENRE_COUNT + 3);
  const hidden = names[VISIBLE_GENRE_COUNT + 1];

  const { visible } = splitVisibleGenres(names, false, hidden.toLowerCase());

  assert.deepEqual(visible, [...names.slice(0, VISIBLE_GENRE_COUNT), hidden]);
});

test('resolveSelectedGenre returns the shown spelling of an existing genre', () => {
  assert.equal(resolveSelectedGenre([{ name: 'News', count: 1 }], 'news'), 'News');
});

test('resolveSelectedGenre returns null when the genre no longer exists or none is selected', () => {
  assert.equal(resolveSelectedGenre([{ name: 'News', count: 1 }], 'Talk'), null);
  assert.equal(resolveSelectedGenre([{ name: 'News', count: 1 }], null), null);
  assert.equal(resolveSelectedGenre([], 'News'), null);
});
