import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { LIBRARY_FILTERS } from '../lib/playbackProgress';
import type { LibraryFilter } from '../lib/playbackProgress';
import { colors, fonts, radii, spacing } from '../lib/theme';

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  unplayed: 'Unplayed',
  inProgress: 'In Progress',
  completed: 'Completed',
};
const CHIP_HEIGHT = 32;
const CHIP_HIT_SLOP = 8;

type Props = {
  counts: Record<LibraryFilter, number>;
  selected: LibraryFilter;
  onSelect: (filter: LibraryFilter) => void;
};

export function FilterChips({ counts, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {LIBRARY_FILTERS.map((filter) => {
        const isSelected = filter === selected;
        return (
          <Pressable
            key={filter}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            hitSlop={CHIP_HIT_SLOP}
            style={[styles.chip, isSelected ? styles.chipSelected : null]}
            onPress={() => onSelect(filter)}
          >
            <Text style={isSelected ? styles.labelSelected : styles.label}>
              {`${FILTER_LABELS[filter]} (${counts[filter]})`}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  label: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 14 },
  labelSelected: { color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
