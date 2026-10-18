import { useState } from 'react';
import { collectGenres, filterByGenre, isSameGenre, resolveSelectedGenre } from '../lib/genres';
import { countByFilter, filterByProgress } from '../lib/playbackProgress';
import type { LibraryFilter, ProgressByUrl } from '../lib/playbackProgress';
import type { SavedUrl } from '../lib/savedUrl';

// The genre and progress filters apply together; the progress counts describe the genre-filtered list.
export function useLibraryView(savedUrls: SavedUrl[], progressByUrl: ProgressByUrl) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [pickedGenre, setPickedGenre] = useState<string | null>(null);

  const genreCounts = collectGenres(savedUrls);
  const selectedGenre = resolveSelectedGenre(genreCounts, pickedGenre);
  const genreItems = filterByGenre(savedUrls, selectedGenre);

  const toggleGenre = (genre: string) => {
    setPickedGenre((current) => (current !== null && isSameGenre(current, genre) ? null : genre));
  };

  return {
    filter,
    setFilter,
    genreCounts,
    selectedGenre,
    toggleGenre,
    progressCounts: countByFilter(genreItems, progressByUrl),
    visibleUrls: filterByProgress(genreItems, progressByUrl, filter),
  };
}
