import { useState } from 'react';
import { collectGenres, filterByGenre, isSameGenre, resolveSelectedGenre } from '../logic/genres';
import { countByFilter, filterByProgress } from '../logic/playbackProgress';
import type { ProgressByUrl, SavedUrl } from '../../data/models';
import type { LibraryFilter } from '../logic/playbackProgress';

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
