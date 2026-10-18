import type { SavedUrl } from '../../data/models.ts';

const WHITESPACE_RUN = /\s+/;
const COMBINING_MARKS = /[̀-ͯ]/g;

// Lower-case and strip accents so "Café" and "cafe" match.
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

function toSearchWords(query: string): string[] {
  return normalizeText(query).split(WHITESPACE_RUN).filter((word) => word !== '');
}

function toSearchableText(item: SavedUrl): string {
  return normalizeText([item.title, ...item.genres, item.url].join(' '));
}

// An item matches when every typed word is found somewhere in its title, genres or URL.
export function searchItems(items: SavedUrl[], query: string): SavedUrl[] {
  const words = toSearchWords(query);
  if (words.length === 0) return items;

  return items.filter((item) => {
    const searchableText = toSearchableText(item);
    return words.every((word) => searchableText.includes(word));
  });
}
