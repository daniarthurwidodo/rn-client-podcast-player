import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SavedUrl } from '../src/data/models';
import { colors, fonts, radii, spacing } from '../lib/theme';

const REMOVE_ICON_SIZE = 14;
const LIST_MAX_HEIGHT = 240;
const NO_GENRES_MESSAGE = 'No genres yet';

type Props = {
  isVisible: boolean;
  item: SavedUrl | null;
  suggestions: string[];
  onAdd: (genre: string) => void;
  onRemove: (genre: string) => void;
  onClose: () => void;
};

export function GenreSheet({ isVisible, item, suggestions, onAdd, onRemove, onClose }: Props) {
  const [draft, setDraft] = useState('');

  const submitDraft = () => {
    onAdd(draft);
    setDraft('');
  };

  const close = () => {
    setDraft('');
    onClose();
  };

  return (
    <Modal transparent animationType="fade" visible={isVisible} onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Genres</Text>
          {item ? <Text style={styles.subtitle} numberOfLines={1}>{item.title}</Text> : null}
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            <View style={styles.chips}>
              {item?.genres.length === 0 ? <Text style={styles.empty}>{NO_GENRES_MESSAGE}</Text> : null}
              {item?.genres.map((genre) => (
                <Pressable
                  key={genre}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${genre}`}
                  style={styles.genreChip}
                  onPress={() => onRemove(genre)}
                >
                  <Text style={styles.genreLabel} numberOfLines={1}>{genre}</Text>
                  <X color={colors.primary} size={REMOVE_ICON_SIZE} />
                </Pressable>
              ))}
            </View>
            {suggestions.length > 0 ? <Text style={styles.sectionLabel}>Your genres</Text> : null}
            <View style={styles.chips}>
              {suggestions.map((genre) => (
                <Pressable
                  key={genre}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${genre}`}
                  style={styles.suggestionChip}
                  onPress={() => onAdd(genre)}
                >
                  <Text style={styles.suggestionLabel} numberOfLines={1}>{`+ ${genre}`}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              testID="genre-input"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitDraft}
              placeholder="New genre"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
              returnKeyType="done"
              blurOnSubmit={false}
            />
            <Pressable accessibilityRole="button" style={styles.addButton} onPress={submitDraft}>
              <Text style={styles.addLabel}>Add</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" style={styles.done} onPress={close}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.sheet,
    padding: spacing.lg,
  },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 18 },
  subtitle: { color: colors.textSupporting, fontFamily: fonts.body, fontSize: 13, marginTop: spacing.xs },
  list: { maxHeight: LIST_MAX_HEIGHT, marginTop: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { color: colors.textMuted, fontFamily: fonts.body },
  sectionLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 12, marginTop: spacing.md, marginBottom: spacing.sm },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: '100%',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  genreLabel: { flexShrink: 1, color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 13 },
  suggestionChip: {
    maxWidth: '100%',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  suggestionLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 13 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.card,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    color: colors.textHigh,
    fontFamily: fonts.body,
    backgroundColor: colors.surface,
  },
  addButton: { paddingVertical: spacing.sm + spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.primary },
  addLabel: { color: colors.onPrimary, fontFamily: fonts.labelBold },
  done: { alignSelf: 'flex-end', marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  doneLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold },
});
