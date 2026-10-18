import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioPlayer } from '../components/AudioPlayer';
import { ErrorMessage, LoadingMessage } from '../components/StatusMessage';
import { getHostLabel } from '../lib/hostLabel';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { usePlayerStore } from '../stores/playerStore';

const FETCHING_INFO_MESSAGE = 'Fetching audio info...';
const NOTHING_PLAYING_MESSAGE = 'Nothing is playing';

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
        <View style={styles.sourceBadge}>
          <Text style={styles.sourceLabel}>{getHostLabel(track.url)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={3}>{track.title}</Text>
      </View>
      <View style={styles.controls}>
        {phase === 'resolving' ? <LoadingMessage message={FETCHING_INFO_MESSAGE} /> : null}
        {phase === 'error' && errorMessage ? <ErrorMessage message={errorMessage} onRetry={() => loadTrack(track)} /> : null}
        {phase === 'ready' ? <AudioPlayer /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyLabel: { color: colors.textSupporting, fontFamily: fonts.body },
  details: { flex: 1, justifyContent: 'center' },
  thumbnail: { alignSelf: 'stretch', aspectRatio: 16 / 9, borderRadius: radii.sheet },
  sourceBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryTint,
  },
  sourceLabel: { color: colors.secondaryText, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3, marginTop: spacing.sm },
  controls: { minHeight: spacing.xl },
});
