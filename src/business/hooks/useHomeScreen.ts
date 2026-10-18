import { isSameGenre } from '../logic/genres';
import { usePlayerStore } from '../player/playerStore';
import { useAddUrlModal } from './useAddUrlModal';
import { useGenreEditor } from './useGenreEditor';
import { useLibraryView } from './useLibraryView';
import { useSavedUrls } from './useSavedUrls';

// Everything the Home screen shows or does, so the screen itself only renders and navigates.
export function useHomeScreen() {
  const library = useSavedUrls();
  const addUrl = useAddUrlModal(library.addUrl);
  const playingUrl = usePlayerStore((state) => state.track?.url);
  const progressByUrl = usePlayerStore((state) => state.progressByUrl);
  const loadTrack = usePlayerStore((state) => state.loadTrack);
  const stopPlayback = usePlayerStore((state) => state.stop);
  const view = useLibraryView(library.savedUrls, progressByUrl);
  const genreEditor = useGenreEditor(library.savedUrls);

  const editingUrl = genreEditor.editingItem?.url;
  const editingGenres = genreEditor.editingItem?.genres ?? [];
  const genreSuggestions = view.genreCounts.map((genre) => genre.name).filter((name) => !editingGenres.some((genre) => isSameGenre(genre, name)));

  const deleteUrl = (url: string) => {
    if (url === playingUrl) stopPlayback();
    library.removeUrl(url);
  };

  return {
    savedUrls: library.savedUrls,
    errorMessage: library.errorMessage,
    isLibraryEmpty: library.savedUrls.length === 0,
    playingUrl,
    progressByUrl,
    addUrl,
    view,
    genreEditor,
    genreSuggestions,
    playTrack: loadTrack,
    deleteUrl,
    addEditingGenre: (genre: string) => editingUrl && library.addItemGenre(editingUrl, genre),
    removeEditingGenre: (genre: string) => editingUrl && library.removeItemGenre(editingUrl, genre),
  };
}
