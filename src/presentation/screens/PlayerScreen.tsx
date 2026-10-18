import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '../components/AudioPlayer';
import { PlaylistPanel } from '../components/PlaylistPanel';
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage';
import { getHostLabel } from '../format/hostLabel';
import { colors, fonts, spacing } from '../theme';
import { usePlayerStore } from '../../business/player/playerStore';

const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const NOTHING_PLAYING_MESSAGE = 'Nothing is playing';
const SUBTITLE_SEPARATOR = ' • ';
const THUMBNAIL_RADIUS = 12;
// The height of the full controls (progress, main row, secondary row), so the playlist below does not jump between states.
const CONTROLS_MIN_HEIGHT = 186;

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const track = usePlayerStore((state) => state.track);
  const phase = usePlayerStore((state) => state.phase);
  const errorMessage = usePlayerStore((state) => state.errorMessage);
  const loadTrack = usePlayerStore((state) => state.loadTrack);

  if (!track) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={styles.emptyLabel}>{NOTHING_PLAYING_MESSAGE}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <View style={styles.details}>
        {track.thumbnailUrl ? (
          <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
        )}
        <Text style={styles.title} numberOfLines={2}>{track.title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{[getHostLabel(track.url), ...track.genres].join(SUBTITLE_SEPARATOR)}</Text>
      </View>
      <View style={styles.controls}>
        {phase === 'resolving' ? <LoadingMessage message={FETCHING_INFO_MESSAGE} /> : null}
        {phase === 'error' && errorMessage ? <ErrorMessage message={errorMessage} onRetry={() => loadTrack(track)} /> : null}
        {phase === 'ready' ? <AudioPlayer /> : null}
      </View>
      <PlaylistPanel />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyLabel: { color: colors.textSupporting, fontFamily: fonts.body },
  details: { flexShrink: 1 },
  thumbnail: { alignSelf: 'stretch', aspectRatio: 16 / 9, flexShrink: 1, borderRadius: THUMBNAIL_RADIUS },
  thumbnailPlaceholder: { backgroundColor: colors.surfaceElevated },
  title: { color: colors.textHigh, fontFamily: fonts.headlineBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, marginTop: spacing.md },
  subtitle: { color: colors.textSupporting, fontFamily: fonts.body, fontSize: 14, marginTop: spacing.xs },
  controls: { minHeight: CONTROLS_MIN_HEIGHT, marginTop: spacing.md },
});
