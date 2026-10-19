import { useEffect, useRef, useState } from 'react';
import type { SavedUrl } from '../../data/models';
import { loadSavedUrls, saveSavedUrls } from '../../data/storage/savedUrlsRepository';
import { addGenre, removeGenre } from '../genres/genres';
import { createNoticeTimer } from '../noticeTimer';
import { resolveAudio } from '../resolve/resolveAudio';

const LOAD_ERROR_MESSAGE = 'Could not load your saved URLs';
const SAVE_ERROR_MESSAGE = 'Could not save your URL';

type UrlMetadata = Pick<SavedUrl, 'title' | 'thumbnailUrl'>;

async function fetchMetadata(url: string): Promise<UrlMetadata | null> {
  try {
    const audio = await resolveAudio(url);
    return { title: audio.title, thumbnailUrl: audio.thumbnailUrl };
  } catch {
    return null;
  }
}

export function useSavedUrls() {
  const [savedUrls, setSavedUrls] = useState<SavedUrl[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorTimer] = useState(() => createNoticeTimer(() => setErrorMessage(null)));
  // Async work reads the latest list from here, not from a stale render closure.
  const latestSavedUrls = useRef<SavedUrl[]>([]);

  const showError = (message: string) => {
    setErrorMessage(message);
    errorTimer.start();
  };

  const commit = async (nextSavedUrls: SavedUrl[]) => {
    latestSavedUrls.current = nextSavedUrls;
    setSavedUrls(nextSavedUrls);
    try {
      await saveSavedUrls(nextSavedUrls);
      setErrorMessage((current) => (current === SAVE_ERROR_MESSAGE ? null : current));
    } catch {
      showError(SAVE_ERROR_MESSAGE);
    }
  };

  // Entries saved before titles existed use their URL as the title.
  const backfillTitles = async (items: SavedUrl[]) => {
    for (const item of items) {
      if (item.title !== item.url) continue;

      const metadata = await fetchMetadata(item.url);
      if (!metadata) continue;
      await commit(latestSavedUrls.current.map((saved) => (saved.url === item.url ? { ...saved, ...metadata } : saved)));
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const loaded = await loadSavedUrls();
        latestSavedUrls.current = loaded;
        setSavedUrls(loaded);
        await backfillTitles(loaded);
      } catch {
        showError(LOAD_ERROR_MESSAGE);
      }
    };
    load();
    return errorTimer.cancel;
    // Runs once on mount: the helpers it calls only use refs, setters and a stable timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rejects when the URL cannot be resolved, so the caller can show the failure.
  const addUrl = async (url: string) => {
    if (latestSavedUrls.current.some((saved) => saved.url === url)) return;

    const audio = await resolveAudio(url);
    const added = { url, title: audio.title, thumbnailUrl: audio.thumbnailUrl, genres: [] };
    await commit([added, ...latestSavedUrls.current]);
  };

  const removeUrl = async (url: string) => {
    await commit(latestSavedUrls.current.filter((saved) => saved.url !== url));
  };

  const updateGenres = async (url: string, change: (genres: string[]) => string[]) => {
    const target = latestSavedUrls.current.find((saved) => saved.url === url);
    if (!target) return;

    const genres = change(target.genres);
    if (genres === target.genres) return;
    await commit(latestSavedUrls.current.map((saved) => (saved.url === url ? { ...saved, genres } : saved)));
  };

  const addItemGenre = (url: string, genre: string) => updateGenres(url, (genres) => addGenre(genres, genre));

  const removeItemGenre = (url: string, genre: string) => updateGenres(url, (genres) => removeGenre(genres, genre));

  return { savedUrls, errorMessage, addUrl, removeUrl, addItemGenre, removeItemGenre };
}
