import { ClipboardPaste, Link2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

const PLACEHOLDER = 'Paste a YouTube or web audio link…';
const BUTTON_LABEL = 'Paste';
const LINK_ICON_SIZE = 18;
const PASTE_ICON_SIZE = 16;

type Props = { onPaste: () => void };

export function PasteBar({ onPaste }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Paste link from clipboard" style={styles.bar} onPress={onPaste}>
      <Link2 color={colors.textSupporting} size={LINK_ICON_SIZE} />
      <Text style={styles.placeholder} numberOfLines={1}>{PLACEHOLDER}</Text>
      <View style={styles.button}>
        <ClipboardPaste color={colors.primary} size={PASTE_ICON_SIZE} />
        <Text style={styles.buttonLabel}>{BUTTON_LABEL}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.sm,
    paddingLeft: spacing.md,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  placeholder: { flex: 1, marginLeft: spacing.sm, color: colors.textSupporting, fontFamily: fonts.body, fontSize: 14 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  buttonLabel: { marginLeft: spacing.xs, color: colors.primary, fontFamily: fonts.labelBold, fontSize: 14 },
});
