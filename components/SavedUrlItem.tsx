import { CircleCheck, X } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../lib/formatDuration';
import { getHostLabel } from '../lib/hostLabel';
import { getProgressFraction, getProgressState } from '../lib/playbackProgress';
import type { PlaybackProgress, ProgressState } from '../lib/playbackProgress';
import type { SavedUrl } from '../lib/savedUrl';
import { colors, fonts, radii, spacing } from '../lib/theme';

const DELETE_ICON_SIZE = 20;
const COMPLETED_ICON_SIZE = 32;
const NOW_PLAYING_LABEL = 'Now playing';
const UNPLAYED_LABEL = 'Unplayed';
const COMPLETED_LABEL = 'Completed';
const PERCENT = 100;

type Props = {
  item: SavedUrl;
  progress: PlaybackProgress | undefined;
  isCurrent: boolean;
  onPress: (item: SavedUrl) => void;
  onDelete: (url: string) => void;
};

function getStatusLabel(state: ProgressState, progress: PlaybackProgress | undefined): string {
  const percent = Math.round(getProgressFraction(progress) * PERCENT);
  const labels = {
    unplayed: UNPLAYED_LABEL,
    inProgress: `${formatDuration(progress?.positionSeconds ?? 0)} played • ${percent}%`,
    completed: COMPLETED_LABEL,
  };
  return labels[state];
}

export function SavedUrlItem({ item, progress, isCurrent, onPress, onDelete }: Props) {
  const state = getProgressState(progress);
  const isCompleted = state === 'completed';
  const statusStyle = styles[`status_${isCurrent ? 'inProgress' : state}`];

  return (
    <Pressable
      style={[styles.card, isCurrent ? styles.cardCurrent : null, isCompleted && !isCurrent ? styles.cardCompleted : null]}
      onPress={() => onPress(item)}
    >
      <View style={styles.row}>
        <View>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.placeholder]} />
          )}
          {isCompleted ? (
            <View style={styles.completedOverlay}>
              <CircleCheck color={colors.primary} size={COMPLETED_ICON_SIZE} />
            </View>
          ) : null}
          {progress ? (
            <View style={styles.durationBadge}>
              <Text style={styles.durationLabel}>{formatDuration(progress.durationSeconds)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.text}>
          <View style={styles.topRow}>
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceLabel} numberOfLines={1}>{getHostLabel(item.url)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${item.title}`}
              hitSlop={12}
              onPress={() => onDelete(item.url)}
            >
              <X color={colors.textMuted} size={DELETE_ICON_SIZE} />
            </Pressable>
          </View>
          <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
          <Text style={[styles.status, statusStyle]}>
            {isCurrent ? NOW_PLAYING_LABEL : getStatusLabel(state, progress)}
          </Text>
        </View>
      </View>
      {state === 'unplayed' ? null : (
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              isCompleted ? styles.barFillCompleted : null,
              { width: `${getProgressFraction(progress) * PERCENT}%` },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.sm + spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.card,
  },
  cardCurrent: { borderColor: colors.primary },
  cardCompleted: { opacity: 0.75 },
  row: { flexDirection: 'row' },
  thumbnail: { width: 120, height: 96, borderRadius: spacing.md },
  placeholder: { backgroundColor: colors.surfaceElevated },
  completedOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.md,
    backgroundColor: colors.backdrop,
  },
  durationBadge: {
    position: 'absolute',
    right: spacing.sm,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm - spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.sm,
    backgroundColor: colors.backdrop,
  },
  durationLabel: { color: colors.textHigh, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  text: { flex: 1, marginLeft: spacing.sm + spacing.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceBadge: {
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.secondaryTint,
  },
  sourceLabel: { color: colors.secondaryText, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 16, lineHeight: 22, marginTop: spacing.sm },
  status: { fontFamily: fonts.labelSemiBold, fontSize: 12, marginTop: spacing.sm },
  status_unplayed: { color: colors.tertiary },
  status_inProgress: { color: colors.primary },
  status_completed: { color: colors.textMuted },
  barTrack: {
    height: 4,
    marginTop: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.stroke,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary },
  barFillCompleted: { backgroundColor: colors.textMuted },
});
