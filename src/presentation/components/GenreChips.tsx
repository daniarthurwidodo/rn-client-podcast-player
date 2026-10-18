import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { isSameGenre, splitVisibleGenres } from '../../business/logic/genres';
import type { GenreCount } from '../../business/logic/genres';
import { spacing } from '../theme';
import { Chip } from './Chip';

const SHOW_MORE_LABEL = 'Show more';
const SHOW_LESS_LABEL = 'Show less';

type Props = {
  genres: GenreCount[];
  selected: string | null;
  onSelect: (genre: string) => void;
};

export function GenreChips({ genres, selected, onSelect }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const countsByName = new Map(genres.map((genre) => [genre.name, genre.count]));
  const { visible, canToggle } = splitVisibleGenres(genres.map((genre) => genre.name), isExpanded, selected);

  return (
    <View style={styles.row}>
      {visible.map((name) => (
        <Chip
          key={name}
          label={`${name} (${countsByName.get(name)})`}
          isSelected={selected !== null && isSameGenre(name, selected)}
          onPress={() => onSelect(name)}
        />
      ))}
      {canToggle ? (
        <Chip label={isExpanded ? SHOW_LESS_LABEL : SHOW_MORE_LABEL} isSelected={false} onPress={() => setIsExpanded(!isExpanded)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
});
