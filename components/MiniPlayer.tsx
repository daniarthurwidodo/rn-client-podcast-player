import { useRouter } from 'expo-router';
import { Pause, Play } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../lib/formatTime';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { usePlayerStore } from '../src/business/player/playerStore';

const PLAYER_PATH = '/player';
const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const BUFFERING_MESSAGE = 'Buffering...';
const TOGGLE_ICON_SIZE = 20;
const PERCENT = 100;

export function MiniPlayer() {
  const router = useRouter();
  const track = usePlayerStore((state) => state.track);
  const phase = usePlayerStore((state) => state.phase);
  const isLoaded = usePlayerStore((state) => state.isLoaded);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const errorMessage = usePlayerStore((state) => state.errorMessage);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);

  if (!track) return null;

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const isReady = phase === 'ready' && isLoaded;
  const subtitle = {
    resolving: FETCHING_INFO_MESSAGE,
    error: errorMessage ?? '',
    ready: isBuffering ? BUFFERING_MESSAGE : `${formatTime(currentTime)} / ${formatTime(duration)}`,
    idle: '',
  }[phase];
  const ToggleIcon = isPlaying ? Pause : Play;

  return (
    <View testID="mini-player" style={styles.pill}>
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
            <ToggleIcon color={colors.onPrimary} fill={colors.onPrimary} size={TOGGLE_ICON_SIZE} />
          </Pressable>
        ) : null}
      </Pressable>
      <View style={[styles.progress, { width: `${progressFraction * PERCENT}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.sheet,
  },
  content: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm },
  thumbnail: { width: 40, height: 40, borderRadius: spacing.sm + spacing.xs },
  placeholder: { backgroundColor: colors.stroke },
  text: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 14 },
  subtitle: { color: colors.textSupporting, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  error: { color: colors.error, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  toggle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: { position: 'absolute', left: 0, bottom: 0, height: 2, backgroundColor: colors.primary },
});
