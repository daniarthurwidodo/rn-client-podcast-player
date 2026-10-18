import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddUrlModal } from '../../components/AddUrlModal';
import { FilterChips } from '../../components/FilterChips';
import { GenreChips } from '../../components/GenreChips';
import { GenrePlayActions } from '../../components/GenrePlayActions';
import { GenreSheet } from '../../components/GenreSheet';
import { PasteBar } from '../../components/PasteBar';
import { SavedUrlItem } from '../../components/SavedUrlItem';
import { useAddUrlModal } from '../../hooks/useAddUrlModal';
import { useGenreEditor } from '../../hooks/useGenreEditor';
import { useLibraryView } from '../../hooks/useLibraryView';
import { useSavedUrls } from '../../hooks/useSavedUrls';
import { isSameGenre } from '../../lib/genres';
import type { SavedUrl } from '../../src/data/models';
import { colors, fonts, radii, spacing } from '../../lib/theme';
import { usePlayerStore } from '../../stores/playerStore';

const PLAYER_PATH = '/player';
const SCREEN_TITLE = 'Podcasts';
const EMPTY_LIBRARY_MESSAGE = 'Tap Paste URL to add a link';
const EMPTY_FILTER_MESSAGE = 'Nothing here yet';
const LIST_BOTTOM_CLEARANCE = 112;

function ItemSeparator() {
  return <View style={styles.separator} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const savedUrls = useSavedUrls();
  const addUrl = useAddUrlModal(savedUrls.addUrl);
  const playingUrl = usePlayerStore((state) => state.track?.url);
  const progressByUrl = usePlayerStore((state) => state.progressByUrl);
  const loadTrack = usePlayerStore((state) => state.loadTrack);
  const playQueue = usePlayerStore((state) => state.playQueue);
  const stopPlayback = usePlayerStore((state) => state.stop);

  const library = useLibraryView(savedUrls.savedUrls, progressByUrl);
  const genreEditor = useGenreEditor(savedUrls.savedUrls);
  const isLibraryEmpty = savedUrls.savedUrls.length === 0;
  const editingGenres = genreEditor.editingItem?.genres ?? [];
  const genreSuggestions = library.genreCounts.map((genre) => genre.name).filter((name) => !editingGenres.some((genre) => isSameGenre(genre, name)));

  const openPlayer = (item: SavedUrl) => {
    loadTrack(item);
    router.push(PLAYER_PATH);
  };

  const playGenre = (shuffle: boolean) => {
    playQueue(library.visibleUrls, { shuffle });
    router.push(PLAYER_PATH);
  };

  const deleteUrl = (url: string) => {
    if (url === playingUrl) stopPlayback();
    savedUrls.removeUrl(url);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{SCREEN_TITLE}</Text>
        <View style={styles.countChip}>
          <Text style={styles.countLabel}>{`${savedUrls.savedUrls.length} saved`}</Text>
        </View>
      </View>
      <PasteBar onPaste={addUrl.openFromClipboard} />
      {isLibraryEmpty ? null : (
        <FilterChips counts={library.progressCounts} selected={library.filter} onSelect={library.setFilter} />
      )}
      {library.genreCounts.length === 0 ? null : (
        <GenreChips genres={library.genreCounts} selected={library.selectedGenre} onSelect={library.toggleGenre} />
      )}
      {library.selectedGenre === null || library.visibleUrls.length === 0 ? null : (
        <GenrePlayActions onPlay={() => playGenre(false)} onShuffle={() => playGenre(true)} />
      )}
      {savedUrls.errorMessage ? <Text style={styles.error}>{savedUrls.errorMessage}</Text> : null}
      <FlatList
        data={library.visibleUrls}
        keyExtractor={(item) => item.url}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={<Text style={styles.empty}>{isLibraryEmpty ? EMPTY_LIBRARY_MESSAGE : EMPTY_FILTER_MESSAGE}</Text>}
        renderItem={({ item }) => (
          <SavedUrlItem
            item={item}
            progress={progressByUrl[item.url]}
            isCurrent={item.url === playingUrl}
            onPress={openPlayer}
            onDelete={deleteUrl}
            onEditGenres={genreEditor.open}
          />
        )}
      />
      <AddUrlModal
        isVisible={addUrl.isVisible}
        isSubmitting={addUrl.isSubmitting}
        input={addUrl.input}
        errorMessage={addUrl.errorMessage}
        onChangeInput={addUrl.changeInput}
        onSubmit={addUrl.submit}
        onClose={addUrl.close}
      />
      <GenreSheet
        isVisible={genreEditor.editingItem !== null}
        item={genreEditor.editingItem}
        suggestions={genreSuggestions}
        onAdd={(genre) => genreEditor.editingItem && savedUrls.addItemGenre(genreEditor.editingItem.url, genre)}
        onRemove={(genre) => genreEditor.editingItem && savedUrls.removeItemGenre(genreEditor.editingItem.url, genre)}
        onClose={genreEditor.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  title: { color: colors.textHigh, fontFamily: fonts.headlineBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  countChip: {
    marginLeft: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  countLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 12 },
  list: { paddingHorizontal: spacing.md, paddingBottom: LIST_BOTTOM_CLEARANCE },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.textSupporting, fontFamily: fonts.body, marginTop: spacing.xl },
  error: { color: colors.error, fontFamily: fonts.body, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});
