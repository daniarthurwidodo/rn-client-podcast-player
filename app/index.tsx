import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { AddUrlModal } from '../components/AddUrlModal';
import { FloatingAddButton } from '../components/FloatingAddButton';
import { SavedUrlItem } from '../components/SavedUrlItem';
import { useAddUrlModal } from '../hooks/useAddUrlModal';
import { useSavedUrls } from '../hooks/useSavedUrls';
import type { SavedUrl } from '../lib/savedUrl';
import { usePlayerStore } from '../stores/playerStore';

const PLAYER_PATH = '/player';

export default function HomeScreen() {
  const router = useRouter();
  const savedUrls = useSavedUrls();
  const addUrl = useAddUrlModal(savedUrls.addUrl);
  const playingUrl = usePlayerStore((state) => state.track?.url);
  const loadTrack = usePlayerStore((state) => state.loadTrack);
  const stopPlayback = usePlayerStore((state) => state.stop);

  const openPlayer = (item: SavedUrl) => {
    loadTrack(item);
    router.push(PLAYER_PATH);
  };

  const deleteUrl = (url: string) => {
    if (url === playingUrl) stopPlayback();
    savedUrls.removeUrl(url);
  };

  return (
    <View style={styles.container}>
      {savedUrls.errorMessage ? <Text style={styles.error}>{savedUrls.errorMessage}</Text> : null}
      <FlatList
        data={savedUrls.savedUrls}
        keyExtractor={(item) => item.url}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Tap + to add a URL</Text>}
        renderItem={({ item }) => <SavedUrlItem item={item} onPress={openPlayer} onDelete={deleteUrl} />}
      />
      <FloatingAddButton onPress={addUrl.open} />
      <AddUrlModal
        isVisible={addUrl.isVisible}
        isSubmitting={addUrl.isSubmitting}
        input={addUrl.input}
        errorMessage={addUrl.errorMessage}
        onChangeInput={addUrl.changeInput}
        onSubmit={addUrl.submit}
        onClose={addUrl.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#777', marginTop: 48 },
  error: { color: '#dc2626', padding: 16 },
});
