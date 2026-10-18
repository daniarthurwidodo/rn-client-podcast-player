import { Search, X } from 'lucide-react-native';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

const PLACEHOLDER = 'Search title, genre or link';
const SEARCH_ICON_SIZE = 18;
const CLEAR_ICON_SIZE = 18;
const CLEAR_HIT_SLOP = 12;

type Props = { query: string; onChangeQuery: (query: string) => void };

export function SearchBar({ query, onChangeQuery }: Props) {
  return (
    <View style={styles.bar}>
      <Search color={colors.textSupporting} size={SEARCH_ICON_SIZE} />
      <TextInput
        style={styles.input}
        testID="search-input"
        accessibilityLabel="Search saved podcasts"
        value={query}
        onChangeText={onChangeQuery}
        placeholder={PLACEHOLDER}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {query === '' ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={CLEAR_HIT_SLOP} onPress={() => onChangeQuery('')}>
          <X color={colors.textSupporting} size={CLEAR_ICON_SIZE} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  input: { flex: 1, paddingVertical: spacing.sm + spacing.xs, color: colors.textHigh, fontFamily: fonts.body, fontSize: 14 },
});
