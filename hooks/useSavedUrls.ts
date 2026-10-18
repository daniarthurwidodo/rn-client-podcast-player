import { useEffect, useRef, useState } from 'react';
import { loadSavedUrls, saveSavedUrls } from '../lib/savedUrlsStorage';
import type { SavedUrl } from '../lib/savedUrl';
import { resolveAudio } from '../modules/newpipe-resolver';

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
  // Async work reads the latest list from here, not from a stale render closure.
  const latestSavedUrls = useRef<SavedUrl[]>([]);

  const commit = async (nextSavedUrls: SavedUrl[]) => {
    latestSavedUrls.current = nextSavedUrls;
    setSavedUrls(nextSavedUrls);
    try {
      await saveSavedUrls(nextSavedUrls);
    } catch {
      setErrorMessage(SAVE_ERROR_MESSAGE);
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
        setErrorMessage(LOAD_ERROR_MESSAGE);
      }
    };
    load();
  }, []);

  // Rejects when the URL cannot be resolved, so the caller can show the failure.
  const addUrl = async (url: string) => {
    if (latestSavedUrls.current.some((saved) => saved.url === url)) return;

    const audio = await resolveAudio(url);
    const added = { url, title: audio.title, thumbnailUrl: audio.thumbnailUrl };
    await commit([added, ...latestSavedUrls.current]);
  };

  const removeUrl = async (url: string) => {
    await commit(latestSavedUrls.current.filter((saved) => saved.url !== url));
  };

  return { savedUrls, errorMessage, addUrl, removeUrl };
}
