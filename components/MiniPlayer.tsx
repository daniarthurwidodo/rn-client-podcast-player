import { usePathname, useRouter } from 'expo-router';
import { Pause, Play } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatTime } from '../lib/formatTime';
import { usePlayerStore } from '../stores/playerStore';

const PLAYER_PATH = '/player';
const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const BUFFERING_MESSAGE = 'Buffering...';
const TOGGLE_ICON_SIZE = 24;
const PERCENT = 100;

export function MiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const track = usePlayerStore((state) => state.track);
  const phase = usePlayerStore((state) => state.phase);
  const isLoaded = usePlayerStore((state) => state.isLoaded);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const errorMessage = usePlayerStore((state) => state.errorMessage);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);

  if (!track || pathname === PLAYER_PATH) return null;

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const isReady = phase === 'ready' && isLoaded;
  const subtitle = {
    resolving: FETCHING_INFO_MESSAGE,
    error: errorMessage ?? '',
    ready: isBuffering ? BUFFERING_MESSAGE : `${formatTime(currentTime)} / ${formatTime(duration)}`,
    idle: '',
  }[phase];

  return (
    <View testID="mini-player" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={[styles.progress, { width: `${progressFraction * PERCENT}%` }]} />
      <Pressable style={styles.content} onPress={() => router.push(PLAYER_PATH)}>
        {track.thumbnailUrl ? (
          <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.placeholder]} />
        )}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>{track.title}</Text>
          <Text style={phase === 'error' ? styles.error : styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        {isReady ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            style={styles.toggle}
            onPress={togglePlayback}
          >
            {isPlaying ? <Pause color="#2563eb" fill="#2563eb" size={TOGGLE_ICON_SIZE} /> : <Play color="#2563eb" fill="#2563eb" size={TOGGLE_ICON_SIZE} />}
          </Pressable>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#f3f4f6', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#ccc' },
  progress: { height: 2, backgroundColor: '#2563eb' },
  content: { flexDirection: 'row', alignItems: 'center', padding: 10 },
  thumbnail: { width: 64, height: 36, borderRadius: 4 },
  placeholder: { backgroundColor: '#e5e7eb' },
  text: { flex: 1, marginLeft: 10 },
  title: { fontSize: 14, fontWeight: '600' },
  subtitle: { color: '#555', fontSize: 12, marginTop: 2 },
  error: { color: '#dc2626', fontSize: 12, marginTop: 2 },
  toggle: { padding: 10 },
});
