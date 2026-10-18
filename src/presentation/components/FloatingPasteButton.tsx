import { ClipboardPaste } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

const BUTTON_LABEL = 'Paste URL';
const ICON_SIZE = 20;
const SHADOW_OPACITY = 0.4;
const SHADOW_RADIUS = 8;
const SHADOW_ELEVATION = 8;

type Props = { onPress: () => void };

export function FloatingPasteButton({ onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Paste link from clipboard" style={styles.button} onPress={onPress}>
      <ClipboardPaste color={colors.onPrimary} size={ICON_SIZE} />
      <Text style={styles.label}>{BUTTON_LABEL}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: SHADOW_OPACITY,
    shadowRadius: SHADOW_RADIUS,
    elevation: SHADOW_ELEVATION,
  },
  label: { color: colors.onPrimary, fontFamily: fonts.labelBold, fontSize: 14 },
});
