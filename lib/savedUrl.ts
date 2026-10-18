export type SavedUrl = {
  url: string;
  title: string;
  thumbnailUrl: string | null;
};

// Entries saved before titles existed are plain URL strings.
function parseSavedUrl(item: unknown): SavedUrl | null {
  if (typeof item === 'string') return { url: item, title: item, thumbnailUrl: null };
  if (typeof item !== 'object' || item === null) return null;
  if (!('url' in item) || typeof item.url !== 'string') return null;

  const title = 'title' in item && typeof item.title === 'string' ? item.title : item.url;
  const thumbnailUrl = 'thumbnailUrl' in item && typeof item.thumbnailUrl === 'string' ? item.thumbnailUrl : null;
  return { url: item.url, title, thumbnailUrl };
}

export function parseSavedUrls(raw: unknown): SavedUrl[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseSavedUrl).filter((item): item is SavedUrl => item !== null);
}
