import type { SavedUrl } from './savedUrl';

export const VISIBLE_GENRE_COUNT = 3;

export type GenreCount = { name: string; count: number };

const WHITESPACE_RUN = /\s+/g;

export function normalizeGenre(raw: string): string | null {
  const normalized = raw.trim().replace(WHITESPACE_RUN, ' ');
  return normalized === '' ? null : normalized;
}

export function isSameGenre(first: string, second: string): boolean {
  return first.toLowerCase() === second.toLowerCase();
}

export function addGenre(genres: string[], raw: string): string[] {
  const genre = normalizeGenre(raw);
  if (genre === null || genres.some((existing) => isSameGenre(existing, genre))) return genres;
  return [...genres, genre];
}

export function removeGenre(genres: string[], genre: string): string[] {
  return genres.filter((existing) => !isSameGenre(existing, genre));
}

// Stored data is untrusted: keep only strings, normalised and without duplicates.
export function parseGenres(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const names = raw.filter((value): value is string => typeof value === 'string');
  return names.reduce<string[]>(addGenre, []);
}

// A genre exists while at least one item has it; the first spelling seen is the one shown.
export function collectGenres(items: SavedUrl[]): GenreCount[] {
  const countsByKey = new Map<string, GenreCount>();
  for (const genre of items.flatMap((item) => item.genres)) {
    const key = genre.toLowerCase();
    const existing = countsByKey.get(key);
    countsByKey.set(key, { name: existing?.name ?? genre, count: (existing?.count ?? 0) + 1 });
  }
  return [...countsByKey.values()].sort((first, second) => first.name.localeCompare(second.name));
}

// The selected genre can disappear (its last item was deleted or untagged); return the shown spelling, or null.
export function resolveSelectedGenre(genres: GenreCount[], selected: string | null): string | null {
  if (selected === null) return null;
  return genres.find((genre) => isSameGenre(genre.name, selected))?.name ?? null;
}

export function filterByGenre(items: SavedUrl[], genre: string | null): SavedUrl[] {
  if (genre === null) return items;
  return items.filter((item) => item.genres.some((existing) => isSameGenre(existing, genre)));
}

export type VisibleGenres = { visible: string[]; canToggle: boolean };

// More than VISIBLE_GENRE_COUNT genres are collapsed behind a "Show more" button; the selected one is never hidden.
export function splitVisibleGenres(names: string[], isExpanded: boolean, selected: string | null): VisibleGenres {
  const canToggle = names.length > VISIBLE_GENRE_COUNT;
  if (!canToggle || isExpanded) return { visible: names, canToggle };

  const firstNames = names.slice(0, VISIBLE_GENRE_COUNT);
  const hiddenSelected = names.find((name, position) => position >= VISIBLE_GENRE_COUNT && selected !== null && isSameGenre(name, selected));
  return { visible: hiddenSelected === undefined ? firstNames : [...firstNames, hiddenSelected], canToggle };
}
