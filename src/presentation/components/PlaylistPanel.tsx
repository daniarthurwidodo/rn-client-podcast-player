import { Volume2 } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavedUrl } from '../../data/models';
import { colors, fonts, radii, spacing } from '../theme';
import { usePlayerStore } from '../../business/player/playerStore';

const ROW_HEIGHT = 48;
const PLAYING_ICON_SIZE = 16;
const CENTER_IN_VIEW = 0.5;

export function PlaylistPanel() {
  const queue = usePlayerStore((state) => state.queue);
  const playQueueTrack = usePlayerStore((state) => state.playQueueTrack);
  const listRef = useRef<FlatList<SavedUrl>>(null);
  const hasQueue = queue !== null;
  const currentIndex = queue?.index ?? 0;

  useEffect(() => {
    if (hasQueue) listRef.current?.scrollToIndex({ index: currentIndex, viewPosition: CENTER_IN_VIEW, animated: true });
  }, [hasQueue, currentIndex]);

  if (!queue) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Playlist</Text>
        <Text style={styles.position}>{`${queue.index + 1} / ${queue.tracks.length}`}</Text>
      </View>
      <FlatList
        ref={listRef}
        style={styles.list}
        data={queue.tracks}
        keyExtractor={(item) => item.url}
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        renderItem={({ item, index }) => {
          const isCurrent = index === queue.index;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              style={[styles.row, isCurrent ? styles.rowCurrent : null]}
              onPress={() => playQueueTrack(index)}
            >
              <Text style={styles.number}>{index + 1}</Text>
              <Text style={isCurrent ? styles.trackTitleCurrent : styles.trackTitle} numberOfLines={1}>{item.title}</Text>
              {isCurrent ? <Volume2 color={colors.primary} size={PLAYING_ICON_SIZE} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignSelf: 'stretch', marginTop: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  title: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 12 },
  position: { color: colors.textMuted, fontFamily: fonts.labelSemiBold, fontSize: 12 },
  list: { flex: 1 },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radii.card,
  },
  rowCurrent: { backgroundColor: colors.primaryTint },
  number: { width: 20, color: colors.textMuted, fontFamily: fonts.labelSemiBold, fontSize: 12 },
  trackTitle: { flex: 1, color: colors.textHigh, fontFamily: fonts.body, fontSize: 14 },
  trackTitleCurrent: { flex: 1, color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
