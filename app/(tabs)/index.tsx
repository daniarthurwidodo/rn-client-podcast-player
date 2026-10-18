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
import { useHomeScreen } from '../../src/business/hooks/useHomeScreen';
import type { SavedUrl } from '../../src/data/models';
import { colors, fonts, radii, spacing } from '../../lib/theme';

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
  const home = useHomeScreen();
  const { view, genreEditor, addUrl } = home;

  const openPlayer = (item: SavedUrl) => {
    home.playTrack(item);
    router.push(PLAYER_PATH);
  };

  const playGenre = (shuffle: boolean) => {
    home.playVisibleAsQueue(shuffle);
    router.push(PLAYER_PATH);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{SCREEN_TITLE}</Text>
        <View style={styles.countChip}>
          <Text style={styles.countLabel}>{`${home.savedUrls.length} saved`}</Text>
        </View>
      </View>
      <PasteBar onPaste={addUrl.openFromClipboard} />
      {home.isLibraryEmpty ? null : (
        <FilterChips counts={view.progressCounts} selected={view.filter} onSelect={view.setFilter} />
      )}
      {view.genreCounts.length === 0 ? null : (
        <GenreChips genres={view.genreCounts} selected={view.selectedGenre} onSelect={view.toggleGenre} />
      )}
      {view.selectedGenre === null || view.visibleUrls.length === 0 ? null : (
        <GenrePlayActions onPlay={() => playGenre(false)} onShuffle={() => playGenre(true)} />
      )}
      {home.errorMessage ? <Text style={styles.error}>{home.errorMessage}</Text> : null}
      <FlatList
        data={view.visibleUrls}
        keyExtractor={(item) => item.url}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={<Text style={styles.empty}>{home.isLibraryEmpty ? EMPTY_LIBRARY_MESSAGE : EMPTY_FILTER_MESSAGE}</Text>}
        renderItem={({ item }) => (
          <SavedUrlItem
            item={item}
            progress={home.progressByUrl[item.url]}
            isCurrent={item.url === home.playingUrl}
            onPress={openPlayer}
            onDelete={home.deleteUrl}
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
        suggestions={home.genreSuggestions}
        onAdd={home.addEditingGenre}
        onRemove={home.removeEditingGenre}
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
