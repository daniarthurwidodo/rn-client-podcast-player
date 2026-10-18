import { Image, StyleSheet, Text, View } from 'react-native';
import { AudioPlayer } from '../components/AudioPlayer';
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage';
import { usePlayerStore } from '../stores/playerStore';

const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const NOTHING_PLAYING_MESSAGE = 'Nothing is playing';

export default function PlayerScreen() {
  const track = usePlayerStore((state) => state.track);
  const phase = usePlayerStore((state) => state.phase);
  const errorMessage = usePlayerStore((state) => state.errorMessage);

  if (!track) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>{NOTHING_PLAYING_MESSAGE}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {track.thumbnailUrl ? <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} /> : null}
      <Text style={styles.title}>{track.title}</Text>
      {phase === 'resolving' ? <LoadingMessage message={FETCHING_INFO_MESSAGE} /> : null}
      {phase === 'error' && errorMessage ? <ErrorMessage message={errorMessage} /> : null}
      {phase === 'ready' ? <AudioPlayer /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  thumbnail: { alignSelf: 'stretch', aspectRatio: 16 / 9, borderRadius: 12, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 24 },
  empty: { color: '#777' },
});
