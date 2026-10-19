import { CircleCheck, X } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDuration } from '../format/formatDuration';
import { getHostLabel } from '../format/hostLabel';
import { getProgressFraction, getProgressState } from '../../business/playback/playbackProgress';
import type { PlaybackProgress, SavedUrl } from '../../data/models';
import type { ProgressState } from '../../business/playback/playbackProgress';
import { colors, fonts, radii, spacing } from '../theme';

const DELETE_ICON_SIZE = 20;
const COMPLETED_ICON_SIZE = 32;
const NOW_PLAYING_LABEL = 'Now playing';
const UNPLAYED_LABEL = 'Unplayed';
const COMPLETED_LABEL = 'Completed';
const PERCENT = 100;
const VISIBLE_CARD_GENRES = 2;
const ADD_GENRE_LABEL = '+ Genre';

type Props = {
  item: SavedUrl;
  progress: PlaybackProgress | undefined;
  isCurrent: boolean;
  onPress: (item: SavedUrl) => void;
  onDelete: (url: string) => void;
  onEditGenres: (item: SavedUrl) => void;
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

function GenreRow({ item, onEdit }: { item: SavedUrl; onEdit: (item: SavedUrl) => void }) {
  const shownGenres = item.genres.slice(0, VISIBLE_CARD_GENRES);
  const hiddenCount = item.genres.length - shownGenres.length;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit genres of ${item.title}`} style={styles.genreRow} onPress={() => onEdit(item)}>
      {item.genres.length === 0 ? <Text style={styles.addGenre}>{ADD_GENRE_LABEL}</Text> : null}
      {shownGenres.map((genre) => (
        <View key={genre} style={styles.genreBadge}>
          <Text style={styles.genreLabel} numberOfLines={1}>{genre}</Text>
        </View>
      ))}
      {hiddenCount > 0 ? <Text style={styles.moreGenres}>{`+${hiddenCount}`}</Text> : null}
    </Pressable>
  );
}

export function SavedUrlItem({ item, progress, isCurrent, onPress, onDelete, onEditGenres }: Props) {
  const state = getProgressState(progress);
  const isCompleted = state === 'completed';
  const statusStyle = styles[`status_${isCurrent ? 'inProgress' : state}`];

  return (
    <Pressable
      style={[styles.card, isCurrent ? styles.cardCurrent : null, isCompleted && !isCurrent ? styles.cardCompleted : null]}
      onPress={() => onPress(item)}
      onLongPress={() => onEditGenres(item)}
    >
      <View style={styles.row}>
        <View style={styles.thumbnailWrap}>
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
          <GenreRow item={item} onEdit={onEditGenres} />
        </View>
      </View>
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
  thumbnailWrap: { alignSelf: 'flex-start' },
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
  genreRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: spacing.sm },
  genreBadge: {
    maxWidth: 110,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  genreLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 11 },
  addGenre: { color: colors.textMuted, fontFamily: fonts.labelSemiBold, fontSize: 12 },
  moreGenres: { color: colors.textMuted, fontFamily: fonts.labelSemiBold, fontSize: 11 },
});
