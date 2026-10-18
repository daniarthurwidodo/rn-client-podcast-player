import { ScrollView, StyleSheet } from 'react-native';
import { LIBRARY_FILTERS } from '../../business/logic/playbackProgress';
import type { LibraryFilter } from '../../business/logic/playbackProgress';
import { spacing } from '../theme';
import { Chip } from './Chip';

const FILTER_LABELS: Record<LibraryFilter, string> = {
  all: 'All',
  unplayed: 'Unplayed',
  inProgress: 'In Progress',
  completed: 'Completed',
};

type Props = {
  counts: Record<LibraryFilter, number>;
  selected: LibraryFilter;
  onSelect: (filter: LibraryFilter) => void;
};

export function FilterChips({ counts, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
      {LIBRARY_FILTERS.map((filter) => (
        <Chip
          key={filter}
          label={`${FILTER_LABELS[filter]} (${counts[filter]})`}
          isSelected={filter === selected}
          onPress={() => onSelect(filter)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
});
