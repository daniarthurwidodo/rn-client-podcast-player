import { useState } from 'react';
import { collectGenres, filterByGenre, isSameGenre, resolveSelectedGenre } from '../genres/genres';
import { countByFilter, filterByProgress } from '../playback/playbackProgress';
import { searchItems } from './search';
import type { ProgressByUrl, SavedUrl } from '../../data/models';
import type { LibraryFilter } from '../playback/playbackProgress';

// The genre and progress filters apply together, then the search text narrows the result; the progress counts
// describe the genre-filtered list and ignore the search text.
export function useLibraryView(savedUrls: SavedUrl[], progressByUrl: ProgressByUrl) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [pickedGenre, setPickedGenre] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const genreCounts = collectGenres(savedUrls);
  const selectedGenre = resolveSelectedGenre(genreCounts, pickedGenre);
  const genreItems = filterByGenre(savedUrls, selectedGenre);

  const toggleGenre = (genre: string) => {
    setPickedGenre((current) => (current !== null && isSameGenre(current, genre) ? null : genre));
  };

  return {
    filter,
    setFilter,
    query,
    setQuery,
    genreCounts,
    selectedGenre,
    toggleGenre,
    progressCounts: countByFilter(genreItems, progressByUrl),
    visibleUrls: searchItems(filterByProgress(genreItems, progressByUrl, filter), query),
  };
}
