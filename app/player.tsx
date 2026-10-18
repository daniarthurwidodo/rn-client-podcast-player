import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '../components/AudioPlayer';
import { PlaylistPanel } from '../components/PlaylistPanel';
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage';
import { getHostLabel } from '../lib/hostLabel';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { usePlayerStore } from '../src/business/player/playerStore';

const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const NOTHING_PLAYING_MESSAGE = 'Nothing is playing';
// Tall enough for the full controls, so the playlist below does not jump when the track finishes loading.
const CONTROLS_MIN_HEIGHT = 196;

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
        {track.thumbnailUrl ? <Image source={{ uri: track.thumbnailUrl }} style={styles.thumbnail} /> : null}
        <View style={styles.badges}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceLabel}>{getHostLabel(track.url)}</Text>
          </View>
          {track.genres.map((genre) => (
            <View key={genre} style={styles.genreBadge}>
              <Text style={styles.genreLabel} numberOfLines={1}>{genre}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.title} numberOfLines={3}>{track.title}</Text>
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
  thumbnail: { alignSelf: 'stretch', aspectRatio: 16 / 9, flexShrink: 1, borderRadius: radii.sheet },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  sourceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryTint,
  },
  genreBadge: {
    maxWidth: '100%',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  genreLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  sourceLabel: { color: colors.secondaryText, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, marginTop: spacing.sm },
  controls: { minHeight: CONTROLS_MIN_HEIGHT, marginTop: spacing.md },
});
